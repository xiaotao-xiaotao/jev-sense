import { t } from "./i18n.js";

const $ = (id) => document.getElementById(id);
const categories = {
  get all() { return t("category.all"); }, get mammal() { return t("category.mammal"); },
  get bird() { return t("category.bird"); }, get reptile() { return t("category.reptile"); },
  get amphibian() { return t("category.amphibian"); }, get fish() { return t("category.fish"); },
  get insect() { return t("category.insect"); }
};
const categoryKeys = Object.keys(categories).filter((key) => key !== "all");
const QUEUE_LIMIT = 20;
const SAMPLE_IDS = ["fox", "owl", "chameleon", "frog", "clownfish", "butterfly"];

export { $, categories, categoryKeys, QUEUE_LIMIT, SAMPLE_IDS };
