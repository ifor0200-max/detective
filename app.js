// ============================================================
// ЛОГИКА ПОИСКА И ФИЛЬТРАЦИИ
// ============================================================

const els = {
  name: document.getElementById("f-name"),
  family: document.getElementById("f-family"),
  ageMin: document.getElementById("f-age-min"),
  ageMax: document.getElementById("f-age-max"),
  status: document.getElementById("f-status"),
  activity: document.getElementById("f-activity"),
  power: document.getElementById("f-power"),
  position: document.getElementById("f-position"),
  gender: document.getElementById("f-gender"),
  results: document.getElementById("results"),
  emptyState: document.getElementById("empty-state"),
  resultsCount: document.getElementById("results-count"),
  resetBtn: document.getElementById("reset-btn")
};

// Эти списки фиксированы (не выводятся из data.js) — таковы допустимые
// значения полей. Значение "-" в данных персонажа означает "не указано"
// и всегда просто не совпадёт ни с одним выбранным фильтром.
const FIXED_OPTIONS = {
  family: ["Аллен", "Крэндалл", "Вурхиз"],
  activity: [
    "Сверхидеальная", "Идеальная", "Хранитель Игровой", "Частичка Игровой",
    "Император Игровой", "Ходячий миф", "Легенда сайта", "Любимый кот",
    "Замечательнейшая", "Замечательная", "Улучшающаяся", "Положительная",
    "Переходная", "Отрицательная", "Ухудшающаяся", "Ужасная", "Ужаснейшая",
    "Забытый кот", "Забывший про игру", "Покинувший игру",
    "Подлежащий удалению", "Пустое место"
  ],
  power: [
    "Блоха", "Котёночек", "Задира", "Гроза детской", "Страх барсуков",
    "Победитель псов", "Защитник племени", "Великий воин",
    "Достоин Львиного племени", "Идеальная"
  ],
  position: [
    "Старший семьи Крэндалл", "Старший семьи Аллен", "Старший семьи Вурхиз",
    "Питомец семьи Крэндалл", "Питомец семьи Аллен", "Питомец семьи Вурхиз",
    "Котенок"
  ],
  gender: ["Кот", "Кошка"]
};

const SELECT_FIELDS_FIXED = [
  { key: "family", el: els.family },
  { key: "activity", el: els.activity },
  { key: "power", el: els.power },
  { key: "position", el: els.position },
  { key: "gender", el: els.gender }
];

// --- Заполняем выпадающие списки ---
function populateSelects() {
  // Статус — единственное поле без фиксированного списка, варианты
  // собираются из того, что реально встречается в data.js
  const statusValues = [...new Set(
    characters.map(c => (c.status || "").trim()).filter(v => v !== "" && v !== "-")
  )].sort((a, b) => a.localeCompare(b, "ru"));

  statusValues.forEach(value => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    els.status.appendChild(opt);
  });

  // Остальные поля — из фиксированных списков допустимых значений
  SELECT_FIELDS_FIXED.forEach(({ key, el }) => {
    FIXED_OPTIONS[key].forEach(value => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = value;
      el.appendChild(opt);
    });
  });
}

// --- Проверка соответствия одного персонажа текущим фильтрам ---
function matchesFilters(c) {
  const name = els.name.value.trim().toLowerCase();
  const family = els.family.value;
  const ageMin = els.ageMin.value !== "" ? Number(els.ageMin.value) : null;
  const ageMax = els.ageMax.value !== "" ? Number(els.ageMax.value) : null;
  const status = els.status.value;
  const activity = els.activity.value;
  const power = els.power.value;
  const position = els.position.value;
  const gender = els.gender.value;

  if (name && !(c.name || "").toLowerCase().includes(name)) return false;
  if (family && c.family !== family) return false;
  if (ageMin !== null && !Number.isNaN(ageMin) && Number(c.age) < ageMin) return false;
  if (ageMax !== null && !Number.isNaN(ageMax) && Number(c.age) > ageMax) return false;
  if (status && c.status !== status) return false;
  if (activity && c.activity !== activity) return false;
  if (power && c.power !== power) return false;
  if (position && c.position !== position) return false;
  if (gender && c.gender !== gender) return false;

  return true;
}

