// Real-time currency conversion — synced multi-currency input board.
// Apple-style dark UI · multilingual (default English) · circular flag icons.
//
// - Rates for ALL currencies are fetched once against USD from the
//   ExchangeRate-API open endpoint (free, no API key).
// - Every row shows a circular flag (or a symbol badge for non-country
//   currencies such as XAU/BTC) and its own input box. Typing in ANY box
//   makes it the anchor; every other box is recomputed from it and the
//   anchor box itself is never overwritten.
// - Currencies are added from a flag picker (no dropdowns in the rows),
//   removed with the ✕ on each row; the list persists in localStorage.
// - The interface language can be switched at the top right; currency
//   names come from Intl.DisplayNames in the chosen language.
const API = "https://open.er-api.com/v6/latest/USD";
const REF = "USD";
const FLAG_CDN = "flags/";  // self-hosted in this repo (no external CDN)
const STORE_LIST = "rtcc.watchlist.v3";
const STORE_LANG = "rtcc.lang.v1";

// ---------- i18n ----------
const LANGS = [
  ["en", "English"], ["zh-CN", "简体中文"], ["zh-TW", "繁體中文"],
  ["ja", "日本語"], ["ko", "한국어"], ["es", "Español"], ["fr", "Français"],
  ["de", "Deutsch"], ["pt", "Português"], ["it", "Italiano"],
  ["ru", "Русский"], ["ar", "العربية"],
];
const STR = {
  title:   { en: "Currency Converter", "zh-CN": "货币换算", "zh-TW": "貨幣換算", ja: "通貨コンバーター", ko: "환율 계산기", es: "Conversor de divisas", fr: "Convertisseur de devises", de: "Währungsrechner", pt: "Conversor de moedas", it: "Convertitore di valuta", ru: "Конвертер валют", ar: "محول العملات" },
  sub:     { en: "Type in any box — all other currencies update instantly at the live rate.", "zh-CN": "在任意输入框输入金额，其它货币按实时汇率立即同步变化。", "zh-TW": "在任意輸入框輸入金額，其它貨幣按即時匯率立即同步變化。", ja: "任意の欄に入力すると、他の通貨がライブレートで即座に更新されます。", ko: "아무 칸에나 입력하면 다른 통화가 실시간 환율로 즉시 바뀝니다.", es: "Escribe en cualquier casilla: el resto se actualiza al instante con el tipo en vivo.", fr: "Saisissez un montant dans n'importe quel champ : les autres devises se mettent à jour instantanément.", de: "Betrag in ein beliebiges Feld eingeben — alle anderen Währungen aktualisieren sich sofort zum Live-Kurs.", pt: "Digite em qualquer campo — as outras moedas atualizam instantaneamente à taxa ao vivo.", it: "Digita in qualsiasi casella: le altre valute si aggiornano subito al tasso live.", ru: "Введите сумму в любое поле — остальные валюты мгновенно обновятся по живому курсу.", ar: "اكتب في أي خانة — تتحدث العملات الأخرى فورًا بالسعر المباشر." },
  add:     { en: "＋ Add currency", "zh-CN": "＋ 添加货币", "zh-TW": "＋ 添加貨幣", ja: "＋ 通貨を追加", ko: "＋ 통화 추가", es: "＋ Añadir divisa", fr: "＋ Ajouter une devise", de: "＋ Währung hinzufügen", pt: "＋ Adicionar moeda", it: "＋ Aggiungi valuta", ru: "＋ Добавить валюту", ar: "＋ إضافة عملة" },
  refresh: { en: "↻ Refresh rates", "zh-CN": "↻ 刷新汇率", "zh-TW": "↻ 重新整理匯率", ja: "↻ レート更新", ko: "↻ 환율 새로고침", es: "↻ Actualizar tasas", fr: "↻ Actualiser les taux", de: "↻ Kurse aktualisieren", pt: "↻ Atualizar taxas", it: "↻ Aggiorna tassi", ru: "↻ Обновить курсы", ar: "↻ تحديث الأسعار" },
  picker:  { en: "Add currency", "zh-CN": "添加货币", "zh-TW": "添加貨幣", ja: "通貨を追加", ko: "통화 추가", es: "Añadir divisa", fr: "Ajouter une devise", de: "Währung hinzufügen", pt: "Adicionar moeda", it: "Aggiungi valuta", ru: "Добавить валюту", ar: "إضافة عملة" },
  search:  { en: "Search code or name", "zh-CN": "搜索代码或名称", "zh-TW": "搜尋代碼或名稱", ja: "コードまたは名前で検索", ko: "코드 또는 이름 검색", es: "Buscar código o nombre", fr: "Rechercher un code ou un nom", de: "Code oder Name suchen", pt: "Pesquisar código ou nome", it: "Cerca codice o nome", ru: "Поиск по коду или названию", ar: "ابحث بالرمز أو الاسم" },
  updated: { en: "Rates last updated: {t} · Source: ExchangeRate-API · Auto-refresh every 60s", "zh-CN": "汇率更新时间：{t} · 数据来源：ExchangeRate-API · 每 60 秒自动刷新", "zh-TW": "匯率更新時間：{t} · 資料來源：ExchangeRate-API · 每 60 秒自動重新整理", ja: "レート更新：{t} · 出典：ExchangeRate-API · 60秒ごとに自動更新", ko: "환율 업데이트: {t} · 출처: ExchangeRate-API · 60초마다 자동 새로고침", es: "Tasas actualizadas: {t} · Fuente: ExchangeRate-API · Actualización automática cada 60 s", fr: "Taux mis à jour : {t} · Source : ExchangeRate-API · Actualisation auto toutes les 60 s", de: "Kurse aktualisiert: {t} · Quelle: ExchangeRate-API · Auto-Aktualisierung alle 60 s", pt: "Taxas atualizadas: {t} · Fonte: ExchangeRate-API · Atualização automática a cada 60 s", it: "Tassi aggiornati: {t} · Fonte: ExchangeRate-API · Aggiornamento automatico ogni 60 s", ru: "Курсы обновлены: {t} · Источник: ExchangeRate-API · Автообновление каждые 60 с", ar: "آخر تحديث للأسعار: {t} · المصدر: ExchangeRate-API · تحديث تلقائي كل 60 ثانية" },
  del:     { en: "Delete", "zh-CN": "删除", "zh-TW": "刪除", ja: "削除", ko: "삭제", es: "Eliminar", fr: "Supprimer", de: "Löschen", pt: "Excluir", it: "Elimina", ru: "Удалить", ar: "حذف" },
  hint:    { en: "Swipe left on a row to delete · Long-press a row and drag to reorder", "zh-CN": "左滑一行删除 · 长按一行拖动排序", "zh-TW": "左滑一行刪除 · 長按一行拖動排序", ja: "行を左スワイプで削除 · 長押ししてドラッグで並べ替え", ko: "행을 왼쪽으로 밀어 삭제 · 길게 눌러 드래그하면 순서 변경", es: "Desliza a la izquierda para eliminar · Mantén pulsado y arrastra para reordenar", fr: "Glisser vers la gauche pour supprimer · Appui long puis glisser pour réordonner", de: "Zum Löschen nach links wischen · Lange drücken und ziehen zum Sortieren", pt: "Deslize para a esquerda para excluir · Pressione e arraste para reordenar", it: "Scorri a sinistra per eliminare · Premi a lungo e trascina per riordinare", ru: "Свайп влево — удалить · Долгое нажатие и перетаскивание — изменить порядок", ar: "اسحب لليسار للحذف · اضغط مطولًا واسحب لإعادة الترتيب" },
  ref:     { en: "reference", "zh-CN": "基准", "zh-TW": "基準", ja: "基準", ko: "기준", es: "referencia", fr: "référence", de: "Referenz", pt: "referência", it: "riferimento", ru: "базовая", ar: "مرجع" },
  loadErr: { en: "Could not load rates: ", "zh-CN": "汇率加载失败：", "zh-TW": "匯率載入失敗：", ja: "レートを読み込めませんでした：", ko: "환율을 불러오지 못했습니다: ", es: "No se pudieron cargar las tasas: ", fr: "Impossible de charger les taux : ", de: "Kurse konnten nicht geladen werden: ", pt: "Não foi possível carregar as taxas: ", it: "Impossibile caricare i tassi: ", ru: "Не удалось загрузить курсы: ", ar: "تعذر تحميل الأسعار: " },
};
let lang = localStorage.getItem(STORE_LANG) || "en";
const t = (key) => (STR[key] && (STR[key][lang] || STR[key].en)) || key;

