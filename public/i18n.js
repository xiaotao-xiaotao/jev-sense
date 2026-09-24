const messages = {
  en: {
    documentTitle: "Jev Sense · Image Sorting Conveyor",
    description: "Jev Sense live image recognition and sorting",
    workspace: "Workspace", animalSorting: "Image Sorting", lab: "Image Recognition Lab",
    workspaceLabel: "WORKSPACE", sideSort: "Live Sorting", sideGallery: "Image Gallery", sidebarCollapse: "Collapse sidebar", sidebarExpand: "Expand sidebar",
    sideTipTitle: "Vision-led sorting", sideTipBody: "Images pass the scanner. Cloudflare describes visible features; Jev decides where they belong.",
    healthChecking: "Checking services", healthMock: "Demo mode · images are not recognized", healthReady: "Vision model and Jev connected", healthError: "Configure Cloudflare and Jev", healthUnavailable: "Services unavailable",
    heroEyebrow: "VISION SYSTEM / 01", pipelineAria: "Vision to classification", pipelineVision: "01 / Vision", pipelineDecision: "02 / Decision", pipelineSorting: "03 / Sorting",
    heroLine1: "Let images pass the scanner,", heroLine2: "and find where they belong.",
    heroBody: "Choose several images from the gallery or upload your own. Start the belt to recognize each image and sort it into a category.",
    sorterTitle: "Image Sorting Conveyor", sample: "＋ Add 6 examples", upload: "↑ Upload images", start: "▶ Start AI sorting", pause: "Ⅱ Pause", clear: "Clear",
    pending: "Pending", processed: "Processed", accuracy: "Correct", review: "Needs review",
    inputHeader: "INPUT / IMAGES", outputHeader: "CLASSIFIED / OUTPUT", intake: "Drop zone", intakeHint: "Waiting for the belt", scanner: "AI scan", scannerWaiting: "Waiting for image", scannerRunning: "Recognizing…",
    queueTitle: "Waiting queue", queueHint: "Use ＋ on a gallery image or upload your own", initialStatus: "Add some images, then start AI sorting.",
    binDetails: "Category details", chooseBinImage: "Choose an image to view its recognition details.", retryRecognition: "↻ Retry recognition", retryingRecognition: "Queued for retry", close: "Close", recentResult: "Latest recognition", resultDetails: "Recognition details", resultWaiting: "Waiting for recognition",
    resultEmptyTitle: "Recognition records will appear here", resultEmptyBody: "Start the belt to see labels, categories and model evidence.",
    evidenceTitle: "Cloudflare visual evidence", rawDecision: "View raw Jev decision", visionTime: "Vision", totalTime: "Total", feedTitle: "Sorting activity", feedEmpty: "Waiting for the first image to pass the scanner…",
    galleryTitle: "Example image gallery", galleryHint: "Select an image to enlarge it. Use ＋ to add it to the queue. Added images are dimmed until you clear the belt.", galleryFilterAria: "Filter by image category", galleryAdded: "Added", galleryAlreadyAdded: "{{name}} is already added",
    viewerTitle: "Image preview", viewerClose: "Close image preview", viewerHint: "Scroll to zoom · Drag when enlarged", zoomOut: "Zoom out", zoomIn: "Zoom in", reset: "Reset",
    footer: "See the features, find the category", pageNav: "Page navigation", scrollPosition: "Page scroll position", jumpSort: "Jump to live sorting", jumpResults: "Jump to results", jumpGallery: "Jump to image gallery", railSort: "Sorting", railResults: "Results", railGallery: "Gallery",
    themeToDark: "Switch to dark mode", themeToLight: "Switch to light mode", languageToZh: "Switch to Chinese", languageToEn: "Switch to English",
    "category.all": "All", "category.mammal": "Mammals", "category.bird": "Birds", "category.reptile": "Reptiles", "category.amphibian": "Amphibians", "category.fish": "Fish", "category.insect": "Insects", "category.review": "Needs review",
    imageCount: "{{count}} images", countImages: "{{count}} images", removeItem: "Remove {{name}}", previewItem: "Enlarge {{name}}", addItem: "Add {{name}} to queue", resultImage: "Recognized image of {{name}}", detailsItem: "View recognition details for {{name}}",
    stateRecognizing: "Recognizing", stateRunning: "Running", stateQueued: "Queued", stateDone: "Completed", stateWaiting: "Waiting for images", stateFailed: "Recognition failed", stateMock: "Demo mode", stateComplete: "Recognized",
    noReliableLabel: "No reliable label", noEvidence: "No visual description returned", noDecision: "No decision returned", annotationMatch: "Matches gallery label", annotationMismatch: "Gallery label: {{name}}", emptyBin: "No records in this category yet.",
    failedReview: "Recognition failed · needs review", mockReview: "Demo mode · needs review", mockNoRecognition: "Demo mode did not recognize the image", unknownCategory: "Category uncertain", mockEvidence: "Demo mode does not inspect the image.",
    "mascot.idle": "Waiting for images", "mascot.queued": "Images are queued", "mascot.toScanner": "Heading to the scanner", "mascot.scanning": "Looking at the image", "mascot.toExit": "Heading to the sorting gate", "mascot.deciding": "Waiting for Jev", "mascot.review": "Check needs review", "mascot.sorted": "Sorted into {{category}}", "mascot.stopped": "Sorting stopped", "mascot.finished": "Round complete", "mascot.paused": "Paused · images remain queued", "mascot.starting": "Starting the belt", "mascot.serviceError": "Service unavailable",
    "status.removed": "Removed {{name}} from the queue.", "status.queueLimit": "The queue holds up to {{count}} images.", "status.added": "Added {{name}}; {{count}} waiting.", "status.alreadyAdded": "{{name}} is already added. Remove it from the queue or clear the belt to add it again.", "status.retryQueued": "Retrying recognition for {{name}}…", "status.visionFailed": "{{name}} failed recognition and needs review: {{error}}", "status.mockReview": "{{name}} needs review; demo mode does not recognize images.", "status.sorted": "{{name}} was sorted into {{category}}.",
    "status.toScanner": "{{name}} is moving toward the AI scanner…", "status.extracting": "Extracting visual features from {{name}}…", "status.visionToExit": "{{name}} has finished visual analysis and is moving toward the sorting gate while Jev decides.", "status.failedToExit": "Visual recognition failed for {{name}}; moving to needs review.", "status.waitDecision": "{{name}} reached the gate; waiting for Jev…", "status.workerStopped": "Sorting stopped: {{error}}", "status.roundDone": "Round complete: {{count}} images processed.", "status.cleared": "The belt is clear. You can add images again.",
    "status.fileType": "Only PNG, JPEG and WebP images under 20 MB are supported.", "status.filesAdded": "Added {{count}} uploaded images. Select Start to sort them.", "status.compressing": "Compressing {{name}} below 30 KB…", "status.compressFailed": "Could not compress {{name}}: {{error}}", "status.started": "The belt has started. Images will pass the scanner one by one.", "status.paused": "Paused. The current image will finish sorting first.", "status.loadingError": "Unable to load gallery or service status",
    "error.vision": "Visual recognition failed", "error.jev": "Jev classification failed", "error.general": "Recognition failed", "error.imageRead": "Image could not be read", "error.imageCompress": "Image could not be compressed below 30 KB"
  },
  zh: {
    documentTitle: "Jev Sense · 图像分类传送带", description: "Jev Sense 图像识别与动态分类",
    workspace: "工作空间", animalSorting: "图像分类", lab: "图像识别实验室", workspaceLabel: "工作空间", sideSort: "动态分类", sideGallery: "预置图库", sidebarCollapse: "收起侧边栏", sidebarExpand: "展开侧边栏",
    sideTipTitle: "视觉驱动分类", sideTipBody: "图片经过扫描点，Cloudflare 描述特征，Jev 决定归属。",
    healthChecking: "正在检查服务", healthMock: "模拟模式 · 不识别图片", healthReady: "视觉模型与 Jev 已连接", healthError: "请配置 Cloudflare 与 Jev", healthUnavailable: "服务未就绪",
    heroEyebrow: "视觉分类系统 / 01", pipelineAria: "从视觉识别到分类结果", pipelineVision: "01 / 视觉识别", pipelineDecision: "02 / 模型判定", pipelineSorting: "03 / 分类输出",
    heroLine1: "让图片经过扫描点，", heroLine2: "自己找到归属。", heroBody: "从图库点选多张图片，或一次上传多张。启动后，图片依次通过视觉识别，再动态进入对应类别。",
    sorterTitle: "图像分类传送带", sample: "＋ 加入 6 张示例", upload: "↑ 上传多张图片", start: "▶ 启动 AI 分类", pause: "Ⅱ 暂停", clear: "清空",
    pending: "待处理", processed: "已处理", accuracy: "分类正确", review: "待复核", inputHeader: "INPUT / 图像输入", outputHeader: "CLASSIFIED / 分类出口", intake: "投放口", intakeHint: "等待进入轨道", scanner: "AI 扫描", scannerWaiting: "等待图片", scannerRunning: "正在识别…",
    queueTitle: "等待队列", queueHint: "点击图库图片右下角＋或上传多张图片", initialStatus: "加入几张图片，然后启动 AI 分类。",
    binDetails: "分类详情", chooseBinImage: "选择一张图片，查看它的识别详情。", retryRecognition: "↻ 重新识别", retryingRecognition: "已加入重试队列", close: "关闭", recentResult: "最近一次识别", resultDetails: "识别详情", resultWaiting: "等待识别", resultEmptyTitle: "识别记录将在这里出现", resultEmptyBody: "启动传送带后可查看标签、类别与模型依据。",
    evidenceTitle: "Cloudflare 视觉线索", rawDecision: "查看 Jev 原始判定", visionTime: "视觉", totalTime: "总计", feedTitle: "分拣记录", feedEmpty: "等待第一张图片通过扫描点…",
    galleryTitle: "预置图片图库", galleryHint: "点击图片查看大图；点击右下角＋加入队列。已加入的图片会置灰，清空后恢复。", galleryFilterAria: "按图片类别筛选", galleryAdded: "已加入", galleryAlreadyAdded: "{{name}}已加入",
    viewerTitle: "图片预览", viewerClose: "关闭大图", viewerHint: "滚轮缩放 · 放大后拖动", zoomOut: "缩小", zoomIn: "放大", reset: "重置",
    footer: "看见特征，识别类别", pageNav: "页面导航", scrollPosition: "页面滚动位置", jumpSort: "跳转到动态分类", jumpResults: "跳转到识别结果", jumpGallery: "跳转到预置图库", railSort: "分类", railResults: "结果", railGallery: "图库",
    themeToDark: "切换到夜间模式", themeToLight: "切换到日间模式", languageToZh: "切换到中文", languageToEn: "切换到英文",
    "category.all": "全部", "category.mammal": "哺乳类", "category.bird": "鸟类", "category.reptile": "爬行类", "category.amphibian": "两栖类", "category.fish": "鱼类", "category.insect": "昆虫", "category.review": "待复核",
    imageCount: "{{count}} 张图片", countImages: "{{count}} 张", removeItem: "移除{{name}}", previewItem: "放大查看{{name}}", addItem: "将{{name}}加入队列", resultImage: "{{name}}的识别图片", detailsItem: "查看{{name}}的识别详情",
    stateRecognizing: "正在识别", stateRunning: "运行中", stateQueued: "已排队", stateDone: "已完成", stateWaiting: "等待投放", stateFailed: "识别失败", stateMock: "模拟模式", stateComplete: "识别完成",
    noReliableLabel: "暂无可靠标签", noEvidence: "未返回视觉描述", noDecision: "未返回结果", annotationMatch: "与图库标注一致", annotationMismatch: "图库标注：{{name}}", emptyBin: "该分类暂无识别记录。",
    failedReview: "识别失败 · 待复核", mockReview: "模拟模式 · 待复核", mockNoRecognition: "模拟模式未识别图片", unknownCategory: "无法确定类别", mockEvidence: "模拟模式不会识别图片。",
    "mascot.idle": "等待图片投放", "mascot.queued": "图片已排队", "mascot.toScanner": "正在前往扫描点", "mascot.scanning": "正在观察图片", "mascot.toExit": "正在前往分类出口", "mascot.deciding": "等待分类判定", "mascot.review": "请查看待复核", "mascot.sorted": "已分到{{category}}", "mascot.stopped": "处理已停止", "mascot.finished": "本轮分类完成", "mascot.paused": "已暂停，图片仍在队列", "mascot.starting": "准备启动传送带", "mascot.serviceError": "服务未就绪",
    "status.removed": "已从队列移除 {{name}}。", "status.queueLimit": "队列最多容纳 {{count}} 张图片。", "status.added": "已加入 {{name}}；待处理 {{count}} 张。", "status.alreadyAdded": "{{name}}已加入；从队列移除或清空后可再次加入。", "status.retryQueued": "正在重新识别 {{name}}…", "status.visionFailed": "{{name}} 识别失败，已进入待复核：{{error}}", "status.mockReview": "{{name}} 进入待复核；模拟模式不会识别图片。", "status.sorted": "{{name}} 已进入{{category}}。",
    "status.toScanner": "{{name}} 正沿传送带前往 AI 扫描点…", "status.extracting": "正在提取 {{name}} 的视觉特征…", "status.visionToExit": "{{name}} 视觉描述完成，正沿轨道驶向分拣闸口；Jev 同时判断。", "status.failedToExit": "{{name}} 视觉识别失败，继续驶向待复核出口。", "status.waitDecision": "{{name}} 已到末端闸口，等待 Jev 分类结果…", "status.workerStopped": "队列处理已停止：{{error}}", "status.roundDone": "本轮分类完成，共处理 {{count}} 张图片。", "status.cleared": "传送带已清空，可以重新投放图片。",
    "status.fileType": "仅支持 20 MB 以内的 PNG、JPEG、WebP 图片。", "status.filesAdded": "已投放 {{count}} 张上传图片；点击启动开始分类。", "status.compressing": "正在将 {{name}} 压缩到 30 KB 以下…", "status.compressFailed": "{{name}} 压缩失败：{{error}}", "status.started": "传送带已启动，图片会依次经过扫描点。", "status.paused": "已暂停；当前图片完成分类后停止。", "status.loadingError": "无法加载图库或服务状态",
    "error.vision": "视觉识别失败", "error.jev": "Jev 分类失败", "error.general": "识别失败", "error.imageRead": "图片无法读取", "error.imageCompress": "图片无法压缩到 30 KB 以下"
  }
};

