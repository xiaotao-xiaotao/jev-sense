import { $ } from "./shared.js";
import { t } from "./i18n.js";

// Match the belt stripe animation: 56 px per roughly 0.58 s.
export const BELT_SPEED_PX_PER_SECOND = 96;
const activeAnimations = new Set();
let getGeneration = () => 0;

export function initializeMotion(readGeneration) {
  getGeneration = readGeneration;
}

export function cancelMotion() {
  for (const animation of activeAnimations) animation.cancel();
  activeAnimations.clear();
}

export function imageToDataUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      // Compress at the scanner, so queued images do not retain large Base64 strings.
      const scale = Math.min(1, 448 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => reject(new Error(t("error.imageRead")));
    image.src = url;
  });
}

function targetPoint(element, card) {
  const stage = $("sorter-stage").getBoundingClientRect();
  const target = element.getBoundingClientRect();
  return {
    x: target.left - stage.left + target.width / 2 - card.offsetWidth / 2,
    y: target.top - stage.top + target.height / 2 - card.offsetHeight / 2
  };
}

export function makeFlyingCard(item) {
  const card = document.createElement("div");
  card.className = "flying-card";
  const image = document.createElement("img");
  image.src = item.url;
  image.alt = "";
  card.append(image);
  $("flying-layer").append(card);
  const start = targetPoint($("intake"), card);
  card.style.left = start.x + "px";
  card.style.top = start.y + "px";
  return card;
}

export function flyAlongBelt(card, target, token) {
  const destination = targetPoint(target, card);
  const dx = destination.x - Number.parseFloat(card.style.left);
  const dy = destination.y - Number.parseFloat(card.style.top);
  const duration = Math.round(Math.hypot(dx, dy) / BELT_SPEED_PX_PER_SECOND * 1000);
  return flyTo(card, target, duration, token, "linear");
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result) : reject(new Error(t("error.imageRead")));
    reader.onerror = () => reject(new Error(t("error.imageRead")));
    reader.readAsDataURL(blob);
  });
}

export async function compressUploadImage(file, maxBytes) {
  if (file.size <= maxBytes) return file;
  const sourceUrl = URL.createObjectURL(file);
  const image = await new Promise((resolve, reject) => {
    const loaded = new Image();
    loaded.onload = () => {
      URL.revokeObjectURL(sourceUrl);
      resolve(loaded);
    };
    loaded.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error(t("error.imageRead")));
    };
    loaded.src = sourceUrl;
  });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error(t("error.imageCompress"));
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  if (!longestSide) throw new Error(t("error.imageRead"));
  let edge = Math.min(960, longestSide);
  while (edge > 0) {
    const scale = edge / longestSide;
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    // JPEG keeps upload and model payloads small; flatten transparent images onto white.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.72, 0.6]) {
      const compressed = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (compressed?.size < maxBytes) return compressed;
    }
    if (edge <= 32) break;
    edge = Math.max(32, Math.floor(edge * 0.8));
  }
  throw new Error(t("error.imageCompress"));
}

export async function flyTo(card, target, duration, token, easing = "cubic-bezier(.22,.7,.2,1)") {
  const destination = targetPoint(target, card);
  const x = Number.parseFloat(card.style.left);
  const y = Number.parseFloat(card.style.top);
  const dx = destination.x - x;
  const dy = destination.y - y;
  const animation = card.animate([
    { transform: "translate(0, 0) scale(1)" },
    { transform: "translate(" + dx + "px, " + dy + "px) scale(" + (target.classList.contains("bin") ? ".75" : "1") + ")" }
  ], { duration, easing, fill: "forwards" });
  activeAnimations.add(animation);
  try {
    await animation.finished;
  } catch {
    return;
  } finally {
    activeAnimations.delete(animation);
  }
  if (token !== getGeneration()) return;
  // Browser zoom can change the stage geometry while the animation is running.
  const settled = targetPoint(target, card);
  card.style.left = settled.x + "px";
  card.style.top = settled.y + "px";
  animation.cancel();
}

export function pinToScanner(card) {
  // Keep the image anchored to the scanner during slow model requests and page zoom.
  card.style.left = "";
  card.style.top = "";
  card.classList.add("scanning-card");
  $("scanner").append(card);
}

export function pinToJunction(card) {
  card.style.left = "";
  card.style.top = "";
  card.classList.add("waiting-card");
  $("junction").append(card);
}

export function releaseFromAnchor(card) {
  const imageRect = card.getBoundingClientRect();
  const stageRect = $("sorter-stage").getBoundingClientRect();
  card.classList.remove("scanning-card", "waiting-card");
  $("flying-layer").append(card);
  card.style.left = imageRect.left - stageRect.left + "px";
  card.style.top = imageRect.top - stageRect.top + "px";
}

