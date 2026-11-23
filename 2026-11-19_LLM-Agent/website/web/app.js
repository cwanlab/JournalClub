import { PARTS, STEPS } from "./content.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cellState = new Map();   // cell id -> { code, outputs, status, seconds }
let current = 0;
const presenter = new BroadcastChannel("agent-tutorial");   // speaker notes window (presenter.html)

const FOOT = `<div class="slide-foot"><span>Institute for Population and Precision Health</span><img src="media/uchicago-logo.png" alt="The University of Chicago"></div>`;

function kickerFor(step) {
  if (step.cls === "cover") return "";
  if (step.kicker) return `<p class="kicker">${esc(step.kicker)}</p>`;
  const part = PARTS.find((p) => p.id === step.part);
  return part ? `<p class="kicker">${esc(part.label)}</p>` : "";
}

function slideHTML(step, index, dirClass = "") {
  const head = step.title
    ? `<header class="slide-head">${kickerFor(step)}<h1>${step.title}</h1></header>`
    : "";
  return `<article class="slide ${step.cls || ""} ${dirClass}">
    <div class="slide-body"><div class="slide-fit">${head}${step.slide}</div></div>
    ${FOOT}
    <span class="page-no">${index + 1}</span>
  </article>`;
}

function fitSlide() {
  // Fit the slide content to the card: shrink it when it overflows, enlarge it (up to MAX_GROW) when it
  // leaves the lower part of the slide empty. The content is laid out at width/scale, then scaled.
  const MAX_GROW = 1.28, MIN_SHRINK = 0.78;
  const body = document.querySelector("#slide-pane .slide-body");
  const inner = document.querySelector("#slide-pane .slide-fit");
  if (!body || !inner) return;
  const cs = getComputedStyle(body);
  const availH = body.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  if (availH <= 0) return;
  const natural = (scale) => {
    inner.style.transform = "";
    inner.style.width = `${(100 / scale).toFixed(3)}%`;
    inner.style.height = "auto";
    const h = inner.scrollHeight;
    inner.style.height = "";
    return h * scale;
  };
  let scale = 1;
  if (natural(1) > availH + 2) {
    scale = Math.max(MIN_SHRINK, availH / natural(1));
  } else {
    let lo = 1, hi = MAX_GROW;
    for (let i = 0; i < 8; i++) {
      const mid = (lo + hi) / 2;
      if (natural(mid) <= availH) lo = mid; else hi = mid;
    }
    scale = lo;
  }
  inner.style.width = `${(100 / scale).toFixed(3)}%`;
  inner.style.height = `${(100 / scale).toFixed(3)}%`;
  inner.style.transform = scale === 1 ? "" : `scale(${scale.toFixed(3)})`;
}

async function inlineSvgs(root) {
  for (const holder of root.querySelectorAll("[data-inline-svg]")) {
    try { holder.innerHTML = await (await fetch(holder.dataset.inlineSvg)).text(); } catch { holder.textContent = "Chart unavailable."; }
  }
  fitSlide();
}

function outputHTML(state) {
  if (state.status === "running") return `<p class="out-note" aria-live="polite">Running… <span class="elapsed">0</span> s</p>`;
  if (!state.outputs) return `<p class="out-note">Not run yet. Press Run or Shift + Enter.</p>`;
  if (!state.outputs.length) return `<p class="out-note">Ran in ${state.seconds} s. No output.</p>`;
  return state.outputs.map((o) => {
    if (o.type === "html") return `<div class="out html">${o.data}</div>`;
    if (o.type === "error") {
      const hint = /NameError/.test(o.data) ? `<p class="out-note">A name is not defined yet. Run the earlier cells on this page (or the page before) first.</p>` : "";
      return `<pre class="out error">${esc(o.data)}</pre>${hint}`;
    }
    return `<pre class="out text">${esc(o.data)}</pre>`;
  }).join("");
}

