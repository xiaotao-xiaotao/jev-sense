import { $, categoryKeys, QUEUE_LIMIT, SAMPLE_IDS } from "./shared.js";
import { renderFilters, renderGallery, syncGallerySelection } from "./gallery.js?v=selection1";
import { initializeViewer } from "./viewer.js?v=preview1";
import { cancelResultRetry, clearResults, initializeResults, recordResult, setResultAnimals, supersedeResult, syncBinThumbnailSelection } from "./results.js?v=retry1";
import { BELT_SPEED_PX_PER_SECOND, blobToDataUrl, cancelMotion, compressUploadImage, flyAlongBelt, flyTo, imageToDataUrl, initializeMotion, makeFlyingCard, pinToJunction, pinToScanner, releaseFromAnchor } from "./motion.js?v=smooth-belt2";
import { initializeScrollAssistant, setAssistantState } from "./scroll-assistant.js?v=gaze3";
import { animalName, getLanguage, initializePreferences, itemName, onLanguageChange, t } from "./i18n.js?v=retry1";

let animals = [];
let queue = [];
let beltCards = [];
let activeItem = null;
let running = false;
let worker = null;
let beltFrame = 0;
let previousBeltFrame = 0;
let lastBeltLaunch = -Infinity;
let generation = 0;
let uploadJobs = 0;
let uploadTail = Promise.resolve();
const controllers = new Set();
const sortingTasks = new Set();
let junctionTail = Promise.resolve();
let junctionReservations = 0;
let approachTail = Promise.resolve();
let processed = 0;
let reviewed = 0;
let evaluated = 0;
let correct = 0;
const counts = Object.fromEntries([...categoryKeys, "review"].map((key) => [key, 0]));
const uploadUrls = new Set();
const selectedGalleryIds = new Set();
const retrySources = new Map();
const UPLOAD_TARGET_BYTES = 30 * 1024;
// A card leaves one belt stripe empty before the next card enters.
const BELT_CARD_GAP_PX = 56;
const SCANNER_FEEDBACK_MS = 350;
const VISIBLE_BELT_QUEUE_SIZE = 3;
let currentStatus = { key: "initialStatus", values: {}, error: false };
let healthState = "healthChecking";

function renderStatus() {
  const { key, values, error } = currentStatus;
  const translated = { ...values };
  if (translated.item) translated.name = itemName(translated.item);
  if (translated.binKey) translated.category = t(`category.${translated.binKey}`);
  $("status").textContent = t(key, translated);
  $("status").classList.toggle("error", error);
}

function setStatus(key, values = {}, error = false) {
  currentStatus = { key, values, error };
  renderStatus();
}

function renderHealth() {
  $("health-text").textContent = t(healthState);
  $("health").title = t(healthState);
}

function refreshControls() {
  const pendingCount = queue.length + beltCards.length;
  const occupiedCount = pendingCount + Number(Boolean(activeItem)) + sortingTasks.size;
  $("queue-count").textContent = pendingCount;
  $("intake-count").textContent = queue.length;
  $("done-count").textContent = processed;
  $("correct-count").textContent = evaluated ? correct + " / " + evaluated : "—";
  $("review-count").textContent = reviewed;
  for (const key of Object.keys(counts)) $("count-" + key).textContent = t("countImages", { count: counts[key] });
  $("start").disabled = running || pendingCount === 0 || uploadJobs > 0;
  $("pause").disabled = !running;
  const remainingExamples = SAMPLE_IDS.filter((id) => !selectedGalleryIds.has(id)).length;
  $("sample").disabled = remainingExamples === 0 || occupiedCount > QUEUE_LIMIT - remainingExamples;
  $("upload").disabled = occupiedCount >= QUEUE_LIMIT || uploadJobs > 0;
  $("sorter-stage").classList.toggle("running", running);
  $("sorter-stage").classList.toggle("has-belt-cards", beltCards.length > 0 || Boolean(activeItem));
  $("run-state").textContent = t(activeItem ? "stateRecognizing" : running ? "stateRunning" : pendingCount ? "stateQueued" : processed ? "stateDone" : "stateWaiting");
  $("run-state").className = "state-badge " + (activeItem ? "running" : running || processed && !pendingCount ? "done" : "");
  renderQueue();
  syncGallerySelection(selectedGalleryIds);
}

