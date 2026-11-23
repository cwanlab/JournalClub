"""How things are shown in the page: formatted text, tables, source code."""
import html
import inspect
import json
import re

import markdown as _markdown


def esc(text):
    return html.escape(str(text), quote=True)


class Html:
    """A value the page shows as HTML."""

    def __init__(self, text):
        self.text = text

    def _repr_html_(self):
        return self.text


class Markdown(Html):
    """Text written in Markdown (the way models usually write), shown formatted."""

    def __init__(self, text):
        super().__init__('<div class="md">' + _markdown.markdown(_list_breaks(text or ""), extensions=["tables", "sane_lists"])
                         + "</div>")


_LIST_ITEM = re.compile(r"^\s*(?:[-*+]|\d+\.)\s")


def _list_breaks(text):
    """Models often start a list right under a line of text; Markdown needs a blank line before it."""
    out = []
    for line in text.split("\n"):
        if _LIST_ITEM.match(line) and out and out[-1].strip() and not _LIST_ITEM.match(out[-1]) \
                and not out[-1].startswith((" ", "\t")):
            out.append("")
        out.append(line)
    return "\n".join(out)


def table(rows, columns):
    head = "".join(f"<th>{esc(c)}</th>" for c in columns)
    body = "".join("<tr>" + "".join(f"<td>{esc(r.get(c, ''))}</td>" for c in columns) + "</tr>" for r in rows)
    return Html(f'<table class="data"><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>')


def show_tool(fn):
    """Exactly what the model is told about one tool: name, description, arguments."""
    return Html(f'<pre class="json">{esc(json.dumps(fn.spec, indent=2))}</pre>')


def show_tools(tools):
    """Name, arguments and description of each tool in a list."""
    return table([{"tool": t.spec["name"], "arguments": ", ".join(t.spec["input_schema"]["properties"]) or "none",
                   "description": t.spec["description"]} for t in tools], ["tool", "arguments", "description"])


def show_source(obj):
    """The Python source of a function, to read how it works."""
    return Html(f'<pre class="source">{esc(inspect.getsource(obj))}</pre>')
