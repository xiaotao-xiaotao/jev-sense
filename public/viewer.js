import { $, categories } from "./shared.js";
import { animalName, onLanguageChange, t } from "./i18n.js";

const VIEWER_MIN_ZOOM = 1;
const VIEWER_MAX_ZOOM = 5;
const VIEWER_ZOOM_STEP = 0.25;
let viewerScale = VIEWER_MIN_ZOOM;
let viewerX = 0;
let viewerY = 0;
let viewerPointerId = null;
let viewerLastX = 0;
let viewerLastY = 0;
let currentViewerItem = null;

function refreshViewerLabels() {
  if (!currentViewerItem) return;
  const name = currentViewerItem.id ? animalName(currentViewerItem) : currentViewerItem.name;
  $("viewer-title").textContent = name;
  $("viewer-category").textContent = currentViewerItem.category === "review" ? t("category.review") :
    categories[currentViewerItem.category] ?? currentViewerItem.label ?? t("viewerTitle");
  $("viewer-image").alt = name;
}

onLanguageChange(refreshViewerLabels);

function clampViewerPan() {
  const stage = $("viewer-stage");
  const image = $("viewer-image");
  if (!image.naturalWidth || !stage.clientWidth || !stage.clientHeight) {
    viewerX = viewerY = 0;
    return;
  }
  // The image uses object-fit: contain; clamp against its visible bounds, not the full image element.
  const fit = Math.min(stage.clientWidth / image.naturalWidth, stage.clientHeight / image.naturalHeight);
  const maxX = Math.max(0, (image.naturalWidth * fit * viewerScale - stage.clientWidth) / 2);
  const maxY = Math.max(0, (image.naturalHeight * fit * viewerScale - stage.clientHeight) / 2);
  viewerX = Math.max(-maxX, Math.min(maxX, viewerX));
  viewerY = Math.max(-maxY, Math.min(maxY, viewerY));
}

function updateViewer() {
  clampViewerPan();
  $("viewer-image").style.transform = `translate(${viewerX}px, ${viewerY}px) scale(${viewerScale})`;
  $("viewer-zoom").textContent = Math.round(viewerScale * 100) + "%";
  $("viewer-zoom-out").disabled = viewerScale <= VIEWER_MIN_ZOOM;
  $("viewer-zoom-in").disabled = viewerScale >= VIEWER_MAX_ZOOM;
  $("viewer-stage").classList.toggle("zoomed", viewerScale > VIEWER_MIN_ZOOM);
}

function setViewerZoom(nextScale, clientX, clientY) {
  nextScale = Math.max(VIEWER_MIN_ZOOM, Math.min(VIEWER_MAX_ZOOM, nextScale));
  if (nextScale === viewerScale) return;
  const stage = $("viewer-stage");
  const rect = stage.getBoundingClientRect();
  const focusX = clientX == null ? 0 : clientX - rect.left - rect.width / 2;
  const focusY = clientY == null ? 0 : clientY - rect.top - rect.height / 2;
  const ratio = nextScale / viewerScale;
  viewerX = focusX - (focusX - viewerX) * ratio;
  viewerY = focusY - (focusY - viewerY) * ratio;
  viewerScale = nextScale;
  updateViewer();
}

function resetViewer() {
  viewerScale = VIEWER_MIN_ZOOM;
  viewerX = viewerY = 0;
  updateViewer();
}

export function openViewer(animal) {
  currentViewerItem = animal;
  refreshViewerLabels();
  $("viewer-image").src = animal.image;
  $("image-viewer").showModal();
  resetViewer();
}

export function initializeViewer() {
  $("viewer-close").addEventListener("click", () => $("image-viewer").close());
  $("image-viewer").addEventListener("click", (event) => {
    if (event.target === $("image-viewer")) $("image-viewer").close();
  });
  $("image-viewer").addEventListener("close", () => {
    viewerPointerId = null;
    $("viewer-stage").classList.remove("dragging");
  });
  $("viewer-image").addEventListener("load", updateViewer);
  $("viewer-zoom-in").addEventListener("click", () => setViewerZoom(viewerScale + VIEWER_ZOOM_STEP));
  $("viewer-zoom-out").addEventListener("click", () => setViewerZoom(viewerScale - VIEWER_ZOOM_STEP));
  $("viewer-reset").addEventListener("click", resetViewer);
  $("viewer-stage").addEventListener("wheel", (event) => {
    event.preventDefault();
    setViewerZoom(viewerScale + (event.deltaY < 0 ? VIEWER_ZOOM_STEP : -VIEWER_ZOOM_STEP), event.clientX, event.clientY);
  }, { passive: false });
  $("viewer-stage").addEventListener("pointerdown", (event) => {
    if (viewerScale <= VIEWER_MIN_ZOOM || event.button !== 0) return;
    viewerPointerId = event.pointerId;
    viewerLastX = event.clientX;
    viewerLastY = event.clientY;
    $("viewer-stage").setPointerCapture(event.pointerId);
    $("viewer-stage").classList.add("dragging");
    event.preventDefault();
  });
  $("viewer-stage").addEventListener("pointermove", (event) => {
    if (event.pointerId !== viewerPointerId) return;
    viewerX += event.clientX - viewerLastX;
    viewerY += event.clientY - viewerLastY;
    viewerLastX = event.clientX;
    viewerLastY = event.clientY;
    updateViewer();
  });
  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    $("viewer-stage").addEventListener(eventName, (event) => {
      if (event.pointerId !== viewerPointerId) return;
      viewerPointerId = null;
      $("viewer-stage").classList.remove("dragging");
    });
  }
  window.addEventListener("resize", () => {
    if ($("image-viewer").open) updateViewer();
  });
}