function cancelPendingRetry(item) {
  const source = retrySources.get(item);
  if (!source) return false;
  retrySources.delete(item);
  cancelResultRetry(source);
  return true;
}

function removeQueuedItem(item) {
  if (!queue.includes(item)) return;
  queue = queue.filter((entry) => entry !== item);
  if (retrySources.has(item)) {
    // The failed record still needs its image if a queued retry is cancelled.
    cancelPendingRetry(item);
  } else {
    if (item.reference) selectedGalleryIds.delete(item.reference.id);
    if (uploadUrls.delete(item.url)) URL.revokeObjectURL(item.url);
  }
  refreshControls();
  if (!queue.length && !running && !activeItem) {
    setAssistantState(processed ? "done" : "idle", processed ? "mascot.finished" : "mascot.idle");
  }
  setStatus("status.removed", { item });
}

function renderQueue() {
  const list = $("queue-list");
  const beltQueue = $("belt-queue");
  list.replaceChildren();
  beltQueue.replaceChildren();
  $("queue-hint").hidden = queue.length + beltCards.length > 0;
  // The rightmost preview is closest to the scanner, so show the next card there.
  for (const item of queue.slice(0, VISIBLE_BELT_QUEUE_SIZE).reverse()) {
    const card = document.createElement("div");
    card.className = "belt-queue-card";
    const preview = document.createElement("img");
    preview.src = item.url;
    preview.alt = "";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "belt-queue-remove";
    remove.textContent = "×";
    remove.setAttribute("aria-label", t("removeItem", { name: itemName(item) }));
    remove.addEventListener("click", () => removeQueuedItem(item));
    card.append(preview, remove);
    beltQueue.append(card);
  }
  for (const item of queue) {
    const card = document.createElement("span");
    card.className = "queue-card";
    const image = document.createElement("img");
    image.src = item.url;
    image.alt = "";
    const label = document.createElement("span");
    label.textContent = itemName(item);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", t("removeItem", { name: itemName(item) }));
    remove.addEventListener("click", () => removeQueuedItem(item));
    card.append(image, label, remove);
    list.append(card);
  }
}

function enqueue(item, retry = false) {
  if (!retry && item.reference && selectedGalleryIds.has(item.reference.id)) {
    setStatus("status.alreadyAdded", { item });
    return false;
  }
  if (queue.length + beltCards.length + Number(Boolean(activeItem)) + sortingTasks.size >= QUEUE_LIMIT) {
    setStatus("status.queueLimit", { count: QUEUE_LIMIT }, true);
    return false;
  }
  queue.push(item);
  if (item.reference) selectedGalleryIds.add(item.reference.id);
  refreshControls();
  setStatus("status.added", { item, count: queue.length });
  if (!running && !activeItem) setAssistantState("queued", "mascot.queued");
  if (running) ensureBeltLoop();
  return true;
}

function finishItem(item, result, binKey) {
  const retrySource = retrySources.get(item);
  if (retrySource) {
    // Replace the failed attempt when the retry completes, regardless of its new outcome.
    retrySources.delete(item);
    supersedeResult(retrySource);
    counts.review--;
    reviewed--;
    processed--;
  }
  counts[binKey]++;
  processed++;
  if (binKey === "review") reviewed++;
  if (item.reference && binKey !== "review") {
    evaluated++;
    if (item.reference.id === result.choice) correct++;
  }
  $("count-" + binKey).textContent = t("countImages", { count: counts[binKey] });
  const thumb = document.createElement("img");
  thumb.src = item.url;
  thumb.alt = itemName(item);
  thumb.dataset.animalId = item.reference?.id ?? "";
  thumb.dataset.uploadName = item.name;
  thumb.dataset.binKey = binKey;
  const recordIndex = recordResult(item, result, binKey);
  thumb.dataset.recordIndex = String(recordIndex);
  thumb.title = `${t("detailsItem", { name: itemName(item) })} · #${String(recordIndex + 1).padStart(3, "0")}`;
  $("thumb-" + binKey).prepend(thumb);
  while ($("thumb-" + binKey).children.length > 3) $("thumb-" + binKey).lastElementChild.remove();
  syncBinThumbnailSelection();
  if (!activeItem) {
    setAssistantState(binKey === "review" ? "review" : "done",
      binKey === "review" ? "mascot.review" : "mascot.sorted", { binKey });
    if (result.error) setStatus("status.visionFailed", { item, error: result.error }, true);
    else if (result.metrics?.mock) setStatus("status.mockReview", { item });
    else setStatus("status.sorted", { item, binKey });
  }
}