function renderCells(step) {
  const pane = $("cells-pane");
  if (!step.cells.length) {
    pane.innerHTML = `<p class="pane-note">No code cells on this page.</p>`;
    return;
  }
  pane.innerHTML = step.cells.map((cell) => {
    const state = cellState.get(cell.id) || { code: cell.code };
    cellState.set(cell.id, state);
    const rows = state.code.split("\n").length;
    return `<div class="cell" data-cell="${cell.id}">
      <p class="prompt">${cell.optional ? `<span class="optional">Optional.</span> ` : ""}${cell.prompt}</p>
      <textarea class="code-input" rows="${rows}" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Python code">${esc(state.code)}</textarea>
      <div class="cell-actions">
        <button class="btn primary run" type="button">Run</button>
        <button class="btn reset" type="button">Reset</button>
      </div>
      <div class="output">${outputHTML(state)}</div>
    </div>`;
  }).join("");
}

function renderSteps() {
  $("steps").innerHTML = PARTS.map((part) => {
    const buttons = STEPS.map((step, i) => step.part !== part.id ? "" :
      `<button class="step${i === current ? " current" : ""}" type="button" data-step="${i}"${i === current ? ' aria-current="page"' : ""}>${esc(step.short)}</button>`).join("");
    return `<div class="part"><span class="part-label">${esc(part.label)}</span>${buttons}</div>`;
  }).join("");
  $("count").textContent = `${current + 1} / ${STEPS.length}`;
  const pct = ((current + 1) / STEPS.length) * 100;
  const fill = $("progress-fill");
  if (fill) fill.style.width = `${pct.toFixed(2)}%`;
  $("prev").disabled = current === 0;
  $("next").disabled = current === STEPS.length - 1;
  document.querySelector(".step.current")?.scrollIntoView({ block: "nearest", inline: "center" });
}

function show(index, push = true) {
  const next = Math.max(0, Math.min(STEPS.length - 1, index));
  const dir = next > current ? "enter-next" : next < current ? "enter-prev" : "";
  current = next;
  const step = STEPS[current];
  $("slide-pane").innerHTML = slideHTML(step, current, dir);
  inlineSvgs($("slide-pane"));
  fillModelName();
  renderCells(step);
  renderSteps();
  requestAnimationFrame(fitSlide);
  for (const img of $("slide-pane").querySelectorAll("img")) if (!img.complete) img.addEventListener("load", fitSlide, { once: true });
  if (push && location.hash !== `#${step.id}`) history.pushState(null, "", `#${step.id}`);
  document.title = `${step.short} | Building a Personal Health Agent`;
  presenter.postMessage({ type: "page", index: current });
}

presenter.onmessage = ({ data }) => {
  if (!data) return;
  if (data.type === "hello") presenter.postMessage({ type: "page", index: current });
  if (data.type === "go") show(data.index);
};

let modelName = "";
function fillModelName() {
  for (const el of document.querySelectorAll("[data-model]")) if (modelName) el.textContent = modelName;
}

function setStatus(id, text, state) {
  const el = $(id);
  if (!el) return;
  const label = el.querySelector(".status-text") || el;
  label.textContent = text;
  el.dataset.state = state;
}

async function refreshStatus() {
  try {
    const s = await (await fetch("api/status", { cache: "no-store" })).json();
    setStatus("py-status", "Python: ready", "ok");
    setStatus("model-status", s.mode === "live" ? `Model: live, ${s.model}` : `Model: replay (${s.recorded})`, s.mode === "live" ? "ok" : "warn");
    modelName = s.model;
    fillModelName();
  } catch {
    setStatus("py-status", "Python: offline", "error");
  }
}