function currencyName(code) {
  try { return new Intl.DisplayNames([lang], { type: "currency" }).of(code) || code; }
  catch (e) { return code; }
}

// ---------- flags ----------
// Currency -> ISO country code for the circle-flags set. Currencies with no
// country (metals, crypto, SDR…) get a circular symbol badge instead.
const FLAG = { USD:"us", CNY:"cn", EUR:"eu", JPY:"jp", GBP:"gb", HKD:"hk", AUD:"au", CAD:"ca", CHF:"ch", NZD:"nz", SGD:"sg", KRW:"kr", INR:"in", TRY:"tr", RUB:"ru", BRL:"br", ZAR:"za", MXN:"mx", TWD:"tw", THB:"th", MYR:"my", IDR:"id", PHP:"ph", VND:"vn", AED:"ae", SAR:"sa", QAR:"qa", KWD:"kw", BHD:"bh", OMR:"om", JOD:"jo", ILS:"il", EGP:"eg", NGN:"ng", KES:"ke", GHS:"gh", MAD:"ma", DZD:"dz", TND:"tn", PLN:"pl", SEK:"se", NOK:"no", DKK:"dk", HUF:"hu", CZK:"cz", RON:"ro", BGN:"bg", HRK:"hr", ISK:"is", UAH:"ua", RSD:"rs", ARS:"ar", CLP:"cl", COP:"co", PEN:"pe", UYU:"uy", DOP:"do", GTQ:"gt", CRC:"cr", PAB:"pa", JMD:"jm", TTD:"tt", BMD:"bm", KYD:"ky", BBD:"bb", BSD:"bs", BZD:"bz", XCD:"ag", AWG:"aw", ANG:"cw", SRD:"sr", GYD:"gy", PKR:"pk", BDT:"bd", LKR:"lk", NPR:"np", MMK:"mm", KHR:"kh", LAK:"la", BND:"bn", MOP:"mo", MNT:"mn", KZT:"kz", UZS:"uz", TMT:"tm", AZN:"az", GEL:"ge", AMD:"am", MDL:"md", BYN:"by", LBP:"lb", IQD:"iq", IRR:"ir", AFN:"af", SDG:"sd", SSP:"ss", ETB:"et", AOA:"ao", MZN:"mz", ZMW:"zm", UGX:"ug", TZS:"tz", XOF:"sn", XAF:"cm", CDF:"cd", MGA:"mg", MUR:"mu", SCR:"sc", BWP:"bw", NAD:"na", SZL:"sz", LSL:"ls", MWK:"mw", GMD:"gm", GNF:"gn", SLL:"sl", LRD:"lr", UYU:"uy", BOB:"bo", PYG:"py", VES:"ve", CUP:"cu", NIO:"ni", HNL:"hn", SVC:"sv", FJD:"fj", PGK:"pg", SBD:"sb", TOP:"to", VUV:"vu", WST:"ws", SRD:"sr", MKD:"mk", ALL:"al", BAM:"ba", MKD:"mk", TJS:"tj", KGS:"kg", RSD:"rs", MGA:"mg", ERN:"er", DJF:"dj", SOS:"so", KMF:"km", CVE:"cv", STN:"st", MRU:"mr", SYP:"sy", YER:"ye", LYD:"ly", AWG:"aw", FKP:"fk", GIP:"gi", SHP:"sh", XPF:"pf", BTN:"bt", MVR:"mv", PAB:"pa", HTG:"ht" };
const BADGE = { XAU: ["Au", "#c9a227"], XAG: ["Ag", "#9aa5b1"], XPT: ["Pt", "#7d8590"], XPD: ["Pd", "#7d8590"], BTC: ["₿", "#f7931a"], ETH: ["Ξ", "#627eea"], XEU: ["€", "#003399"] };

