"""The agent: a model, tools and a loop."""
from dataclasses import dataclass, field

from .llm import call_model, tool_results_message, user_message
from .show import Html, Markdown, esc, table
from .tools import SYSTEM_PROMPT

MAX_ROUNDS = 8


def run_tools(tool_calls, tools):
    """Run each requested tool and return the text of each result, in order."""
    by_name = {t.spec["name"]: t for t in tools}
    results = []
    for call in tool_calls:
        try:
            results.append(str(by_name[call.name](**call.args)))
        except Exception as error:   # the model reads the error and can try again
            results.append(f"Error: {type(error).__name__}: {error}")
    return results


@dataclass
class Answer:
    text: str
    trace: list = field(default_factory=list)      # one entry per tool call
    model_calls: int = 0
    contents: list = field(default_factory=list, repr=False)
    note: str = ""
    check: dict = None        # set by the harness: what the check found in the draft, and in the rewrite

    def _repr_html_(self):
        parts = [_check_panel(self.check) if self.check else "",
                 f'<p class="note">{esc(self.note)}</p>' if self.note else "", Markdown(self.text)._repr_html_(),
                 f'<p class="label">How it got there: {self.model_calls} model calls, {len(self.trace)} tool calls</p>']
        if self.trace:
            parts.append(show_trace(self)._repr_html_())
        return "".join(parts)


def _flag_items(found):
    rows = []
    for item in found:
        kind, _, sentence = item.partition(": ")
        rows.append(f'<li><span class="flag-kind">{esc(kind)}</span> <q>{esc(sentence)}</q></li>')
    return "<ul>" + "".join(rows) + "</ul>"


def _check_panel(check):
    """The harness check, shown from the check's own output (not from what the model wrote)."""
    draft, rewrite = check["draft"], check.get("rewrite")
    if not draft:
        return ('<div class="check-panel pass"><p class="check-head">Harness check on the draft: '
                '<b>nothing flagged</b>, so it went straight to the person.</p></div>')
    html = (f'<div class="check-panel"><p class="check-head">Harness check on the draft: '
            f'<b>{len(draft)} problem{"s" if len(draft) != 1 else ""} found</b>, sent back to the model once.</p>'
            + _flag_items(draft))
    if rewrite is not None:
        html += ('<p class="check-ok">Check on the rewrite: <b>nothing flagged</b></p>' if not rewrite else
                 f'<p class="check-head">Check on the rewrite: <b>still {len(rewrite)} flagged</b></p>' + _flag_items(rewrite))
    return html + "</div>"


def side_by_side(*columns):
    """Answers next to each other, each as (title, answer): the text, and which tools it called."""
    cells = []
    for title, answer in columns:
        trace = getattr(answer, "trace", [])              # a plain Reply from call_model has no trace
        calls = getattr(answer, "model_calls", 1)
        used = ", ".join(dict.fromkeys(t["tool"] for t in trace)) or "none"
        cells.append(f'<div class="side"><p class="label">{esc(title)}</p>{Markdown(answer.text)._repr_html_()}'
                     f'<p class="meta">{calls} model call{"s" if calls != 1 else ""}. Tools called: {esc(used)}</p></div>')
    return Html('<div class="side-by-side">' + "".join(cells) + "</div>")


def run_agent(question, tools, max_rounds=MAX_ROUNDS, system=SYSTEM_PROMPT):
    """Ask one question and loop until the model answers without asking for a tool."""
    contents = [user_message(question)]          # the conversation so far
    trace, calls = [], 0                         # what happened, for show_trace
    for round_number in range(1, max_rounds + 1):
        reply = call_model(contents, tools=tools, system=system)
        calls += 1
        if not reply.tool_calls:                 # no tool requested: this is the answer
            return Answer(reply.text, trace, calls, contents + [reply.message])
        contents.append(reply.message)           # keep the model's request
        results = run_tools(reply.tool_calls, tools)
        for call, result in zip(reply.tool_calls, results):
            trace.append({"model call": calls, "tool": call.name, "arguments": call.args, "result": result})
        contents.append(tool_results_message(reply.tool_calls, results))   # send the results back
    return Answer(f"Stopped after {max_rounds} rounds.", trace, calls, contents)


