"""One function talks to the model: call_model. Everything else in the lab is plain Python.

Live calls go to the Claude Messages API. Every live reply is also saved in recorded.json, so the
same cell can be replayed without a network (LAB_MODE=replay, or automatically when a live call fails).
"""
import hashlib
import json
import os
import time
from dataclasses import dataclass, field

from .data import ROOT

MODEL = os.environ.get("LAB_MODEL", "claude-opus-5-5")
EFFORT = os.environ.get("LAB_EFFORT", "low")
RECORDINGS = ROOT / "recorded.json"

call_log = []     # one entry per model call: tokens, seconds, live or recorded
_client = None


@dataclass
class ToolCall:
    id: str
    name: str
    args: dict

    def __repr__(self):
        return f"{self.name}({', '.join(f'{k}={v!r}' for k, v in self.args.items())})"


@dataclass
class Reply:
    text: str                 # what the model wrote
    tool_calls: list          # the tools it asked for; empty when it has answered
    message: dict             # its whole message, to append to the conversation
    stop_reason: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    recorded: bool = False
    note: str = field(default="", repr=False)

    def _repr_html_(self):
        from .show import esc, Markdown
        parts = []
        if self.note:
            parts.append(f'<p class="note">{esc(self.note)}</p>')
        if self.text.strip():
            parts.append(Markdown(self.text)._repr_html_())
        if self.tool_calls:
            items = "".join(f"<li><code>{esc(repr(c))}</code></li>" for c in self.tool_calls)
            parts.append(f'<p class="label">The model asks for {len(self.tool_calls)} tool call(s):</p><ul class="calls">{items}</ul>')
        parts.append(f'<p class="meta">{"recorded reply" if self.recorded else "live"}, {esc(MODEL)}, '
                     f'{self.input_tokens} tokens in, {self.output_tokens} out, stop: {esc(self.stop_reason)}</p>')
        return "".join(parts)


def mode():
    """'live' when credentials are present and LAB_MODE is not 'replay'; otherwise 'replay'."""
    if os.environ.get("LAB_MODE") == "replay":
        return "replay"
    has_key = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")
    return "live" if has_key or _signed_in() else "replay"


def _signed_in():
    """True after `ant auth login`: a saved sign-in profile exists (its file is not read here)."""
    from pathlib import Path
    store = Path(os.environ.get("ANTHROPIC_CONFIG_DIR") or Path.home() / ".config" / "anthropic")
    return any((store / "credentials").glob("*.json"))


def user_message(text):
    """A message from the user."""
    return {"role": "user", "content": text}


def tool_results_message(tool_calls, results):
    """The results of the requested tools, sent back to the model in one user message."""
    return {"role": "user", "content": [
        {"type": "tool_result", "tool_use_id": call.id, "content": result}
        for call, result in zip(tool_calls, results)]}


def _block(block):
    return block if isinstance(block, dict) else block.model_dump()


def _key(contents, tools, system):
    """A stable name for one request: what was asked, not the ids or the hidden reasoning."""
    simple = []
    for message in contents:
        content = message["content"]
        if isinstance(content, str):
            simple.append([message["role"], content])
            continue
        parts = []
        for block in map(_block, content):
            if block["type"] == "text":
                parts.append(["text", block["text"]])
            elif block["type"] == "tool_use":
                parts.append(["tool_use", block["name"], block["input"]])
            elif block["type"] == "tool_result":
                parts.append(["tool_result", block["content"]])
        simple.append([message["role"], parts])
    payload = json.dumps([system, [t.spec for t in tools or []], simple], sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()[:16]


def _load():
    return json.loads(RECORDINGS.read_text()) if RECORDINGS.exists() else {}


def _reply(blocks, stop_reason, usage, recorded, note=""):
    text = "".join(b["text"] for b in blocks if b["type"] == "text")
    calls = [ToolCall(b["id"], b["name"], b["input"]) for b in blocks if b["type"] == "tool_use"]
    return Reply(text, calls, {"role": "assistant", "content": blocks}, stop_reason,
                 usage.get("input_tokens", 0), usage.get("output_tokens", 0), recorded, note)


def call_model(contents, tools=None, system=None):
    """Send the conversation so far to the model and return its reply."""
    if isinstance(contents, str):
        contents = [user_message(contents)]
    key = _key(contents, tools, system)
    started = time.time()
    note = ""
    if mode() == "live":
        try:
            reply = _live(contents, tools, system, key)
            call_log.append({"call": len(call_log) + 1, "source": "live", "input_tokens": reply.input_tokens,
                             "output_tokens": reply.output_tokens, "seconds": round(time.time() - started, 1)})
            return reply
        except Exception as error:   # on stage, a recorded reply beats a stack trace
            note = f"Live call failed ({type(error).__name__}); showing the recorded reply instead."
            if key not in _load():
                raise
    saved = _load().get(key)
    if saved is None:
        raise RuntimeError("No model is configured and this exact request has no recorded reply. "
                           "Put ANTHROPIC_API_KEY in .env and restart the server to make live calls.")
    # Replayed turns keep only text and tool requests, so they can be mixed into a later live conversation.
    blocks = [b for b in saved["content"] if b["type"] in ("text", "tool_use")]
    reply = _reply(blocks, saved["stop_reason"], saved["usage"], recorded=True, note=note)
    call_log.append({"call": len(call_log) + 1, "source": "recorded", "input_tokens": reply.input_tokens,
                     "output_tokens": reply.output_tokens, "seconds": 0.0})
    return reply


def _live(contents, tools, system, key):
    global _client
    import anthropic
    if _client is None:
        _client = anthropic.Anthropic()
    request = dict(model=MODEL, max_tokens=16000, messages=contents,
                   output_config={"effort": EFFORT},
                   # If a safety classifier declines the request, the API re-runs it on a fallback model.
                   betas=["server-side-fallback-2026-07-01"], fallbacks="default")
    if system:
        request["system"] = system
    if tools:
        request["tools"] = [t.spec for t in tools]
    response = _client.beta.messages.create(**request)
    usage = {"input_tokens": response.usage.input_tokens, "output_tokens": response.usage.output_tokens}
    blocks = [b.model_dump() for b in response.content]
    saved = _load()
    saved[key] = {"content": blocks, "stop_reason": response.stop_reason, "usage": usage, "model": response.model}
    RECORDINGS.write_text(json.dumps(saved, indent=1))
    text = "".join(b.text for b in response.content if b.type == "text")
    calls = [ToolCall(b.id, b.name, b.input) for b in response.content if b.type == "tool_use"]
    # Live turns go back to the API exactly as they came, thinking blocks included.
    return Reply(text, calls, {"role": "assistant", "content": response.content}, response.stop_reason,
                 usage["input_tokens"], usage["output_tokens"])


def show_calls():
    """What each model call cost since call_log was last cleared."""
    from .show import table
    return table(call_log, ["call", "source", "input_tokens", "output_tokens", "seconds"])
