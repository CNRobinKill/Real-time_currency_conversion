// Real-time currency conversion — Canvas board edition.
// Apple-style dark UI · multilingual (default English) · circular flag icons.
//
// The currency board is drawn on a <canvas>, which gives the gestures
// full control and fixes the classic DOM problems:
//  - the canvas has touch-action:none, so once a touch starts on the
//    board the page can never scroll along with a drag;
//  - there is no hidden DOM delete button behind a row — the red Delete
//    area is *drawn* only while a swipe is in progress, and is never
//    drawn during a long-press drag, so it cannot leak through.
//
// Interactions:
//  - Tap a row's VALUE (right side only): a real <input> overlays that
//    row, styled red / larger / bold while editing; typing re-anchors
//    the whole board (all other rows recompute from that row's amount).
//    Tapping the flag/name area does nothing, so edits aren't triggered
//    by accident.
//  - Swipe a row left: reveals the drawn Delete area; tap it to remove.
//  - Long-press (450ms) a row: pick it up and drag to reorder. The
//    canvas uses touch-action: pan-y, so ordinary vertical touch-drags
//    are scrolled NATIVELY by the browser (compositor-smooth). Only
//    once the long-press fires does the board lock scrolling, by
//    canceling touchmove for the rest of that gesture.
//  - At most 7 currencies are shown at once.
// Rates come from the ExchangeRate-API open endpoint (free, no key),
// fetched once against USD; flags are self-hosted under flags/.
const API = "https://open.er-api.com/v6/latest/USD";
const REF = "USD";
const FLAG_DIR = "flags/";
const MAX_ROWS = 7;
const ROW_H = 68;
const DEL_W = 84;
const STORE_LIST = "rtcc.watchlist.v4";
const STORE_LANG = "rtcc.lang.v1";
const DEFAULT_LIST = ["USD", "CNH", "TRY", "HKD", "JPY", "GBP", "EUR"];

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
  max:     { en: "Maximum 7 currencies — remove one first.", "zh-CN": "最多显示 7 个货币，请先删除一个。", "zh-TW": "最多顯示 7 個貨幣，請先刪除一個。", ja: "最大7通貨までです。先に1つ削除してください。", ko: "최대 7개 통화까지 표시됩니다. 먼저 하나를 삭제하세요.", es: "Máximo 7 divisas: elimina una primero.", fr: "7 devises maximum — supprimez-en une d'abord.", de: "Maximal 7 Währungen — zuerst eine entfernen.", pt: "Máximo de 7 moedas — remova uma primeiro.", it: "Massimo 7 valute: rimuovine prima una.", ru: "Максимум 7 валют — сначала удалите одну.", ar: "بحد أقصى 7 عملات — احذف واحدة أولًا." },
  del:     { en: "Delete", "zh-CN": "删除", "zh-TW": "刪除", ja: "削除", ko: "삭제", es: "Eliminar", fr: "Supprimer", de: "Löschen", pt: "Excluir", it: "Elimina", ru: "Удалить", ar: "حذف" },
  hint:    { en: "Tap value to edit · Tap icon for trend · Long-press drag to reorder — drop on top to set base · Swipe to delete", "zh-CN": "点数值编辑 · 点图标看走势 · 长按拖动排序，拖到第一行设为基准 · 左滑删除", "zh-TW": "點數值編輯 · 點圖標看走勢 · 長按拖動排序，拖到第一行設為基準 · 左滑刪除", ja: "数値をタップして編集 · アイコンをタップで推移 · 長押しドラッグで並べ替え、先頭に置くと基準に · 左スワイプで削除", ko: "값을 탭해 편집 · 아이콘을 탭하면 추이 · 길게 눌러 드래그해 정렬, 맨 위에 놓으면 기준 통화 · 왼쪽으로 밀어 삭제", es: "Toca un valor para editar · Toca el icono para la tendencia · Mantén y arrastra para ordenar; suelta arriba para fijar la base · Desliza para eliminar", fr: "Touchez une valeur pour modifier · Touchez l'icône pour la tendance · Appui long pour réordonner ; déposez en haut pour définir la base · Glisser pour supprimer", de: "Wert antippen zum Bearbeiten · Symbol antippen für Trend · Lange drücken und ziehen zum Sortieren; oben ablegen setzt die Basis · Wischen zum Löschen", pt: "Toque num valor para editar · Toque no ícone para a tendência · Pressione e arraste para ordenar; solte no topo para definir a base · Deslize para excluir", it: "Tocca un valore per modificare · Tocca l'icona per l'andamento · Premi a lungo e trascina per riordinare; rilascia in alto per impostare la base · Scorri per eliminare", ru: "Коснитесь значения, чтобы изменить · Коснитесь значка для динамики · Долгое нажатие и перетаскивание — порядок; отпустите наверху, чтобы сделать базовой · Свайп — удалить", ar: "انقر على قيمة للتحرير · انقر على الأيقونة للاتجاه · اضغط مطولًا واسحب للترتيب؛ أفلت في الأعلى لتعيين الأساس · اسحب للحذف" },
  ref:     { en: "reference", "zh-CN": "基准", "zh-TW": "基準", ja: "基準", ko: "기준", es: "referencia", fr: "référence", de: "Referenz", pt: "referência", it: "riferimento", ru: "базовая", ar: "مرجع" },
  loadErr: { en: "Could not load rates: ", "zh-CN": "汇率加载失败：", "zh-TW": "匯率載入失敗：", ja: "レートを読み込めませんでした：", ko: "환율을 불러오지 못했습니다: ", es: "No se pudieron cargar las tasas: ", fr: "Impossible de charger les taux : ", de: "Kurse konnten nicht geladen werden: ", pt: "Não foi possível carregar as taxas: ", it: "Impossibile caricare i tassi: ", ru: "Не удалось загрузить курсы: ", ar: "تعذر تحميل الأسعار: " },
  trend:   { en: "30-day trend", "zh-CN": "近30天走势", "zh-TW": "近30天走勢", ja: "過去30日の推移", ko: "최근 30일 추이", es: "Tendencia de 30 días", fr: "Tendance sur 30 jours", de: "30-Tage-Trend", pt: "Tendência de 30 dias", it: "Andamento 30 giorni", ru: "Динамика за 30 дней", ar: "اتجاه 30 يومًا" },
  loading: { en: "Loading…", "zh-CN": "加载中…", "zh-TW": "載入中…", ja: "読み込み中…", ko: "로딩 중…", es: "Cargando…", fr: "Chargement…", de: "Lädt…", pt: "Carregando…", it: "Caricamento…", ru: "Загрузка…", ar: "جارٍ التحميل…" },
  noHist:  { en: "No history available for this currency.", "zh-CN": "该货币暂无历史数据。", "zh-TW": "該貨幣暫無歷史資料。", ja: "この通貨の履歴データはありません。", ko: "이 통화의 과거 데이터가 없습니다.", es: "Sin historial para esta divisa.", fr: "Aucun historique pour cette devise.", de: "Keine Verlaufsdaten für diese Währung.", pt: "Sem histórico para esta moeda.", it: "Nessuno storico per questa valuta.", ru: "Нет истории для этой валюты.", ar: "لا توجد بيانات تاريخية لهذه العملة." },
  chartErr:{ en: "Could not load the trend: ", "zh-CN": "走势加载失败：", "zh-TW": "走勢載入失敗：", ja: "推移を読み込めませんでした：", ko: "추이를 불러오지 못했습니다: ", es: "No se pudo cargar la tendencia: ", fr: "Impossible de charger la tendance : ", de: "Trend konnte nicht geladen werden: ", pt: "Não foi possível carregar a tendência: ", it: "Impossibile caricare l'andamento: ", ru: "Не удалось загрузить динамику: ", ar: "تعذر تحميل الاتجاه: " },
  high:    { en: "30d high", "zh-CN": "30天最高", "zh-TW": "30天最高", ja: "30日最高", ko: "30일 최고", es: "Máx. 30d", fr: "Max 30 j", de: "30T-Hoch", pt: "Máx. 30d", it: "Max 30g", ru: "Макс. 30 дн.", ar: "الأعلى في 30 يومًا" },
  low:     { en: "30d low", "zh-CN": "30天最低", "zh-TW": "30天最低", ja: "30日最安", ko: "30일 최저", es: "Mín. 30d", fr: "Min 30 j", de: "30T-Tief", pt: "Mín. 30d", it: "Min 30g", ru: "Мин. 30 дн.", ar: "الأدنى في 30 يومًا" },
  change:  { en: "30d change", "zh-CN": "30天涨跌", "zh-TW": "30天漲跌", ja: "30日変化", ko: "30일 변동", es: "Cambio 30d", fr: "Variation 30 j", de: "30T-Änderung", pt: "Variação 30d", it: "Variazione 30g", ru: "Изм. за 30 дн.", ar: "تغير 30 يومًا" },
};
let lang = localStorage.getItem(STORE_LANG) || "en";
const t = (key) => (STR[key] && (STR[key][lang] || STR[key].en)) || key;
const NAME_OVERRIDE = {
  CNH: { en: "Chinese Yuan (Offshore)", "zh-CN": "离岸人民币", "zh-TW": "離岸人民幣", ja: "人民元（オフショア）" },
  XAU: { en: "Gold", "zh-CN": "黄金", "zh-TW": "黃金", ja: "金" },
  XAG: { en: "Silver", "zh-CN": "白银", "zh-TW": "白銀", ja: "銀" },
  BTC: { en: "Bitcoin", "zh-CN": "比特币", "zh-TW": "比特幣", ja: "ビットコイン" },
  ETH: { en: "Ethereum", "zh-CN": "以太坊", "zh-TW": "以太坊", ja: "イーサリアム" },
};
function currencyName(code) {
  let viaIntl = code;
  try { viaIntl = new Intl.DisplayNames([lang], { type: "currency" }).of(code) || code; } catch (e) {}
  if (viaIntl !== code) return viaIntl;
  const o = NAME_OVERRIDE[code];
  return (o && (o[lang] || o.en)) || code;
}

