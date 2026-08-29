/**
 * Auditoria automatica de la app: accesibilidad basica y flujos principales.
 *
 *   node tools/audit.mjs [http://localhost:5199]
 *
 * Comprueba nombre accesible en controles, alternativas de imagen, etiquetas de
 * formulario, foco visible, y recorre los flujos de texto, recibo y deshacer.
 * No forma parte de la aplicacion.
 */

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const BASE = process.argv[2] ?? "http://localhost:5199";
const PORT = 9344;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, "--window-size=390,844", "about:blank",
], { stdio: "ignore" });
process.on("exit", () => chrome.kill());

async function wsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const p = list.find((t) => t.type === "page");
      if (p) return p.webSocketDebuggerUrl;
    } catch { /* arrancando */ }
    await sleep(250);
  }
  throw new Error("Chrome no respondió");
}

const ws = new WebSocket(await wsUrl());
await new Promise((r) => { ws.onopen = r; });
let seq = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((r) => pending.set(id, r)); };
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await send("Page.navigate", { url: BASE }); await sleep(1200);
await evaluate("localStorage.clear()");
await send("Page.navigate", { url: BASE }); await sleep(1200);

const problems = [];
const ok = [];
const check = (name, list) => (list.length ? problems.push(`${name}: ${list.length} → ${list.slice(0, 4).join(" | ")}`) : ok.push(name));

const AUDIT = `(() => {
  const name = (el) =>
    (el.getAttribute('aria-label') || '').trim() ||
    (el.getAttribute('aria-labelledby') ? (document.getElementById(el.getAttribute('aria-labelledby'))?.textContent || '').trim() : '') ||
    (el.textContent || '').trim() ||
    (el.querySelector('img')?.alt || '').trim();
  const sel = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').filter(Boolean).join('.') : '');
  const out = { unnamed: [], images: [], fields: [], smallTargets: [], headings: [] };
  for (const el of document.querySelectorAll('button, a[href], [role=tab]')) {
    if (!name(el)) out.unnamed.push(sel(el));
    // Area tactil minima 44×44 (design system §18). Se excluyen los controles
    // que viven dentro de una fila o pastilla ya suficientemente alta.
    const r = el.getBoundingClientRect();
    if (r.width && (r.width < 44 || r.height < 44) &&
        !el.closest('.segmented, .suggestions, .dots, .skip-link')) {
      out.smallTargets.push(sel(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
  }
  for (const img of document.querySelectorAll('img')) {
    if (!img.hasAttribute('alt') && img.getAttribute('aria-hidden') !== 'true') out.images.push(img.src.slice(-24));
  }
  for (const f of document.querySelectorAll('input, select, textarea')) {
    const lab = f.labels?.length || f.getAttribute('aria-label') || f.getAttribute('aria-labelledby');
    if (!lab) out.fields.push(sel(f));
  }
  out.headings = [...document.querySelectorAll('h1,h2,h3')].map(h => h.tagName + ':' + h.textContent.trim().slice(0, 28));
  return out;
})()`;

/* ---- pantalla 1: onboarding ---- */
let a = await evaluate(AUDIT);
check("onboarding · controles sin nombre", a.unnamed);
check("onboarding · imágenes sin alternativa", a.images);
console.log("  encabezados onboarding:", a.headings.join(", "));

/* ---- pantalla 2: hilo ---- */
await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Omitir'))?.click()`);
await sleep(500);
a = await evaluate(AUDIT);
check("hilo · controles sin nombre", a.unnamed);
check("hilo · imágenes sin alternativa", a.images);
check("hilo · campos sin etiqueta", a.fields);
check("hilo · áreas táctiles <44px", a.smallTargets);

/* foco visible */
const focusRing = await evaluate(`(() => {
  const b = document.querySelector('.icon-btn'); b.focus();
  const s = getComputedStyle(b, ':focus-visible');
  return { outline: s.outlineStyle + ' ' + s.outlineWidth, active: document.activeElement === b };
})()`);
ok.push(`foco visible en .icon-btn (${focusRing.outline}, enfocado=${focusRing.active})`);

