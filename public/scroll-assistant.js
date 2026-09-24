import { onLanguageChange, t } from "./i18n.js";

const chapters = [
  { id: "sorter", key: "sideSort", shortKey: "railSort" },
  { id: "results", key: "recentResult", shortKey: "railResults" },
  { id: "gallery", key: "sideGallery", shortKey: "railGallery" }
];
let assistantMessage = { key: "mascot.idle", values: {} };

function paintAssistantMessage() {
  const values = { ...assistantMessage.values };
  if (values.binKey) values.category = t(`category.${values.binKey}`);
  document.getElementById("mascot-message").textContent = t(assistantMessage.key, values);
}

onLanguageChange(paintAssistantMessage);

function initializeMascotGaze() {
  const mascot = document.querySelector("#intro-mascot .mascot-hero");
  let frame = 0;
  let hasPointer = false;
  let mouseX = 0;
  let mouseY = 0;

  function updateGaze() {
    frame = 0;
    const bounds = mascot.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const x = Math.max(-6, Math.min(6, (mouseX - bounds.left - bounds.width / 2) / bounds.width * 12));
    // 向上留出更明显的视线变化；向下收窄，避免眼睛贴近嘴部。
    const y = Math.max(-11, Math.min(6, (mouseY - bounds.top - bounds.height / 2) / bounds.height * 22));
    // CSS variables pass into this SVG use instance, leaving the rail mascot centered.
    mascot.style.setProperty("--gaze-x", `${x.toFixed(2)}px`);
    mascot.style.setProperty("--gaze-y", `${y.toFixed(2)}px`);
  }

  function scheduleGaze() {
    if (hasPointer && !frame) frame = requestAnimationFrame(updateGaze);
  }

  window.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    hasPointer = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
    scheduleGaze();
  }, { passive: true });
  window.addEventListener("scroll", scheduleGaze, { passive: true });
  window.addEventListener("resize", scheduleGaze);
  document.addEventListener("mouseleave", () => {
    hasPointer = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    mascot.style.removeProperty("--gaze-x");
    mascot.style.removeProperty("--gaze-y");
  });
}

export function setAssistantState(state, key, values = {}) {
  const hero = document.getElementById("intro-mascot");
  const rail = document.getElementById("page-rail");
  hero.dataset.state = state;
  rail.dataset.state = state;
  assistantMessage = { key, values };
  paintAssistantMessage();
}

export function initializeScrollAssistant() {
  initializeMascotGaze();
  const rail = document.getElementById("page-rail");
  const track = document.getElementById("page-rail-track");
  const thumb = document.getElementById("page-rail-thumb");
  const fill = document.getElementById("page-rail-fill");
  const percent = document.getElementById("rail-percent");
  document.documentElement.classList.add("has-page-rail");
  let pointerId = null;
  let grabOffset = 0;
  let frame = 0;

  const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const limits = () => {
    const half = thumb.offsetHeight / 2;
    return { start: half, range: Math.max(1, track.clientHeight - thumb.offsetHeight) };
  };
  const activeChapter = () => {
    let active = 0;
    chapters.forEach((chapter, index) => {
      if (document.getElementById(chapter.id).getBoundingClientRect().top <= window.innerHeight * .4) active = index;
    });
    return active;
  };

  function paint(ratio) {
    const { start, range } = limits();
    const top = start + ratio * range;
    thumb.style.top = `${top}px`;
    fill.style.height = `${top}px`;
    const index = activeChapter();
    const percentage = Math.round(ratio * 100);
    thumb.setAttribute("aria-valuenow", String(percentage));
    thumb.setAttribute("aria-valuetext", `${t(chapters[index].key)} · ${percentage}%`);
    percent.textContent = `${percentage}%`;
    document.getElementById("rail-current").textContent = t(chapters[index].shortKey);
  }

  function sync() {
    frame = 0;
    const max = maxScroll();
    rail.hidden = max < 100;
    if (rail.hidden) return;
    paint(max ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
  }

  function scheduleSync() {
    if (!frame) frame = requestAnimationFrame(sync);
  }

  function scrollToRatio(ratio) {
    const bounded = Math.min(1, Math.max(0, ratio));
    // While dragging, keep the robot under the pointer even if scroll events arrive later.
    paint(bounded);
    window.scrollTo({ top: bounded * maxScroll(), behavior: "auto" });
  }

  function pointerRatio(clientY) {
    const { start, range } = limits();
    return (clientY - track.getBoundingClientRect().top - grabOffset - start) / range;
  }

  track.addEventListener("pointerdown", (event) => {
    if (pointerId !== null || event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    const thumbRect = thumb.getBoundingClientRect();
    grabOffset = thumb.contains(event.target) ? event.clientY - thumbRect.top - thumbRect.height / 2 : 0;
    pointerId = event.pointerId;
    track.setPointerCapture(pointerId);
    document.documentElement.classList.add("rail-dragging");
    thumb.focus({ preventScroll: true });
    scrollToRatio(pointerRatio(event.clientY));
  });
  track.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return;
    event.preventDefault();
    scrollToRatio(pointerRatio(event.clientY));
  });
  const endPointer = (event) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    grabOffset = 0;
    document.documentElement.classList.remove("rail-dragging");
    scheduleSync();
  };
  track.addEventListener("pointerup", endPointer);
  track.addEventListener("pointercancel", endPointer);
  track.addEventListener("lostpointercapture", endPointer);

  thumb.addEventListener("keydown", (event) => {
    const current = maxScroll() ? window.scrollY / maxScroll() : 0;
    const step = event.key === "PageUp" || event.key === "PageDown" ? .2 : .05;
    let next;
    if (event.key === "ArrowDown" || event.key === "PageDown") next = current + step;
    else if (event.key === "ArrowUp" || event.key === "PageUp") next = current - step;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 1;
    else return;
    event.preventDefault();
    document.documentElement.classList.add("rail-dragging");
    scrollToRatio(next);
    document.documentElement.classList.remove("rail-dragging");
  });

  window.addEventListener("scroll", scheduleSync, { passive: true });
  window.addEventListener("resize", scheduleSync);
  onLanguageChange(scheduleSync);
  if (window.ResizeObserver) new ResizeObserver(scheduleSync).observe(document.body);
  scheduleSync();
}