// ---------- flags ----------
const FLAG = { USD:"us", CNH:"cn", CNY:"cn", EUR:"eu", JPY:"jp", GBP:"gb", HKD:"hk", AUD:"au", CAD:"ca", CHF:"ch", NZD:"nz", SGD:"sg", KRW:"kr", INR:"in", TRY:"tr", RUB:"ru", BRL:"br", ZAR:"za", MXN:"mx", TWD:"tw", THB:"th", MYR:"my", IDR:"id", PHP:"ph", VND:"vn", AED:"ae", SAR:"sa", QAR:"qa", KWD:"kw", BHD:"bh", OMR:"om", JOD:"jo", ILS:"il", EGP:"eg", NGN:"ng", KES:"ke", GHS:"gh", MAD:"ma", DZD:"dz", TND:"tn", PLN:"pl", SEK:"se", NOK:"no", DKK:"dk", HUF:"hu", CZK:"cz", RON:"ro", BGN:"bg", HRK:"hr", ISK:"is", UAH:"ua", RSD:"rs", ARS:"ar", CLP:"cl", COP:"co", PEN:"pe", UYU:"uy", DOP:"do", GTQ:"gt", CRC:"cr", PAB:"pa", JMD:"jm", TTD:"tt", BMD:"bm", KYD:"ky", BBD:"bb", BSD:"bs", BZD:"bz", XCD:"ag", AWG:"aw", ANG:"cw", SRD:"sr", GYD:"gy", PKR:"pk", BDT:"bd", LKR:"lk", NPR:"np", MMK:"mm", KHR:"kh", LAK:"la", BND:"bn", MOP:"mo", MNT:"mn", KZT:"kz", UZS:"uz", TMT:"tm", AZN:"az", GEL:"ge", AMD:"am", MDL:"md", BYN:"by", LBP:"lb", IQD:"iq", IRR:"ir", AFN:"af", SDG:"sd", SSP:"ss", ETB:"et", AOA:"ao", MZN:"mz", ZMW:"zm", UGX:"ug", TZS:"tz", XOF:"sn", XAF:"cm", CDF:"cd", MGA:"mg", MUR:"mu", SCR:"sc", BWP:"bw", NAD:"na", SZL:"sz", LSL:"ls", MWK:"mw", GMD:"gm", GNF:"gn", SLL:"sl", LRD:"lr", UYU:"uy", BOB:"bo", PYG:"py", VES:"ve", CUP:"cu", NIO:"ni", HNL:"hn", SVC:"sv", FJD:"fj", PGK:"pg", SBD:"sb", TOP:"to", VUV:"vu", WST:"ws", SRD:"sr", MKD:"mk", ALL:"al", BAM:"ba", MKD:"mk", TJS:"tj", KGS:"kg", RSD:"rs", MGA:"mg", ERN:"er", DJF:"dj", SOS:"so", KMF:"km", CVE:"cv", STN:"st", MRU:"mr", SYP:"sy", YER:"ye", LYD:"ly", AWG:"aw", FKP:"fk", GIP:"gi", SHP:"sh", XPF:"pf", BTN:"bt", MVR:"mv", PAB:"pa", HTG:"ht" };
const BADGE = { XAU: ["Au", "#c9a227"], XAG: ["Ag", "#9aa5b1"], XPT: ["Pt", "#7d8590"], XPD: ["Pd", "#7d8590"], BTC: ["₿", "#f7931a"], ETH: ["Ξ", "#627eea"], XEU: ["€", "#003399"] };
const flagImgs = {};
function flagImg(code) {
  const cc = FLAG[code];
  if (!cc) return null;
  if (!flagImgs[code]) {
    const img = new Image();
    img.onload = () => draw();
    img.src = FLAG_DIR + cc + ".svg";
    flagImgs[code] = img;
  }
  const img = flagImgs[code];
  return (img.complete && img.naturalWidth > 0) ? img : null;
}
// Real brand logos for crypto (self-hosted circular coin icons,
// spothq/cryptocurrency-icons, CC0). Other non-fiat assets (XAU/XAG)
// keep their symbol badges.
const ICON = { BTC: "icons/btc.svg", ETH: "icons/eth.svg" };
const iconImgs = {};
function assetImg(code) {
  const f = flagImg(code);
  if (f) return f;
  const path = ICON[code];
  if (!path) return null;
  if (!iconImgs[code]) {
    const img = new Image();
    img.onload = () => draw();
    img.src = path;
    iconImgs[code] = img;
  }
  const img = iconImgs[code];
  return (img.complete && img.naturalWidth > 0) ? img : null;
}

