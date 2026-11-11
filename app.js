// Real-time currency conversion — multi-currency synced input board.
//
// How it works:
// - Rates for ALL currencies are fetched once against a single reference
//   (USD) from the ExchangeRate-API open endpoint (free, no API key).
// - Every currency row has its own input box. Typing in ANY box makes that
//   box the "anchor": every other box is recomputed as
//       value(other) = value(anchor) / rate(anchor) * rate(other)
//   The box being typed in is never overwritten, so typing never jitters.
// - The currency list is editable: add currencies with the dropdown,
//   remove them with ✕, or change a row's currency in place with its
//   dropdown. The list is remembered in localStorage.
// - Rates auto-refresh every 60s; on refresh the board is recomputed from
//   the current anchor, so the amount you typed stays put.
const API = "https://open.er-api.com/v6/latest/USD";
const REF = "USD";
const STORE_KEY = "rtcc.watchlist.v2";

let rates = {};        // code -> rate vs REF (REF itself = 1)
let updatedUtc = "";
let watchlist = loadWatchlist();
let anchor = { code: REF, raw: "100" };  // last edited box

const $ = (id) => document.getElementById(id);

function loadWatchlist() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (e) { /* ignore */ }
  return ["USD", "CNY", "EUR", "JPY", "GBP", "HKD"];
}

function saveWatchlist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(watchlist)); } catch (e) { /* ignore */ }
}

// Format a computed value for an input box: enough precision for both
// large units (JPY) and small ones (BTC), no trailing-zero noise.
function toInputValue(x) {
  if (!isFinite(x)) return "";
  if (x === 0) return "0";
  const ax = Math.abs(x);
  const digits = ax >= 1000 ? 2 : ax >= 1 ? 4 : ax >= 0.01 ? 6 : 8;
  return String(parseFloat(x.toFixed(digits)));
}

function convert(value, from, to) {
  return value / rates[from] * rates[to];
}

// Recompute every box except the anchor's from the anchor's current value.
function syncFromAnchor() {
  const value = parseFloat(anchor.raw);
  document.querySelectorAll(".amount").forEach(input => {
    const code = input.dataset.code;
    if (code === anchor.code) return;
    input.value = (anchor.raw === "" || isNaN(value)) ? "" : toInputValue(convert(value, anchor.code, code));
  });
}

function rateHint(code) {
  if (code === REF) return "reference";
  return `1 ${REF} = ${rates[code]} ${code}`;
}

function renderBoard() {
  const board = $("board");
  board.innerHTML = "";
  for (const code of watchlist) {
    const row = document.createElement("div");
    row.className = "currency-row";

    const select = document.createElement("select");
    select.className = "code";
    select.dataset.code = code;
    for (const c of Object.keys(rates).sort()) {
      const opt = new Option(c, c);
      if (watchlist.includes(c) && c !== code) opt.disabled = true;
      select.add(opt);
    }
    select.value = code;
    select.addEventListener("change", () => {
      const idx = watchlist.indexOf(code);
      const input = row.querySelector(".amount");
      watchlist[idx] = select.value;
      saveWatchlist();
      anchor = { code: select.value, raw: input.value };  // keep its amount, re-anchor
      renderBoard();
    });

    const input = document.createElement("input");
    input.className = "amount";
    input.dataset.code = code;
    input.type = "number";
    input.min = "0";
    input.step = "any";
    input.inputMode = "decimal";
    input.placeholder = "0";
    input.addEventListener("input", () => {
      anchor = { code, raw: input.value };
      syncFromAnchor();
    });

    const hint = document.createElement("span");
    hint.className = "hint";
    hint.textContent = rateHint(code);

    const remove = document.createElement("button");
    remove.className = "remove";
    remove.textContent = "✕";
    remove.title = "Remove " + code;
    remove.disabled = watchlist.length <= 1;
    remove.addEventListener("click", () => {
      watchlist = watchlist.filter(c => c !== code);
      if (anchor.code === code) anchor = { code: watchlist[0], raw: document.querySelector(".amount")?.value ?? "100" };
      saveWatchlist();
      renderBoard();
    });

    row.append(select, input, hint, remove);
    board.appendChild(row);
  }
  // Restore the anchor's typed value exactly, then sync the rest.
  const anchorInput = document.querySelector(`.amount[data-code="${anchor.code}"]`);
  if (anchorInput) anchorInput.value = anchor.raw;
  syncFromAnchor();
  refreshAddOptions();
  $("updated").textContent = updatedUtc
    ? `Rates last updated: ${updatedUtc} · Source: ExchangeRate-API · Auto-refresh every 60s`
    : "";
}

function refreshAddOptions() {
  const sel = $("addSelect");
  sel.innerHTML = "";
  for (const c of Object.keys(rates).sort()) {
    if (!watchlist.includes(c)) sel.add(new Option(c, c));
  }
}

async function loadRates(forceRender = true) {
  const res = await fetch(API);
  if (!res.ok) throw new Error(`Rate request failed: ${res.status}`);
  const data = await res.json();
  if (data.result !== "success") throw new Error("Provider returned an error");
  rates = data.rates;
  updatedUtc = data.time_last_update_utc;
  if (forceRender) renderBoard();
}

async function init() {
  try {
    await loadRates();
    setInterval(() => loadRates().catch(() => {}), 60000);
  } catch (e) {
    $("error").textContent = "Could not load rates: " + e.message;
  }
}

$("addBtn").addEventListener("click", () => {
  const code = $("addSelect").value;
  if (code && !watchlist.includes(code)) {
    watchlist.push(code);
    saveWatchlist();
    renderBoard();
  }
});
$("refresh").addEventListener("click", async () => {
  $("error").textContent = "";
  try { await loadRates(); }
  catch (e) { $("error").textContent = "Refresh failed: " + e.message; }
});
init();