async function analyzeItem(item, token, requestController) {
  let result = {};
  let decisionPromise = null;
  let inferenceStarted = 0;
  try {
    const image = item.uploadBlob ? await blobToDataUrl(item.uploadBlob) : await imageToDataUrl(item.url);
    if (token !== generation) return;
    inferenceStarted = performance.now();
    const response = await fetch("/v1/describe-animal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, language: getLanguage() }),
      signal: requestController.signal
    });
    result = await response.json();
    if (!response.ok) throw new Error(result.error || t("error.vision"));
    // Jev works while the image continues along the belt toward the sorting gate.
    decisionPromise = fetch("/v1/decide-animal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evidence: result.evidence }),
      signal: requestController.signal
    }).then(async (decisionResponse) => {
      const decision = await decisionResponse.json();
      if (!decisionResponse.ok) decision.error = decision.error || t("error.jev");
      return decision;
    }).catch((error) => ({ error: error.message || t("error.jev") }));
  } catch (error) {
    if (token !== generation) return;
    result.error = error.message || t("error.general");
  }
  if (token !== generation) return;
  return { result, decisionPromise, inferenceStarted };
}

async function scanItem(item, card, token) {
  setAssistantState("moving", "mascot.toScanner");
  setStatus("status.toScanner", { item });
  const requestController = new AbortController();
  controllers.add(requestController);
  // Start the model during the final approach so its latency overlaps the card's movement.
  const analysisPromise = analyzeItem(item, token, requestController);
  await flyAlongBelt(card, $("scanner"), token);
  if (token !== generation) return;
  pinToScanner(card);
  $("sorter-stage").classList.add("scanning");
  setAssistantState("scanning", "mascot.scanning");
  $("scanner-text").textContent = t("scannerRunning");
  setStatus("status.extracting", { item });
  const [analysis] = await Promise.all([
    analysisPromise,
    new Promise((resolve) => setTimeout(resolve, SCANNER_FEEDBACK_MS))
  ]);
  if (token !== generation || !analysis) return;
  return { ...analysis, requestController };
}

async function sortItem(item, card, scan, token, previousJunction, releaseJunction, previousApproach, releaseApproach, releaseScanner) {
  let { result } = scan;
  let approachReleased = false;
  try {
    if (!activeItem) {
      setAssistantState("moving", "mascot.toExit");
      setStatus(result.error ? "status.failedToExit" : "status.visionToExit", { item }, Boolean(result.error));
    }
    if (releaseApproach) {
      // One card may wait before the junction while the preceding card leaves the gate.
      await previousApproach;
      if (token !== generation) return;
      releaseScanner();
      await flyAlongBelt(card, $("junction-approach"), token);
      if (token !== generation) return;
      card.classList.add("approach-waiting");
      await previousJunction;
      card.classList.remove("approach-waiting");
      if (token !== generation) return;
      releaseApproach();
      approachReleased = true;
    } else releaseScanner();
    await flyAlongBelt(card, $("junction"), token);
    if (token !== generation) return;
    pinToJunction(card);
    $("junction").classList.add("decision-pending");
    if (scan.decisionPromise) {
      if (!activeItem) {
        setAssistantState("scanning", "mascot.deciding");
        setStatus("status.waitDecision", { item });
      }
      const decision = await scan.decisionPromise;
      if (token !== generation) return;
      result = {
        ...result,
        ...decision,
        metrics: {
          ...result.metrics,
          ...decision.metrics,
          elapsed_ms: Math.round(performance.now() - scan.inferenceStarted)
        }
      };
    }
    $("junction").classList.remove("decision-pending");
    const binKey = !result.error && !result.metrics?.mock && categoryKeys.includes(result.category)
      ? result.category : "review";
    releaseFromAnchor(card);
    releaseJunction();
    await flyTo(card, $("bin-" + binKey), 1150, token);
    if (token !== generation) return;
    card.remove();
    finishItem(item, result, binKey);
  } finally {
    releaseScanner();
    card.classList.remove("approach-waiting");
    if (!approachReleased) releaseApproach?.();
    releaseJunction();
    if (scan.requestController) controllers.delete(scan.requestController);
    if (token === generation) $("junction").classList.remove("decision-pending");
  }
}

