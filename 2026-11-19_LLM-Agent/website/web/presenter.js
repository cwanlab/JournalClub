import { PARTS, STEPS } from "./content.js";
import { NOTES } from "./notes.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const plain = (html) => { const d = document.createElement("div"); d.innerHTML = html; return d.textContent.trim(); };
const channel = new BroadcastChannel("agent-tutorial");
let current = -1;
const KEY_CALL = /\b(show_\w+|run_agent\w*|send_back|call_model|side_by_side|health_record|load_skill|plot_days|daily_frame|medication_advice|unsafe_example|compare_metric|my_agent|weekly_means|print)\(/;
const keyLine = (code) => {
  const lines = code.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
  return (lines.find((l) => KEY_CALL.test(l) && !/^\s*def /.test(l) && !/^\s*(print\(\)|advice|rule)\b/.test(l)) || lines[0] || "").trim();
};
let started = null;

function render(index) {
  current = index;
  const step = STEPS[index];
  const note = NOTES[step.id] || { keys: [], say: [] };
  const part = PARTS.find((p) => p.id === step.part);
  $("page").textContent = `${index + 1} / ${STEPS.length}  ${step.short}`;
  $("part").textContent = part ? part.label || part.title || "" : "";
  $("target").textContent = note.end ? `end by ${note.end}` : "";
  const cells = (step.cells || []).map((c, i) =>
    `<li><b>Cell ${i + 1}</b>: ${esc(c.prompt)}<br><code>${esc(keyLine(c.code))}</code></li>`).join("");
  const say = (note.say || []).map((en) => `<div><span class="en">${esc(en)}</span></div>`).join("");
  const next = STEPS[index + 1];
  $("root").innerHTML = `<main>
    <section>
      <h1>${esc(plain(step.title || step.short))}</h1>
      <h2>Key points</h2>
      <ol class="keys">${note.keys.map((k) => `<li>${esc(k)}</li>`).join("")}</ol>
    </section>
    <div class="side">
      ${cells ? `<section><h2>Cells to run</h2><ol class="cells">${cells}</ol></section>` : ""}
      ${say ? `<section><h2>Phrases</h2><div class="say">${say}</div></section>` : ""}
      <section class="next"><h2>Next</h2>${next ? `<b>${esc(next.short)}</b>: ${esc(plain(next.title || ""))}` : "End of talk"}</section>
    </div>
  </main>`;
  document.title = `Notes: ${step.short}`;
}

channel.onmessage = ({ data }) => { if (data && data.type === "page") render(data.index); };
channel.postMessage({ type: "hello" });

const go = (delta) => channel.postMessage({ type: "go", index: Math.max(0, current + delta) });
$("prev").onclick = () => go(-1);
$("next").onclick = () => go(1);
document.addEventListener("keydown", (e) => {
  if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); go(1); }
  else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); go(-1); }
});

const fmt = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
const toSec = (s) => { const [m, x] = s.split(":").map(Number); return m * 60 + x; };
$("timer").onclick = () => {
  started = started ? null : Date.now();
  $("timer").textContent = started ? "Reset timer" : "Start timer";
  $("clock").textContent = "0:00";
  $("clock").classList.remove("late");
};
setInterval(() => {
  if (!started) return;
  const sec = Math.floor((Date.now() - started) / 1000);
  $("clock").textContent = fmt(sec);
  const note = current >= 0 ? NOTES[STEPS[current].id] : null;
  $("clock").classList.toggle("late", !!(note && note.end && sec > toSec(note.end)));
}, 500);
