import { $, categories, categoryKeys } from "./shared.js";
import { openViewer } from "./viewer.js?v=preview1";
import { animalName, itemName, onLanguageChange, t } from "./i18n.js?v=retry1";

const binKeys = [...categoryKeys, "review"];
const records = [];
let animals = [];
let selectedBinKey = null;
let selectedRecord = null;
let displayedImage = null;
let displayedRecord = null;
let retryHandler = null;

export function setResultAnimals(value) {
  animals = value;
}

function evidenceSummary(evidence) {
  if (typeof evidence === "string") return evidence;
  if (typeof evidence?.summary === "string") return evidence.summary;
  if (typeof evidence?.description === "string") return evidence.description;
  return evidence == null ? t("noEvidence") : JSON.stringify(evidence);
}

function previewImage(item, animal) {
  return {
    name: item.name,
    id: item.reference?.id,
    image: item.url,
    category: animal?.category ?? "review"
  };
}

function showResult(item, result, historical = false) {
  const failed = Boolean(result.error);
  const animal = failed || result.metrics?.mock ? null : animals.find((entry) => entry.id === result.choice);
  displayedRecord = records.findLast((record) => !record.superseded && record.item === item && record.result === result) ?? null;
  $("result-empty").hidden = true;
  $("result-content").hidden = false;
  $("result-heading").textContent = t(historical ? "resultDetails" : "recentResult");
  $("result-state").textContent = t(failed ? "stateFailed" : result.metrics?.mock ? "stateMock" : animal ? "stateComplete" : "category.review");
  $("result-state").className = "state-badge " + (failed || !animal ? "unknown" : "done");
  $("result-image").src = item.url;
  $("result-image").alt = t("resultImage", { name: itemName(item) });
  $("result-preview").setAttribute("aria-label", t("previewItem", { name: itemName(item) }));
  displayedImage = previewImage(item, animal);
  $("result-source").textContent = itemName(item);
  $("result-name").textContent = animal ? animalName(animal) : t("category.review");
  $("category-tag").textContent = animal ? categories[animal.category] : t("noReliableLabel");
  const retryButton = $("retry-result");
  retryButton.hidden = !failed;
  retryButton.disabled = Boolean(displayedRecord?.retrying);
  retryButton.textContent = t(displayedRecord?.retrying ? "retryingRecognition" : "retryRecognition");
  $("evidence-text").textContent = result.metrics?.mock ? t("mockEvidence") : result.evidence ? evidenceSummary(result.evidence) : result.error ?? t("noEvidence");
  $("decision-json").textContent = result.decision == null
    ? result.error && result.evidence ? JSON.stringify({ error: result.error }, null, 2) : t("noDecision")
    : JSON.stringify(result.decision, null, 2);
  $("vision-time").textContent = result.metrics?.vision_ms == null ? "—" : result.metrics.vision_ms + " ms";
  $("jev-time").textContent = result.metrics?.jev_ms == null ? "—" : result.metrics.jev_ms + " ms";
  $("total-time").textContent = result.metrics?.elapsed_ms == null ? "—" : result.metrics.elapsed_ms + " ms";
  const evaluation = $("accuracy-tag");
  evaluation.hidden = !item.reference || !animal || result.metrics?.mock;
  if (!evaluation.hidden) {
    const matched = item.reference.id === animal.id;
    evaluation.textContent = matched ? t("annotationMatch") : t("annotationMismatch", { name: animalName(item.reference) });
    evaluation.className = "accuracy-tag " + (matched ? "match" : "mismatch");
  }
}

function closeBinDetails() {
  selectedBinKey = null;
  if ($("bin-details").open) $("bin-details").close();
  for (const key of binKeys) $("bin-" + key).setAttribute("aria-expanded", "false");
}

function renderBinDetails() {
  if (!selectedBinKey) return;
  const matching = records.filter((record) => !record.superseded && record.binKey === selectedBinKey).reverse();
  $("bin-details-title").textContent = t(`category.${selectedBinKey}`) + " · " + t("countImages", { count: matching.length });
  $("bin-details-hint").hidden = matching.length < 2;
  const list = $("bin-details-list");
  list.replaceChildren();
  if (!matching.length) {
    const empty = document.createElement("p");
    empty.className = "bin-details-empty";
    empty.textContent = t("emptyBin");
    list.append(empty);
    return;
  }
  for (const record of matching) {
    const entry = document.createElement("div");
    entry.className = "bin-detail-entry";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "bin-detail-item" + (record === (selectedRecord ?? records.at(-1)) ? " selected" : "");
    button.setAttribute("aria-label", t("detailsItem", { name: itemName(record.item) }));
    button.setAttribute("aria-pressed", String(record === (selectedRecord ?? records.at(-1))));
    const order = document.createElement("span");
    order.className = "record-order";
    order.textContent = String(record.sequence).padStart(3, "0");
    const image = document.createElement("img");
    image.src = record.item.url;
    image.alt = "";
    const text = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = itemName(record.item);
    const detail = document.createElement("small");
    const animal = record.binKey === "review" ? null : animals.find((entry) => entry.id === record.result.choice);
    detail.textContent = record.result.error ? t("failedReview") :
      record.result.metrics?.mock ? t("mockReview") : animal ? animalName(animal) : t("category.review");
    text.append(name, detail);
    button.append(order, image, text);
    button.addEventListener("click", () => {
      closeBinDetails();
      selectRecord(record);
    });
    entry.append(button);
    if (record.result.error) {
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "soft-button bin-retry-button";
      retry.textContent = t(record.retrying ? "retryingRecognition" : "retryRecognition");
      retry.disabled = Boolean(record.retrying);
      retry.addEventListener("click", () => requestRetry(record));
      entry.append(retry);
    }
    list.append(entry);
  }
}