function advanceBelt(now) {
  beltFrame = 0;
  if (!running) {
    previousBeltFrame = 0;
    return;
  }
  const elapsed = previousBeltFrame ? Math.min(now - previousBeltFrame, 100) / 1000 : 0;
  previousBeltFrame = now;
  const cardWidth = beltCards[0]?.card.offsetWidth || 72;
  const spacing = cardWidth + BELT_CARD_GAP_PX;
  const entryX = beltCards[0]?.entryX;
  const tail = beltCards.at(-1);
  if (queue.length && now - lastBeltLaunch >= spacing / BELT_SPEED_PX_PER_SECOND * 1000
      && (!tail || tail.x >= entryX + spacing)) {
    const item = queue.shift();
    const card = makeFlyingCard(item);
    const x = Number.parseFloat(card.style.left);
    beltCards.push({ item, card, x, entryX: x });
    lastBeltLaunch = now;
    refreshControls();
  }
  const stage = $("sorter-stage").getBoundingClientRect();
  const scanner = $("scanner").getBoundingClientRect();
  const stopX = scanner.left - stage.left + scanner.width / 2 - cardWidth / 2 - spacing;
  beltCards.forEach((entry, index) => {
    const limit = index ? beltCards[index - 1].x - spacing : stopX;
    entry.x = Math.min(limit, entry.x + BELT_SPEED_PX_PER_SECOND * elapsed);
    entry.card.style.left = `${entry.x}px`;
  });
  if (beltCards[0]?.x >= stopX - 0.5) ensureWorker();
  if (queue.length || beltCards.length) beltFrame = requestAnimationFrame(advanceBelt);
  else previousBeltFrame = 0;
}

function ensureBeltLoop() {
  if (running && !beltFrame) beltFrame = requestAnimationFrame(advanceBelt);
}

function finishRoundIfIdle() {
  if (!running || worker || queue.length || beltCards.length || sortingTasks.size) return;
  running = false;
  setAssistantState("done", "mascot.finished");
  setStatus("status.roundDone", { count: processed });
  refreshControls();
}

function launchSort(item, card, scan, token) {
  // Reserve one waiting position before the junction, leaving the scanner free for the next image.
  const previousJunction = junctionTail;
  const needsApproach = junctionReservations > 0;
  junctionReservations++;
  let resolveJunction;
  let junctionReleased = false;
  junctionTail = new Promise((resolve) => { resolveJunction = resolve; });
  const releaseJunction = () => {
    if (junctionReleased) return;
    junctionReleased = true;
    // An early failure must not let a later card overtake the preceding card.
    void previousJunction.then(() => {
      if (token === generation) junctionReservations--;
      resolveJunction();
    });
  };
  let previousApproach = Promise.resolve();
  let releaseApproach = null;
  if (needsApproach) {
    previousApproach = approachTail;
    let resolveApproach;
    let approachReleased = false;
    approachTail = new Promise((resolve) => { resolveApproach = resolve; });
    releaseApproach = () => {
      if (approachReleased) return;
      approachReleased = true;
      resolveApproach();
    };
  }
  // The scanner remains reserved until this card can depart, even if its vision request has finished.
  let releaseScanner;
  const scannerDeparture = new Promise((resolve) => { releaseScanner = resolve; });
  const task = sortItem(item, card, scan, token, previousJunction, releaseJunction, previousApproach, releaseApproach, releaseScanner);
  sortingTasks.add(task);
  task.catch((error) => {
    if (token !== generation) return;
    cancelPendingRetry(item);
    card.remove();
    running = false;
    setStatus("status.workerStopped", { error: error.message }, true);
    setAssistantState("review", "mascot.stopped");
  }).finally(() => {
    if (token !== generation) return;
    sortingTasks.delete(task);
    refreshControls();
    finishRoundIfIdle();
  });
  refreshControls();
  return scannerDeparture;
}

