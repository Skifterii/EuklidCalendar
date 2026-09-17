(() => {
  const pad = n => String(n).padStart(2, "0");
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDate = value => { const [y, m, d] = value.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (date, count) => { const copy = new Date(date); copy.setDate(copy.getDate() + count); return copy; };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = iso(today);
  const storeKey = "rhythm.tracker.v2";
  const previousStoreKey = "rhythm.tracker.v1";
  const previousKeys = ["daily-rhythm.entries.v3", "daily-rhythm.entries.v2"];
  const categories = {
    vitamin: { name: "Supplements", icon: "💊", color: "#ec4f9b", rule: "Complete all" },
    activity: { name: "Activity", icon: "⚡", color: "#20b5b6", rule: "At least one" },
    schedule: { name: "Other", icon: "✦", color: "#8f61e8", rule: "Complete all" }
  };
  const habitRules = { Magnesium: "Every day", Creatine: "Every day", Gym: "Choose 4 days per week", Practice: "Monday–Thursday", Game: "Weekends", "Study · 1 hour": "7 hours per week", "House cleaning": "Every day", "Drink water": "Every day", "Read · 20 minutes": "Every day", "Stretch · 10 minutes": "Every day", "Sleep · 8 hours": "Every day" };
  const habitIcons = { Magnesium: "💊", Creatine: "◈", Gym: "🏋️", Practice: "🏀", Game: "🏆", "Study · 1 hour": "📚", "House cleaning": "🧹", "Drink water": "💧", "Read · 20 minutes": "📖", "Stretch · 10 minutes": "🧘", "Sleep · 8 hours": "🌙" };
  const habitColors = { Magnesium: "#ec4f9b", Creatine: "#8f61e8", Gym: "#20b5b6", Practice: "#38a7e8", Game: "#ff7a21", "Study · 1 hour": "#54ad67", "House cleaning": "#e9a23b", "Drink water": "#3f9ee8", "Read · 20 minutes": "#8f61e8", "Stretch · 10 minutes": "#55b98a", "Sleep · 8 hours": "#6674d9" };
  const goalDefinitions = [
    { name: "Gym", target: 4, label: "Gym sessions this week" },
    { name: "Practice", target: 4, label: "Practice sessions this week" },
    { name: "Game", target: 2, label: "Weekend games this week" },
    { name: "Study · 1 hour", target: 7, label: "Study hours this week" }
  ];

  function buildRoutineEntries() {
    const entries = [];
    const end = new Date(today.getFullYear() + 1, 11, 31);
    for (let date = new Date(today); date <= end; date.setDate(date.getDate() + 1)) {
      const dateValue = iso(date), day = date.getDay();
      const add = (slug, type, name) => entries.push({ id: `${slug}-${dateValue}`, date: dateValue, type, name, time: "", done: false });
      add("magnesium", "vitamin", "Magnesium");
      add("creatine", "vitamin", "Creatine");
      add("study", "schedule", "Study · 1 hour");
      add("gym", "activity", "Gym");
      add("house-cleaning", "activity", "House cleaning");
      add("stretch", "activity", "Stretch · 10 minutes");
      add("water", "schedule", "Drink water");
      add("reading", "schedule", "Read · 20 minutes");
      add("sleep", "schedule", "Sleep · 8 hours");
      if (day >= 1 && day <= 4) add("practice", "activity", "Practice");
      if (day === 0 || day === 6) add("game", "activity", "Game");
    }
    return entries;
  }

  function safeParse(value) { try { return value ? JSON.parse(value) : null; } catch { return null; } }
  function addNewDailyHabits(entries) {
    const upgraded = [...entries];
    const additions = [
      ["gym", "activity", "Gym"], ["house-cleaning", "activity", "House cleaning"], ["stretch", "activity", "Stretch · 10 minutes"],
      ["water", "schedule", "Drink water"], ["reading", "schedule", "Read · 20 minutes"], ["sleep", "schedule", "Sleep · 8 hours"]
    ];
    const end = new Date(today.getFullYear() + 1, 11, 31);
    for (let date = new Date(today); date <= end; date.setDate(date.getDate() + 1)) {
      const dateValue = iso(date);
      additions.forEach(([slug, type, name]) => {
        if (!upgraded.some(entry => entry.date === dateValue && entry.name === name)) upgraded.push({ id: `${slug}-${dateValue}`, date: dateValue, type, name, time: "", done: false });
      });
    }
    return upgraded;
  }
  function loadState() {
    const current = safeParse(localStorage.getItem(storeKey));
    if (current?.entries) return current;
    const previousState = safeParse(localStorage.getItem(previousStoreKey));
    if (previousState?.entries) return { ...previousState, entries: addNewDailyHabits(previousState.entries) };
    const legacy = previousKeys.map(key => safeParse(localStorage.getItem(key))).find(Boolean);
    const entries = (legacy || buildRoutineEntries()).filter(entry => entry.date >= todayIso);
    return { entries, sickDays: [], notes: {}, settings: { theme: "system", weekStartsMonday: true } };
  }

  let state = loadState();
  state.sickDays ||= []; state.notes ||= {}; state.settings ||= { theme: "system", weekStartsMonday: true };
  let selected = new Date(today);
  let monthCursor = new Date(today.getFullYear(), today.getMonth(), 1);
  let yearCursor = today.getFullYear();
  const app = document.querySelector("#app");
  const importFile = document.querySelector("#importFile");
  const save = () => localStorage.setItem(storeKey, JSON.stringify(state));
  const entriesFor = date => state.entries.filter(entry => entry.date === iso(date));
  const completedFor = date => entriesFor(date).filter(entry => entry.done);
  const percentFor = date => { const all = entriesFor(date); return all.length ? Math.round(completedFor(date).length / all.length * 100) : 0; };
  function statusFor(date) {
    if (state.sickDays.includes(iso(date))) return "status-sick";
    const all = entriesFor(date), done = all.filter(entry => entry.done).length;
    if (!all.length || !done) return "";
    const ratio = done / all.length;
    if (ratio === 1) return "status-complete";
    if (ratio >= .75) return "status-high";
    if (ratio >= .5) return "status-mid";
    return "status-low";
  }
  const formatDate = (date, options) => date.toLocaleDateString(undefined, options);
  const route = () => ["today", "month", "year", "goals", "habits", "settings"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "today";
  function startOfWeek(date) { const copy = new Date(date); copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7)); return copy; }
  function categoryMet(type, items) { return !!items.length && (type === "activity" ? items.some(entry => entry.done) : items.every(entry => entry.done)); }
  function applyTheme() {
    const preference = state.settings.theme || "system";
    const dark = preference === "dark" || (preference === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }
  function pageHead(eyebrow, title, actions = "") { return `<header class="page-head"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1></div>${actions}</header>`; }
  function renderProgress(entries) { return `<div class="segmented-progress" style="grid-template-columns:repeat(${Math.max(entries.length, 1)},1fr)">${entries.length ? entries.map(entry => `<i class="${entry.done ? "done" : ""}"></i>`).join("") : "<i></i>"}</div>`; }
  function habitRow(entry) {
    const icon = habitIcons[entry.name] || categories[entry.type].icon;
    return `<label class="habit-row" data-entry-id="${entry.id}"><span class="habit-icon" style="background:${habitColors[entry.name] || categories[entry.type].color}18">${icon}</span><span class="habit-copy"><strong>${entry.name}</strong><small>${habitRules[entry.name] || (entry.time || "Scheduled")}</small></span><input type="checkbox" ${entry.done ? "checked" : ""} aria-label="${entry.name}, ${entry.done ? "completed" : "not completed"}"><span class="round-check" aria-hidden="true">✓</span></label>`;
  }
  function habitGroups(date) {
    const all = entriesFor(date);
    if (!all.length) return `<div class="empty-state"><strong>Nothing scheduled</strong><br>This day has no routines.</div>`;
    return Object.entries(categories).map(([type, category]) => {
      const items = all.filter(entry => entry.type === type); if (!items.length) return "";
      return `<section class="category"><div class="category-head"><h3>${category.name}</h3><span class="muted">${items.filter(entry => entry.done).length} / ${items.length}</span></div><div class="habit-list">${items.map(habitRow).join("")}</div></section>`;
    }).join("");
  }
  function wireHabitChecks() {
    app.querySelectorAll(".habit-row input").forEach(input => input.addEventListener("change", event => {
      const id = event.currentTarget.closest(".habit-row").dataset.entryId;
      const entry = state.entries.find(item => item.id === id); if (entry) entry.done = event.currentTarget.checked;
      save(); render();
    }));
  }

  function renderToday() {
    const dateEntries = entriesFor(selected), completed = dateEntries.filter(entry => entry.done).length;
    const percent = dateEntries.length ? Math.round(completed / dateEntries.length * 100) : 0;
    const met = Object.keys(categories).filter(type => categoryMet(type, dateEntries.filter(entry => entry.type === type))).length;
    const dates = Array.from({ length: 14 }, (_, index) => addDays(today, index - 13));
    app.innerHTML = `${pageHead(formatDate(selected, { weekday: "long" }), formatDate(selected, { month: "long", day: "numeric" }).toUpperCase())}
      <div class="date-strip">${dates.map(date => `<button class="date-pill ${statusFor(date)} ${iso(date) === iso(selected) ? "selected" : ""}" data-date="${iso(date)}"><span class="dow">${formatDate(date, { weekday: "narrow" })}</span><span class="num">${date.getDate()}</span><span class="mini-track"><i style="width:${percentFor(date)}%"></i></span></button>`).join("")}</div>
      <section class="card today-card ${statusFor(selected)}">${state.sickDays.includes(iso(selected)) ? `<div class="status-banner">🤒 Sick day marked — this date is now red on your calendar.</div>` : ""}<p class="card-kicker">Today's habits</p><div class="progress-head"><span>${completed} / ${dateEntries.length} completed</span><span class="muted">${percent}% today</span></div>${renderProgress(dateEntries)}<p class="category-goals">${met} of ${Object.keys(categories).length} category goals met</p>${habitGroups(selected)}<div class="today-actions"><button class="soft-button" id="addNote">${state.notes[iso(selected)] ? "Edit note" : "Add a note"}</button><button class="soft-button" id="markMoment">Mark a moment</button></div></section>
      <button class="sick-toggle ${state.sickDays.includes(iso(selected)) ? "active" : ""}" id="sickToggle">🤒 Feeling sick${state.sickDays.includes(iso(selected)) ? " · Marked" : ""}</button>`;
    app.querySelectorAll(".date-pill").forEach(button => button.addEventListener("click", () => { selected = parseDate(button.dataset.date); render(); }));
    document.querySelector("#sickToggle").addEventListener("click", () => { const value = iso(selected); state.sickDays = state.sickDays.includes(value) ? state.sickDays.filter(day => day !== value) : [...state.sickDays, value]; save(); render(); });
    document.querySelector("#addNote").addEventListener("click", () => { const value = prompt("Note for this day", state.notes[iso(selected)] || ""); if (value !== null) { state.notes[iso(selected)] = value.trim(); save(); render(); } });
    document.querySelector("#markMoment").addEventListener("click", () => { state.notes[iso(selected)] = [state.notes[iso(selected)], "★ Moment marked"].filter(Boolean).join("\n"); save(); render(); });
    wireHabitChecks();
  }

  function monthStats() {
    const prefix = `${monthCursor.getFullYear()}-${pad(monthCursor.getMonth() + 1)}`;
    const monthEntries = state.entries.filter(entry => entry.date.startsWith(prefix) && entry.date <= todayIso), completions = monthEntries.filter(entry => entry.done);
    const activeDays = new Set(completions.map(entry => entry.date)).size;
    const perfectDays = [...new Set(monthEntries.map(entry => entry.date))].filter(date => { const items = state.entries.filter(entry => entry.date === date); return items.length && items.every(entry => entry.done); }).length;
    const counts = completions.reduce((map, entry) => map.set(entry.name, (map.get(entry.name) || 0) + 1), new Map());
    return { completions: completions.length, activeDays, perfectDays, mostLogged: [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "—" };
  }
  function renderMonth() {
    const stats = monthStats(), year = monthCursor.getFullYear(), month = monthCursor.getMonth();
    const offset = (new Date(year, month, 1).getDay() + 6) % 7, days = new Date(year, month + 1, 0).getDate();
    const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1))]; while (cells.length % 7) cells.push(null);
    const actions = `<div><button class="icon-button" id="prevMonth" aria-label="Previous month">‹</button> <button class="icon-button" id="nextMonth" aria-label="Next month" ${year === today.getFullYear() && month === today.getMonth() ? "disabled" : ""}>›</button></div>`;
    app.innerHTML = `${pageHead(year, formatDate(monthCursor, { month: "long" }), actions)}<section class="stats-grid"><div class="card stat"><p class="card-kicker">Completions</p><strong>${stats.completions}</strong><small>items checked</small></div><div class="card stat"><p class="card-kicker">Active days</p><strong>${stats.activeDays}</strong><small>days with progress</small></div><div class="card stat"><p class="card-kicker">Perfect days</p><strong>${stats.perfectDays}</strong><small>every item met</small></div><div class="card stat"><p class="card-kicker">Most logged</p><strong>${stats.mostLogged}</strong><small>this month</small></div></section>
      <div class="status-legend"><span><i class="legend-low"></i>Started</span><span><i class="legend-mid"></i>Halfway</span><span><i class="legend-high"></i>Almost done</span><span><i class="legend-complete"></i>Complete</span><span><i class="legend-sick"></i>Sick</span></div><div class="month-layout"><section class="card month-card"><div class="weekday-row"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div><div class="month-grid">${cells.map(date => date ? `<button class="month-day ${statusFor(date)} ${iso(date) === iso(selected) ? "selected" : ""}" data-date="${iso(date)}" ${date > today ? "disabled" : ""}>${date.getDate()}<span class="day-progress"><i style="width:${percentFor(date)}%"></i></span></button>` : `<span class="month-day outside"></span>`).join("")}</div></section><aside class="card compact-card ${statusFor(selected)}">${state.sickDays.includes(iso(selected)) ? `<div class="status-banner">🤒 Sick day marked</div>` : ""}<p class="card-kicker">${iso(selected) === todayIso ? "Today" : formatDate(selected, { weekday: "long" })}</p><h2>${formatDate(selected, { weekday: "long", month: "long", day: "numeric" })}</h2>${habitGroups(selected)}</aside></div>`;
    document.querySelector("#prevMonth").addEventListener("click", () => { monthCursor = new Date(year, month - 1, 1); selected = new Date(monthCursor); render(); });
    document.querySelector("#nextMonth").addEventListener("click", () => { monthCursor = new Date(year, month + 1, 1); selected = monthCursor > today ? new Date(today) : new Date(monthCursor); render(); });
    app.querySelectorAll(".month-day[data-date]").forEach(button => button.addEventListener("click", () => { selected = parseDate(button.dataset.date); render(); })); wireHabitChecks();
  }

  const allHabitNames = () => [...new Set(state.entries.map(entry => entry.name))];
  function renderYear() {
    const yearEntries = state.entries.filter(entry => entry.date.startsWith(`${yearCursor}-`) && entry.date <= todayIso), completions = yearEntries.filter(entry => entry.done), activeDays = new Set(completions.map(entry => entry.date)).size;
    const weeks = Array.from({ length: 53 }, (_, i) => addDays(new Date(yearCursor, 0, 1), i * 7));
    const rows = Object.entries(categories).map(([type, category]) => `<p class="year-category">${category.name}</p>${allHabitNames().filter(name => state.entries.some(entry => entry.name === name && entry.type === type)).map(name => `<div class="year-row"><strong><span style="color:${habitColors[name] || category.color}">■</span> ${name}</strong>${weeks.map(week => { const weekEnd = addDays(week, 6), done = state.entries.some(entry => entry.name === name && entry.done && parseDate(entry.date) >= week && parseDate(entry.date) <= weekEnd); return `<i class="year-cell ${done ? "done" : ""} ${week > today ? "future" : ""}" style="--cell-color:${habitColors[name] || category.color}" title="Week of ${iso(week)}"></i>`; }).join("")}</div>`).join("")}`).join("");
    const actions = `<div><button class="icon-button" id="prevYear" aria-label="Previous year">‹</button> <button class="icon-button" id="nextYear" aria-label="Next year" ${yearCursor === today.getFullYear() ? "disabled" : ""}>›</button></div>`;
    app.innerHTML = `${pageHead("The whole year", yearCursor, actions)}<section class="stats-grid"><div class="card stat"><p class="card-kicker">Completions</p><strong>${completions.length}</strong><small>this year</small></div><div class="card stat"><p class="card-kicker">Consistency</p><strong>${yearEntries.length ? Math.round(completions.length / yearEntries.length * 100) : 0}%</strong><small>scheduled items</small></div><div class="card stat"><p class="card-kicker">Active days</p><strong>${activeDays}</strong><small>days tracked</small></div><div class="card stat"><p class="card-kicker">Best month</p><strong>—</strong><small>appears with more data</small></div></section><section class="card year-sheet"><p class="card-kicker">One row per item</p><p class="muted">Every item you complete fills its own square. Your year grows from here.</p>${rows}</section>`;
    document.querySelector("#prevYear").addEventListener("click", () => { yearCursor--; render(); }); document.querySelector("#nextYear").addEventListener("click", () => { yearCursor++; render(); });
  }
  function renderGoals() {
    const weekStart = startOfWeek(today), weekEnd = addDays(weekStart, 6);
    const goals = goalDefinitions.map(goal => ({ ...goal, progress: state.entries.filter(entry => entry.name === goal.name && entry.done && parseDate(entry.date) >= weekStart && parseDate(entry.date) <= weekEnd).length }));
    app.innerHTML = `${pageHead(`${goals.filter(goal => goal.progress < goal.target).length} in progress`, "Goals")}<div class="goal-list">${goals.map(goal => `<section class="card goal-card"><div class="goal-top"><div><h3>${goal.label}</h3><p class="muted">Resets every Monday</p></div><strong>${goal.progress} / ${goal.target}</strong></div><div class="bar"><i style="width:${Math.min(100, goal.progress / goal.target * 100)}%"></i></div></section>`).join("")}</div>`;
  }
  function renderHabits() {
    app.innerHTML = `${pageHead(`${Object.keys(categories).length} categories · ${allHabitNames().length} items`, "Habits")}<div class="manage-list">${Object.entries(categories).map(([type, category]) => { const names = allHabitNames().filter(name => state.entries.some(entry => entry.name === name && entry.type === type)); return `<section class="card manage-category"><p class="card-kicker">${category.rule}</p><h2>${category.name}</h2>${names.map(name => `<div class="manage-item"><div><strong>${habitIcons[name] || category.icon} ${name}</strong><br><small>${habitRules[name] || "Scheduled"}</small></div><span class="muted">Active</span></div>`).join("")}</section>`; }).join("")}</div>`;
  }
  function renderSettings() {
    const preference = state.settings.theme || "system";
    app.innerHTML = `${pageHead("Preferences", "Settings")}<div class="settings-grid"><section class="card settings-section"><h2>Appearance</h2><div class="setting-row"><div><strong>Theme</strong><p>Light is the primary design; dark uses soft charcoal.</p></div><div class="choice-group">${["light", "dark", "system"].map(value => `<label><input type="radio" name="theme" value="${value}" ${preference === value ? "checked" : ""}><span>${value[0].toUpperCase() + value.slice(1)}</span></label>`).join("")}</div></div></section><section class="card settings-section"><h2>Your data</h2><p class="muted">Everything stays in this browser. Export regularly so you have a backup.</p><div class="today-actions"><button class="soft-button" id="exportData">Export JSON</button><button class="soft-button" id="importData">Import JSON</button></div></section><section class="card settings-section"><h2 class="danger">Reset</h2><div class="setting-row"><div><strong>Clear all history</strong><p>Unchecks every completion while keeping your routines.</p></div><button class="soft-button danger" id="clearHistory">Clear</button></div><div class="setting-row"><div><strong>Reset everything</strong><p>Returns the tracker to its original routines and settings.</p></div><button class="soft-button danger" id="resetEverything">Reset</button></div></section></div>`;
    app.querySelectorAll("input[name=theme]").forEach(input => input.addEventListener("change", () => { state.settings.theme = input.value; save(); applyTheme(); }));
    document.querySelector("#exportData").addEventListener("click", () => { const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }), link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `rhythm-backup-${todayIso}.json`; link.click(); URL.revokeObjectURL(link.href); });
    document.querySelector("#importData").addEventListener("click", () => importFile.click());
    document.querySelector("#clearHistory").addEventListener("click", () => { if (confirm("Clear all completion history?")) { state.entries.forEach(entry => entry.done = false); state.notes = {}; state.sickDays = []; save(); render(); } });
    document.querySelector("#resetEverything").addEventListener("click", () => { if (confirm("Reset all tracker data?")) { state = { entries: buildRoutineEntries(), sickDays: [], notes: {}, settings: { theme: "system", weekStartsMonday: true } }; save(); applyTheme(); render(); } });
  }
  importFile.addEventListener("change", async () => { const file = importFile.files?.[0]; if (!file) return; const imported = safeParse(await file.text()); if (imported?.entries && Array.isArray(imported.entries)) { state = imported; save(); applyTheme(); render(); } importFile.value = ""; });
  function render() {
    document.querySelectorAll("nav a").forEach(link => link.classList.toggle("active", link.dataset.route === route()));
    document.querySelector(".sick-toggle")?.remove();
    ({ today: renderToday, month: renderMonth, year: renderYear, goals: renderGoals, habits: renderHabits, settings: renderSettings })[route()]();
  }
  window.addEventListener("hashchange", render);
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", applyTheme);
  applyTheme(); save(); render();
})();