function flagNode(code, cls = "flag") {
  const cc = FLAG[code];
  if (cc) {
    const img = document.createElement("img");
    img.className = cls; img.alt = code; img.loading = "lazy"; img.draggable = false;
    img.src = FLAG_CDN + cc + ".svg";
    img.onerror = () => img.replaceWith(badgeNode(code, cls));
    return img;
  }
  return badgeNode(code, cls);
}
function badgeNode(code, cls = "flag") {
  const [sym, color] = BADGE[code] || [code.slice(0, 2), "#48484a"];
  const d = document.createElement("div");
  d.className = cls === "flag" ? "flag-badge" : "flag-badge";
  d.style.background = color; d.textContent = sym; d.title = code;
  return d;
}

// ---------- state ----------
let rates = {};
let updatedUtc = "";
let watchlist = loadWatchlist();
let anchor = { code: REF, raw: "100" };

const $ = (id) => document.getElementById(id);
function loadWatchlist() {
  try { const s = JSON.parse(localStorage.getItem(STORE_LIST)); if (Array.isArray(s) && s.length) return s; } catch (e) {}
  return ["USD", "CNY", "EUR", "JPY", "GBP", "HKD"];
}
function saveWatchlist() { try { localStorage.setItem(STORE_LIST, JSON.stringify(watchlist)); } catch (e) {} }