function ensureWorker() {
  // A card can be scanned while an earlier card waits before the junction.
  if (worker || !running || !beltCards.length) return;
  const cardWidth = beltCards[0].card.offsetWidth;
  const stage = $("sorter-stage").getBoundingClientRect();
  const scanner = $("scanner").getBoundingClientRect();
  const stopX = scanner.left - stage.left + scanner.width / 2 - cardWidth / 2 - cardWidth - BELT_CARD_GAP_PX;
  if (beltCards[0].x < stopX - 0.5) return;
  const { item, card } = beltCards.shift();
  activeItem = item;
  refreshControls();
  worker = (async () => {
    let failed = false;
    const token = generation;
    try {
      const scan = await scanItem(item, card, token);
      if (token !== generation || !scan) return;
      releaseFromAnchor(card);
      $("sorter-stage").classList.remove("scanning");
      $("scanner-text").textContent = t("scannerWaiting");
      activeItem = null;
      await launchSort(item, card, scan, token);
    } catch (error) {
      if (token !== generation) return;
      failed = true;
      cancelPendingRetry(item);
      $("sorter-stage").classList.remove("scanning");
      $("scanner-text").textContent = t("scannerWaiting");
      setStatus("status.workerStopped", { error: error.message }, true);
      setAssistantState("review", "mascot.stopped");
      running = false;
    } finally {
      if (token !== generation) return;
      activeItem = null;
      worker = null;
      if (running && (queue.length || beltCards.length)) {
        ensureWorker();
        ensureBeltLoop();
      }
      else if (!running && !failed && (queue.length || beltCards.length)) {
        setAssistantState("queued", "mascot.paused");
      }
      refreshControls();
      finishRoundIfIdle();
    }
  })();
}

function clearAll() {
  generation++;
  running = false;
  if (beltFrame) cancelAnimationFrame(beltFrame);
  beltFrame = 0;
  previousBeltFrame = 0;
  lastBeltLaunch = -Infinity;
  uploadJobs = 0;
  uploadTail = Promise.resolve();
  beltCards = [];
  worker = null;
  for (const requestController of controllers) requestController.abort();
  controllers.clear();
  sortingTasks.clear();
  retrySources.clear();
  junctionTail = Promise.resolve();
  junctionReservations = 0;
  approachTail = Promise.resolve();
  cancelMotion();
  queue = [];
  selectedGalleryIds.clear();
  activeItem = null;
  processed = reviewed = evaluated = correct = 0;
  for (const key of Object.keys(counts)) {
    counts[key] = 0;
    $("count-" + key).textContent = t("countImages", { count: 0 });
    $("thumb-" + key).replaceChildren();
  }
  $("flying-layer").replaceChildren();
  $("scanner").querySelector(".scanning-card")?.remove();
  $("junction").querySelector(".waiting-card")?.remove();
  $("junction").classList.remove("decision-pending");
  clearResults();
  $("sorter-stage").classList.remove("scanning");
  $("scanner-text").textContent = t("scannerWaiting");
  for (const url of uploadUrls) URL.revokeObjectURL(url);
  uploadUrls.clear();
  refreshControls();
  setAssistantState("idle", "mascot.idle");
  setStatus("status.cleared");
}

async function addFiles(files) {
  const selectedFiles = [...files];
  if (!selectedFiles.length) return;
  const token = generation;
  uploadJobs++;
  refreshControls();
  // Serialize separate drops so compressed images enter the queue in selection order.
  const previousUpload = uploadTail;
  let finishUpload;
  uploadTail = new Promise((resolve) => { finishUpload = resolve; });
  let added = 0;
  let failed = false;
  try {
    await previousUpload;
    for (const file of selectedFiles) {
      if (token !== generation) return;
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 20 * 1024 * 1024) {
        setStatus("status.fileType", {}, true);
        failed = true;
        continue;
      }
      if (queue.length + beltCards.length + Number(Boolean(activeItem)) + sortingTasks.size >= QUEUE_LIMIT) {
        setStatus("status.queueLimit", { count: QUEUE_LIMIT }, true);
        failed = true;
        break;
      }
      try {
        if (file.size > UPLOAD_TARGET_BYTES) setStatus("status.compressing", { name: file.name });
        const uploadBlob = await compressUploadImage(file, UPLOAD_TARGET_BYTES);
        if (token !== generation) return;
        const url = URL.createObjectURL(uploadBlob);
        uploadUrls.add(url);
        if (enqueue({ name: file.name, url, uploadBlob, reference: null })) added++;
        else {
          uploadUrls.delete(url);
          URL.revokeObjectURL(url);
          failed = true;
        }
      } catch (error) {
        setStatus("status.compressFailed", { name: file.name, error: error.message }, true);
        failed = true;
      }
    }
  } finally {
    finishUpload();
    if (token === generation) {
      uploadJobs--;
      refreshControls();
      if (added && !failed) setStatus("status.filesAdded", { count: added });
    }
  }
}

