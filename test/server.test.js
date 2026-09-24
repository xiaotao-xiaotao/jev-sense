import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";

import {
  ANIMALS,
  createServer,
  normalizeVisionResult,
  readConfig,
  validateJudgePayload
} from "../server.js";

const TEST_IMAGE = "data:image/png;base64,aGVsbG8=";
const TEST_QUESTIONS = {
  subject: {
    type: "choice",
    criteria: { animal: "Animal", other: "Other" }
  }
};

test("validates image and question boundaries", () => {
  const result = validateJudgePayload({ image: TEST_IMAGE, questions: TEST_QUESTIONS });
  assert.equal(result.image, TEST_IMAGE);
  assert.deepEqual(result.state, {});
  assert.throws(
    () => validateJudgePayload({ image: "file.jpg", questions: TEST_QUESTIONS }),
    /base64 data URL/
  );
  assert.throws(
    () => validateJudgePayload({ image: TEST_IMAGE, questions: {} }),
    /1 to 32/
  );
});

test("serves thirty small gallery images and keeps mock classification explicit", async (context) => {
  const config = readConfig({}, { server: { mock: true } });
  const server = createServer({ config });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const gallery = await fetch(`${baseUrl}/v1/gallery`).then((response) => response.json());
  assert.equal(gallery.animals.length, 30);
  assert.equal(ANIMALS.length, 30);
  for (const animal of gallery.animals) {
    const image = await fetch(`${baseUrl}/docs/${animal.id}.jpg`);
    assert.equal(image.status, 200, animal.id);
    assert.match(image.headers.get("content-type"), /image\/jpeg/);
    assert.ok((await image.arrayBuffer()).byteLength < 30000, `${animal.id} exceeds 30 KB`);
  }
  assert.equal((await fetch(`${baseUrl}/docs/unknown.jpg`)).status, 404);

  const response = await fetch(`${baseUrl}/v1/classify-animal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: TEST_IMAGE })
  });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.choice, "uncertain");
  assert.equal(result.category, null);
  assert.equal(result.metrics.mock, true);

  const description = await fetch(`${baseUrl}/v1/describe-animal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: TEST_IMAGE })
  }).then((reply) => reply.json());
  const mockDecision = await fetch(`${baseUrl}/v1/decide-animal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ evidence: description.evidence })
  }).then((reply) => reply.json());
  assert.equal(mockDecision.choice, "uncertain");
  assert.equal(mockDecision.metrics.mock, true);
});

test("classifies animal from visual evidence without gallery ground truth", async (context) => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push(JSON.parse(options.body));
    return calls.length === 1
      ? Response.json({ success: true, result: { response: "A fox with orange fur and a bushy tail." } })
      : Response.json({ answers: { animal: { type: "choice", choice: "fox" } } });
  };
  const config = readConfig({}, {
    server: { mock: false },
    cloudflare: { accountId: "account", apiToken: "token" },
    jev: { apiUrl: "https://example.invalid/jev", apiKey: "secret" }
  });
  const server = createServer({ config, fetchImpl });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => server.close());

  const response = await fetch(`http://127.0.0.1:${server.address().port}/v1/classify-animal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: TEST_IMAGE })
  });
  const result = await response.json();
  assert.equal(result.choice, "fox");
  assert.equal(result.category, "mammal");
  assert.match(calls[0].messages[0].content, /animal/);
  assert.equal(calls[1].questions.animal.criteria.fox, "The main animal is a fox.");
  assert.equal(calls[1].state.vision_evidence.summary, "A fox with orange fur and a bushy tail.");
  assert.equal(JSON.stringify(calls).includes("/docs/fox.jpg"), false);
});