// ---------- state ----------
let rates = {};
let updatedUtc = "";
let watchlist = loadWatchlist();
let anchor = { code: "USD", raw: "100" };
let values = {};            // code -> display string
let editingCode = null;
let swipeCode = null, swipeDx = 0, swipeOpen = false;
let dragCode = null, dragY = 0;

const $ = (id) => document.getElementById(id);
const canvas = $("board");
const ctx = canvas.getContext ? canvas.getContext("2d") : null;
const editor = $("editor");

function loadWatchlist() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_LIST));
    if (Array.isArray(s) && s.length) return s.slice(0, MAX_ROWS);
  } catch (e) {}
  return [...DEFAULT_LIST];
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
// Rate hint under each value: keep the provider's own precision for
// fiat, but trim long float / scientific-notation rates (the merged
// metals & crypto extras) to a readable form.
function fmtRate(r) {
  if (r === undefined || r === null) return "";
  const s = String(r);
  return (s.length > 10 || s.includes("e") || s.includes("E")) ? toInputValue(r) : s;
}

function computeValues() {
  const v = parseFloat(anchor.raw);
  values = {};
  for (const code of watchlist) {
    if (code === anchor.code) values[code] = anchor.raw;
    else values[code] = (anchor.raw === "" || isNaN(v)) ? "" : toInputValue(convert(v, anchor.code, code));
  }
}

// ---------- drawing ----------
function boardW() { return canvas.clientWidth || canvas.parentElement.clientWidth || 360; }

function drawRow(code, y, shiftX) {
  const W = boardW();
  ctx.save();
  ctx.translate(shiftX, 0);
  // flag / brand icon / badge
  const cx = 38, cy = y + ROW_H / 2, r = 20;
  const img = assetImg(code);
  if (img) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  } else {
    const [sym, color] = BADGE[code] || [code.slice(0, 2), "#48484a"];
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "700 15px -apple-system, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(sym, cx, cy + 1);
  }
  // code + localized name
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#fff"; ctx.font = "600 16px -apple-system, sans-serif";
  ctx.fillText(code, 70, cy - 3);
  ctx.fillStyle = "#98989f"; ctx.font = "12px -apple-system, sans-serif";
  const nm = currencyName(code);
  ctx.fillText(nm, 70, cy + 15, Math.max(60, W - 70 - 190));
  // value + rate (hidden while this row is being edited in the overlay)
  if (editingCode !== code) {
    ctx.textAlign = "right";
    ctx.fillStyle = "#fff"; ctx.font = "500 20px -apple-system, sans-serif";
    ctx.fillText(values[code] || "0", W - 16, cy - 2);
    ctx.fillStyle = "#636366"; ctx.font = "11px -apple-system, sans-serif";
    const ref = refCode();
    const hint = code === ref ? t("ref") : (rates[code] && rates[ref] ? `1 ${ref} = ${fmtRate(rates[code] / rates[ref])}` : "");
    ctx.fillText(hint, W - 16, cy + 15);
  }
  ctx.restore();
}

