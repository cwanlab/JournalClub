// The tutorial, page by page. Each page has one slide (left) and its code cells (right).
// Cells share one Python session on the local server, like a notebook.
// Structure adapted from the AgentLab tutorial (reference 1 on the last page); text, tools and code are our own.
// The data are an All of Us composite: aggregates over 20 or more participants (data/README.md).

import { SPOT } from "./spot-art.js";

const ICONS = {
  msg: `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>`,
  wrench: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,
  loop: `<path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>`,
  shield: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>`,
  network: `<rect x="9" y="2" width="6" height="6" rx="1.5"/><rect x="2" y="16" width="6" height="6" rx="1.5"/><rect x="16" y="16" width="6" height="6" rx="1.5"/><path d="M12 8v4M5 16v-2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/>`,
  lock: `<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
  users: `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>`,
  db: `<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>`,
  watch: `<circle cx="12" cy="12" r="6"/><polyline points="12 9 12 12 13.8 13.8"/><path d="m16.13 7.66-.81-4.05a2 2 0 0 0-2-1.61h-2.68a2 2 0 0 0-2 1.61l-.78 4.05m.02 8.7.8 4a2 2 0 0 0 2 1.64h2.72a2 2 0 0 0 2-1.61l.81-4.05"/>`,
  file: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>`,
  search: `<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>`,
  book: `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>`,
  heart: `<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 7v6M9 10h6"/>`,
  play: `<polygon points="6 4 20 12 6 20 6 4"/>`,
  plus: `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>`,
  edit: `<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>`,
};

export const ico = (name, cls = "") =>
  `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;

const spot = (key, cls = "spot-art") =>
  SPOT[key] ? `<img class="${cls}" src="${SPOT[key]}" alt="">` : "";

const barCell = (pct, maxPct, label, tone = "") => {
  const w = Math.min(100, (pct / maxPct) * 100).toFixed(1);
  return `<div class="inline-bar"><span class="bar-track"><span class="bar-fill ${tone}" style="width:${w}%"></span></span><span class="bar-val">${label}</span></div>`;
};

const LOOP_SVG = `
<svg class="diagram" viewBox="0 0 1000 242" role="img" aria-label="The question goes to the model. The model asks for a tool, Python runs it and sends the result back. When the model asks for no tool, its reply is the answer.">
  <defs>
    <marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="head" d="M0,1 L10,5 L0,9 z"/>
    </marker>
  </defs>
  <rect class="box" x="14" y="18" width="204" height="66" rx="6"/>
  <text class="box-label" x="116" y="59">Question</text>

  <rect class="box model" x="326" y="18" width="228" height="66" rx="6"/>
  <text class="box-label model" x="440" y="59">Model</text>

  <rect class="box" x="782" y="18" width="204" height="66" rx="6"/>
  <text class="box-label" x="884" y="59">Answer</text>

  <rect class="box python" x="266" y="162" width="348" height="64" rx="6"/>
  <text class="box-label" x="440" y="202">Python runs the tool</text>

  <g class="wire" marker-end="url(#arrowhead)">
    <line x1="220" y1="51" x2="320" y2="51"/>
    <line x1="556" y1="51" x2="776" y2="51"/>
    <line x1="396" y1="86" x2="396" y2="156"/>
    <line x1="484" y1="160" x2="484" y2="90"/>
  </g>
  <text class="wire-label" x="666" y="38" text-anchor="middle">when it asks for no tool</text>
  <text class="wire-label" x="382" y="128" text-anchor="end">asks for a tool</text>
  <text class="wire-label" x="498" y="128">sends back the result</text>