function toInputValue(x) {
  if (!isFinite(x)) return "";
  if (x === 0) return "0";
  const ax = Math.abs(x);
  const digits = ax >= 1000 ? 2 : ax >= 1 ? 4 : ax >= 0.01 ? 6 : 8;
  return String(parseFloat(x.toFixed(digits)));
}
const convert = (v, from, to) => v / rates[from] * rates[to];

function syncFromAnchor() {
  const value = parseFloat(anchor.raw);
  document.querySelectorAll(".amount").forEach(input => {
    const code = input.dataset.code;
    if (code === anchor.code) return;
    input.value = (anchor.raw === "" || isNaN(value)) ? "" : toInputValue(convert(value, anchor.code, code));
  });
}

// ---------- board ----------
// Each row lives in a .swipe wrapper with a Delete button behind it:
//  - swipe left reveals Delete (iOS style), tap Delete to remove the row
//  - long-press (450ms) picks the row up; drag vertically to reorder
function deleteCurrency(code) {
  if (watchlist.length <= 1) return;
  watchlist = watchlist.filter(c => c !== code);
  if (anchor.code === code) anchor = { code: watchlist[0], raw: "100" };
  saveWatchlist(); renderBoard();
}

function closeAllSwipes(except) {
  document.querySelectorAll(".swipe.open").forEach(w => {
    if (w !== except) { w.classList.remove("open"); w.querySelector(".currency-row").style.transform = ""; }
  });
}