function draw() {
  if (!ctx) return;
  const W = boardW(), H = boardH();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#1c1c1e";
  ctx.fillRect(0, 0, W, H);
  watchlist.forEach((code, i) => {
    const y = rowY(i);
    if (code === dragCode) return;                    // dragged row drawn last, floating
    let shift = 0;
    if (code === swipeCode) {
      shift = swipeDx;
      if (shift < 0) {                                 // draw Delete behind the row
        ctx.fillStyle = "#ff3b30";
        ctx.fillRect(W + shift, y, -shift, ROW_H);
        if (shift <= -40) {
          ctx.fillStyle = "#fff"; ctx.font = "600 15px -apple-system, sans-serif";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(t("del"), W + shift / 2, y + ROW_H / 2);
        }
      }
    }
    drawRow(code, y, shift);
    if (i < watchlist.length - 1) {
      const sepY = y + ROW_H + (code === expandedCode ? CHART_H : 0) - 0.25;
      ctx.strokeStyle = "#38383a"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(70, sepY); ctx.lineTo(W, sepY); ctx.stroke();
    }
  });
  if (expandedIdx() >= 0) drawChartRegion(chartTop());
  if (dragCode) {                                      // floating dragged row
    const y = dragY - ROW_H / 2;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    ctx.fillStyle = "#2c2c2e";
    ctx.beginPath(); ctx.roundRect(4, y, W - 8, ROW_H, 12); ctx.fill();
    ctx.restore();
    drawRow(dragCode, y, 0);
  }
}

function fitCanvas() {
  const W = boardW(), H = boardH();
  const dpr = window.devicePixelRatio || 1;
  canvas.style.height = H + "px";
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

// ---------- editor overlay ----------
// Left edge (CSS px) of a row's right-aligned value text. Only taps at
// or right of this edge (minus a small tolerance) open the editor —
// tapping the flag/name area must not trigger editing.
function valueLeftEdge(code) {
  const W = boardW();
  if (!ctx) return W * 0.5;
  ctx.save();
  ctx.font = "500 20px -apple-system, sans-serif";
  const w = ctx.measureText(values[code] || "0").width;
  ctx.restore();
  return W - 16 - w;
}
function openEditor(code) {
  closeSwipe();
  editingCode = code;
  anchor = { code, raw: values[code] || "" };
  computeValues();
  const idx = watchlist.indexOf(code);
  editor.classList.remove("hidden");
  editor.style.top = (rowY(idx) + 11) + "px";
  editor.value = anchor.raw;
  draw();
  editor.focus();
  try { editor.select(); } catch (e) {}
  // The on-screen keyboard would otherwise cover rows near the bottom:
  // scroll the page so the editor sits inside the visible viewport.
  setTimeout(() => ensureEditorVisible(true), 350);
}
// Keep the editor inside the visual viewport (which shrinks when the
// software keyboard opens). Runs on open and on every viewport resize
// while editing.
function ensureEditorVisible(smooth) {
  if (editingCode === null) return;
  const vv = window.visualViewport;
  const r = editor.getBoundingClientRect();
  const vTop = vv ? vv.offsetTop : 0;
  const vBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
  const margin = 14;
  if (r.bottom > vBottom - margin) {
    window.scrollBy({ top: r.bottom - (vBottom - margin), behavior: smooth ? "smooth" : "auto" });
  } else if (r.top < vTop + margin) {
    window.scrollBy({ top: r.top - vTop - margin, behavior: smooth ? "smooth" : "auto" });
  }
}
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", () => ensureEditorVisible(false));
}
function closeEditor() {
  if (editingCode === null) return;
  editingCode = null;
  editor.classList.add("hidden");
  if (document.activeElement === editor) editor.blur();
  draw();
}
// Tapping anywhere outside the editor (and outside the canvas, whose own
// gesture handler deals with taps) exits editing.
document.addEventListener("pointerdown", (e) => {
  if (editingCode !== null && e.target !== editor && e.target !== canvas) closeEditor();
});
editor.addEventListener("input", () => {
  if (editingCode === null) return;
  anchor = { code: editingCode, raw: editor.value };
  computeValues(); draw();
});
editor.addEventListener("blur", closeEditor);
editor.addEventListener("keydown", (e) => { if (e.key === "Enter") editor.blur(); });

// ---------- swipe / drag gestures (canvas owns them all) ----------
function closeSwipe() { swipeCode = null; swipeDx = 0; swipeOpen = false; }

function deleteCurrency(code) {
  if (watchlist.length <= 1) return;
  watchlist = watchlist.filter(c => c !== code);
  if (anchor.code === code) anchor = { code: watchlist[0], raw: "100" };
  if (expandedCode === code) { expandedCode = null; pairChart = null; chartError = null; scrubIdx = null; }
  closeSwipe(); closeEditor();
  if (expandedCode) refreshChart();       // the benchmark may have changed under an open chart
  saveWatchlist(); computeValues(); fitCanvas();
}