$("sample").addEventListener("click", () => {
  const examples = SAMPLE_IDS.filter((id) => !selectedGalleryIds.has(id)).flatMap((id) => {
    const animal = animals.find((entry) => entry.id === id);
    return animal ? [{ name: animal.name, url: animal.image, reference: animal }] : [];
  });
  // Each visible group enters from right to left, matching its position on the belt.
  for (let index = 0; index < examples.length; index += VISIBLE_BELT_QUEUE_SIZE) {
    for (const item of examples.slice(index, index + VISIBLE_BELT_QUEUE_SIZE).reverse()) enqueue(item);
  }
});
$("upload").addEventListener("click", () => $("file-input").click());
$("file-input").addEventListener("change", (event) => {
  const files = [...event.target.files];
  event.target.value = "";
  void addFiles(files);
});
function startSorting() {
  if (!queue.length && !beltCards.length) return;
  running = true;
  setAssistantState("moving", "mascot.starting");
  refreshControls();
  setStatus("status.started");
  ensureWorker();
  ensureBeltLoop();
}

function retryFailedRecord(record) {
  if (!enqueue(record.item, true)) return false;
  retrySources.set(record.item, record);
  if (!running) startSorting();
  setStatus("status.retryQueued", { item: record.item });
  return true;
}

$("start").addEventListener("click", startSorting);
$("pause").addEventListener("click", () => {
  running = false;
  refreshControls();
  setStatus("status.paused");
});
$("clear").addEventListener("click", clearAll);
$("sorter-scroll").addEventListener("dragover", (event) => {
  event.preventDefault();
  $("sorter-scroll").classList.add("dragging");
});
$("sorter-scroll").addEventListener("dragleave", () => $("sorter-scroll").classList.remove("dragging"));
$("sorter-scroll").addEventListener("drop", (event) => {
  event.preventDefault();
  $("sorter-scroll").classList.remove("dragging");
  void addFiles([...event.dataTransfer.files]);
});
window.addEventListener("pagehide", () => {
  generation++;
  for (const requestController of controllers) requestController.abort();
  for (const url of uploadUrls) URL.revokeObjectURL(url);
});

async function initialize() {
  try {
    const [galleryResponse, healthResponse] = await Promise.all([fetch("/v1/gallery"), fetch("/health")]);
    if (!galleryResponse.ok || !healthResponse.ok) throw new Error(t("status.loadingError"));
    animals = (await galleryResponse.json()).animals;
    setResultAnimals(animals);
    const health = await healthResponse.json();
    $("health").classList.add(health.mock ? "mock" : health.ready ? "ready" : "error");
    healthState = health.mock ? "healthMock" : health.ready ? "healthReady" : "healthError";
    renderHealth();
    renderFilters(animals, enqueue);
    renderGallery(animals, enqueue);
    refreshControls();
  } catch (error) {
    $("health").classList.add("error");
    healthState = "healthUnavailable";
    renderHealth();
    setAssistantState("review", "mascot.serviceError");
    setStatus("status.loadingError", {}, true);
  }
}
onLanguageChange(() => {
  refreshControls();
  renderStatus();
  renderHealth();
  $("scanner-text").textContent = t($("sorter-stage").classList.contains("scanning") ? "scannerRunning" : "scannerWaiting");
  document.querySelectorAll(".bin-thumbs img").forEach((image) => {
    const animal = animals.find((entry) => entry.id === image.dataset.animalId);
    const name = animal ? animalName(animal) : image.dataset.uploadName;
    image.alt = name;
    image.title = `${t("detailsItem", { name })} · #${String(Number(image.dataset.recordIndex) + 1).padStart(3, "0")}`;
  });
});

initializePreferences();
setAssistantState("idle", "mascot.idle");
renderStatus();
$("scanner-text").textContent = t("scannerWaiting");
initializeMotion(() => generation);
initializeScrollAssistant();
initializeViewer();
initializeResults(retryFailedRecord);
initialize();