function attachGestures(wrap, row, code) {
  let startX = 0, startY = 0, dx = 0, dy = 0, baseX = 0;
  let mode = null;            // null | "swipe" | "drag"
  let longTimer = null, moved = false;
  const DEL_W = 84;
  row.addEventListener("contextmenu", (e) => e.preventDefault());

  row.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".del-btn")) return;
    closeAllSwipes(wrap);
    startX = e.clientX; startY = e.clientY; dx = 0; dy = 0; moved = false; mode = null;
    baseX = wrap.classList.contains("open") ? -DEL_W : 0;
    row.setPointerCapture && row.setPointerCapture(e.pointerId);
    longTimer = setTimeout(() => {
      if (moved) return;
      mode = "drag";
      row.style.touchAction = "none";
      row.classList.add("dragging");
      wrap.classList.add("drag-wrap");
      if (navigator.vibrate) navigator.vibrate(10);
      const inp = row.querySelector(".amount"); if (inp) inp.blur();
    }, 450);
  });

  row.addEventListener("pointermove", (e) => {
    if (!startX && startX !== 0) return;
    dx = e.clientX - startX; dy = e.clientY - startY;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      moved = true;
      if (longTimer) { /* keep timer: a slow hold that drifts a little still counts */ }
    }
    if (mode === "drag") {
      e.preventDefault();
      row.style.transform = `translateY(${dy}px)`;
      // Swap with the sibling whose middle the pointer has crossed.
      const board = $("board");
      const others = [...board.querySelectorAll(".swipe:not(.drag-wrap)")];
      for (const sib of others) {
        const r = sib.getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2 && wrap.compareDocumentPosition(sib) & Node.DOCUMENT_POSITION_PRECEDING) {
          board.insertBefore(wrap, sib); startY += r.height; dy = e.clientY - startY;
          row.style.transform = `translateY(${dy}px)`; break;
        }
        if (e.clientY > r.top + r.height / 2 && wrap.compareDocumentPosition(sib) & Node.DOCUMENT_POSITION_FOLLOWING) {
          board.insertBefore(wrap, sib.nextSibling); startY -= r.height; dy = e.clientY - startY;
          row.style.transform = `translateY(${dy}px)`; break;
        }
      }
    } else if (mode !== "swipe" && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      mode = "swipe";
      if (longTimer) { clearTimeout(longTimer); longTimer = null; }
      row.style.transition = "none";
    }
    if (mode === "swipe") {
      const x = Math.max(-DEL_W, Math.min(0, baseX + dx));
      row.style.transform = `translateX(${x}px)`;
    }
  });

  const end = (e) => {
    if (longTimer) { clearTimeout(longTimer); longTimer = null; }
    row.style.touchAction = "";
    if (mode === "drag") {
      row.classList.remove("dragging"); wrap.classList.remove("drag-wrap");
      row.style.transform = "";
      watchlist = [...$("board").querySelectorAll(".swipe")].map(w => w.dataset.code);
      saveWatchlist(); renderBoard();
    } else if (mode === "swipe") {
      row.style.transition = "";
      const x = baseX + dx;
      if (x < -DEL_W / 2) { wrap.classList.add("open"); row.style.transform = `translateX(${-DEL_W}px)`; }
      else { wrap.classList.remove("open"); row.style.transform = ""; }
    } else if (wrap.classList.contains("open") && Math.abs(dx) < 5 && Math.abs(dy) < 5) {
      wrap.classList.remove("open"); row.style.transform = "";   // tap closes an open row
    }
    mode = null; startX = NaN;
  };
  row.addEventListener("pointerup", end);
  row.addEventListener("pointercancel", end);
}

