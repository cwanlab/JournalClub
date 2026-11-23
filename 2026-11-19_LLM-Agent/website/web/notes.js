// Speaker notes for the presenter window (presenter.html). Not shown on the projected page.
// keys: what to say, in order. say: ready-made English sentences.
// end: where the talk should be when this page ends (from talk/speaker_script.md).

export const NOTES = {
  title: {
    end: "1:00",
    keys: [
      "Open up an LLM agent and build it part by part",
      "One person: a wearable + a health record (made up for teaching)",
    ],
    say: [
      "I'll walk you through it step by step.",
    ],
  },
  plan: {
    end: "2:30",
    keys: [
      "Five parts: model, tools, skills, loop, harness",
      "Each part is one section of the talk",
      "Slides on the left, live Python on the right",
      "Run the cell: the model behind today’s agent",
    ],
    say: [
      "Here is how the talk works: slides on the left, code on the right.",
      "On the right are Python cells that run live.",
      "By the end, you’ll have a first idea of how an agent works inside.",
    ],
  },
  data: {
    end: "4:30",
    keys: [
      "Fitbit sleep and steps, one row per day, All of Us column names",
      "Day 0 = June 22",
      "Sleep 397 → 309 min a night (−22%)",
      "Cell 1: only 14 days listed; cell 2: the chart from the data",
    ],
    say: [
      "The data are synthetic, in the All of Us format.",
      "To keep it easy to follow, I only list the last 14 days.",
      "Starting from the next slide, we build the agent one part at a time.",
    ],
  },
  model: {
    end: "6:00",
    keys: [
      "Part 1: the model reads messages and writes one back",
      "No tools, no data: it cannot see your sleep",
      "→ the first problem: how does it get the data?",
    ],
    say: [
      "Now we come to the first part: the model.",
      "Let’s run it, and the answer will appear here.",
      "This leads to the first problem: the model cannot see the data.",
    ],
  },
  tool: {
    end: "8:30",
    keys: [
      "Part 2: a tool is a Python function the model asks us to run",
      "Cell 1: today’s 4 tools (2 wearable, 1 health record, load_skill)",
      "Cell 2: model sees name, description, arguments; never the code",
      "Cell 3: the return text is everything the model knows",
      "Numbers + days observed + a caution",
    ],
    say: [
      "To make it easier to explain, I use a plain Python function as the tool.",
      "A tool retrieves the data; the model only reads the text it returns.",
    ],
  },
  ehr: {
    end: "10:30",
    keys: [
      "health_record(section): one section as text",
      "Cell 1 medications: metoprolol 25 mg from day 0 (beta blocker)",
      "Prescriber’s note: early waking, tiredness common; ease in 1–2 weeks",
      "Cell 2 visits: Jun 20 high blood pressure; follow-up Jul 6",
      "Caution line: timing, not cause; never advise changing a medication",
    ],
    say: [
      "meh-TOE-pruh-lol, a beta blocker for blood pressure.",
      "Vitals: blood pressure and heart rate.",
      "A real tool would read the OMOP tables in All of Us; here we use this teaching record instead.",
    ],
  },
  skill: {
    end: "12:30",
    keys: [
      "Part 3: a skill = how to answer one kind of question (SKILL.md)",
      "Every call carries only the name + one line (a menu)",
      "load_skill brings the full instructions when needed",
      "Cell 1 system prompt (catalog at the end) → cell 2 two skills → cell 3 full skill",
      "Say “goes along with”, never “causes”",
    ],
    say: [],
  },
  agent: {
    end: "14:30",
    keys: [
      "Part 4: agent = model + tools + a loop",
      "Same question as page 4, now a real answer",
      "5 h 09 vs 6 h 37 (−22%); nights shorter, not more broken",
      "Table: loaded the describe skill, then 3 compare_metric calls at once",
    ],
    say: [
      "Every step is traceable: each tool call is in the table.",
    ],
  },
  byhand: {
    end: "17:30",
    keys: [
      "Slow it down: one model call at a time",
      "Cell 1: first call → asks for load_skill",
      "Cell 2: keep its message, run the tools, send the results back",
      "Run cell 2 again until it answers (“Already answered”)",
      "It follows the skill: minute_asleep, then in_bed and awake",
      "Cell 3: the conversation grows by 2 rows each round",
    ],
    say: [
      "This is the whole principle behind the loop.",
    ],
  },
  tenlines: {
    end: "19:00",
    keys: [
      "The whole agent is one for loop",
      "Call; no tool asked → return; else keep, run, send back",
      "Tokens per round: ~1,200 → 1,500 → 2,000",
      "Whole conversation re-sent each round → keep tool results short",
    ],
    say: [],
  },
  owntool: {
    end: "21:00",
    keys: [
      "No built-in tool gives weekly means",
      "Docstring = the description the model reads",
      "Cell 1: 400, 398, 394, then 309: a sudden drop",
      "Cell 2: TOOLS + [weekly_means]; does the model call it?",
    ],
    say: [
      "This new tool fills a gap the other tools leave.",
      "In theory, we can add as many tools as we need; each one is just a function.",
    ],
  },
  agree: {
    end: "23:30",
    keys: [
      "Part 5: request (prompt, skill) vs enforced (code) = harness",
      "Leading question: “sleeping more”; data say −22%",
      "Cell 1 left: no data, no rule → goes along, lists reasons (sycophancy)",
      "Cell 1 right: one rule → “I can’t see the data, can’t confirm”",
      "Cell 2: full agent → “the opposite: less”, with numbers",
      "Without rule 3 it still corrects: the numbers are in front of it",
    ],
    say: [
      "The question assumes something the data contradict.",
      "Without data, it accepts an unfounded conclusion.",
      "A good agent should question the claim, not just accept it.",
      "The rule tells the model what it is supposed to say when it cannot check.",
      "Agreeing with the user is not the same as being right.",
    ],
  },
  failure: {
    end: "26:30",
    keys: [
      "Easy to go from a date to unsafe advice",
      "Cell 1: a bad draft we wrote ourselves; no model said this",
      "Two problems: names the drug as the cause; says skip the dose",
      "3 layers: tool caution, skill (requests), harness code (enforced)",
      "Cell 2: plain Python rules, same result every time",
      "Cell 3: red box = 2 found, sent back; green = rewrite passes",
      "In real use: check at the exit of every answer; insurance",
    ],
    say: [],
  },
  together: {
    end: "29:00",
    keys: [
      "Same question, two tool lists",
      "Wearable only: shorter nights, generic guesses",
      "+ health record: metoprolol on day 0, prescriber’s note, Jul 6 follow-up",
      "Still safe: “lines up”, no dose change, ask the clinician",
    ],
    say: [
      "With the health record, the answer becomes specific to this person.",
    ],
  },
  takehome: {
    end: "30:00",
    keys: [
      "Model alone cannot see the data",
      "Tools give data; skills say how to answer",
      "The loop ties them together; the harness checks the result",
      "With the health record: specific and still safe",
      "Questions",
    ],
    say: [
      "I hope you now have a first idea of how an agent is built.",
    ],
  },
};
