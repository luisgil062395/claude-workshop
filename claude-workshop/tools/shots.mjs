/**
 * Herramienta de QA visual.
 *
 * Abre la app en un lienzo de 390x844 —el mismo de los disenos de Figma— la
 * recorre por los flujos principales y guarda un PNG de cada pantalla, para
 * poder compararla contra assets/screenshots/.
 *
 *   node tools/shots.mjs [http://localhost:5199] [carpeta-de-salida]
 *
 * No forma parte de la aplicacion: no se importa desde src/.
 */

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const BASE = process.argv[2] ?? "http://localhost:5199";
const OUT = process.argv[3] ?? "/tmp/shots";
const PORT = 9333;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, "--window-size=390,844",
  "--force-device-scale-factor=1", "about:blank",
], { stdio: "ignore" });

process.on("exit", () => chrome.kill());

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* aún arrancando */ }
    await sleep(250);
  }
  throw new Error("Chrome no respondió");
}

const ws = new WebSocket(await target());
await new Promise((res) => { ws.onopen = res; });

let seq = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res) => pending.set(id, res));
}

async function evaluate(expression) {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  return r.result?.result?.value;
}

async function shot(name) {
  await sleep(450);
  const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, "base64"));
  console.log("  ✓", `${name}.png`);
}

/** Hace clic en el primer elemento que cumpla el selector/texto. */
async function click(desc) {
  const ok = await evaluate(`(() => {
    const all = [...document.querySelectorAll('button, a, [role=tab]')];
    const el = all.find(e => (e.getAttribute('aria-label') || e.textContent || '').trim().includes(${JSON.stringify(desc)}));
    if (!el) return false;
    el.click(); return true;
  })()`);
  if (!ok) console.warn("  ! no encontré:", desc);
  await sleep(300);
  return ok;
}

async function type(selector, text) {
  await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, ${JSON.stringify(text)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(150);
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
});

async function goto(url) {
  await send("Page.navigate", { url });
  await sleep(1200);
}

console.log("Capturando…");

/* 1 · Onboarding */
await goto(BASE);
await evaluate("localStorage.clear()");
await goto(BASE);
await shot("01-onboarding");

/* 2 · Hilo vacío */
await click("Omitir");
await shot("02-thread-empty");

/* 3 · Voz */
await click("Abrir captura por voz o foto");
await shot("03-voice");
await click("Cerrar");

/* 4 · Respuesta del chat */
await click("¿Qué recomendaciones tienes?");
await sleep(1400);
await shot("04-thread-answer");

/* 5 · Revisión de un gasto dictado por texto */
await type("#composer-input", "Pagué 120 pesos por un café en Avellaneda");
await evaluate("document.querySelector('.composer').requestSubmit()");
await sleep(1200);
await shot("05-review");
await click("Guardar");
await sleep(600);
await shot("06-thread-saved");

/* 7 · Insights */
await click("Ver insights");
await shot("07-insights");
await evaluate("document.querySelector('.insights').scrollTop = 900");
await shot("08-insights-scrolled");

/* 9 · Tablet y escritorio */
await send("Emulation.setDeviceMetricsOverride", { width: 834, height: 1000, deviceScaleFactor: 1, mobile: false });
await shot("09-tablet");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await shot("10-desktop");

ws.close();
chrome.kill();
console.log("Listo →", OUT);
process.exit(0);