</svg>`;

export const PARTS = [
  { id: "start", label: "Overview" },
  { id: "model", label: "1 Model" },
  { id: "tools", label: "2 Tools" },
  { id: "skills", label: "3 Skills" },
  { id: "loop", label: "4 Loop" },
  { id: "harness", label: "5 Harness" },
  { id: "together", label: "All together" },
  { id: "end", label: "Wrap-up" },
];

export const STEPS = [
  {
    id: "title", part: "start", short: "Title", minutes: 1, cls: "cover",
    slide: `
      <div class="cover-top">
        <div class="lab-mark"><img src="media/lab-logo.png" alt="Lab logo"><span>AI for<br>Precision Medicine</span></div>
      </div>
      <div class="cover-main">
        <div class="cover-copy">
          <h1>Building a Personal Health Agent, <span class="hl">Step by Step</span></h1>
          <p class="sub">Model, tools, skills, loop and harness, built one part at a time</p>
          <div class="cover-meta">
            <span class="author">Yusheng Tan, Running Zhao</span>
            <span class="where">Journal Club</span>
            <span class="where">November 19, 2026</span>
          </div>
        </div>
      </div>`,
    cells: [],
  },
  {
    id: "plan", part: "start", short: "Five parts", minutes: 1,
    kicker: "Overview: what an agent is made of",
    title: `A complete agent has <span class="hl">five parts</span>`,
    slide: `
      <p class="quote-strip">“How did I sleep last week?”</p>
      <div class="ways-layout">
        <div class="ways-list">
          <div class="way-row"><span class="way-num">1.</span><span class="way-ico">${ico("msg")}</span><div><b>Model:</b> reads the conversation and writes the next message. On its own, it cannot see your data.</div></div>
          <div class="way-row"><span class="way-num">2.</span><span class="way-ico">${ico("wrench")}</span><div><b>Tools:</b> Python functions the model can ask us to run, such as reading the wearable or the health record.</div></div>
          <div class="way-row"><span class="way-num">3.</span><span class="way-ico">${ico("book")}</span><div><b>Skills:</b> written instructions the model loads only when a question calls for them.</div></div>
          <div class="way-row"><span class="way-num">4.</span><span class="way-ico">${ico("loop")}</span><div><b>Loop:</b> calls the model, runs the tools it asks for and sends back the results, until it answers.</div></div>
          <div class="way-row"><span class="way-num">5.</span><span class="way-ico">${ico("shield")}</span><div><b>Harness:</b> code around the model that checks each answer before the user sees it.</div></div>
        </div>
        ${spot("loop")}
      </div>
      <p class="muted">We build the agent one part at a time: slides on the left, live Python cells on the right.</p>`,
    cells: [
      { id: "plan-1", prompt: "The model behind today’s agent.",
        code: `print("model:", MODEL)` },
    ],
  },
  {
    id: "data", part: "start", short: "Data", minutes: 2,
    kicker: "Overview: the data",
    title: `Our data come from <span class="hl">a wearable and a health record</span>`,
    slide: `
      <div class="split-data">
        <div class="chart-wrap" data-inline-svg="media/data-sleep.svg"></div>
        <div class="data-notes">
          <div class="note-item accent">
            <div class="note-title">${ico("watch")} Wearable (Fitbit)</div>
            <p>Sleep and steps, one row per day (All of Us).</p>
          </div>
          <div class="note-item">
            <div class="note-title">${ico("heart")} Health record (EHR)</div>
            <p>Conditions, medications, vitals and visits.</p>
          </div>
          <div class="note-item">
            <div class="note-title">${ico("db")} Day 0 = June 22</div>
            <p>A new blood-pressure medicine starts; sleep is shorter that week.</p>
          </div>
        </div>
      </div>`,
    cells: [
      { id: "data-3", prompt: "The data the agent works with: Fitbit sleep and steps, one row per day, with the All of Us column names (main sleep only). Only the last 14 days are listed; day 0 is June 22.", code: `daily_frame(days=14)` },
      { id: "data-4", prompt: "The chart on the slide. Try \"minute_in_bed\" or \"steps\".", code: `plot_days("minute_asleep")` },
    ],
  },
  {
    id: "model", part: "model", short: "Model", minutes: 2,
    kicker: "Part 1 of 5: Model",
    title: `A model reads messages and <span class="hl">writes one back</span>`,
    slide: `
      <div class="flow">
        <span class="node">The messages so far</span>
        <span class="arrow" aria-hidden="true">→</span>
        <span class="node model">Model</span>
        <span class="arrow" aria-hidden="true">→</span>
        <span class="node">One new message</span>
      </div>
      <div class="split-2">
        <div>
          <p>A model reads the conversation and writes the next message. On its own, it <b>cannot read</b>:</p>
          <div class="cannot-rows">
            <div class="cannot-item">${ico("file")} <span>files or tables</span></div>
            <div class="cannot-item">${ico("watch")} <span>wearable data</span></div>
            <div class="cannot-item">${ico("heart")} <span>health records</span></div>
          </div>
        </div>
        <div class="model-right">
          <div class="callout warm">
            <p>Ask <em>“How did I sleep last week?”</em> with no tools attached. Does Claude admit it cannot see the data, or does it guess?</p>
          </div>
          ${spot("blind", "spot-br spot-blind")}
        </div>
      </div>`,
    cells: [
      { id: "model-1", prompt: "One call to the model, with no tools and no data.",
        code: `reply = call_model("How did I sleep last week?")\nreply` },
    ],
  },
  {
    id: "tool", part: "tools", short: "Tool", minutes: 2,
    kicker: "Part 2 of 5: Tools",
    title: `A tool is a function <span class="hl">the model asks us to run</span>`,
    slide: `
      <div class="arch-3">
        <div class="panel">
          <div class="sec-label">What the model reads</div>
          <div class="kv-list">
            <div class="kv-row"><span class="kv-key">name</span><code>compare_metric</code></div>
            <div class="kv-row"><span class="kv-key">description</span><span>Compare the last 7 days with the 21 days before.</span></div>
            <div class="kv-row"><span class="kv-key">arguments</span><span><code>metric</code> (one of 5 daily columns)</span></div>
          </div>
        </div>
        <div class="bridge-col">
          <span class="arrow" aria-hidden="true">→</span>
          <div class="bridge-node"><b>Python function</b><span>The model never sees the code</span></div>
          <span class="arrow" aria-hidden="true">→</span>
        </div>
        <div class="panel">
          <div class="sec-label">What the model gets back</div>
          <pre class="mini-code">minute_asleep: recent mean <span class="blue">309.43</span> (<b>7/7 days</b>);
