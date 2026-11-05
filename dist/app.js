import {
  CATEGORIES,
  COLORS,
  dateKey,
  dateObject,
  addDays,
  validDate,
  emptyState,
  outfitItems,
  isWearable,
  outfitWeatherWarnings,
  generateOutfits,
  explain,
  stats,
  guessItem,
  validateBackup,
} from "./core.js";
import { load, save, resizePhoto } from "./storage.js";
import { searchCities, forecast, dayWeather, weatherLabel } from "./weather.js";
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const icons = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-13 4h2m4 0h2m-8 3h2"/>',
  spark:
    '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  refresh:
    '<path d="M20 7v5h-5M4 17v-5h5m10.2-5A8 8 0 0 0 5 6m-.2 11A8 8 0 0 0 19 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="m9 3-.5 3-2 1L4 6l-2 4 2.5 2v2L2 16l2 4 3-1 2 1 .5 2h5l.5-2 2-1 3 1 2-4-2.5-2v-2L22 10l-2-4-3 1-2-1-.5-3Z"/>',
  heart:
    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  cloud:
    '<path d="M6 18a5 5 0 1 1 0-10 6 6 0 0 1 11.5 1.5A4.5 4.5 0 1 1 18 18Z"/>',
  pin: '<path d="m8 3 8 0-1 6 4 4v2H5v-2l4-4Zm4 12v7"/>',
  chart: '<path d="M4 3v18h17M8 16v-4m5 4V7m5 9v-6"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  shirt: '<path d="m8 3-5 3-2 5 5 2v8h12v-8l5-2-2-5-5-3a4 4 0 0 1-8 0Z"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
};
function icon(name, cls = "") {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.spark}</svg>`;
}
let mode = "demo";
try {
  mode = localStorage.getItem("form-mode") === "personal" ? "personal" : "demo";
} catch {}
let state,
  view = "today",
  selectedDate = dateKey(),
  occasion = "Office day",
  outfits = [],
  active = 0,
  nonce = 0,
  pin = null,
  category = "All pieces",
  search = "",
  weatherData = null,
  weatherError = "",
  weatherLoading = false,
  cityResults = [],
  pending = [],
  pendingIndex = 0,
  storageReady = true,
  toastTimer,
  editorId = null;
const modal = $("#modal");
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 4200);
}
function openModal(html) {
  modal.innerHTML = html;
  modal.showModal();
}
let uploadGeneration = 0;
function closeModal() {
  uploadGeneration++;
  modal.close();
  pending = [];
  editorId = null;
}
function modalHead(title, kicker = "MAKE IT YOURS") {
  return `<div class="modal-top"><div><p class="eyebrow">${kicker}</p><h2 id="modal-title">${title}</h2></div><button class="icon-button" data-action="close" aria-label="Close dialog">${icon("close")}</button></div>`;
}
async function persist(next, { recovery = false } = {}) {
  if (!storageReady && !recovery) {
    toast("Device storage is unavailable. Changes cannot be saved.");
    return false;
  }
  try {
    await save(mode, next);
    state = next;
    storageReady = true;
    return true;
  } catch {
    toast(
      "Could not save. Your device storage may be full. Export a backup before clearing space.",
    );
    return false;
  }
}
function currentWeather() {
  if (state.preferences.city) return dayWeather(weatherData, selectedDate);
  return mode === "demo"
    ? { high: 17, low: 10, rain: 15, wind: 12, code: 2, sample: true }
    : null;
}
function regenerate() {
  outfits = generateOutfits({
    items: state.items,
    occasion,
    weather: currentWeather(),
    date: selectedDate,
    wears: state.wears,
    feedback: state.feedback,
    pin,
    nonce,
    comfort: state.preferences.comfort,
    adventure: state.preferences.adventure,
  });
  active = 0;
}
function currentOutfit() {
  return outfits[active];
}
const fmtDate = (
  d,
  opts = { weekday: "long", month: "long", day: "numeric" },
) => dateObject(d).toLocaleDateString("en-US", opts);
function smallDate(d) {
  return fmtDate(d, { month: "short", day: "numeric" });
}
function image(item, cls = "", lazy = true) {
  return `<img class="${cls}" src="${esc(item.image || "assets/icon.svg")}" alt="${esc(item.name)}" ${lazy ? 'loading="lazy"' : ""} width="300" height="320">`;
}
function weekStrip() {
  return `<div class="week-strip">${Array.from({ length: 7 }, (_, n) => {
    const date = addDays(dateKey(), n);
    return `<button class="day ${date === selectedDate ? "selected" : ""}" data-action="date" data-date="${date}" aria-pressed="${date === selectedDate}"><span>${fmtDate(date, { weekday: "short" })}</span><strong>${dateObject(date).getDate()}</strong><i class="${state.plans[date] ? "planned" : ""}"></i></button>`;
  }).join("")}</div>`;
}
function weatherCard() {
  const w = currentWeather();
  let source = weatherLoading
    ? "Updating forecast…"
    : weatherError ||
      (!w && state.preferences.city
        ? "Forecast unavailable for this date · provisional"
        : w?.sample
          ? "Sample weather · choose your city"
          : state.preferences.city?.name ||
            "Set your city for weather-aware outfits");
  return `<button class="weather-card" data-action="settings"><span class="weather-icon">${icon(w?.rain >= 45 ? "cloud" : "sun")}</span><span><strong>${w ? `${Math.round(w.high)}° <small>/ ${Math.round(w.low)}°C</small>` : "Your forecast"}</strong><span>${w ? esc(weatherLabel(w)) : "Dress for your day"}</span></span><span class="weather-details">${w ? `${w.rain}% rain<br>${Math.round(w.wind)} km/h wind` : icon("plus")}</span><small class="weather-source">${esc(source)}</small></button>`;
}
function shell() {
  const counts = stats(state);
  $("#app").innerHTML =
    `<aside class="sidebar"><a href="#today" class="wordmark" data-action="nav" data-view="today">FORM<span>®</span></a><p class="brand-caption">A considered wardrobe.</p><div class="nav-label">YOUR EVERYDAY, REIMAGINED</div><nav aria-label="Main navigation">${[
      ["today", "sun", "Today"],
      ["wardrobe", "grid", "Wardrobe"],
      ["planner", "calendar", "Planner"],
      ["insights", "chart", "Your progress"],
    ]
      .map(
        ([key, i, name]) =>
          `<button class="nav-item ${view === key ? "active" : ""}" data-action="nav" data-view="${key}" ${view === key ? 'aria-current="page"' : ""}>${icon(i)}<span>${name}</span>${key === "wardrobe" ? `<small>${counts.pieces}</small>` : ""}</button>`,
      )
      .join(
        "",
      )}</nav><div class="sidebar-note"><span class="tiny-flower">✳</span><p>Good style starts<br>with what you own.</p><span>Make a little more of it.</span></div><div class="sidebar-bottom"><button class="nav-item" data-action="settings">${icon("settings")}<span>Preferences</span></button><a class="portfolio-link" href="https://cjarhodes.com" target="_blank" rel="noopener">A project by Alex Rhodes ${icon("arrow")}</a></div></aside><div class="app-body"><header class="topbar"><span class="mobile-wordmark">FORM<sup>®</sup></span><div class="mode-badge"><i></i>${mode === "demo" ? "THE SAMPLE WARDROBE" : "YOUR PERSONAL WARDROBE"}</div><div class="top-actions"><button class="mode-switch" data-action="switch">${mode === "demo" ? "Use my wardrobe" : "Explore the demo"} ${icon("arrow")}</button><button class="avatar" data-action="settings" aria-label="Open preferences">AR</button></div></header>${!storageReady ? '<div class="storage-warning" role="alert">Your saved wardrobe could not be opened. Changes are paused. Reload or restore a valid backup in Preferences.</div>' : ""}<main id="main" tabindex="-1">${view === "today" ? todayPage() : view === "wardrobe" ? wardrobePage() : view === "planner" ? plannerPage() : insightsPage()}</main><footer class="footer"><span>LESS GUESSWORK. MORE YOU.</span><span>Made to be worn. <span class="footer-dot">✳</span> FORM ${new Date().getFullYear()}</span></footer></div><nav class="mobile-nav" aria-label="Mobile navigation">${[
      ["today", "sun", "Today"],
      ["wardrobe", "grid", "Wardrobe"],
      ["planner", "calendar", "Planner"],
      ["insights", "chart", "Progress"],
    ]
      .map(
        ([key, i, name]) =>
          `<button class="${view === key ? "active" : ""}" data-action="nav" data-view="${key}" ${view === key ? 'aria-current="page"' : ""}>${icon(i)}<span>${name}</span></button>`,
      )
      .join("")}</nav>`;
}
function pageHead(kicker, title, copy, action = "") {
  return `<div class="page-head"><div><p class="eyebrow">${kicker}</p><h1>${title}</h1><p class="page-intro">${copy}</p></div>${action}</div>`;
}
function todayPage() {
  const o = currentOutfit(),
    w = currentWeather(),
    counts = stats(state);
  return `${pageHead(`${selectedDate === dateKey() ? "TODAY" : "PLANNING AHEAD"} / ${fmtDate(selectedDate, { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}`, "Good clothes.<br><em>New possibilities.</em>", "A fresh perspective on the wardrobe you already have.", `<div class="season-mark">${icon("spark")}<span>YOUR STYLE,<br>A LITTLE FURTHER.</span></div>`)}<div class="styling-controls"><label><span>THE OCCASION</span><select id="occasion">${["Office day", "Customer meeting", "Weekend", "Dinner out"].map((v) => `<option ${occasion === v ? "selected" : ""}>${v}</option>`).join("")}</select></label><label><span>GET DRESSED FOR</span><input aria-label="Outfit date" id="outfit-date" type="date" value="${selectedDate}" min="${dateKey()}" max="${addDays(dateKey(), 365)}"></label>${pin ? `<button class="pin-chip" data-action="unpin">${icon("pin")}${esc(state.items.find((i) => i.id === pin)?.name)} ${icon("close")}</button>` : '<span class="control-hint">A little inspiration.<br>Entirely your clothes.</span>'}<button class="button button-dark" data-action="generate">${icon("refresh")} Fresh ideas</button></div><div class="today-layout"><section class="outfit-section" aria-label="Outfit recommendations"><div class="outfit-tabs" role="group" aria-label="Outfit adventure level">${["Your comfort zone", "A fresh combination", "A little adventurous"].map((label, i) => `<button class="${active === i ? "active" : ""}" data-action="outfit" data-index="${i}" ${!outfits[i] ? "disabled" : ""} aria-pressed="${active === i}"><span>0${i + 1}</span>${label}</button>`).join("")}</div>${o ? outfitBoard(o) : emptyOutfit()}${o ? `<div class="outfit-actions"><button class="button button-dark" data-action="schedule">${icon("calendar")} Save for ${selectedDate === dateKey() ? "today" : smallDate(selectedDate)}</button><button class="button button-light" data-action="wore" ${selectedDate > dateKey() ? 'disabled title="Confirm a wear on the day itself"' : ""}>${icon("check")} Wore this</button><button class="icon-button ${state.feedback[o.signature] === "love" ? "loved" : ""}" data-action="love" aria-label="${state.feedback[o.signature] === "love" ? "Remove favorite" : "Love this outfit"}" aria-pressed="${state.feedback[o.signature] === "love"}">${icon("heart")}</button></div>` : ""}</section><aside class="day-panel"><div class="panel-title"><h2>Your day, considered.</h2><span>${icon("sun")}</span></div>${weekStrip()}${weatherCard()}<div class="styling-note"><p class="eyebrow">${icon("spark")} WHY IT WORKS</p><h3>${["Easy, with intention.", "Familiar pieces. Fresh energy.", "A good kind of different."][active]}</h3><p>${o ? esc(explain(o, state.items, w)) : "Start with a few favorite pieces. We’ll help you find the possibilities between them."}</p>${o ? `<button class="text-button" data-action="skip">Not quite my style ${icon("arrow")}</button>` : ""}</div><div class="rediscover-note"><span>↗</span><div><strong>Give the overlooked a moment.</strong><p>${counts.worn ? `${counts.pieces - counts.worn} pieces haven’t had a turn yet.` : "Your next favorite outfit might already be in your wardrobe."}</p><button class="text-button" data-action="nav" data-view="wardrobe">Rediscover your wardrobe ${icon("arrow")}</button></div></div></aside></div><section class="bottom-story"><span class="story-number">01 — THE PHILOSOPHY</span><p>Buy less. <em>See more.</em><br>Wear what’s possible.</p><span>Great style isn’t always something new.<br>Sometimes, it’s a new way of seeing.</span></section>`;
}
function outfitBoard(o) {
  const pieces = outfitItems(o, state.items);
  return `<div class="outfit-board ${pieces.length === 3 ? "three-pieces" : ""}"><div class="board-caption"><span>THE ${occasion === "Weekend" ? "OFF-DUTY" : occasion === "Dinner out" ? "AFTER-HOURS" : "EVERYDAY"} EDIT</span><span>LOOK / 0${active + 1}</span></div>${pieces.map((i) => `<button class="board-piece piece-${i.category.toLowerCase()}" data-action="swap" data-id="${esc(i.id)}" aria-label="Swap ${esc(i.name)}">${image(i, "", false)}<span class="piece-label"><span>${esc(i.name)}</span><small>${esc(i.color)} · ${i.sample ? "Sample piece" : esc(i.fit)}</small></span><span class="swap-indicator">${icon("refresh")} Swap</span></button>`).join("")}<div class="board-bottom"><span><i></i> ${pieces.length} PIECES, ALL FROM YOUR WARDROBE</span>${pin ? icon("pin") : icon("spark")}</div></div>`;
}
function emptyOutfit() {
  const available = state.items.filter((i) => i.status === "available");
  const missing = ["Tops", "Bottoms", "Shoes"].filter(
    (c) => !available.some((i) => i.category === c),
  );
  return `<div class="empty-state outfit-empty"><span class="empty-icon">${icon("shirt")}</span><h2>${state.items.length ? "Let’s make room for a look." : "Your wardrobe. A fresh start."}</h2><p>${missing.length ? `Add an available ${missing.map((c) => ({ Tops: "top", Bottoms: "pair of trousers or jeans", Shoes: "pair of shoes" })[c]).join(", ")} to get started.` : "No complete outfit fits these conditions. Try another occasion, unpin your piece, or add a warmer layer."}</p><button class="button button-dark" data-action="upload">${icon("plus")} Add your clothes</button>${pin ? '<button class="text-button" data-action="unpin">Remove pinned piece</button>' : ""}</div>`;
}
function wardrobePage() {
  const filtered = state.items.filter(
    (i) =>
      (category === "All pieces" ||
        i.category === category ||
        (category === "Overlooked" &&
          !state.wears.some((w) => w.ids.includes(i.id)))) &&
      `${i.name} ${i.color} ${i.kind}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return `${pageHead("THE COLLECTION", "More than <em>the usual.</em>", `${state.items.length} pieces. Countless ways to make them yours.`, `<button class="button button-dark" data-action="upload">${icon("plus")} Add clothes</button>`)}${mode === "demo" ? '<div class="inline-note">An illustrated sample collection to explore. Switch to your wardrobe to add your own clothes.</div>' : '<div class="inline-note">Stored on this device. Export a backup in Preferences to keep your wardrobe safe.</div>'}<div class="wardrobe-toolbar"><div class="filter-tabs" role="group" aria-label="Filter wardrobe">${["All pieces", ...CATEGORIES, "Overlooked"].map((c) => `<button class="${category === c ? "active" : ""}" data-action="filter" data-category="${c}" aria-pressed="${category === c}">${c}</button>`).join("")}</div><label class="search-field">${icon("search")}<input type="search" id="wardrobe-search" placeholder="Find a piece…" value="${esc(search)}" aria-label="Search your wardrobe"></label></div><p class="results-count">${filtered.length} PIECES ${category === "Overlooked" ? "WAITING FOR THEIR MOMENT" : ""}</p><div class="wardrobe-grid">${filtered.map((item) => `<button class="garment-card" data-action="edit" data-id="${esc(item.id)}"><div class="garment-image">${image(item)}${item.status !== "available" ? `<span class="status-tag">${item.status === "laundry" ? "In laundry" : "Archived"}</span>` : ""}<span class="card-edit">${icon("plus")}</span></div><div class="garment-meta"><span class="color-dot" style="background:${COLORS[item.color]}"></span><span>${esc(item.category)} / ${esc(item.color)}</span></div><h3>${esc(item.name)}</h3><p>${state.wears.filter((w) => w.ids.includes(item.id)).length ? `Worn ${state.wears.filter((w) => w.ids.includes(item.id)).length} times` : "A fresh possibility"}</p></button>`).join("")}</div>${!filtered.length ? `<div class="empty-state"><h2>${state.items.length ? "No pieces match just yet." : "Start with what you love."}</h2><p>${state.items.length ? "Try another filter or search." : "Photograph 20–30 pieces, including shoes and a few things you rarely wear. Add them a batch at a time."}</p><button class="button button-dark" data-action="${state.items.length ? "clear-filter" : "upload"}">${state.items.length ? "Clear filters" : "Add your first pieces"}</button></div>` : ""}`;
}
function plannerPage() {
  return `${pageHead("A LITTLE FORESIGHT", "Good weeks.<br><em>Better dressed.</em>", "Give tomorrow one less thing to think about.", `<button class="button button-dark" data-action="plan-new">${icon("plus")} Plan a day</button>`)}<div class="planner-intro"><span>${icon("calendar")} YOUR NEXT SEVEN DAYS</span><p>Save an outfit. Change your mind. Keep it simple.</p></div><div class="planner-grid">${Array.from({ length: 7 }, (_, n) => planCard(addDays(dateKey(), n))).join("")}</div>${
    Object.keys(state.plans)
      .filter((d) => d >= addDays(dateKey(), 7))
      .sort().length
      ? `<div class="section-heading"><h2>A little further ahead.</h2></div><div class="planner-grid">${Object.keys(
          state.plans,
        )
          .filter((d) => d >= addDays(dateKey(), 7))
          .sort()
          .map(planCard)
          .join("")}</div>`
      : ""
  }<div class="planner-footnote">${icon("cloud")} Forecasts are checked when you open the app. Dates beyond the forecast are provisional. Plans change only when you choose to update them.</div>`;
}
function planCard(d) {
  const plan = state.plans[d],
    pieces = outfitItems(plan, state.items),
    valid = plan && isWearable(plan, state.items),
    w = state.preferences.city ? dayWeather(weatherData, d) : null;
  const weatherWarnings = plan
    ? outfitWeatherWarnings(plan, state.items, w, state.preferences.comfort)
    : [];
  const planNotice = !valid
    ? "A piece is unavailable. Update this look."
    : weatherWarnings[0];
  return `<article class="plan-card ${plan ? "has-plan" : ""}"><div class="plan-date"><span>${d === dateKey() ? "TODAY" : fmtDate(d, { weekday: "long" }).toUpperCase()}</span><strong>${fmtDate(d, { month: "short", day: "numeric" })}</strong></div>${plan ? `<button class="mini-outfit" data-action="open-plan" data-date="${d}" aria-label="View outfit for ${smallDate(d)}">${pieces.map((i) => image(i)).join("")}</button><p class="plan-occasion">${esc(plan.occasion)}</p>${planNotice ? `<small class="plan-warning">${esc(planNotice)}</small>` : ""}<div class="plan-card-actions"><button class="text-button" data-action="open-plan" data-date="${d}">Review ${icon("arrow")}</button><button class="icon-button" data-action="remove-plan" data-date="${d}" aria-label="Remove plan for ${smallDate(d)}">${icon("close")}</button></div>` : `<button class="plan-add" data-action="date-plan" data-date="${d}">${icon("plus")}<span>Make a little plan</span></button>`}<small class="plan-weather">${icon(w?.rain >= 45 ? "cloud" : "sun")}${w ? `${Math.round(w.high)}°C · ${weatherLabel(w)}` : "Weather pending"}</small></article>`;
}
function insightsPage() {
  const s = stats(state),
    unworn = state.items.filter(
      (i) => !state.wears.some((w) => w.ids.includes(i.id)),
    );
  const adventurous = state.wears.filter((w) => w.level === 2).length;
  return `${pageHead("PROGRESS, NOT PERFECTION", "Find your <em>own rhythm.</em>", "More of your wardrobe. A little more confidence. One outfit at a time.")}<div class="stat-grid">${[
    [
      s.worn + "/" + s.pieces,
      "PIECES GIVEN A TURN",
      "Distinct pieces you’ve confirmed wearing.",
    ],
    [
      s.newLooks,
      "DIFFERENT LOOKS WORN",
      "Fresh combinations that made it out the door.",
    ],
    [
      adventurous,
      "ADVENTUROUS DAYS",
      "Times you tried the more adventurous option.",
    ],
  ]
    .map(
      ([n, label, copy]) =>
        `<article class="stat-card"><span class="eyebrow">${label}</span><strong>${n}</strong><p>${copy}</p></article>`,
    )
    .join(
      "",
    )}</div><div class="section-heading"><div><p class="eyebrow">THE OVERLOOKED EDIT</p><h2>Still full of potential.</h2></div><span>${unworn.length} pieces waiting</span></div><div class="rediscovery-grid">${
    unworn
      .slice(0, 4)
      .map(
        (i) =>
          `<button class="garment-card" data-action="style-piece" data-id="${esc(i.id)}"><div class="garment-image">${image(i)}<span class="style-piece-tag">Style this ${icon("arrow")}</span></div><h3>${esc(i.name)}</h3></button>`,
      )
      .join("") ||
    "<p>Every piece has had a turn. Keep finding new combinations.</p>"
  }</div><div class="section-heading"><h2>Your outfit journal.</h2><span>Confirmed wears only</span></div><div class="journal">${
    [...state.wears]
      .reverse()
      .slice(0, 20)
      .map(
        (w) =>
          `<article class="journal-row"><span>${smallDate(w.date)}</span><div class="journal-images">${outfitItems(
            w,
            state.items,
          )
            .map((i) => image(i))
            .join(
              "",
            )}</div><p>${esc(w.occasion || "Everyday")}<small>${["Comfort zone", "Fresh combination", "Adventurous"][w.level] || "Your own combination"}</small></p><button class="icon-button" data-action="undo-wear" data-id="${esc(w.id)}" aria-label="Remove wear logged on ${smallDate(w.date)}">${icon("close")}</button></article>`,
      )
      .join("") ||
    '<div class="empty-state compact"><h3>Your story starts with a wear.</h3><p>Tap “Wore this” after trying an outfit. Your progress will grow from there.</p></div>'
  }</div>`;
}
async function updateWeather() {
  const city = state.preferences.city;
  const requestMode = mode;
  weatherData = null;
  weatherError = "";
  if (!city) {
    regenerate();
    shell();
    return;
  }
  weatherLoading = true;
  shell();
  try {
    const data = await forecast(city);
    if (mode !== requestMode || state.preferences.city?.name !== city.name)
      return;
    weatherData = data;
  } catch (e) {
    if (mode !== requestMode || state.preferences.city?.name !== city.name)
      return;
    weatherError = e.message;
  }
  weatherLoading = false;
  regenerate();
  shell();
}
function settings() {
  openModal(
    `${modalHead("A little more you.", "PREFERENCES")}<div class="settings-body"><div class="settings-section"><h3>Your weather, your city.</h3><p>Use a city name—no precise location needed. Temperatures are shown in Celsius.</p><form id="city-search" class="city-search"><label class="sr-only" for="city-query">City name</label><input id="city-query" name="query" placeholder="Search for your city" required minlength="2"><button class="button button-dark" type="submit">Search</button></form><div id="city-results" aria-live="polite"></div>${state.preferences.city ? `<div class="current-city">${icon("check")} ${esc(state.preferences.city.name)} <button class="text-button" data-action="clear-city">Remove</button></div>` : ""}<small>Forecast and location search by <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>. No location is requested until you search.</small></div><form id="preferences"><div class="settings-section"><h3>Your comfort zone.</h3><label>Temperature preference<select name="comfort">${[
      ["cold", "I tend to feel cold"],
      ["neutral", "Somewhere in the middle"],
      ["warm", "I tend to feel warm"],
    ]
      .map(
        ([v, label]) =>
          `<option value="${v}" ${state.preferences.comfort === v ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></label><label>Style appetite<select name="adventure">${[
      ["0", "Ease me in"],
      ["1", "A little adventurous"],
      ["2", "Push my style further"],
    ]
      .map(
        ([v, label]) =>
          `<option value="${v}" ${state.preferences.adventure === Number(v) ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></label><button class="button button-dark" type="submit">Save preferences ${icon("check")}</button></div></form><div class="settings-section"><h3>Your clothes. Your data.</h3><p>Photos and history stay in this browser on this device. They aren’t uploaded to a server or synced between devices. Export regularly; clearing browser data removes your wardrobe.</p><div class="settings-actions"><button class="button button-light" data-action="export">${icon("download")} Export backup</button><label class="button button-light file-label">${icon("upload")} Restore backup<input id="import-backup" type="file" accept="application/json,.json"></label></div><p class="small-copy">${mode === "demo" ? "You’re exploring the sample wardrobe. Your personal wardrobe is separate." : "You’re editing your personal wardrobe. The sample collection is separate."}</p></div><div class="settings-section"><h3>On your iPhone.</h3><p>In Safari, tap Share, then Add to Home Screen. FORM opens like an app and keeps your wardrobe handy offline after your first visit.</p></div><div class="settings-section"><h3>Thoughtful by design.</h3><p>FORM uses wardrobe rules, not paid AI calls. Filename-based tags are a starting point for your corrections. Automatic visual recognition and background removal are future improvements.</p><a class="text-button" href="https://cjarhodes.com" target="_blank" rel="noopener">Explore the portfolio ${icon("arrow")}</a></div></div>`,
  );
}
function editor(item, isPending = false) {
  const kinds = {
    Tops: ["tee", "shirt", "polo"],
    Bottoms: ["jeans", "trousers"],
    Shoes: ["sneakers", "loafers", "boots"],
    Layers: ["overshirt", "sweater", "blazer", "jacket"],
  };
  openModal(
    `${modalHead(isPending ? `Make it yours. <small>${pendingIndex + 1} / ${pending.length}</small>` : "The details matter.", isPending ? "REVIEW YOUR UPLOAD" : "YOUR WARDROBE")}<form id="item-editor"><div class="editor-layout"><div class="editor-image">${image(item, "", false)}</div><div class="editor-fields">${isPending ? '<p class="inline-note">Tags are suggested from the filename. Check the color, category and details.</p>' : ""}<label>Piece name<input name="name" value="${esc(item.name)}" required maxlength="100"></label><div class="form-pair"><label>Category<select name="category" id="edit-category">${CATEGORIES.map((c) => `<option ${item.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></label><label>Color<select name="color">${Object.keys(
      COLORS,
    )
      .map((c) => `<option ${item.color === c ? "selected" : ""}>${c}</option>`)
      .join(
        "",
      )}</select></label></div><label>Type<select name="kind" id="edit-kind">${kinds[item.category].map((k) => `<option ${item.kind === k ? "selected" : ""}>${k}</option>`).join("")}</select></label><details class="item-advanced" ${isPending ? "" : "open"}><summary>Fit, warmth & styling details</summary><div class="form-pair"><label>Dress level<select name="formality">${[
      [1, "Casual"],
      [2, "Smart casual"],
      [3, "Smart"],
    ]
      .map(
        ([n, label]) =>
          `<option value="${n}" ${item.formality === n ? "selected" : ""}>${label}</option>`,
      )
      .join("")}</select></label><label>Warmth<select name="warmth">${[
      [1, "Light"],
      [2, "Midweight"],
      [3, "Warm"],
    ]
      .map(
        ([n, label]) =>
          `<option value="${n}" ${item.warmth === n ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></label></div><label>Fit<select name="fit">${["Slim / fitted", "Relaxed / straight", "Loose / oversized"].map((f) => `<option ${item.fit === f ? "selected" : ""}>${f}</option>`).join("")}</select></label><label>Style character<select name="boldness">${[
      [0, "An everyday staple"],
      [1, "A little distinctive"],
      [2, "A statement piece"],
    ]
      .map(
        ([n, label]) =>
          `<option value="${n}" ${item.boldness === n ? "selected" : ""}>${label}</option>`,
      )
      .join("")}</select></label><label>Availability<select name="status">${[
      ["available", "Ready to wear"],
      ["laundry", "In the laundry"],
      ["archived", "Not in rotation / doesn’t fit"],
    ]
      .map(
        ([v, label]) =>
          `<option value="${v}" ${item.status === v ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></label><div class="checkboxes"><label><input name="waterproof" type="checkbox" ${item.waterproof ? "checked" : ""}> Rain-ready</label><label><input name="delicate" type="checkbox" ${item.delicate ? "checked" : ""}> Avoid rain</label></div></details></div></div><div class="modal-footer">${isPending ? '<button class="text-button" type="button" data-action="skip-upload">Skip this photo</button>' : `<button class="text-button danger" type="button" data-action="delete-item" data-id="${esc(item.id)}">Remove piece</button><button class="text-button" type="button" data-action="style-piece" data-id="${esc(item.id)}">${icon("pin")} Style this</button>`}<button type="submit" class="button button-dark">${icon("check")} ${isPending ? "Add to wardrobe" : "Save changes"}</button></div></form>`,
  );
}
function uploadDialog() {
  if (mode === "demo") {
    openModal(
      `${modalHead("Let’s make it personal.")}<div class="empty-state compact"><p>Your own photos belong in your personal wardrobe. The sample collection stays separate so you can explore any time.</p><button class="button button-dark" data-action="switch-upload">Open my wardrobe ${icon("arrow")}</button></div>`,
    );
    return;
  }
  openModal(
    `${modalHead("Start with a few favorites.", "BUILD YOUR WARDROBE")}<div class="upload-area">${icon("shirt")}<h3>Your clothes. In a new light.</h3><p>Choose a batch of up to 30 photos, one piece per photo. A plain background and good light work best.</p><label class="button button-dark file-label">${icon("plus")} Choose photos<input type="file" id="photo-upload" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple></label><small>JPEG, PNG, WebP · Up to 20 MB each<br>Photos are resized and saved on this device.</small><p id="upload-progress" role="status"></p></div>`,
  );
}
function swapDialog(id) {
  const item = state.items.find((i) => i.id === id);
  if (!item) return;
  const alternatives = state.items.filter(
    (i) =>
      i.category === item.category && i.id !== id && i.status === "available",
  );
  openModal(
    `${modalHead("A different direction.", "SWAP A PIECE")}<p class="modal-description">Keep the rest of your look. Choose another ${esc(item.category.toLowerCase())} piece.</p><div class="swap-grid">${alternatives.map((i) => `<button class="garment-card" data-action="choose-swap" data-id="${esc(i.id)}" data-replace="${esc(id)}"><div class="garment-image">${image(i)}</div><h3>${esc(i.name)}</h3><p>${esc(i.color)}</p></button>`).join("") || "<p>No alternatives yet. Add another piece in this category.</p>"}</div>`,
  );
}
async function switchMode(upload = false) {
  closeModal();
  const nextMode = mode === "demo" ? "personal" : "demo";
  try {
    const next = await load(nextMode);
    mode = nextMode;
    state = next;
    pin = null;
    weatherData = null;
    weatherLoading = false;
    weatherError = "";
    outfits = [];
    category = "All pieces";
    search = "";
    try {
      localStorage.setItem("form-mode", mode);
    } catch {}
    view = upload ? "wardrobe" : "today";
    regenerate();
    shell();
    await updateWeather();
    if (upload) uploadDialog();
  } catch {
    toast(
      "Could not open device storage. Your current wardrobe has not changed.",
    );
  }
}
async function savePlan() {
  const o = currentOutfit();
  if (!o || !isWearable(o, state.items)) {
    toast("Choose a complete outfit with available pieces first.");
    return;
  }
  const existing = state.plans[selectedDate];
  if (existing) {
    openModal(
      `${modalHead("A new plan?", "UPDATE YOUR DAY")}<p class="modal-description">There’s already an outfit saved for ${esc(fmtDate(selectedDate))}. Replace it with this look?</p><div class="modal-footer"><button class="button button-light" data-action="close">Keep existing</button><button class="button button-dark" data-action="replace-plan">Replace outfit</button></div>`,
    );
    return;
  }
  await putPlan();
}
async function putPlan() {
  const o = currentOutfit();
  if (!o) return;
  const next = structuredClone(state);
  next.plans[selectedDate] = {
    ids: [...o.ids],
    level: o.level,
    signature: o.signature,
    occasion,
    savedWeather: currentWeather(),
    savedAt: new Date().toISOString(),
  };
  if (await persist(next)) {
    closeModal();
    shell();
    toast(`Outfit saved for ${smallDate(selectedDate)}.`);
  }
}
function planNew() {
  openModal(
    `${modalHead("One less decision.", "PLAN AHEAD")}<form id="plan-date-form"><div class="settings-section"><label>Choose a day<input name="date" type="date" value="${selectedDate}" min="${dateKey()}" max="${addDays(dateKey(), 365)}" required></label><p class="small-copy">We’ll make outfit suggestions for that day. Beyond the available forecast, suggestions are provisional.</p></div><div class="modal-footer"><button class="button button-dark" type="submit">Find an outfit ${icon("arrow")}</button></div></form>`,
  );
}
async function perform(action, b) {
  switch (action) {
    case "nav":
      view = b.dataset.view;
      shell();
      $("#main").focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
      break;
    case "settings":
      settings();
      break;
    case "close":
      closeModal();
      break;
    case "switch":
      await switchMode();
      break;
    case "switch-upload":
      await switchMode(true);
      break;
    case "date":
      selectedDate = b.dataset.date;
      regenerate();
      shell();
      break;
    case "date-plan":
      selectedDate = b.dataset.date;
      view = "today";
      pin = null;
      regenerate();
      shell();
      window.scrollTo({ top: 0, behavior: "instant" });
      break;
    case "generate":
      nonce++;
      regenerate();
      shell();
      toast(
        outfits.length
          ? "A fresh perspective."
          : "Add available tops, bottoms and shoes to build a look.",
      );
      break;
    case "outfit":
      active = Number(b.dataset.index);
      shell();
      break;
    case "filter":
      category = b.dataset.category;
      shell();
      break;
    case "clear-filter":
      category = "All pieces";
      search = "";
      shell();
      break;
    case "upload":
      uploadDialog();
      break;
    case "edit":
      editorId = b.dataset.id;
      editor(state.items.find((i) => i.id === editorId));
      break;
    case "skip-upload":
      pendingIndex++;
      if (pendingIndex < pending.length) editor(pending[pendingIndex], true);
      else {
        closeModal();
        regenerate();
        shell();
      }
      break;
    case "swap":
      swapDialog(b.dataset.id);
      break;
    case "choose-swap": {
      const o = currentOutfit(),
        replacement = state.items.find((i) => i.id === b.dataset.id);
      if (!o || !replacement) break;
      const w = currentWeather();
      const ids = o.ids.map((id) =>
        id === b.dataset.replace ? replacement.id : id,
      );
      const warnings = outfitWeatherWarnings(
        { ids },
        state.items,
        w,
        state.preferences.comfort,
      );
      if (warnings.length) {
        toast(warnings[0]);
        break;
      }
      outfits[active] = { ...o, ids, signature: [...ids].sort().join("|") };
      closeModal();
      shell();
      break;
    }
    case "style-piece": {
      const item = state.items.find((i) => i.id === b.dataset.id);
      if (item.status !== "available") {
        toast("Mark this piece ready to wear before styling it.");
        break;
      }
      pin = item.id;
      view = "today";
      closeModal();
      regenerate();
      shell();
      window.scrollTo({ top: 0, behavior: "instant" });
      break;
    }
    case "unpin":
      pin = null;
      regenerate();
      shell();
      break;
    case "schedule":
      await savePlan();
      break;
    case "replace-plan":
      await putPlan();
      break;
    case "wore": {
      const o = currentOutfit();
      if (!o || selectedDate > dateKey() || !isWearable(o, state.items)) break;
      const duplicate = state.wears.some(
        (w) =>
          w.date === selectedDate &&
          [...w.ids].sort().join("|") === [...o.ids].sort().join("|"),
      );
      if (duplicate) {
        toast("This outfit is already in today’s journal.");
        break;
      }
      const next = structuredClone(state);
      next.wears.push({
        id: crypto.randomUUID(),
        date: selectedDate,
        ids: [...o.ids],
        occasion,
        level: o.level,
      });
      if (await persist(next)) {
        shell();
        toast("A good look, logged. Your wardrobe is getting its moment.");
      }
      break;
    }
    case "love":
    case "skip": {
      const o = currentOutfit();
      if (!o) break;
      const next = structuredClone(state);
      if (action === "love") {
        if (next.feedback[o.signature] === "love")
          delete next.feedback[o.signature];
        else next.feedback[o.signature] = "love";
      } else next.feedback[o.signature] = "skip";
      if (await persist(next)) {
        if (action === "skip") {
          nonce++;
          regenerate();
        }
        shell();
        toast(
          action === "love"
            ? "Preference saved."
            : "Noted. Let’s try another direction.",
        );
      }
      break;
    }
    case "plan-new":
      planNew();
      break;
    case "open-plan": {
      const p = state.plans[b.dataset.date];
      selectedDate = b.dataset.date;
      occasion = p.occasion;
      view = "today";
      pin = null;
      regenerate();
      const level = p.level ?? 0;
      outfits[level] = { ...p, signature: [...p.ids].sort().join("|"), level };
      active = level;
      shell();
      window.scrollTo({ top: 0, behavior: "instant" });
      if (!isWearable(p, state.items))
        toast("A piece in this plan is unavailable. Swap it before wearing.");
      break;
    }
    case "remove-plan": {
      const next = structuredClone(state);
      delete next.plans[b.dataset.date];
      if (await persist(next)) {
        shell();
        toast("Plan removed. Room for something else.");
      }
      break;
    }
    case "undo-wear": {
      const next = structuredClone(state);
      next.wears = next.wears.filter((w) => w.id !== b.dataset.id);
      if (await persist(next)) {
        shell();
        toast("Wear removed from your journal.");
      }
      break;
    }
    case "delete-item": {
      const item = state.items.find((i) => i.id === b.dataset.id);
      openModal(
        `${modalHead("Remove this piece?", "YOUR WARDROBE")}<p class="modal-description">Remove ${esc(item.name)}? Plans that use it will be removed too. You can archive it instead to preserve its history.</p><div class="modal-footer"><button class="button button-light" data-action="close">Keep piece</button><button class="button button-dark" data-action="confirm-delete" data-id="${esc(item.id)}">Remove piece</button></div>`,
      );
      break;
    }
    case "confirm-delete": {
      const id = b.dataset.id,
        next = structuredClone(state);
      next.items = next.items.filter((i) => i.id !== id);
      for (const [date, p] of Object.entries(next.plans))
        if (p.ids.includes(id)) delete next.plans[date];
      next.wears = next.wears.map((w) => ({
        ...w,
        ids: w.ids.filter((i) => i !== id),
      }));
      if (await persist(next)) {
        if (pin === id) pin = null;
        closeModal();
        regenerate();
        shell();
        toast("Piece removed.");
      }
      break;
    }
    case "choose-city": {
      const city = cityResults[Number(b.dataset.index)];
      if (!city) break;
      const next = structuredClone(state);
      next.preferences.city = city;
      if (await persist(next)) {
        closeModal();
        await updateWeather();
        toast("Your forecast is ready.");
      }
      break;
    }
    case "clear-city": {
      const next = structuredClone(state);
      next.preferences.city = null;
      if (await persist(next)) {
        weatherData = null;
        weatherError = "";
        weatherLoading = false;
        regenerate();
        shell();
        settings();
      }
      break;
    }
    case "export": {
      const file = new Blob([JSON.stringify(state, null, 2)], {
          type: "application/json",
        }),
        url = URL.createObjectURL(file),
        a = document.createElement("a");
      a.href = url;
      a.download = `form-${mode}-${dateKey()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast("Backup exported. Keep it somewhere safe.");
      break;
    }
    case "confirm-restore": {
      if (!restoreData) break;
      if (await persist(restoreData, { recovery: true })) {
        restoreData = null;
        pin = null;
        closeModal();
        regenerate();
        shell();
        await updateWeather();
        toast("Your wardrobe has been restored.");
      }
      break;
    }
  }
}
let busy = false,
  restoreData = null;
document.addEventListener("click", async (event) => {
  const b = event.target.closest("[data-action]");
  if (!b || b.disabled) return;
  event.preventDefault();
  if (busy) return;
  busy = true;
  try {
    await perform(b.dataset.action, b);
  } catch (e) {
    console.error(e);
    toast(
      "Something didn’t finish. Your saved wardrobe is safe; please try again.",
    );
  } finally {
    busy = false;
  }
});
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    const r = modal.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closeModal();
  }
});
modal.addEventListener("cancel", () => {
  uploadGeneration++;
  pending = [];
  editorId = null;
});
document.addEventListener("input", (e) => {
  if (e.target.id === "wardrobe-search") {
    search = e.target.value;
    const start = e.target.selectionStart;
    shell();
    const input = $("#wardrobe-search");
    input.focus();
    input.setSelectionRange(start, start);
  }
});
document.addEventListener("change", async (e) => {
  try {
    if (e.target.id === "occasion") {
      occasion = e.target.value;
      regenerate();
      shell();
    }
    if (e.target.id === "outfit-date") {
      if (
        !validDate(e.target.value) ||
        e.target.value < dateKey() ||
        e.target.value > addDays(dateKey(), 365)
      )
        return;
      selectedDate = e.target.value;
      regenerate();
      shell();
    }
    if (e.target.id === "edit-category") {
      const kinds = {
        Tops: ["tee", "shirt", "polo"],
        Bottoms: ["jeans", "trousers"],
        Shoes: ["sneakers", "loafers", "boots"],
        Layers: ["overshirt", "sweater", "blazer", "jacket"],
      };
      $("#edit-kind").innerHTML = kinds[e.target.value]
        .map((k) => `<option>${k}</option>`)
        .join("");
    }
    if (e.target.id === "photo-upload") {
      const generation = ++uploadGeneration;
      const remaining = 1000 - state.items.length;
      if (remaining <= 0) {
        toast("Your wardrobe has reached the 1,000-piece limit.");
        return;
      }
      const files = [...e.target.files].slice(0, Math.min(30, remaining));
      const prepared = [];
      if (e.target.files.length > 30)
        toast(
          "Starting with the first 30 photos. Add the rest in another batch.",
        );
      pending = [];
      const progress = $("#upload-progress");
      e.target.disabled = true;
      for (let i = 0; i < files.length; i++) {
        progress.textContent = `Preparing photo ${i + 1} of ${files.length}…`;
        try {
          const image = await resizePhoto(files[i]);
          if (generation !== uploadGeneration) return;
          prepared.push({
            ...guessItem(files[i].name),
            id: crypto.randomUUID(),
            image,
          });
        } catch (error) {
          toast(error.message);
        }
      }
      if (!modal.open || generation !== uploadGeneration) {
        pending = [];
        return;
      }
      pending = prepared;
      if (pending.length) {
        pendingIndex = 0;
        editor(pending[0], true);
      } else {
        progress.textContent =
          "No photos could be opened. Try JPEG or PNG files.";
        e.target.disabled = false;
      }
    }
    if (e.target.id === "import-backup") {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 100 * 1024 * 1024)
        throw new Error("This backup is too large (100 MB maximum).");
      restoreData = validateBackup(JSON.parse(await file.text()));
      openModal(
        `${modalHead("Restore your wardrobe?", "BACKUP")}<p class="modal-description">This backup contains ${restoreData.items.length} pieces. Restoring replaces the current ${mode === "demo" ? "sample" : "personal"} wardrobe on this device. Export your current wardrobe first if you want to keep it.</p><div class="modal-footer"><button class="button button-light" data-action="close">Cancel</button><button class="button button-dark" data-action="confirm-restore">Restore backup</button></div>`,
      );
    }
  } catch (error) {
    toast(
      error instanceof SyntaxError
        ? "That file is not a valid JSON backup."
        : error.message,
    );
  }
});
document.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const data = new FormData(form);
  const submit = form.querySelector('[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    if (form.id === "city-search") {
      const results = $("#city-results");
      results.textContent = "Finding your city…";
      try {
        cityResults = await searchCities(data.get("query"));
        results.innerHTML =
          cityResults
            .map(
              (c, i) =>
                `<button type="button" class="city-result" data-action="choose-city" data-index="${i}">${esc(c.name)} ${icon("plus")}</button>`,
            )
            .join("") ||
          "<p>No cities found. Try a nearby city or a different spelling.</p>";
      } catch (error) {
        results.textContent = error.message;
      }
    }
    if (form.id === "preferences") {
      const next = structuredClone(state);
      next.preferences.comfort = data.get("comfort");
      next.preferences.adventure = Number(data.get("adventure"));
      if (await persist(next)) {
        closeModal();
        regenerate();
        shell();
        toast("Preferences saved.");
      }
    }
    if (form.id === "item-editor") {
      const base = pending.length
        ? pending[pendingIndex]
        : state.items.find((i) => i.id === editorId);
      if (!base) return;
      const item = { ...base };
      for (const key of ["name", "category", "color", "kind", "fit", "status"])
        item[key] = String(data.get(key)).trim();
      if (!item.name) {
        toast("Give this piece a name.");
        return;
      }
      for (const key of ["formality", "warmth", "boldness"])
        item[key] = Number(data.get(key));
      item.waterproof = data.has("waterproof");
      item.delicate = data.has("delicate");
      const next = structuredClone(state);
      if (pending.length) next.items.push(item);
      else next.items = next.items.map((i) => (i.id === item.id ? item : i));
      if (await persist(next)) {
        if (pending.length) {
          pendingIndex++;
          if (pendingIndex < pending.length) {
            editor(pending[pendingIndex], true);
          } else {
            const count = pending.length;
            closeModal();
            regenerate();
            shell();
            toast(`${count} photos reviewed. Your wardrobe is taking shape.`);
          }
        } else {
          closeModal();
          regenerate();
          shell();
          toast("Piece updated.");
        }
      }
    }
    if (form.id === "plan-date-form") {
      const date = data.get("date");
      if (
        validDate(date) &&
        date >= dateKey() &&
        date <= addDays(dateKey(), 365)
      ) {
        selectedDate = date;
        view = "today";
        pin = null;
        closeModal();
        regenerate();
        shell();
      }
    }
  } catch (error) {
    console.error(error);
    toast("Could not save that change. Please try again.");
  } finally {
    if (submit) submit.disabled = false;
  }
});
try {
  state = await load(mode);
} catch (error) {
  storageReady = false;
  state = emptyState(mode === "demo");
  console.error(error);
}
regenerate();
shell();
if (state.preferences.city) updateWeather();
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("./sw.js").catch(() => {});