let g = null;  // active gesture
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
// Once a long-press turns the gesture into a row drag, cancel touchmove
// (non-passive, so this actually blocks) to keep the page from scrolling
// for the rest of the gesture. Before that, the page scrolls natively.
canvas.addEventListener("touchmove", (e) => { if (g && g.mode === "drag") e.preventDefault(); }, { passive: false });
canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  if (inChartArea(y)) {
    if (toggleRect && x >= toggleRect.x && x <= toggleRect.x + toggleRect.w && y >= toggleRect.y && y <= toggleRect.y + toggleRect.h) {
      chartFlipped = !chartFlipped; scrubIdx = null; draw();
      return;
    }
    g = { code: expandedCode, startX: x, startY: y, dx: 0, dy: 0, mode: "chart", idx: -1, wasEditing: null };
    try { canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); } catch (err) {}
    chartScrubAt(x);
    return;
  }
  const idx = rowAtY(y);
  if (idx < 0 || idx >= watchlist.length) return;
  const code = watchlist[idx];
  // Tapping the revealed Delete area deletes.
  if (swipeOpen && code === swipeCode && x > boardW() - DEL_W) { deleteCurrency(code); return; }
  try { canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); } catch (err) {}
  g = { code, startX: x, startY: y, dx: 0, dy: 0, mode: null, idx, wasEditing: editingCode };
  if (swipeOpen && code === swipeCode) g.base = -DEL_W; else g.base = 0;
  if (idx !== 0) {           // the benchmark row (first) is pinned: it cannot be dragged away, only displaced by a row dropped on top of it
    g.longTimer = setTimeout(() => {
      if (!g || g.mode) return;
      g.mode = "drag"; dragCode = code;
      if (expandedCode) { expandedCode = null; pairChart = null; chartError = null; scrubIdx = null; }
      dragY = rowY(watchlist.indexOf(code)) + ROW_H / 2;
      document.body.style.overflow = "hidden";          // lock page scroll while dragging
      closeEditor(); closeSwipe();
      if (navigator.vibrate) navigator.vibrate(10);
      fitCanvas();
    }, 450);
  }
});
canvas.addEventListener("pointermove", (e) => {
  if (!g) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  g.dx = x - g.startX; g.dy = y - g.startY;
  if (g.mode === "chart") { chartScrubAt(x); return; }
  if (g.mode === "drag") {
    dragY = y;
    const target = Math.max(0, Math.min(watchlist.length - 1, Math.floor(y / ROW_H)));
    const cur = watchlist.indexOf(dragCode);
    if (target !== cur) {
      watchlist.splice(cur, 1); watchlist.splice(target, 0, dragCode);
    }
    draw();
  } else if (g.mode === "swipe" || (Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy))) {
    if (g.mode !== "swipe") { g.mode = "swipe"; clearTimeout(g.longTimer); if (editingCode) closeEditor(); if (expandedCode) collapseChart(); }
    swipeCode = g.code;
    swipeDx = Math.max(-DEL_W, Math.min(0, (g.base || 0) + g.dx));
    draw();
  }
});
function endGesture(e) {
  if (!g) return;
  clearTimeout(g.longTimer);
  document.body.style.overflow = "";
  if (g.mode === "chart") { scrubIdx = null; draw(); g = null; return; }
  if (g.mode === "drag") {
    dragCode = null;
    saveWatchlist(); draw();
  } else if (g.mode === "swipe") {
    if (swipeDx < -DEL_W / 2) { swipeOpen = true; swipeDx = -DEL_W; }
    else closeSwipe();
    draw();
  } else if (Math.abs(g.dx) < 10 && Math.abs(g.dy) < 10) {
    // plain tap (a moved gesture that matched no mode is not a tap)
    if (g.wasEditing) closeEditor();          // while editing, any tap elsewhere just exits editing
    else if (swipeOpen) { closeSwipe(); draw(); }
    else if (editingCode !== g.code) {
      // Right side (the value) edits; left side (flag / name) opens the trend chart.
      if (g.startX >= valueLeftEdge(g.code) - 14) openEditor(g.code);
      else openChart(g.code);
    }
  }
  g = null;
}
// The browser takes the gesture over (native page scroll): settle any
// in-progress mode, but never treat the interruption as a tap.
function cancelGesture() {
  if (!g) return;
  clearTimeout(g.longTimer);
  document.body.style.overflow = "";
  if (g.mode === "chart") { scrubIdx = null; draw(); g = null; return; }
  if (g.mode === "drag") {
    dragCode = null;
    saveWatchlist(); draw();
  } else if (g.mode === "swipe") {
    if (swipeDx < -DEL_W / 2) { swipeOpen = true; swipeDx = -DEL_W; }
    else closeSwipe();
    draw();
  }
  g = null;
}
canvas.addEventListener("pointerup", endGesture);
canvas.addEventListener("pointercancel", cancelGesture);

// ---------- picker ----------
function renderPicker(filter = "") {
  const grid = $("pickerGrid");
  grid.innerHTML = "";
  $("pickerNote").textContent = watchlist.length >= MAX_ROWS ? t("max") : "";
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
      if (watchlist.length >= MAX_ROWS) { $("pickerNote").textContent = t("max"); return; }
      watchlist.push(code); saveWatchlist();
      computeValues(); fitCanvas();
      $("picker").classList.add("hidden");
    });
    grid.appendChild(b);
  }
}
function flagNode(code) {
  const cc = FLAG[code];
  if (cc) {
    const img = document.createElement("img");
    img.className = "flag"; img.alt = code; img.loading = "lazy"; img.draggable = false;
    img.src = FLAG_DIR + cc + ".svg";
    img.onerror = () => img.replaceWith(badgeNode(code));
    return img;
  }
  if (ICON[code]) {
    const img = document.createElement("img");
    img.className = "flag"; img.alt = code; img.loading = "lazy"; img.draggable = false;
    img.src = ICON[code];
    img.onerror = () => img.replaceWith(badgeNode(code));
    return img;
  }
  return badgeNode(code);
}
function badgeNode(code) {
  const [sym, color] = BADGE[code] || [code.slice(0, 2), "#48484a"];
  const d = document.createElement("div");
  d.className = "flag-badge"; d.style.background = color; d.textContent = sym; d.title = code;
  return d;
}

