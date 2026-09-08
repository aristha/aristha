const $ = (selector, root = document) => root.querySelector(selector);

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const asText = (value) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    return value.transition || value.title || value.message || JSON.stringify(value);
  }
  return String(value ?? "");
};

function renderFlow(items = []) {
  if (!items.length) return "";
  let html = '<div class="flow" aria-label="Process flow">';
  items.forEach((item, index) => {
    if (index) html += '<span class="flow__arrow" aria-hidden="true">→</span>';
    html += '<span class="flow__item">' + escapeHtml(asText(item)) + '</span>';
  });
  return html + "</div>";
}

function renderList(items = []) {
  if (!items.length) return "";
  return '<ul class="act__list">' +
    items.map((item) => "<li>" + escapeHtml(asText(item)) + "</li>").join("") +
    "</ul>";
}

function renderTools(tools = []) {
  if (!tools.length) return "";
  return '<div class="tool-grid">' +
    tools.map((tool) =>
      '<div class="tool"><strong>' + escapeHtml(tool.name) + '</strong><span>' +
      escapeHtml((tool.roles || []).join(" · ")) + "</span></div>"
    ).join("") +
    "</div>";
}

const actTag = {
  origin: "ORIGIN",
  transitions: "TRANSITIONS",
  "systems-thinking": "SYSTEMS THINKING",
  leadership: "LEADERSHIP",
  "ai-shift": "THE AI SHIFT",
  "now-next": "NOW / NEXT"
};

function renderAct(act) {
  const items = act.highlights || act.milestones || act.capabilities || [];
  let special = "";

  if (act.id === "ai-shift") {
    special =
      '<p class="act__message">' + escapeHtml(act.key_line || act.message || "") + "</p>" +
      '<p class="eyebrow section-label">BEFORE</p>' +
      renderFlow((act.before && act.before.flow) || []) +
      '<p class="eyebrow section-label">NOW</p>' +
      renderFlow((act.now && act.now.flow) || []) +
      renderTools(act.daily_tools || []);
  } else if (act.id === "now-next") {
    special =
      '<p class="eyebrow section-label">CURRENT FLOW</p>' +
      renderFlow(act.current_flow || []) +
      '<div class="tool-grid">' +
        '<div class="tool"><strong>AI roles</strong><span>' +
          escapeHtml((act.ai_roles || []).join(" · ")) +
        '</span></div>' +
        '<div class="tool"><strong>Human roles</strong><span>' +
          escapeHtml((act.human_roles || []).join(" · ")) +
        '</span></div>' +
      "</div>" +
      (act.question ? '<p class="act__message">' + escapeHtml(act.question) + "</p>" : "");
  } else {
    special =
      renderList(items) +
      (act.lesson ? '<p class="act__message">' + escapeHtml(act.lesson) + "</p>" : "") +
      (act.message ? '<p class="act__message">' + escapeHtml(act.message) + "</p>" : "");
  }

  return (
    '<article class="act" id="act-' + escapeHtml(act.id) + '" data-act="' + escapeHtml(act.id) + '">' +
      '<div class="act__top">' +
        '<span class="act__number">' + String(act.order || "").padStart(2, "0") + "</span>" +
        '<span class="act__tag">' + escapeHtml(actTag[act.id] || "ENGINEERING") + "</span>" +
      "</div>" +
      "<h2>" + escapeHtml(act.title || "") + "</h2>" +
      (act.purpose ? '<p class="act__purpose">' + escapeHtml(act.purpose) + "</p>" : "") +
      special +
    "</article>"
  );
}

function renderNav(acts) {
  const nav = $("#storyNav");
  nav.innerHTML = acts.map((act) =>
    '<a class="story-nav__item" href="#act-' + escapeHtml(act.id) + '" data-nav="' + escapeHtml(act.id) + '">' +
      '<span class="story-nav__dot" aria-hidden="true"></span>' +
      "<span>" + String(act.order || "").padStart(2, "0") + "</span>" +
    "</a>"
  ).join("");
}

function activateAct(id) {
  document.querySelectorAll("[data-nav]").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.nav === id);
  });

  const active = Array.from(document.querySelectorAll("[data-nav]"))
    .find((item) => item.dataset.nav === id);
  if (active) active.scrollIntoView({ block: "nearest", inline: "center" });
}

function setupObservers() {
  const acts = Array.from(document.querySelectorAll(".act"));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in-view");
        activateAct(entry.target.dataset.act);
      });
    },
    { rootMargin: "-30% 0px -45% 0px", threshold: 0.05 }
  );

  acts.forEach((act) => observer.observe(act));

  const updateProgress = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const percent = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
    $("#progressBar").style.width = percent + "%";
  };

  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
}

async function loadStory() {
  const actsRoot = $("#acts");

  try {
    const response = await fetch("./story.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("story.json returned " + response.status);

    const data = await response.json();
    const acts = Array.from(data.acts || []).sort((a, b) => (a.order || 0) - (b.order || 0));

    if (!acts.length) throw new Error("No story acts found");

    document.title = (data.story && data.story.title ? data.story.title : "Built by Transition") + " — Aristha";
    actsRoot.innerHTML = acts.map(renderAct).join("");
    renderNav(acts);

    const finalAct = acts.find((act) => act.id === "now-next");
    if (finalAct && finalAct.question) $("#closingQuestion").textContent = finalAct.question;

    requestAnimationFrame(() => {
      const first = actsRoot.querySelector(".act");
      if (first) first.classList.add("in-view");
      setupObservers();
    });
  } catch (error) {
    console.error(error);
    actsRoot.innerHTML =
      '<section class="loading-card">' +
        '<p class="eyebrow">STORY DATA UNAVAILABLE</p>' +
        "<h2>The interactive story could not be loaded.</h2>" +
        '<p class="act__purpose">The source still lives in the repository. You can read the full engineering journey on GitHub.</p>' +
        '<p class="act__message"><a href="https://github.com/aristha/aristha/blob/main/story/ENGINEERING_JOURNEY.md">Open the full journey →</a></p>' +
      "</section>";
  }
}

loadStory();