const englishAnimalNames = {
  fox: "Fox", panda: "Giant panda", elephant: "Elephant", giraffe: "Giraffe", rabbit: "Rabbit", lion: "Lion", kangaroo: "Kangaroo", deer: "Deer", zebra: "Zebra", squirrel: "Squirrel", hedgehog: "Hedgehog", koala: "Koala",
  owl: "Owl", penguin: "Penguin", flamingo: "Flamingo", parrot: "Parrot", eagle: "Bald eagle", toucan: "Toucan", turtle: "Sea turtle", chameleon: "Chameleon", crocodile: "Crocodile", snake: "Green tree python", frog: "Frog", salamander: "Salamander", clownfish: "Clownfish", shark: "Shark", seahorse: "Seahorse", butterfly: "Butterfly", bee: "Bee", dragonfly: "Dragonfly"
};

export function getLanguage() { return document.documentElement.lang.startsWith("zh") ? "zh" : "en"; }
export function t(key, values = {}) {
  const template = messages[getLanguage()][key] ?? messages.en[key] ?? key;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => String(values[name] ?? ""));
}
export function animalName(animal) { return getLanguage() === "en" ? englishAnimalNames[animal.id] ?? animal.name : animal.name; }
export function itemName(item) { return item.reference ? animalName(item.reference) : item.name; }
export function onLanguageChange(callback) { window.addEventListener("jev:language", callback); }