test("requests visual descriptions in the selected language", async (context) => {
  const prompts = [];
  const config = readConfig({}, {
    server: { mock: false },
    cloudflare: { accountId: "account", apiToken: "token" },
    jev: { apiUrl: "https://example.invalid/jev", apiKey: "secret" }
  });
  const fetchImpl = async (_url, options) => {
    prompts.push(JSON.parse(options.body).messages[0].content);
    return Response.json({ success: true, result: { response: "An animal is visible." } });
  };
  const server = createServer({ config, fetchImpl });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}/v1/describe-animal`;
  for (const language of ["en", "zh"]) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: TEST_IMAGE, language })
    });
    assert.equal(response.status, 200);
  }
  assert.match(prompts[0], /Write the description in English/);
  assert.match(prompts[1], /Write the description in Simplified Chinese/);
  const invalid = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: TEST_IMAGE, language: "fr" })
  });
  assert.equal(invalid.status, 400);
});

test("returns vision evidence before the separate Jev decision", async (context) => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return calls.length === 1
      ? Response.json({ success: true, result: { response: "A black and white penguin on snow." } })
      : Response.json({ answers: { animal: { type: "choice", choice: "penguin" } } });
  };
  const config = readConfig({}, {
    server: { mock: false },
    cloudflare: { accountId: "account", apiToken: "token" },
    jev: { apiUrl: "https://example.invalid/jev", apiKey: "secret" }
  });
  const server = createServer({ config, fetchImpl });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const description = await fetch(`${baseUrl}/v1/describe-animal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: TEST_IMAGE })
  }).then((response) => response.json());
  assert.equal(calls.length, 1);
  assert.match(description.evidence.summary, /penguin/);
  assert.equal(typeof description.metrics.vision_ms, "number");

  const decisionResponse = await fetch(`${baseUrl}/v1/decide-animal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ evidence: description.evidence })
  });
  const decision = await decisionResponse.json();
  assert.equal(decision.choice, "penguin");
  assert.equal(decision.category, "bird");
  assert.equal(calls[1].body.state.vision_evidence.summary, description.evidence.summary);
  assert.equal(typeof decision.metrics.jev_ms, "number");

  const emptyEvidence = await fetch(`${baseUrl}/v1/decide-animal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ evidence: {} })
  });
  assert.equal(emptyEvidence.status, 400);
});

test("keeps one animal description when the vision model repeats its response", async (context) => {
  const description = "A gray and white furry animal with large ears sits on a branch.";
  const repeated = `${description} **Description in Simplified Chinese:** ${description} **Description in Simplified Chinese:** ${description}`;
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return calls.length === 1
      ? Response.json({ success: true, result: { response: repeated } })
      : Response.json({ answers: { animal: { type: "choice", choice: "koala" } } });
  };
  const config = readConfig({}, {
    server: { mock: false },
    cloudflare: { accountId: "account", apiToken: "token" },
    jev: { apiUrl: "https://example.invalid/jev", apiKey: "secret" }
  });
  const server = createServer({ config, fetchImpl });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const visual = await fetch(`${baseUrl}/v1/describe-animal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: TEST_IMAGE, language: "zh" })
  }).then((response) => response.json());
  assert.equal(visual.evidence.summary, description);
  assert.match(calls[0].body.messages[1].content[0].text, /一句简体中文/);

  await fetch(`${baseUrl}/v1/decide-animal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ evidence: visual.evidence })
  });
  assert.equal(calls[1].body.state.vision_evidence.summary, description);
});

test("normalizes Cloudflare JSON and fenced model output", () => {
  assert.deepEqual(
    normalizeVisionResult({ result: { response: "```json\n{\"scene\":\"park\"}\n```" } }),
    { scene: "park" }
  );
  assert.deepEqual(
    normalizeVisionResult({ result: { response: "A dog is visible." } }),
    { summary: "A dog is visible.", parse_warning: "Vision response was not valid JSON" }
  );
});

test("reads local JSON config and lets environment variables override it", () => {
  const config = readConfig(
    { JEV_MODEL: "jev-env-override" },
    {
      server: { port: 9000, requestTimeoutMs: 30000, mock: true },
      cloudflare: {
        accountId: "account",
        apiToken: "token",
        visionModel: "@cf/meta/llama-4-scout-17b-16e-instruct"
      },
      jev: {
        apiUrl: "https://opencode.ai/zen/v1/systemone",
        model: "jev-1.13-free",
        apiKey: "public",
        apiKeyHeader: "Authorization",
        apiKeyPrefix: "Bearer "
      }
    }
  );

  assert.equal(config.port, 9000);
  assert.equal(config.mock, true);
  assert.equal(config.jevApiUrl, "https://opencode.ai/zen/v1/systemone");
  assert.equal(config.jevModel, "jev-env-override");
  assert.equal(config.jevApiKey, "public");
});

