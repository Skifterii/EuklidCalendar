(() => {
  const pad = n => String(n).padStart(2, "0");
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDate = value => { const [y, m, d] = value.split("-").map(Number); return new Date(y, m - 1, d); };
  const today = new Date();
  const storageKey = "daily-rhythm.entries.v2";
  const starterEntries = buildRoutineEntries();
  let entries = JSON.parse(localStorage.getItem(storageKey) || "null") || starterEntries;
  let selected = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let visibleMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
  let activeFilter = "all";

  function buildRoutineEntries() {
    const items = [];
    const start = new Date(today.getFullYear(), today.getMonth() - 6, 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 19, 0);
    const gymDays = new Set([0, 1, 3, 5]); // Sunday, Monday, Wednesday, Friday
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const day = date.getDay();
      const dateValue = iso(date);
      const add = (slug, type, name) => items.push({ id: `${slug}-${dateValue}`, date: dateValue, type, name, time: "", done: false });
      add("magnesium", "vitamin", "Magnesium");
      add("creatine", "vitamin", "Creatine");
      add("study", "schedule", "Study · 1 hour");
      if (gymDays.has(day)) add("gym", "activity", "Gym");
      if (day >= 1 && day <= 4) add("practice", "activity", "Practice");
      if (day === 0 || day === 6) add("game", "activity", "Game");
    }
    return items;
  }

  const grid = document.querySelector("#calendarGrid");
  const monthTitle = document.querySelector("#monthTitle");
  const weekdayLabel = document.querySelector("#selectedWeekday");
  const dayTitle = document.querySelector("#selectedDayTitle");
  const entryList = document.querySelector("#entryList");
  const dialog = document.querySelector("#entryDialog");
  const form = document.querySelector("#entryForm");
  const dateInput = document.querySelector("#entryDate");
  const ring = document.querySelector("#completionRing");
  const template = document.querySelector("#entryTemplate");

  function save() { localStorage.setItem(storageKey, JSON.stringify(entries)); }
  function entriesFor(date) { return entries.filter(entry => entry.date === date); }
  function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }

  function renderCalendar() {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    monthTitle.innerHTML = `${visibleMonth.toLocaleDateString(undefined, { month: "long" })} <span>${year}</span>`;
    grid.innerHTML = "";
    const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7;
    const start = new Date(year, month, 1 - firstOffset);
    for (let i = 0; i < 42; i++) {
      const date = new Date(start); date.setDate(start.getDate() + i);
      const dateIso = iso(date);
      const dayEntries = entriesFor(dateIso);
      const button = document.createElement("button");
      button.className = "calendar-day";
      if (date.getMonth() !== month) button.classList.add("outside");
      if (dateIso === iso(selected)) button.classList.add("selected");
      if (dateIso === iso(today)) button.classList.add("today");
      button.setAttribute("aria-label", date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }));
      const dots = dayEntries.slice(0, 5).map(entry => `<i class="${entry.type}"></i>`).join("");
      button.innerHTML = `<span class="date-number">${date.getDate()}</span><span class="day-dots">${dots}</span>${dayEntries.length ? `<span class="day-count">${dayEntries.length}</span>` : ""}`;
      button.addEventListener("click", () => { selected = date; if (date.getMonth() !== month) visibleMonth = new Date(date.getFullYear(), date.getMonth(), 1); render(); });
      grid.append(button);
    }
  }

  function renderDay() {
    weekdayLabel.textContent = selected.toLocaleDateString(undefined, { weekday: "long" });
    dayTitle.textContent = selected.toLocaleDateString(undefined, { day: "numeric", month: "long" });
    const all = entriesFor(iso(selected)).sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
    const visible = activeFilter === "all" ? all : all.filter(entry => entry.type === activeFilter);
    entryList.innerHTML = "";
    if (!visible.length) {
      entryList.innerHTML = `<div class="empty-state"><strong>Nothing planned yet</strong>Add an entry to shape this day.</div>`;
    } else {
      visible.forEach(entry => {
        const card = template.content.firstElementChild.cloneNode(true);
        card.dataset.type = entry.type;
        card.classList.toggle("done", entry.done);
        card.querySelector(".entry-type").textContent = entry.type;
        card.querySelector("h3").textContent = entry.name;
        card.querySelector(".entry-time").textContent = entry.time ? formatTime(entry.time) : "Any time";
        card.querySelector(".check").setAttribute("aria-label", entry.done ? `Mark ${entry.name} incomplete` : `Mark ${entry.name} complete`);
        card.querySelector(".check").addEventListener("click", () => { entry.done = !entry.done; save(); render(); });
        card.querySelector(".delete-entry").addEventListener("click", () => { entries = entries.filter(item => item.id !== entry.id); save(); render(); });
        entryList.append(card);
      });
    }
    const completed = all.filter(entry => entry.done).length;
    const percent = all.length ? Math.round(completed / all.length * 100) : 0;
    ring.textContent = `${percent}%`;
    ring.style.setProperty("--progress", `${percent}%`);
    ring.setAttribute("aria-label", `${completed} of ${all.length} completed`);
  }

  function formatTime(value) {
    const [h, m] = value.split(":").map(Number);
    return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  function render() { renderCalendar(); renderDay(); }
  function openEntryDialog() { dateInput.value = iso(selected); dialog.showModal(); setTimeout(() => document.querySelector("#entryName").focus(), 20); }

  document.querySelector("#prevMonth").addEventListener("click", () => { visibleMonth.setMonth(visibleMonth.getMonth() - 1); visibleMonth = new Date(visibleMonth); renderCalendar(); });
  document.querySelector("#nextMonth").addEventListener("click", () => { visibleMonth.setMonth(visibleMonth.getMonth() + 1); visibleMonth = new Date(visibleMonth); renderCalendar(); });
  document.querySelector("#todayButton").addEventListener("click", () => { selected = new Date(today); visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1); render(); });
  document.querySelector("#openDialog").addEventListener("click", openEntryDialog);
  document.querySelector("#panelAdd").addEventListener("click", openEntryDialog);
  document.querySelector("#closeDialog").addEventListener("click", () => dialog.close());
  document.querySelector("#cancelDialog").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  document.querySelectorAll(".filter").forEach(button => button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".filter").forEach(item => { const active = item === button; item.classList.toggle("active", active); item.setAttribute("aria-selected", String(active)); });
    renderDay();
  }));
  form.addEventListener("submit", event => {
    event.preventDefault();
    const entry = { id: uid(), type: document.querySelector("#entryType").value, name: document.querySelector("#entryName").value.trim(), date: dateInput.value, time: document.querySelector("#entryTime").value, done: false };
    if (!entry.name || !entry.date) return;
    entries.push(entry); save(); selected = parseDate(entry.date); visibleMonth = new Date(selected.getFullYear(), selected.getMonth(), 1); form.reset(); dialog.close(); render();
  });

  const context = document.modelContext;
  if (context?.registerTool) {
    const lifecycle = new AbortController();
    Promise.resolve(context.registerTool({
      name: "create_calendar_entry",
      title: "Create calendar entry",
      description: "Create a vitamin, activity, or schedule entry and show it in the Daily Rhythm calendar.",
      inputSchema: { type: "object", properties: { type: { type: "string", enum: ["vitamin", "activity", "schedule"] }, name: { type: "string", minLength: 1, maxLength: 60 }, date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }, time: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" } }, required: ["type", "name", "date"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (!input || !["vitamin", "activity", "schedule"].includes(input.type) || typeof input.name !== "string" || !input.name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("Invalid calendar entry");
        const entry = { id: uid(), type: input.type, name: input.name.trim().slice(0, 60), date: input.date, time: input.time || "", done: false };
        entries.push(entry); save(); selected = parseDate(entry.date); visibleMonth = new Date(selected.getFullYear(), selected.getMonth(), 1); render(); return { id: entry.id, status: "created", date: entry.date };
      }
    }, { signal: lifecycle.signal })).catch(() => {});
  }
  render();
})();