def _loop(contents, tools, max_rounds, system, trace=None, calls=0):
    """The same loop as run_agent, continued from a conversation that already exists (used by the harness)."""
    trace = [] if trace is None else trace
    for round_number in range(1, max_rounds + 1):
        reply = call_model(contents, tools=tools, system=system)
        calls += 1
        if not reply.tool_calls:
            return Answer(reply.text, trace, calls, contents + [reply.message])
        contents.append(reply.message)
        results = run_tools(reply.tool_calls, tools)
        for call, result in zip(reply.tool_calls, results):
            trace.append({"model call": calls, "tool": call.name, "arguments": call.args, "result": result})
        contents.append(tool_results_message(reply.tool_calls, results))
    return Answer(f"Stopped after {max_rounds} rounds.", trace, calls, contents)


def run_agent_checked(question, tools, check, advice, max_rounds=MAX_ROUNDS, system=SYSTEM_PROMPT):
    """The same loop with a check in the harness: code reads the draft answer before a person does.

    If check(draft) finds something, the draft goes back to the model once, with the advice.
    """
    draft = run_agent(question, tools, max_rounds, system)
    found = check(draft.text)
    if not found:
        draft.check = {"draft": []}
        return draft
    contents = draft.contents + [_flagged(found, advice)]
    final = _loop(contents, tools, max_rounds, system, draft.trace, draft.model_calls)
    final.check = {"draft": found, "rewrite": check(final.text)}
    final.note = "The rewrite:"
    return final


def _flagged(found, advice):
    return user_message(f"A check in code flagged your draft: {found}. {advice} Rewrite the answer.")


def send_back(question, draft, tools, check, advice, max_rounds=MAX_ROUNDS, system=SYSTEM_PROMPT):
    """What the harness does when the check fires: the flagged draft goes back to the model once,
    with what the check found and the advice, and the model rewrites it."""
    found = check(draft)
    contents = [user_message(question), {"role": "assistant", "content": draft}, _flagged(found, advice)]
    final = _loop(contents, tools, max_rounds, system)
    final.check = {"draft": found, "rewrite": check(final.text)}
    final.note = "The rewrite:"
    return final


def show_trace(answer):
    """One row per tool call: which model call asked for it, the arguments, and the start of the result."""
    return table([{**t, "arguments": ", ".join(f"{k}={v!r}" for k, v in t["arguments"].items()) or "none",
                   "result": t["result"].splitlines()[0][:150] + ("…" if len(t["result"]) > 150 else "")}
                  for t in answer.trace], ["model call", "tool", "arguments", "result"])


def show_contents(contents):
    """The conversation so far: who sent each message, and everything it holds."""
    rows = []
    for i, message in enumerate(contents, 1):
        content = message["content"]
        if isinstance(content, str):
            parts = ["text: " + content]
        else:
            parts = []
            for block in content:
                block = block if isinstance(block, dict) else block.model_dump()
                if block["type"] == "tool_use":
                    args = ", ".join(f"{k}={v!r}" for k, v in block["input"].items())
                    parts.append(f"tool request: {block['name']}({args})")
                elif block["type"] == "tool_result":
                    parts.append("tool result: " + str(block["content"]))
                elif block["type"] == "text" and block["text"].strip():
                    parts.append("text: " + block["text"])
        holds = "".join(f'<div class="part">{esc(p)}</div>' for p in parts)
        rows.append(f"<tr><td>{i}</td><td>{esc(message['role'])}</td><td class=\"holds\">{holds}</td></tr>")
    return Html('<table class="data contents"><thead><tr><th>#</th><th>from</th><th>holds</th></tr></thead>'
                f'<tbody>{"".join(rows)}</tbody></table>')