// ---------- language ----------
function applyLanguage() {
  document.documentElement.lang = lang;
  $("uiTitle").textContent = t("title");
  $("uiSub").textContent = t("sub");
  $("uiHint").textContent = t("hint");
  $("addBtn").textContent = t("add");
  $("refreshBtn").textContent = t("refresh");
  $("pickerTitle").textContent = t("picker");
  $("pickerSearch").placeholder = t("search");
  document.title = t("title");
  draw();
  if (!$("picker").classList.contains("hidden")) renderPicker($("pickerSearch").value);
  $("updated").textContent = updatedUtc ? t("updated").replace("{t}", updatedUtc) : "";
}

// ---------- data ----------
// Non-fiat extras (gold, silver, bitcoin, ethereum) are not in the
// ExchangeRate-API feed, so their USD spot prices come from free
// no-key endpoints and are merged in as units-per-USD rates. They load
// in parallel and never block the fiat board.
const EXTRA_APIS = [
  { url: "https://api.gold-api.com/price/XAU", pick: (d) => ({ XAU: d.price }) },
  { url: "https://api.gold-api.com/price/XAG", pick: (d) => ({ XAG: d.price }) },
  { url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd",
    pick: (d) => ({ BTC: d.bitcoin && d.bitcoin.usd, ETH: d.ethereum && d.ethereum.usd }) },
];
let extraRates = {};   // code -> units per 1 USD (1 / spot price)
async function loadExtras() {
  const results = await Promise.allSettled(EXTRA_APIS.map(async (a) => {
    const res = await fetch(a.url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return a.pick(await res.json());
  }));
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const [code, usd] of Object.entries(r.value)) {
      if (usd > 0) extraRates[code] = 1 / usd;
    }
  }
}

async function loadRates() {
  const res = await fetch(API);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.result !== "success") throw new Error("Provider error");
  rates = { ...data.rates, ...extraRates }; updatedUtc = data.time_last_update_utc;
  if (!rates[anchor.code]) anchor = { code: watchlist[0], raw: anchor.raw };
  computeValues(); fitCanvas();
  $("updated").textContent = t("updated").replace("{t}", updatedUtc);
  // Refresh the extras alongside; merge and redraw when they land.
  loadExtras().then(() => {
    if (!Object.keys(extraRates).length) return;
    rates = { ...rates, ...extraRates };
    computeValues(); draw();
    if (!$("picker").classList.contains("hidden")) renderPicker($("pickerSearch").value);
  }).catch(() => {});
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
  computeValues();
  fitCanvas();
  applyLanguage();
  window.addEventListener("resize", fitCanvas);
  try {
    await loadRates();
    setInterval(() => loadRates().catch(() => {}), 60000);
  } catch (e) { $("error").textContent = t("loadErr") + e.message; }
}