function applyTranslations() {
  document.title = t("documentTitle");
  document.querySelector('meta[name="description"]').content = t("description");
  document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => { node.setAttribute("aria-label", t(node.dataset.i18nAria)); });
  document.querySelectorAll("[data-i18n-title]").forEach((node) => { node.title = t(node.dataset.i18nTitle); });
}

function paintButtons() {
  const dark = document.documentElement.dataset.theme === "dark";
  const themeButton = document.getElementById("theme-toggle");
  const langButton = document.getElementById("lang-toggle");
  const sidebarButton = document.getElementById("sidebar-toggle");
  const themeLabel = t(dark ? "themeToLight" : "themeToDark");
  themeButton.setAttribute("aria-label", themeLabel);
  themeButton.setAttribute("aria-pressed", String(dark));
  themeButton.title = themeLabel;
  const languageLabel = t(getLanguage() === "en" ? "languageToZh" : "languageToEn");
  langButton.setAttribute("aria-label", languageLabel);
  langButton.title = languageLabel;
  langButton.dataset.language = getLanguage();
  const collapsed = document.documentElement.dataset.sidebar === "collapsed";
  const sidebarLabel = t(collapsed ? "sidebarExpand" : "sidebarCollapse");
  sidebarButton.setAttribute("aria-label", sidebarLabel);
  sidebarButton.setAttribute("aria-expanded", String(!collapsed));
  sidebarButton.title = sidebarLabel;
}