function requestRetry(record) {
  if (!record?.result.error || record.retrying || !retryHandler) return;
  if (!retryHandler(record)) {
    closeBinDetails();
    return;
  }
  record.retrying = true;
  if (displayedRecord === record) showResult(record.item, record.result, true);
  closeBinDetails();
}

export function cancelResultRetry(record) {
  record.retrying = false;
  if (displayedRecord === record) showResult(record.item, record.result, true);
  renderBinDetails();
}

export function supersedeResult(record) {
  // Keep record indexes stable for thumbnails and activity rows from other images.
  record.superseded = true;
  const index = records.indexOf(record);
  document.querySelectorAll(`.bin-thumbs img[data-record-index="${index}"]`).forEach((image) => image.remove());
  $("feed").querySelector(`.feed-row[data-record-index="${index}"]`)?.remove();
  if (selectedRecord === record) selectedRecord = null;
  renderBinDetails();
}

function updateFeedSelection() {
  const currentIndex = records.indexOf(selectedRecord ?? records.at(-1));
  for (const row of $("feed").querySelectorAll(".feed-row")) {
    const selected = Number(row.dataset.recordIndex) === currentIndex;
    row.classList.toggle("selected", selected);
    row.setAttribute("aria-pressed", String(selected));
  }
  syncBinThumbnailSelection();
}

export function syncBinThumbnailSelection() {
  const currentIndex = records.indexOf(selectedRecord ?? records.at(-1));
  for (const thumb of document.querySelectorAll(".bin-thumbs img")) {
    thumb.classList.toggle("selected", Number(thumb.dataset.recordIndex) === currentIndex);
  }
}

function selectRecord(record) {
  // An explicit choice stays fixed while later images continue sorting.
  selectedRecord = record;
  showResult(record.item, record.result, true);
  $("decision-json").parentElement.open = true;
  renderBinDetails();
  updateFeedSelection();
  $("result-heading").scrollIntoView({ behavior: "smooth", block: "start" });
}

function addFeed(record, index) {
  $("feed").querySelector(".feed-empty")?.remove();
  const { item, result, binKey } = record;
  const row = document.createElement("button");
  row.type = "button";
  row.className = "feed-row";
  row.dataset.recordIndex = String(index);
  row.setAttribute("aria-label", t("detailsItem", { name: itemName(item) }));
  row.setAttribute("aria-controls", "result-content");
  const order = document.createElement("span");
  order.className = "record-order";
  order.textContent = String(record.sequence).padStart(3, "0");
  const image = document.createElement("img");
  image.src = item.url;
  image.alt = "";
  const text = document.createElement("div");
  const title = document.createElement("strong");
  const animal = binKey === "review" ? null : animals.find((entry) => entry.id === result.choice);
  title.textContent = itemName(item) + " → " + (animal ? animalName(animal) : t("category.review"));
  const detail = document.createElement("small");
  detail.textContent = result.error ? result.error : result.metrics?.mock ?
    t("mockNoRecognition") : categories[binKey] ?? t("unknownCategory");
  text.append(title, detail);
  row.append(order, image, text);
  row.addEventListener("click", () => selectRecord(record));
  $("feed").prepend(row);
}

export function recordResult(item, result, binKey) {
  const record = { item, result, binKey, sequence: records.length + 1 };
  records.push(record);
  if (!selectedRecord) showResult(item, result);
  renderBinDetails();
  addFeed(record, records.length - 1);
  updateFeedSelection();
  return records.length - 1;
}

export function clearResults() {
  records.length = 0;
  selectedRecord = null;
  displayedImage = null;
  displayedRecord = null;
  closeBinDetails();
  renderFeed();
  $("result-empty").hidden = false;
  $("result-content").hidden = true;
  $("decision-json").parentElement.open = false;
  $("result-state").textContent = t("resultWaiting");
  $("result-state").className = "state-badge";
  $("result-heading").textContent = t("recentResult");
}

function renderFeed() {
  $("feed").replaceChildren();
  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "feed-empty";
    empty.textContent = t("feedEmpty");
    $("feed").append(empty);
    return;
  }
  records.forEach((record, index) => {
    if (!record.superseded) addFeed(record, index);
  });
  updateFeedSelection();
}

onLanguageChange(() => {
  if (records.length) {
    const shown = selectedRecord ?? records.at(-1);
    showResult(shown.item, shown.result, Boolean(selectedRecord));
  } else {
    $("result-heading").textContent = t("recentResult");
    $("result-state").textContent = t("resultWaiting");
  }
  renderBinDetails();
  renderFeed();
});

export function initializeResults(onRetry) {
  retryHandler = onRetry;
  $("result-preview").addEventListener("click", () => {
    if (displayedImage) openViewer(displayedImage);
  });
  $("retry-result").addEventListener("click", () => requestRetry(displayedRecord));
  for (const key of binKeys) {
    $("bin-" + key).addEventListener("click", () => {
      const matching = records.filter((record) => !record.superseded && record.binKey === key);
      if (matching.length === 1) {
        selectRecord(matching[0]);
        return;
      }
      // A category with multiple results opens a track so every image can be chosen reliably.
      selectedBinKey = key;
      for (const binKey of binKeys) $("bin-" + binKey).setAttribute("aria-expanded", String(binKey === key));
      renderBinDetails();
      $("bin-details").showModal();
      $("bin-details-list").querySelector("button")?.focus();
    });
  }
  $("close-bin-details").addEventListener("click", closeBinDetails);
  $("bin-details").addEventListener("close", () => {
    // A delayed close event must not dismiss a picker reopened immediately afterward.
    if (!$("bin-details").open) closeBinDetails();
  });
  clearResults();
}