$("addBtn").addEventListener("click", () => {
  closeEditor();
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

// ---------- inline trend chart (tap a row's flag / name) ----------
// Tapping a row's flag/name expands a chart directly under that row,
// drawn inside the board canvas — only one row is expanded at a time,
// and tapping another row moves the expansion there. The chart shows
// the pair between the BENCHMARK currency (the first row) and the
// tapped currency over the last 30 days; the ⇄ pill in its header
// flips the pair (base <-> quote) and redraws it inverted.
// History is fetched as units-per-USD series per currency and then
// crossed by date: Frankfurter (ECB) for fiat majors, CoinGecko for
// BTC/ETH, dated currency-api snapshots for the rest (CNH, metals,
// exotics) — all free, no key, CORS-open.
const CG_ID = { BTC: "bitcoin", ETH: "ethereum" };
const USD_PRICE_CODES = new Set(["XAU", "XAG", "XPT", "XPD", "BTC", "ETH"]);
const CHART_H = 184;
const histCache = {};
let expandedCode = null, pairChart = null, chartFlipped = false, chartError = null;
let scrubIdx = null, toggleRect = null, chartGeom = null;

function refCode() { return watchlist[0]; }
function expandedIdx() { return expandedCode ? watchlist.indexOf(expandedCode) : -1; }
function rowY(i) { const ei = expandedIdx(); return i * ROW_H + (ei >= 0 && i > ei ? CHART_H : 0); }
function boardH() { return watchlist.length * ROW_H + (expandedIdx() >= 0 ? CHART_H : 0); }
function rowAtY(y) {
  for (let i = 0; i < watchlist.length; i++) { const ry = rowY(i); if (y >= ry && y < ry + ROW_H) return i; }
  return -1;
}
function chartTop() { const ei = expandedIdx(); return ei >= 0 ? rowY(ei) + ROW_H : 0; }
function inChartArea(y) { return expandedIdx() >= 0 && y >= chartTop() && y < chartTop() + CHART_H; }

function fmtNum(v) {
  if (!isFinite(v)) return "";
  const ax = Math.abs(v);
  const digits = ax >= 1000 ? 2 : ax >= 1 ? 4 : ax >= 0.01 ? 6 : 8;
  return v.toLocaleString("en-US", { maximumFractionDigits: digits });
}
const isoDay = (d) => d.toISOString().slice(0, 10);
const fmtDay = (d) => d.slice(5);   // YYYY-MM-DD -> MM-DD

async function fetchFrankfurter(code) {
  const end = new Date(), start = new Date(Date.now() - 31 * 864e5);
  const url = `https://api.frankfurter.dev/v1/${isoDay(start)}..${isoDay(end)}?base=USD&symbols=${code}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const pts = [];
  for (const day of Object.keys(data.rates || {}).sort()) {
    const v = data.rates[day][code];
    if (v > 0) pts.push({ d: day, v });
  }
  if (pts.length < 2) throw new Error("empty");
  return pts;
}
async function fetchCoinGecko(code) {
  const url = `https://api.coingecko.com/api/v3/coins/${CG_ID[code]}/market_chart?vs_currency=usd&days=30&interval=daily`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const pts = (data.prices || []).map(([ts, v]) => ({ d: isoDay(new Date(ts)), v })).filter((p) => p.v > 0);
  if (pts.length < 2) throw new Error("empty");
  return pts;
}
async function fetchDatedPerUsd(code) {
  const offsets = [30, 27, 24, 21, 18, 15, 12, 9, 6, 3, 0];
  const lc = code.toLowerCase();
  const fetchDay = async (off) => {
    const day = isoDay(new Date(Date.now() - off * 864e5));
    const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${day}/v1/currencies/usd.json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const r = data.usd && data.usd[lc];
    if (!(r > 0)) throw new Error("empty");
    return { d: data.date || day, v: r };
  };
  const byDay = new Map();
  for (const r of await Promise.allSettled(offsets.map(fetchDay))) {
    if (r.status === "fulfilled") byDay.set(r.value.d, r.value);
  }
  if (byDay.size < 5) {           // flaky CDN day: one sequential retry pass over the missing dates
    for (const off of offsets) {
      const day = isoDay(new Date(Date.now() - off * 864e5));
      if (byDay.has(day)) continue;
      try { const pt = await fetchDay(off); byDay.set(pt.d, pt); } catch (e) {}
      if (byDay.size >= 8) break;
    }
  }
  const pts = [...byDay.values()].sort((a, b) => (a.d < b.d ? -1 : 1));
  if (pts.length < 2) throw new Error("empty");
  return pts;
}
// Units of `code` per 1 USD, daily, last ~30 days.
async function loadUsdSeries(code) {
  if (histCache[code]) return histCache[code];
  let pts;
  if (code === REF) {
    const now = Date.now();
    pts = [{ d: isoDay(new Date(now - 30 * 864e5)), v: 1 }, { d: isoDay(new Date(now)), v: 1 }];
  } else if (CG_ID[code]) {
    try { pts = (await fetchCoinGecko(code)).map((p) => ({ d: p.d, v: 1 / p.v })); }
    catch (e) { pts = await fetchDatedPerUsd(code); }
  } else if (USD_PRICE_CODES.has(code) || code === "CNH") {
    pts = await fetchDatedPerUsd(code);
  } else {
    try { pts = await fetchFrankfurter(code); } catch (e) { pts = await fetchDatedPerUsd(code); }
  }
  histCache[code] = pts;
  return pts;
}
function buildPairSeries(benchPts, codePts) {
  const bMap = new Map(benchPts.map((p) => [p.d, p.v]));
  const out = [];
  for (const p of codePts) {
    let bv = bMap.get(p.d);
    if (bv === undefined) {           // carry the benchmark's last earlier value forward
      for (let i = benchPts.length - 1; i >= 0; i--) { if (benchPts[i].d <= p.d) { bv = benchPts[i].v; break; } }
    }
    if (bv > 0) out.push({ d: p.d, v: p.v / bv });
  }
  return out;
}
async function loadPairChart(code) {
  const bench = refCode();
  const [bs, cs] = await Promise.all([loadUsdSeries(bench), loadUsdSeries(code)]);
  const points = buildPairSeries(bs, cs);
  if (points.length < 2) throw new Error("empty");
  return { bench, code, points };
}
function refreshChart() {
  if (!expandedCode) return;
  const code = expandedCode, bench = refCode();
  pairChart = null; chartError = null; scrubIdx = null;
  draw();
  loadPairChart(code).then((pc) => {
    if (expandedCode === code && refCode() === bench) { pairChart = pc; draw(); }
  }).catch((e) => {
    if (expandedCode === code) {
      chartError = (e && e.message === "empty") ? t("noHist") : t("chartErr") + (e ? e.message : "");
      draw();
    }
  });
}
function openChart(code) {
  if (code === refCode()) return;            // the benchmark has no pair against itself
  closeEditor(); closeSwipe();
  if (expandedCode === code) { collapseChart(); return; }
  expandedCode = code; chartFlipped = false;
  fitCanvas();
  refreshChart();
}
function collapseChart() {
  expandedCode = null; pairChart = null; chartError = null; scrubIdx = null; toggleRect = null;
  fitCanvas();
}
function displaySeries() {
  if (!pairChart) return null;
  if (!chartFlipped) return { base: pairChart.bench, quote: pairChart.code, points: pairChart.points };
  return { base: pairChart.code, quote: pairChart.bench, points: pairChart.points.map((p) => ({ d: p.d, v: 1 / p.v })) };
}
function chartScrubAt(x) {
  const s = displaySeries();
  if (!s || !chartGeom) return;
  const i = Math.round(((x - chartGeom.x0) / (chartGeom.x1 - chartGeom.x0)) * (s.points.length - 1));
  scrubIdx = Math.max(0, Math.min(s.points.length - 1, i));
  draw();
}
function drawChartRegion(top) {
  const W = boardW();
  ctx.save();
  ctx.fillStyle = "#232326";
  ctx.fillRect(0, top, W, CHART_H);
  ctx.strokeStyle = "#38383a"; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(0, top + 0.25); ctx.lineTo(W, top + 0.25); ctx.stroke();
  toggleRect = null; chartGeom = null;
  ctx.textBaseline = "middle";
  if (chartError) {
    ctx.fillStyle = "#ff453a"; ctx.font = "13px -apple-system, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(chartError, W / 2, top + CHART_H / 2, W - 32);
    ctx.restore(); return;
  }
  const s = displaySeries();
  if (!s) {
    ctx.fillStyle = "#98989f"; ctx.font = "13px -apple-system, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(t("loading"), W / 2, top + CHART_H / 2, W - 32);
    ctx.restore(); return;
  }
  const pts = s.points, first = pts[0], last = pts[pts.length - 1];
  // header: flip pill on the right (measured first to bound the pair label)
  const pillTxt = `${s.base} ⇄ ${s.quote}`;
  ctx.font = "600 11px -apple-system, sans-serif";
  const pillW = ctx.measureText(pillTxt).width + 20, pillH = 22;
  const pillX = W - 16 - pillW, pillY = top + 6;
  toggleRect = { x: pillX, y: pillY, w: pillW, h: pillH };
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, 11); else ctx.rect(pillX, pillY, pillW, pillH);
  ctx.fillStyle = "#3a3a3c"; ctx.fill();
  ctx.fillStyle = "#fff"; ctx.textAlign = "center";
  ctx.fillText(pillTxt, pillX + pillW / 2, pillY + pillH / 2 + 0.5);
  // pair label
  ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.font = "600 13px -apple-system, sans-serif";
  ctx.fillText(`1 ${s.base} = ${fmtNum(last.v)} ${s.quote}`, 16, top + 17, Math.max(40, pillX - 24));
  // plot
  const x0 = 16, x1 = W - 16 - 52, y0 = top + 36, y1 = top + CHART_H - 36;
  chartGeom = { x0, x1 };
  const rawLo = Math.min(...pts.map((p) => p.v)), rawHi = Math.max(...pts.map((p) => p.v));
  let lo = rawLo, hi = rawHi;
  if (hi - lo < 1e-12) { const pad = Math.abs(lo) * 0.005 + 1e-9; hi = lo + pad; lo = lo - pad; }
  const span = hi - lo; hi += span * 0.08; lo -= span * 0.08;
  const X = (i) => x0 + (pts.length === 1 ? (x1 - x0) / 2 : (i / (pts.length - 1)) * (x1 - x0));
  const Y = (v) => y0 + ((hi - v) / (hi - lo)) * (y1 - y0);
  const up = last.v >= first.v;
  const col = up ? "#30d158" : "#ff453a";
  ctx.font = "10px -apple-system, sans-serif"; ctx.textAlign = "left";
  for (const gv of [rawHi, (rawHi + rawLo) / 2, rawLo]) {
    const y = Y(gv);
    ctx.strokeStyle = "#333336"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    ctx.fillStyle = "#98989f"; ctx.fillText(fmtNum(gv), x1 + 6, y);
  }
  ctx.beginPath();
  pts.forEach((p, i) => { const x = X(i), y = Y(p.v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
  ctx.lineTo(X(pts.length - 1), y1); ctx.lineTo(X(0), y1); ctx.closePath();
  const grad = ctx.createLinearGradient(0, y0, 0, y1);
  grad.addColorStop(0, up ? "rgba(48,209,88,0.30)" : "rgba(255,69,58,0.30)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath(); ctx.arc(X(pts.length - 1), Y(last.v), 3.5, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
  // dates under the plot
  ctx.fillStyle = "#636366"; ctx.font = "10px -apple-system, sans-serif"; ctx.textAlign = "left";
  ctx.fillText(fmtDay(first.d), x0, y1 + 11);
  ctx.textAlign = "right"; ctx.fillText(fmtDay(last.d), x1, y1 + 11);
  // footer: 30d change (left, colored) + high/low (right, gray)
  const chg = first.v > 0 ? ((last.v - first.v) / first.v) * 100 : 0;
  ctx.textAlign = "left"; ctx.font = "700 12px -apple-system, sans-serif"; ctx.fillStyle = col;
  ctx.fillText(`${chg >= 0 ? "▲ +" : "▼ "}${chg.toFixed(2)}%`, 16, top + CHART_H - 13);
  ctx.font = "11px -apple-system, sans-serif"; ctx.fillStyle = "#98989f"; ctx.textAlign = "right";
  ctx.fillText(`${t("high")} ${fmtNum(rawHi)} · ${t("low")} ${fmtNum(rawLo)}`, W - 16, top + CHART_H - 13);
  ctx.textAlign = "left";
  // scrub crosshair + tooltip
  if (scrubIdx !== null && pts[scrubIdx]) {
    const p = pts[scrubIdx], x = X(scrubIdx), y = Y(p.v);
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke();
    const label = `${fmtDay(p.d)} · ${fmtNum(p.v)}`;
    ctx.font = "600 11px -apple-system, sans-serif";
    const tw = ctx.measureText(label).width + 14;
    const bx = Math.min(Math.max(x - tw / 2, 2), W - tw - 2);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, top + 32, tw, 18, 6); else ctx.rect(bx, top + 32, tw, 18);
    ctx.fillStyle = "#3a3a3c"; ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(label, bx + tw / 2, top + 41.5);
    ctx.textAlign = "left";
  }
  ctx.restore();
}

// Debug/test handle (read-only view of the board state).
window.__rtcc = { get watchlist() { return [...watchlist]; }, get values() { return { ...values }; }, get anchor() { return { ...anchor }; }, get rates() { return { ...rates }; }, get expandedCode() { return expandedCode; }, get pairChart() { return pairChart; }, get chartFlipped() { return chartFlipped; }, openChart, collapseChart, loadPairChart };
init();