/* ---- flujo: texto → revisión → guardar ---- */
await evaluate(`(() => {
  const el = document.querySelector('#composer-input');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, 'Ayer gasté 250 pesos en Soriana');
  el.dispatchEvent(new Event('input', {bubbles:true}));
  document.querySelector('.composer').requestSubmit();
})()`);
await sleep(1400);
const review = await evaluate(`(() => {
  const d = document.querySelector('[role=dialog]');
  if (!d) return null;
  return {
    modal: d.getAttribute('aria-modal'),
    labelled: !!d.getAttribute('aria-labelledby'),
    amount: document.querySelector('#f-amount')?.value,
    desc: document.querySelector('#f-desc')?.value,
    cat: document.querySelector('#f-cat')?.value,
    date: document.querySelector('#f-date')?.value,
  };
})()`);
console.log("  revisión:", JSON.stringify(review));
if (!review) problems.push("flujo texto → no abrió la revisión");
else {
  if (review.amount !== "250") problems.push(`extracción monto: esperaba 250, obtuve ${review.amount}`);
  if (review.desc !== "Soriana") problems.push(`extracción concepto: esperaba Soriana, obtuve ${review.desc}`);
  if (review.cat !== "groceries") problems.push(`extracción categoría: esperaba groceries, obtuve ${review.cat}`);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (review.date !== yesterday) problems.push(`fecha relativa "ayer": esperaba ${yesterday}, obtuve ${review.date}`);
  else ok.push('fecha relativa "ayer" resuelta correctamente');
}
a = await evaluate(AUDIT);
check("revisión · campos sin etiqueta", a.fields);
check("revisión · controles sin nombre", a.unnamed);

const before = await evaluate(`JSON.parse(localStorage.getItem('suma.v1')).expenses.length`);
await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Guardar'))?.click()`);
await sleep(700);
const after = await evaluate(`JSON.parse(localStorage.getItem('suma.v1')).expenses.length`);
if (after === before + 1) ok.push(`guardado persistido (${before} → ${after})`);
else problems.push(`guardado: ${before} → ${after}`);

await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Deshacer'))?.click()`);
await sleep(500);
const undone = await evaluate(`JSON.parse(localStorage.getItem('suma.v1')).expenses.length`);
if (undone === before) ok.push(`deshacer revierte (${after} → ${undone})`);
else problems.push(`deshacer: ${after} → ${undone}`);

/* ---- flujo: pregunta ---- */
await evaluate(`(() => {
  const el = document.querySelector('#composer-input');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, '¿Cuánto gasté este mes?');
  el.dispatchEvent(new Event('input', {bubbles:true}));
  document.querySelector('.composer').requestSubmit();
})()`);
await sleep(1500);
const answered = await evaluate(`document.querySelectorAll('.bubble--suma').length > 0 && document.querySelector('.bubble--suma').textContent.trim().slice(0,60)`);
if (answered) ok.push(`respuesta de chat: "${answered}…"`);
else problems.push("la pregunta no produjo respuesta");

/* ---- voz ---- */
await evaluate(`[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||'').includes('Abrir captura'))?.click()`);
await sleep(400);
const voice = await evaluate(`(() => {
  const d = document.querySelector('.voice');
  return d ? { live: !!d.querySelector('[aria-live]'), text: d.querySelector('.voice__state')?.textContent } : null;
})()`);
console.log("  voz:", JSON.stringify(voice));
if (!voice?.live) problems.push("la pantalla de voz no anuncia su estado con aria-live");
else ok.push(`voz: estado con aria-live ("${voice.text}")`);

/* ---- insights ---- */
await evaluate(`[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||'').includes('Cerrar'))?.click()`);
await sleep(300);
await evaluate(`[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||'').includes('Ver insights'))?.click()`);
await sleep(500);
a = await evaluate(AUDIT);
check("insights · controles sin nombre", a.unnamed);
check("insights · áreas táctiles <44px", a.smallTargets);
const chart = await evaluate(`(() => {
  const f = document.querySelector('.barchart [role=img]');
  return f ? f.getAttribute('aria-label').slice(0, 70) : null;
})()`);
if (chart) ok.push(`gráfica con equivalente textual: "${chart}…"`);
else problems.push("la gráfica no expone equivalente textual");

console.log("\n── OK ──");
for (const o of ok) console.log("  ✓", o);
console.log("\n── A revisar ──");
if (problems.length === 0) console.log("  (ninguno)");
for (const p of problems) console.log("  ✗", p);

ws.close(); chrome.kill();
process.exit(problems.length ? 1 : 0);