// --- Подбор фото ---
// Расширения, которые перебираются автоматически для фото, подобранного
// по id персонажа (images/<id>.jpg, .png и т.д.)
const PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

function createPlaceholder() {
  const div = document.createElement("div");
  div.className = "card-photo card-photo--placeholder";
  div.textContent = "Нет фото";
  return div;
}

// Возвращает готовый DOM-элемент фото персонажа: <img> с автоматическим
// перебором расширений по id (images/<id>.jpg / .png / ...), либо явный
// c.photo (если указан вручную — имеет приоритет), либо плашку.
function buildPhotoElement(c) {
  const id = (c.id || "").trim();

  if (!c.photo && !id) {
    return createPlaceholder();
  }

  const img = document.createElement("img");
  img.className = "card-photo";
  img.alt = c.name || "";
  img.loading = "lazy";

  if (c.photo) {
    // Фото указано вручную — единственный вариант, при ошибке даём плашку
    img.src = c.photo;
    img.addEventListener("error", () => img.replaceWith(createPlaceholder()), { once: true });
    return img;
  }

  // Фото подбирается по id: перебираем расширения по очереди
  let extIndex = 0;
  const tryNext = () => {
    if (extIndex >= PHOTO_EXTENSIONS.length) {
      img.replaceWith(createPlaceholder());
      return;
    }
    img.src = `images/${id}.${PHOTO_EXTENSIONS[extIndex]}`;
    extIndex += 1;
  };
  img.addEventListener("error", tryNext);
  tryNext();
  return img;
}

// --- Отрисовка одной карточки персонажа ---
function renderCard(c) {
  const card = document.createElement("article");
  card.className = "card";

  card.appendChild(buildPhotoElement(c));

  const body = document.createElement("div");
  body.className = "card-body";
  body.innerHTML = `
    <dl class="card-fields">
      <div><dt>Имя</dt><dd>${escapeHtml(c.name || "—")}</dd></div>
      <div><dt>Возраст</dt><dd>${escapeHtml(String(c.age ?? "—"))}</dd></div>
      <div><dt>Статус</dt><dd>${escapeHtml(c.status || "—")}</dd></div>
      <div><dt>Активность</dt><dd>${escapeHtml(c.activity || "—")}</dd></div>
      <div><dt>БУ</dt><dd>${escapeHtml(c.power || "—")}</dd></div>
      <div><dt>Семья</dt><dd>${escapeHtml(c.family || "—")}</dd></div>
      <div><dt>Должность</dt><dd>${escapeHtml(c.position || "—")}</dd></div>
      <div><dt>Пол</dt><dd>${escapeHtml(c.gender || "—")}</dd></div>
    </dl>
  `;
  card.appendChild(body);

  return card;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// --- Полный цикл перерисовки результатов ---
function renderResults() {
  const filtered = characters.filter(matchesFilters);

  els.results.innerHTML = "";
  filtered.forEach(c => els.results.appendChild(renderCard(c)));

  els.emptyState.hidden = filtered.length !== 0;
  els.resultsCount.textContent = `Найдено: ${filtered.length} из ${characters.length}`;
}

// --- Сброс всех фильтров ---
function resetFilters() {
  els.name.value = "";
  els.family.value = "";
  els.ageMin.value = "";
  els.ageMax.value = "";
  els.status.value = "";
  els.activity.value = "";
  els.power.value = "";
  els.position.value = "";
  els.gender.value = "";
  renderResults();
}

// --- Подписка на события ---
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const debouncedRender = debounce(renderResults, 150);

[els.name, els.ageMin, els.ageMax].forEach(el => {
  el.addEventListener("input", debouncedRender);
});
[els.status, els.family, els.activity, els.power, els.position, els.gender].forEach(el => {
  el.addEventListener("change", renderResults);
});
els.resetBtn.addEventListener("click", resetFilters);

// --- Инициализация ---
populateSelects();
renderResults();