function renderBoard() {
  const board = $("board");
  board.innerHTML = "";
  for (const code of watchlist) {
    const wrap = document.createElement("div");
    wrap.className = "swipe"; wrap.dataset.code = code;

    const del = document.createElement("button");
    del.className = "del-btn"; del.textContent = t("del");
    del.addEventListener("click", () => deleteCurrency(code));
    wrap.appendChild(del);

    const row = document.createElement("div");
    row.className = "currency-row";
    row.appendChild(flagNode(code));

    const meta = document.createElement("div");
    meta.className = "meta";
    const hint = code === REF ? t("ref") : `1 ${REF} = ${rates[code]}`;
    meta.innerHTML = `<div class="code">${code}</div><div class="name"></div><div class="hint">${hint}</div>`;
    meta.querySelector(".name").textContent = currencyName(code);
    row.appendChild(meta);

    const input = document.createElement("input");
    input.className = "amount"; input.dataset.code = code;
    input.type = "number"; input.min = "0"; input.step = "any";
    input.inputMode = "decimal"; input.placeholder = "0";
    input.setAttribute("aria-label", code);
    input.addEventListener("input", () => { anchor = { code, raw: input.value }; syncFromAnchor(); });
    row.appendChild(input);

    wrap.appendChild(row);
    attachGestures(wrap, row, code);
    board.appendChild(wrap);
  }
  const ai = document.querySelector(`.amount[data-code="${anchor.code}"]`);
  if (ai) ai.value = anchor.raw;
  syncFromAnchor();
  $("updated").textContent = updatedUtc ? t("updated").replace("{t}", updatedUtc) : "";
}

// ---------- picker (add currency; flag grid, no dropdowns) ----------
function renderPicker(filter = "") {
  const grid = $("pickerGrid");
  grid.innerHTML = "";
  const q = filter.trim().toLowerCase();
  for (const code of Object.keys(rates).sort()) {
    if (watchlist.includes(code)) continue;
    const name = currencyName(code);
    if (q && !code.toLowerCase().includes(q) && !name.toLowerCase().includes(q)) continue;
    const b = document.createElement("button");
    b.className = "pick-item";
    b.appendChild(flagNode(code));
    const label = document.createElement("span");
    const nm = document.createElement("span");
    nm.className = "pname"; nm.textContent = name;
    label.append(document.createTextNode(code), nm);
    b.appendChild(label);
    b.addEventListener("click", () => {
      watchlist.push(code); saveWatchlist();
      $("picker").classList.add("hidden"); renderBoard();
    });
    grid.appendChild(b);
  }
}

// ---------- static texts / language ----------
function applyLanguage() {
  document.documentElement.lang = lang;
  $("uiTitle").textContent = t("title");
  $("uiSub").textContent = t("sub");
  $("addBtn").textContent = t("add");
  $("refreshBtn").textContent = t("refresh");
  $("uiHint").textContent = t("hint");
  $("pickerTitle").textContent = t("picker");
  $("pickerSearch").placeholder = t("search");
  document.title = t("title");
  if (Object.keys(rates).length) { renderBoard(); if (!$("picker").classList.contains("hidden")) renderPicker($("pickerSearch").value); }
}

// ---------- data ----------
async function loadRates() {
  const res = await fetch(API);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.result !== "success") throw new Error("Provider error");
  rates = data.rates; updatedUtc = data.time_last_update_utc;
  renderBoard();
}

async function init() {
  const sel = $("langSelect");
  for (const [code, label] of LANGS) sel.add(new Option(label, code));
  sel.value = LANGS.some(([c]) => c === lang) ? lang : "en";
  lang = sel.value;
  sel.addEventListener("change", () => {
    lang = sel.value;
    try { localStorage.setItem(STORE_LANG, lang); } catch (e) {}
    applyLanguage();
  });
  applyLanguage();
  try {
    await loadRates();
    setInterval(() => loadRates().catch(() => {}), 60000);
  } catch (e) { $("error").textContent = t("loadErr") + e.message; }
}

$("addBtn").addEventListener("click", () => {
  $("pickerSearch").value = ""; renderPicker();
  $("picker").classList.remove("hidden");
});
$("pickerClose").addEventListener("click", () => $("picker").classList.add("hidden"));
$("picker").addEventListener("click", (e) => { if (e.target === $("picker")) $("picker").classList.add("hidden"); });
$("pickerSearch").addEventListener("input", (e) => renderPicker(e.target.value));
$("refreshBtn").addEventListener("click", async () => {
  $("error").textContent = "";
  try { await loadRates(); } catch (e) { $("error").textContent = t("loadErr") + e.message; }
});
init();
