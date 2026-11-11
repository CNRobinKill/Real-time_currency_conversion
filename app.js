// Real-time currency conversion — editable multi-currency board.
// Data: ExchangeRate-API open endpoint (free, no API key).
// All displayed currencies are converted from a SINGLE fetch per base
// currency, so the whole board is always in sync with one rate snapshot.
const API = "https://open.er-api.com/v6/latest/";
const cache = {};
let watchlist = ["CNY", "EUR", "JPY", "GBP", "HKD", "AUD", "CAD"];
let currencies = [];

const $ = (id) => document.getElementById(id);

async function getRates(base, force = false) {
  if (cache[base] && !force) return cache[base];
  const res = await fetch(API + base);
  if (!res.ok) throw new Error(`Rate request failed: ${res.status}`);
  const data = await res.json();
  if (data.result !== "success") throw new Error("Provider returned an error");
  cache[base] = data;
  return data;
}

function fmt(n, digits = 4) {
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

async function render(force = false) {
  $("error").textContent = "";
  const base = $("base").value;
  const amount = parseFloat($("amount").value) || 0;
  try {
    const data = await getRates(base, force);
    // Board
    $("board").innerHTML = "";
    for (const code of watchlist) {
      if (code === base) continue;
      const rate = data.rates[code];
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${code}</td><td>${rate}</td><td>${fmt(amount * rate)}</td>`;
      const td = document.createElement("td");
      const btn = document.createElement("button");
      btn.textContent = "✕";
      btn.title = "Remove " + code;
      btn.addEventListener("click", () => {
        watchlist = watchlist.filter(c => c !== code);
        render();
      });
      td.appendChild(btn);
      tr.appendChild(td);
      $("board").appendChild(tr);
    }
    // Single conversion
    const from = $("from").value, to = $("to").value;
    const single = await getRates(from);
    $("result").textContent =
      `${fmt(amount, 2)} ${from} = ${fmt(amount * single.rates[to])} ${to}  (1 ${from} = ${single.rates[to]} ${to})`;
    $("updated").textContent =
      `Rates last updated: ${data.time_last_update_utc} · Source: ExchangeRate-API · Auto-refresh every 60s`;
  } catch (e) {
    $("error").textContent = "Failed to load rates: " + e.message;
  }
}

async function init() {
  try {
    const data = await getRates("USD");
    currencies = Object.keys(data.rates).sort();
    for (const id of ["base", "from", "to", "addSelect"]) {
      for (const code of currencies) $(id).add(new Option(code, code));
    }
    $("base").value = "USD";
    $("from").value = "USD";
    $("to").value = "CNY";
    $("addSelect").value = "SGD";
    await render();
    setInterval(() => render(true), 60000);
  } catch (e) {
    $("error").textContent = "Could not load currencies: " + e.message;
  }
}

$("refresh").addEventListener("click", () => render(true));
$("addBtn").addEventListener("click", () => {
  const code = $("addSelect").value;
  if (!watchlist.includes(code)) watchlist.push(code);
  render();
});
$("swap").addEventListener("click", () => {
  [$("from").value, $("to").value] = [$("to").value, $("from").value];
  render();
});
["amount", "base", "from", "to"].forEach(id => $(id).addEventListener("change", () => render()));
init();