function setLanguage(language, persist = true) {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  if (persist) try { localStorage.setItem("jev-sense-language", language); } catch {}
  applyTranslations();
  paintButtons();
  window.dispatchEvent(new Event("jev:language"));
}

function setTheme(theme, persist = true) {
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
  if (persist) try { localStorage.setItem("jev-sense-theme", theme); } catch {}
  paintButtons();
}

function setSidebar(collapsed, persist = true) {
  document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded";
  if (persist) try { localStorage.setItem("jev-sense-sidebar", document.documentElement.dataset.sidebar); } catch {}
  paintButtons();
}

export function initializePreferences() {
  applyTranslations();
  paintButtons();
  document.getElementById("lang-toggle").addEventListener("click", () => setLanguage(getLanguage() === "en" ? "zh" : "en"));
  document.getElementById("theme-toggle").addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
  document.getElementById("sidebar-toggle").addEventListener("click", () => setSidebar(document.documentElement.dataset.sidebar !== "collapsed"));
  window.addEventListener("storage", (event) => {
    if (event.key === "jev-sense-language") setLanguage(event.newValue === "zh" ? "zh" : "en", false);
    if (event.key === "jev-sense-theme") setTheme(event.newValue === "light" ? "light" : "dark", false);
    if (event.key === "jev-sense-sidebar") setSidebar(event.newValue === "collapsed", false);
  });
}