async function runCell(cellEl) {
  const id = cellEl.dataset.cell;
  const state = cellState.get(id);
  if (state.status === "running") return;
  state.code = cellEl.querySelector(".code-input").value;
  state.status = "running";
  const output = cellEl.querySelector(".output");
  const runButton = cellEl.querySelector(".run");
  runButton.disabled = true;
  runButton.setAttribute("aria-busy", "true");
  output.innerHTML = outputHTML(state);
  const started = performance.now();
  const timer = setInterval(() => {
    const el = output.querySelector(".elapsed");
    if (el) el.textContent = Math.round((performance.now() - started) / 1000);
  }, 500);
  try {
    const response = await fetch("api/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: state.code }) });
    const result = await response.json();
    state.outputs = result.outputs || [{ type: "error", data: result.error || "No result." }];
  } catch (error) {
    state.outputs = [{ type: "error", data: `Could not reach the local server: ${error.message}\nStart it with: .venv/bin/python server.py` }];
  }
  clearInterval(timer);
  state.status = "done";
  state.seconds = ((performance.now() - started) / 1000).toFixed(1);
  const live = document.querySelector(`.cell[data-cell="${id}"]`);
  if (live) {
    live.querySelector(".output").innerHTML = outputHTML(state);
    const button = live.querySelector(".run");
    button.disabled = false;
    button.removeAttribute("aria-busy");
  }
  refreshStatus();
}

function autosize(textarea) {
  textarea.rows = Math.max(1, textarea.value.split("\n").length);
}

$("cells-pane").addEventListener("click", (event) => {
  const cellEl = event.target.closest(".cell");
  if (!cellEl) return;
  if (event.target.closest(".run")) runCell(cellEl);
  if (event.target.closest(".reset")) {
    const step = STEPS[current];
    const cell = step.cells.find((c) => c.id === cellEl.dataset.cell);
    cellState.set(cell.id, { code: cell.code });
    renderCells(step);
  }
});
$("cells-pane").addEventListener("input", (event) => {
  if (!event.target.matches(".code-input")) return;
  autosize(event.target);
  cellState.get(event.target.closest(".cell").dataset.cell).code = event.target.value;
});
$("cells-pane").addEventListener("keydown", (event) => {
  if (!event.target.matches(".code-input")) return;
  if (event.key === "Enter" && event.shiftKey) {
    event.preventDefault();
    runCell(event.target.closest(".cell"));
  } else if (event.key === "Tab" && !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey) {
    event.preventDefault();
    event.target.setRangeText("    ", event.target.selectionStart, event.target.selectionEnd, "end");
  } else if (event.key === "Escape") {
    event.target.blur();
  }
});

$("steps").addEventListener("click", (event) => {
  const button = event.target.closest("[data-step]");
  if (button) show(Number(button.dataset.step));
});
$("prev").addEventListener("click", () => show(current - 1));
$("next").addEventListener("click", () => show(current + 1));
$("present").addEventListener("click", togglePresent);
$("restart").addEventListener("click", async () => {
  setStatus("py-status", "Python: restarting", "warn");
  await fetch("api/restart", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  for (const state of cellState.values()) { delete state.outputs; delete state.status; }
  renderCells(STEPS[current]);
  refreshStatus();
});

function togglePresent() {
  const on = document.body.classList.toggle("present");
  const label = $("present-label") || $("present");
  label.textContent = on ? "Show code" : "Slides only";
  $("present").setAttribute("aria-pressed", String(on));
  requestAnimationFrame(fitSlide);
}

window.addEventListener("resize", () => requestAnimationFrame(fitSlide));

document.addEventListener("keydown", (event) => {
  if (event.target.matches("textarea, input") || event.metaKey || event.ctrlKey || event.altKey) return;
  if (["ArrowRight", "PageDown"].includes(event.key)) { event.preventDefault(); show(current + 1); }
  else if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); show(current - 1); }
  else if (event.key.toLowerCase() === "p") togglePresent();
  else if (event.key.toLowerCase() === "f") {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }
  else if (event.key.toLowerCase() === "n") window.open("presenter.html", "agent-tutorial-notes", "width=1100,height=760");
});

window.addEventListener("popstate", () => showFromHash(false));
function showFromHash(push) {
  const index = STEPS.findIndex((s) => `#${s.id}` === location.hash);
  show(index < 0 ? 0 : index, push);
}

showFromHash(false);
refreshStatus();
