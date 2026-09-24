import { $, categories } from "./shared.js";
import { openViewer } from "./viewer.js?v=preview1";
import { animalName, onLanguageChange, t } from "./i18n.js";

let activeFilter = "all";
let currentAnimals = [];
let enqueueItem = null;
let selectedIds = new Set();

function updateGalleryCards() {
  for (const card of $("gallery-grid").querySelectorAll(".animal-card")) {
    const selected = selectedIds.has(card.dataset.animalId);
    card.classList.toggle("is-added", selected);
    const add = card.querySelector(".card-add");
    add.disabled = selected;
    add.textContent = selected ? "✓" : "+";
    add.setAttribute("aria-label", t(selected ? "galleryAlreadyAdded" : "addItem", { name: card.dataset.animalName }));
    card.querySelector(".card-added-label").hidden = !selected;
    card.querySelector(".card-added-label").textContent = t("galleryAdded");
  }
}

export function syncGallerySelection(ids) {
  selectedIds = new Set(ids);
  updateGalleryCards();
}

onLanguageChange(() => {
  if (enqueueItem) {
    renderFilters(currentAnimals, enqueueItem);
    renderGallery(currentAnimals, enqueueItem);
  }
});

export function renderFilters(animals, onEnqueue) {
  currentAnimals = animals;
  enqueueItem = onEnqueue;
  const root = $("filters");
  root.replaceChildren();
  for (const [key, name] of Object.entries(categories)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter" + (activeFilter === key ? " active" : "");
    button.textContent = name;
    button.addEventListener("click", () => {
      activeFilter = key;
      renderFilters(animals, onEnqueue);
      renderGallery(animals, onEnqueue);
    });
    root.append(button);
  }
}

export function renderGallery(animals, onEnqueue) {
  const root = $("gallery-grid");
  root.replaceChildren();
  const visible = animals.filter((animal) => activeFilter === "all" || animal.category === activeFilter);
  $("gallery-count").textContent = t("imageCount", { count: visible.length });
  for (const [index, animal] of visible.entries()) {
    const card = document.createElement("div");
    card.className = "animal-card";
    card.dataset.animalId = animal.id;
    card.dataset.animalName = animalName(animal);
    const imageWrap = document.createElement("div");
    imageWrap.className = "card-image";
    const preview = document.createElement("button");
    preview.type = "button";
    preview.className = "card-preview";
    preview.setAttribute("aria-label", t("previewItem", { name: animalName(animal) }));
    preview.setAttribute("aria-haspopup", "dialog");
    const image = document.createElement("img");
    image.src = animal.image;
    image.alt = animalName(animal);
    image.loading = index < 8 ? "eager" : "lazy";
    preview.append(image);
    preview.addEventListener("click", () => openViewer(animal));
    const add = document.createElement("button");
    add.type = "button";
    add.className = "card-add";
    add.textContent = "+";
    add.setAttribute("aria-label", t("addItem", { name: animalName(animal) }));
    add.addEventListener("click", () => onEnqueue({
      name: animal.name, url: animal.image, reference: animal
    }));
    const addedLabel = document.createElement("span");
    addedLabel.className = "card-added-label";
    imageWrap.append(preview, addedLabel, add);
    const info = document.createElement("div");
    info.className = "card-info";
    const name = document.createElement("strong");
    name.textContent = animalName(animal);
    const category = document.createElement("small");
    category.textContent = categories[animal.category];
    info.append(name, category);
    card.append(imageWrap, info);
    root.append(card);
  }
  updateGalleryCards();
}