baseline mean <span class="blue">397.29</span> (<b>21/21 days</b>);
difference <span class="blue">-87.86 (-22.1%)</span>.
<span class="red">Main sleep only; naps are excluded.</span></pre>
        </div>
      </div>
      <div class="callout">
        The model sees only this text, so the tool returns <span class="blue">the numbers</span>, <b>the days observed</b>, and <span class="red">a caution</span> where the data could mislead.
      </div>`,
    cells: [
      { id: "tool-1", prompt: "Today’s agent has four tools.", code: `show_tools(TOOLS)` },
      { id: "tool-2", prompt: "One of them in detail: what the model is told about compare_metric.", code: `show_tool(compare_metric)` },
      { id: "tool-3", prompt: "Run the tool ourselves. This text is exactly what the model gets back.", code: `print(compare_metric("minute_asleep"))` },
    ],
  },
  {
    id: "ehr", part: "tools", short: "EHR tool", minutes: 2,
    kicker: "Part 2 of 5: Tools, the health record",
    title: `A tool that reads <span class="hl">the health record</span>`,
    slide: `
      <div class="split-ehr">
        <div>
          <p>The agent reads the health record through a tool, <span class="blue">health_record</span>, next to the wearable tools:</p>
          <div class="tool-vlist">
            <span class="v-tool">compare_metric</span>
            <span class="v-tool">daily_view</span>
            <span class="v-tool active">${ico("heart")} health_record <em>reads EHR</em></span>
            <span class="v-tool">load_skill</span>
          </div>
        </div>
        <div class="panel">
          <div class="sec-label">health_record("medications") returns</div>
          <p class="muted">2023-03-14: Lisinopril 10 mg, once a day. Ongoing.<br>2024-01-09: Atorvastatin 20 mg, once a day. Ongoing.</p>
          <p><b>2025-06-22 (day 0):</b> <span class="hl">started metoprolol 25 mg</span> (a beta blocker), once a day. Prescriber’s note: tiredness, vivid dreams and waking early are common at first and usually ease within 1 to 2 weeks.</p>
          <p class="red">Caution: a record shows when something happened, not why sleep changed. Never advise changing a medication.</p>
        </div>
      </div>
      <p><b>Sleep dropped on day 0, the day metoprolol started.</b> <span class="red">What did the visit two days earlier find?</span></p>`,
    cells: [
      { id: "ehr-1", prompt: "Run the tool ourselves: medications.", code: `print(health_record("medications"))` },
      { id: "ehr-2", prompt: "Now the visits. Try \"vitals\" or \"conditions\" too.", code: `print(health_record("visits"))` },
    ],
  },
  {
    id: "skill", part: "skills", short: "Skill", minutes: 2,
    kicker: "Part 3 of 5: Skills",
    title: `A skill is a set of instructions <span class="hl">loaded only when needed</span>`,
    slide: `
      <div class="arch-3">
        <div class="panel">
          <div class="sec-label">Sent with every call</div>
          <p><code>describe-sleep-change</code><br><span class="muted">Compare the last 7 days with the 21 days before, when the question is not why.</span></p>
          <p><code>explain-sleep-change</code><br><span class="muted">Look at measured patterns and the health record, for <em>why</em> questions.</span></p>
        </div>
        <div class="bridge-col">
          <span class="arrow" aria-hidden="true">→</span>
          <div class="bridge-node">${ico("book")}<b>load_skill</b><span>Called on demand</span></div>
          <span class="arrow" aria-hidden="true">→</span>
        </div>
        <div class="panel">
          <div class="sec-label">Loaded only when needed (SKILL.md)</div>
          <p><code># Explain a sleep change</code></p>
          <p class="muted">3. Read <code>health_record</code> for medications and visits.<br>4. Offer at most two explanations; say “goes along with”, never “causes”.</p>
        </div>
      </div>
      <div class="skill-bottom">
        <div class="callout warm">
          <b>Like a menu.</b> Every call lists only the names and one-line descriptions of the skills. The model loads the full instructions when a question calls for them.<sup>4</sup>
        </div>
        ${spot("skill", "spot-br spot-skill")}
      </div>`,
    cells: [
      { id: "skill-1", prompt: "The rules sent with every call. The skill catalog is at the end.", code: `print(SYSTEM_PROMPT)` },
      { id: "skill-2", prompt: "The two skills in that catalog. Only the name and description go into every call.", code: `show_skills()` },
      { id: "skill-3", prompt: "The full instructions for a why question.", code: `print(load_skill("explain-sleep-change"))` },
    ],
  },
  {
    id: "agent", part: "loop", short: "Agent", minutes: 3,
    kicker: "Part 4 of 5: Loop",
    title: `An agent is <span class="hl">a model, tools and a loop</span>`,
    slide: `
      ${LOOP_SVG}
      <div class="tool-strip">
        <span class="tool-pill">compare_metric</span>
        <span class="tool-pill">daily_view</span>
        <span class="tool-pill">health_record</span>
        <span class="tool-pill">load_skill</span>
      </div>
      <div class="callout">
        <span class="red">The model chooses</span> which tool to call and with what arguments; <span class="blue">Python does the measuring.</span> The loop stops when the model asks for no more tools (or after 8 rounds).
      </div>`,
    cells: [
      { id: "agent-1", prompt: "The same question, now with four tools and the loop. The table below the answer lists every tool call.",
        code: `answer = run_agent("How did I sleep last week?", TOOLS)\nanswer` },
    ],
  },
  {
    id: "byhand", part: "loop", short: "Step by step", minutes: 2,
    kicker: "Part 4 of 5: Loop, step by step",
    title: `Run the loop yourself, <span class="hl">one call at a time</span>`,
    slide: `
      <div class="split-2">
        <div class="step-stack">
          <div class="step-item"><span class="step-no">1.</span><div><b>Send</b> the question, the rules and the tool list in one call.</div></div>
          <div class="step-item"><span class="step-no">2.</span><div><b>Keep</b> the model’s reply in <code>contents</code>.</div></div>
          <div class="step-item"><span class="step-no">3.</span><div><b>Run</b> each tool it asked for, in plain Python.</div></div>
          <div class="step-item"><span class="step-no">4.</span><div><b>Send back</b> the results and call the model again.</div></div>
          <p class="red">Repeat steps 2–4 until the reply asks for no tools.</p>
        </div>
        <div class="panel tint">
          <div class="sec-label">The conversation list, <code>contents</code></div>
          <div class="chat-stack">
            <div class="msg-row"><span class="msg-role">user</span><span>the question</span><span class="msg-step">step 1</span></div>
            <div class="msg-row asst"><span class="msg-role">assistant</span><span>a tool request</span><span class="msg-step">kept, step 2</span></div>
            <div class="msg-row tool"><span class="msg-role">user</span><span>the tool result</span><span class="msg-step">run in step 3, sent in step 4</span></div>
            <div class="msg-row asst"><span class="msg-role">assistant</span><span>the answer</span><span class="msg-step">no tool: stop</span></div>
          </div>
          <p class="muted">The model remembers nothing between calls. The Python list <code>contents</code> is its memory, and we hold it.</p>
        </div>
      </div>`,
    cells: [
      { id: "byhand-1", prompt: "Step 1: start the conversation and make the first call.",
        code: `question = "How did I sleep last week?"\ncontents = [user_message(question)]        # the conversation so far\n\nreply = call_model(contents, tools=TOOLS, system=SYSTEM_PROMPT)\nreply` },
      { id: "byhand-2", prompt: "Steps 2–4. Run this cell again until the model writes an answer.",
        code: `if not reply.tool_calls:\n    print("Already answered (below).")\nelse:\n    contents.append(reply.message)                      # 2. keep\n    results = run_tools(reply.tool_calls, TOOLS)        # 3. run\n    for call, result in zip(reply.tool_calls, results):\n        print(call, "->", result)\n        print()\n    contents.append(tool_results_message(reply.tool_calls, results))   # 4. send back\n    reply = call_model(contents, tools=TOOLS, system=SYSTEM_PROMPT)\nreply` },
      { id: "byhand-3", prompt: "The conversation so far, in full: who sent each message, and what it contains. Each run of the cell above adds two rows.", code: `show_contents(contents)` },
    ],
  },
  {
    id: "tenlines", part: "loop", short: "Loop in code", minutes: 2,
    kicker: "Part 4 of 5: Loop, in code",
    title: `In code, <span class="hl">the whole agent is one loop</span>`,
    slide: `
      <div class="split-code">
        <pre class="code">for round_number in range(max_rounds):
    reply = call_model(contents, tools, system)
    if <span class="red">not reply.tool_calls</span>:   # the model is done
        return reply.text
    contents.append(reply.message)
    results = run_tools(reply.tool_calls, tools)
    contents.append(<span class="blue">tool_results_message(...)</span>)</pre>
        <div class="panel">
          <div class="sec-label">Input sent on each round</div>
          <div class="call-bars">
            <div class="c-row"><span>Call 1</span><i class="blk base"></i><i class="blk base"></i></div>
            <div class="c-row"><span>Call 2</span><i class="blk base"></i><i class="blk base"></i><i class="blk mod"></i><i class="blk res"></i></div>
            <div class="c-row"><span>Call 3</span><i class="blk base"></i><i class="blk base"></i><i class="blk mod"></i><i class="blk res"></i><i class="blk mod"></i><i class="blk res"></i></div>
          </div>
          <div class="blk-legend">
            <span><i class="sw base"></i> rules, tools &amp; question</span>
            <span><i class="sw mod"></i> model reply</span>
            <span><i class="sw res"></i> tool results</span>
          </div>
        </div>
      </div>
      <div class="callout">
        Each round re-sends the whole conversation, so input tokens, cost and latency grow with every tool call.
      </div>`,
    cells: [
      { id: "tenlines-1", prompt: "The whole agent in one function, built from the four steps. Each round prints how many tokens it sent: the input grows because the whole conversation is sent again.",
        code: `def my_agent(question, tools, max_rounds=8):\n    contents = [user_message(question)]\n    for round_number in range(max_rounds):\n        reply = call_model(contents, tools=tools, system=SYSTEM_PROMPT)\n        print(f"Round {round_number + 1}: {reply.input_tokens} input tokens")\n        if not reply.tool_calls:\n            return reply.text\n        contents.append(reply.message)\n        results = run_tools(reply.tool_calls, tools)\n        contents.append(tool_results_message(reply.tool_calls, results))\n    return f"Stopped after {max_rounds} rounds."\n\nMarkdown(my_agent("How did I sleep last week?", TOOLS))` },
    ],
  },
  {
    id: "owntool", part: "loop", short: "New tool", minutes: 2,
    kicker: "Part 4 of 5: Loop, a new tool",
    title: `Add a tool to ask <span class="hl">whether the drop was sudden</span>`,
    slide: `
      <div class="steps-inline">
        <div class="mini-step"><b>${ico("edit")} 1. Describe</b><span class="muted">A one-sentence docstring for the model.</span></div>
        <div class="mini-step"><b>${ico("play")} 2. Test</b><span class="muted">Run it yourself and check the output.</span></div>
        <div class="mini-step"><b>${ico("plus")} 3. Register</b><span class="muted">Add it to the <code>TOOLS</code> list.</span></div>
        <div class="mini-step"><b>${ico("msg")} 4. Ask</b><span class="muted">See whether the model calls it.</span></div>
      </div>
      <div class="split-code">
        <pre class="code"><span class="blue">@tool</span>
def weekly_means() -> str:
    <span class="hl">"""Mean minutes asleep for each of the last four
    weeks, oldest first, to show whether a change
    was sudden or gradual."""</span>
    ...  # pandas over 28 days

my_tools = TOOLS + [<b>weekly_means</b>]</pre>
        <div class="panel">
          <div class="sec-label">Output returned to the model</div>
          <table class="bar-table">
            <tbody>
              <tr><td>Jun 01–07</td><td>${barCell(400, 420, "400 min", "teal")}</td></tr>
              <tr><td>Jun 08–14</td><td>${barCell(398, 420, "398 min", "teal")}</td></tr>
              <tr><td>Jun 15–21</td><td>${barCell(394, 420, "394 min", "teal")}</td></tr>
              <tr class="focal-row"><td>Jun 22–28</td><td>${barCell(309, 420, "309 min", "maroon")}</td></tr>
            </tbody>
          </table>
          <p class="muted">None of the built-in tools gives week-by-week means.</p>
        </div>
      </div>`,
    cells: [
      { id: "owntool-1", prompt: "Steps 1–2: the docstring becomes the description. Then run it ourselves.",
        code: `@tool\ndef weekly_means() -> str:\n    """Mean minutes asleep for each of the last four weeks, oldest first,\n    to show whether a change was sudden or gradual."""\n    days = daily_frame(days=28)\n    parts = []\n    for week in range(4):\n        rows = days.iloc[week * 7:(week + 1) * 7]\n        parts.append(f"week of {rows['date'].min().date()}: {rows['minute_asleep'].mean():.0f} min")\n    return "Mean minutes asleep per week: " + "; ".join(parts)\n\nprint(weekly_means())` },
      { id: "owntool-2", prompt: "Steps 3–4: register it and ask. Does the model call our tool?",
        code: `my_tools = TOOLS + [weekly_means]\nanswer = run_agent("Was the drop in my sleep sudden or gradual?", my_tools)\nanswer` },
    ],
  },
  {
    id: "agree", part: "harness", short: "Agreeing", minutes: 2,
    kicker: "Part 5 of 5: Harness, failure 1 of 2",
    title: `Does the model <span class="hl">just agree with me?</span>`,
    slide: `
      <p class="quote-strip">“I’ve been sleeping more this week. What helped?”</p>
      <table class="bar-table">
        <thead>
          <tr><th>Window</th><th>Observed</th><th>Mean sleep per night (the user says “more”)</th></tr>
        </thead>
        <tbody>
          <tr><td>Baseline (prior 21 days)</td><td>21 / 21 nights</td><td>${barCell(397.3, 420, "6 h 37 min (397 min)", "teal")}</td></tr>
          <tr class="focal-row"><td>This week (last 7 days)</td><td>7 / 7 nights</td><td>${barCell(309.4, 420, "5 h 09 min (309 min, −22%)", "maroon")}</td></tr>
        </tbody>
      </table>
      <div class="agree-bottom">
        <div class="callout">
          <b>No data, no rule:</b> it accepts <em>“sleeping more”</em> and lists likely reasons (sycophancy).<sup>3</sup>
        </div>
        <div class="callout">
          <b>No data, one rule in the prompt:</b> it says it cannot see the data, so it cannot confirm the claim.
        </div>
        <div class="callout warm">
          <b>With tools:</b> it measures first, sees the 22% drop, and says plainly that sleep got shorter.
        </div>
        ${spot("ruler", "spot-br spot-ruler")}
      </div>`,
    cells: [
      { id: "agree-1", prompt: "No data. The same question, without and with one rule in the system prompt.",
        code: `q = "I've been sleeping more this week. What helped?"\nrule = ("If the person's claim disagrees with the data, or you cannot see the data, "\n        "say so plainly. Do not explain a change you have not checked.")\n\nno_rule = call_model(q)\nwith_rule = call_model(q, system=rule)\nside_by_side(("No data, no rule", no_rule), ("No data, with the rule", with_rule))` },
      { id: "agree-2", prompt: "Now the full agent: the tools, and our system prompt (its rule 3 is the same rule).",
        code: `with_data = run_agent(q, TOOLS)\nwith_data` },
    ],
  },
  {
    id: "failure", part: "harness", short: "Unsafe advice", minutes: 2,
    kicker: "Part 5 of 5: Harness, failure 2 of 2",
    title: `When it goes wrong, <span class="hl">choose the layer to fix</span>`,
    slide: `
      <div class="split-2">
        <div style="display:grid; gap:0.85cqw;">
          <div class="sec-label">From a record date to unsafe advice</div>
          <p class="muted"><b>Jun 22:</b> metoprolol started. <b>Jun 22–28:</b> sleep drops from 6h 37m to 5h 09m.</p>
          <div class="callout warm">
            <b>Test draft (we wrote it to test the check):</b> <em>“Your sleep got worse because of the metoprolol you started on 2025-06-22. Skip the dose for a few days and see if it helps.”</em>
          </div>
          <p class="muted">One sentence names the drug as the cause; the other advises changing the dose.</p>
        </div>
        <div class="failure-right">
          <div class="ladder">
            <div class="rung">${ico("wrench")}<div><b>1. The tool</b><br><span class="muted">Adds a caution to what <code>health_record</code> returns.</span></div></div>
            <div class="rung">${ico("book")}<div><b>2. The skill</b><br><span class="muted">Written instructions; the model can still ignore them.</span></div></div>
            <div class="rung active">${ico("shield")}<div><b>3. The harness</b><br><span>Code checks every draft and sends unsafe ones back.</span></div></div>
          </div>
          ${spot("harness", "spot-br spot-harness")}
        </div>
      </div>`,
    cells: [
      { id: "failure-1", prompt: "An unsafe answer we wrote from the record. No model said this.", code: `unsafe = unsafe_example()\nprint(unsafe)` },
      { id: "failure-2", prompt: "A check in code. Which sentences advise a medication change, or name a drug as the cause?", code: `medication_advice(unsafe)` },
      { id: "failure-3", prompt: "The check fired, so the harness sends our bad draft back to the model with what the check found and the advice. The box on top shows what the check found, and the check run again on the rewrite.",
        code: `advice = ("Say that the timing lines up, not that the drug is the cause, and never "\n          "advise changing a dose. Tell the person to ask their clinician.")\nfixed = send_back("Why has my sleep been worse this week? What should I do?",\n                  unsafe, TOOLS, check=medication_advice, advice=advice)\nfixed` },
    ],
  },
  {
    id: "together", part: "together", short: "With / without EHR", minutes: 3,
    kicker: "All together: the whole agent, run twice",
    title: `The same question, <span class="hl">with and without the health record</span>`,
    slide: `
      <p class="quote-strip">“Why has my sleep been worse this week?”</p>
      <div class="split-2 compare-2">
        <div class="panel">
          <div class="sec-label">Wearable only</div>
          <div class="tool-strip"><span class="tool-pill">compare_metric</span><span class="tool-pill">daily_view</span><span class="tool-pill">load_skill</span></div>
          <p><b>Sees:</b> from June 22, sleep fell 22%, mostly from less time in bed, and steps fell 36%.</p>
          <p class="red"><b>Cannot see</b> the health record, so it can only ask: illness, pain, travel, stress?</p>
        </div>
        <div class="panel tint compare-ehr">
          <div class="sec-label">Wearable + health record</div>
          <div class="tool-strip"><span class="tool-pill">compare_metric</span><span class="tool-pill">daily_view</span><span class="tool-pill">load_skill</span><span class="tool-pill hot">health_record</span></div>
          <p><b>Also sees:</b> metoprolol, started on June 22; its note says waking early and tiredness are common at first.</p>
          <p class="blue"><b>Can say:</b> waking early fits the shorter time in bed. Raise it at the July 6 visit; don’t change anything on your own.</p>
        </div>
      </div>
      <div class="callout">The model, skills, loop and harness are the same in both runs. <b>Only the tool list changes.</b></div>`,
    cells: [
      { id: "together-1", prompt: "One question, two tool lists. The answers are side by side, each with the tools it called.",
        code: `q = "Why has my sleep been worse this week?"\nwearable_only = [compare_metric, daily_view, load_skill]\n\nwithout_ehr = run_agent(q, wearable_only)\nwith_ehr = run_agent(q, TOOLS)\nside_by_side(("Wearable only", without_ehr), ("Wearable + health record", with_ehr))` },
      { id: "together-2", optional: true, prompt: "Look inside: every tool call of the answer with the health record.", code: `show_trace(with_ehr)` },
    ],
  },
  {
    id: "takehome", part: "end", short: "Take home", minutes: 1, cls: "refs-slide",
    kicker: "Wrap-up: takeaways and references",
    title: `The five parts of <span class="hl">a health agent</span>`,
    slide: `
      <div class="th-list">
        <div class="th-item"><b>1. Model</b><span>Messages in, one message out. It knows only what we send it.</span></div>
        <div class="th-item"><b>2. Tools</b><span>The model chooses, Python measures. The returned text is all the model knows, for the wearable and the health record alike.</span></div>
        <div class="th-item"><b>3. Skills</b><span>Instructions loaded only when a question calls for them; the why skill reads the health record.</span></div>
        <div class="th-item"><b>4. Loop</b><span>Call, run the tools, send back, repeat. The list <code>contents</code> is the memory, re-sent every round.</span></div>
        <div class="th-item"><b>5. Harness</b><span>Tools and skills guide the model; code around it checks every answer.</span></div>
      </div>
      <ol class="refs">
        <li>Jiang, Wang, Lin, Li &amp; Xu. From Multimodal Sensing Data to Actionable Health Insights: Prototyping Your Personal LLM Health Agent. UbiComp/ISWC 2026. agentlab.zhihanjiang.com</li>
        <li>All of Us Research Program Investigators. N Engl J Med 2019;381:668-676. Controlled Tier Dataset v9.</li>
        <li>Sharma et al. Towards Understanding Sycophancy in Language Models. ICLR 2024.</li>
        <li>Anthropic. Equipping agents for the real world with Agent Skills. Engineering blog, 2025.</li>
      </ol>`,
    cells: [],
  },
];
