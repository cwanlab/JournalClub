"""Local server for the tutorial page: serves web/ and runs code cells in one shared Python session.

Run:  .venv/bin/python server.py      then open http://127.0.0.1:8790
It listens on this machine only, because /api/run executes whatever code the page sends.
"""
import ast
import contextlib
import io
import json
import os
import threading
import traceback
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("LAB_PORT", "8790"))

# Credentials and settings live in .env (never in the page): ANTHROPIC_API_KEY=..., LAB_MODEL=..., LAB_MODE=replay
if (ROOT / ".env").exists():
    for line in (ROOT / ".env").read_text().splitlines():
        name, sep, value = line.strip().partition("=")
        if sep and name and not name.startswith("#"):
            os.environ.setdefault(name.strip(), value.strip().strip('"').strip("'"))

import pandas as pd  # noqa: E402
import lab  # noqa: E402

_lock = threading.Lock()
_session = {}


def _fresh_session():
    _session.clear()
    exec("from lab import *\nimport pandas as pd", _session)
    lab.call_log.clear()


def _render(value):
    if value is None:
        return None
    if isinstance(value, pd.DataFrame):
        return {"type": "html", "data": value.to_html(classes="data", border=0, na_rep="NaN", max_rows=30,
                                                      float_format=lambda x: f"{x:.2f}", index=False)}
    if hasattr(value, "_repr_html_"):
        return {"type": "html", "data": value._repr_html_()}
    return {"type": "text", "data": value if isinstance(value, str) else repr(value)}


class _Stream(io.TextIOBase):
    """print() output, kept in order with displayed values."""

    def __init__(self, outputs):
        self.outputs = outputs

    def write(self, text):
        if self.outputs and self.outputs[-1]["type"] == "text":
            self.outputs[-1]["data"] += text
        elif text:
            self.outputs.append({"type": "text", "data": text})
        return len(text)


def run_cell(code):
    outputs = []

    def display(value):
        rendered = _render(value)
        if rendered:
            outputs.append(rendered)

    _session["display"] = display
    try:
        tree = ast.parse(code)
        last = tree.body.pop() if tree.body and isinstance(tree.body[-1], ast.Expr) else None
        with contextlib.redirect_stdout(_Stream(outputs)):
            exec(compile(tree, "<cell>", "exec"), _session)
            if last is not None:
                display(eval(compile(ast.Expression(last.value), "<cell>", "eval"), _session))
        ok = True
    except Exception:
        lines = traceback.format_exc().splitlines()
        keep = [l for l in lines if "server.py" not in l and not l.startswith("    exec(") and not l.startswith("    display(eval(")]
        outputs.append({"type": "error", "data": "\n".join(keep[-12:])})
        ok = False
    return {"ok": ok, "outputs": outputs}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "web"), **kwargs)

    def log_message(self, *args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _json(self, payload, status=200):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/status":
            recorded = len(json.loads(lab.llm.RECORDINGS.read_text())) if lab.llm.RECORDINGS.exists() else 0
            return self._json({"python": "ready", "mode": lab.mode(), "model": lab.MODEL, "recorded": recorded})
        return super().do_GET()

    def do_POST(self):
        # Only this page may call the API: a cell runs arbitrary Python.
        if self.headers.get("Origin") not in (None, f"http://127.0.0.1:{PORT}", f"http://localhost:{PORT}"):
            return self._json({"error": "forbidden"}, 403)
        length = int(self.headers.get("Content-Length") or 0)
        payload = json.loads(self.rfile.read(length) or b"{}")
        if self.path == "/api/run":
            with _lock:
                return self._json(run_cell(payload.get("code", "")))
        if self.path == "/api/restart":
            with _lock:
                _fresh_session()
            return self._json({"ok": True})
        return self._json({"error": "not found"}, 404)


if __name__ == "__main__":
    _fresh_session()
    print(f"Tutorial lab on http://127.0.0.1:{PORT}  (model: {lab.MODEL}, mode: {lab.mode()})")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