test("serves the UI and completes the mock pipeline", async (context) => {
  const config = {
    port: 0,
    timeout: 5000,
    mock: true,
    cloudflareAccountId: "",
    cloudflareApiToken: "",
    visionModel: "@cf/meta/llama-4-scout-17b-16e-instruct",
    jevApiUrl: "",
    jevApiKey: "",
    jevModel: "typesafe/jev",
    jevApiKeyHeader: "Authorization",
    jevApiKeyPrefix: "Bearer "
  };
  const server = createServer({ config });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => server.close());

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const home = await fetch(baseUrl);
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.match(html, /Jev Sense · Image Sorting Conveyor/);
  assert.match(html, /rel="icon" type="image\/svg\+xml" href="\/brand-icon\.svg\?v=scan1"/);
  assert.match(html, /class="brand-mark" src="\/brand-icon\.svg\?v=scan1"/);
  assert.match(html, /id="bin-mammal"/);
  assert.match(html, /id="bin-review"/);
  assert.match(html, /id="image-viewer"/);
  assert.match(html, /id="page-rail"/);
  assert.doesNotMatch(html, /<!-- @include:/);
  const brandIcon = await fetch(`${baseUrl}/brand-icon.svg`);
  assert.equal(brandIcon.status, 200);
  assert.match(brandIcon.headers.get("content-type"), /image\/svg\+xml/);
  assert.match(await brandIcon.text(), /<svg[^>]+viewBox="0 0 64 64"/);
  for (const file of ["app.js", "shared.js", "gallery.js", "viewer.js", "results.js", "motion.js", "scroll-assistant.js", "i18n.js", "style.css", "sorter.css", "results.css", "gallery.css", "viewer.css", "scroll-assistant.css", "theme.css", "responsive.css"]) {
    const asset = await fetch(`${baseUrl}/${file}`);
    assert.equal(asset.status, 200, file);
    assert.match(asset.headers.get("content-type"), file.endsWith(".js") ? /text\/javascript/ : /text\/css/, file);
  }

  const health = await fetch(`${baseUrl}/health`).then((response) => response.json());
  assert.equal(health.ready, true);
  assert.equal(health.mock, true);

  const response = await fetch(`${baseUrl}/v1/judge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: TEST_IMAGE, questions: TEST_QUESTIONS })
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.vision.mock, true);
  assert.equal(result.decision.answers.subject.type, "choice");
  assert.equal(result.metrics.mock, true);
});

test("orchestrates Cloudflare Llama 4 Scout before the external Jev API", async (context) => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    if (calls.length === 1) {
      return Response.json({
        success: true,
        result: {
          choices: [{ message: { content: JSON.stringify({
            summary: "A white dog is standing on grass.",
            objects: [{ name: "dog", color: "white" }]
          }) } }]
        }
      });
    }
    return Response.json({
      model: "typesafe/jev",
      answers: {
        subject: {
          type: "choice",
          choice: "animal",
          probabilities: { animal: 0.98, other: 0.02 }
        }
      }
    });
  };
  const config = {
    port: 0,
    timeout: 5000,
    mock: false,
    cloudflareAccountId: "account-id",
    cloudflareApiToken: "cloudflare-secret",
    visionModel: "@cf/meta/llama-4-scout-17b-16e-instruct",
    jevApiUrl: "https://example.invalid/v1/decisions",
    jevApiKey: "jev-secret",
    jevModel: "typesafe/jev",
    jevApiKeyHeader: "Authorization",
    jevApiKeyPrefix: "Bearer "
  };
  const server = createServer({ config, fetchImpl });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => server.close());

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/v1/judge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: TEST_IMAGE, questions: TEST_QUESTIONS })
  });
  assert.equal(response.status, 200);
  const result = await response.json();

  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /ai\/run\/@cf\/meta\/llama-4-scout-17b-16e-instruct$/);
  assert.equal(calls[0].options.headers.Authorization, "Bearer cloudflare-secret");
  assert.equal(calls[0].body.messages[1].content[1].image_url.url, TEST_IMAGE);
  assert.equal(calls[0].body.response_format.type, "json_object");
  assert.equal(calls[1].url, config.jevApiUrl);
  assert.equal(calls[1].options.headers.Authorization, "Bearer jev-secret");
  assert.equal(
    calls[1].body.state.vision_evidence.objects[0].name,
    "dog"
  );
  assert.equal(result.decision.answers.subject.choice, "animal");
  assert.equal(typeof result.metrics.vision_ms, "number");
  assert.equal(result.metrics.mock, false);
});
