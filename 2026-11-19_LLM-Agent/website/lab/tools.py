"""Tools: Python functions the model can ask to run. Each returns text, because text is all the model reads."""
import inspect
import typing
from pathlib import Path

import pandas as pd

from .data import DAY_0, HEALTH_RECORD, ROOT, aggregates, daily_frame

_JSON_TYPES = {str: "string", int: "integer", float: "number", bool: "boolean"}


def tool(fn):
    """Mark a function as a tool: its name, docstring and arguments become what the model reads."""
    doc = inspect.getdoc(fn) or ""
    description, _, arg_text = doc.partition("Args:")
    arg_docs = {}
    for line in arg_text.splitlines():
        name, sep, text = line.strip().partition(":")
        if sep and name.isidentifier():
            arg_docs[name] = text.strip()
        elif arg_docs and line.strip():
            last = next(reversed(arg_docs))
            arg_docs[last] += " " + line.strip()
    properties, required = {}, []
    for name, param in inspect.signature(fn).parameters.items():
        kind = param.annotation
        if typing.get_origin(kind) is typing.Literal:
            prop = {"type": "string", "enum": list(typing.get_args(kind))}
        else:
            prop = {"type": _JSON_TYPES.get(kind, "string")}
        if name in arg_docs:
            prop["description"] = arg_docs[name]
        properties[name] = prop
        if param.default is inspect.Parameter.empty:
            required.append(name)
    fn.spec = {"name": fn.__name__, "description": " ".join(description.split()),
               "input_schema": {"type": "object", "properties": properties, "required": required,
                                "additionalProperties": False}}
    return fn


def with_description(fn, description):
    """The same tool with a different description: what the model reads changes, the code does not."""
    def copy(*args, **kwargs):
        return fn(*args, **kwargs)
    copy.__name__ = fn.__name__
    copy.spec = {**fn.spec, "description": description}
    return copy


def _windows():
    days = daily_frame(days=28)
    return days.iloc[21:], days.iloc[:21]


def _span(rows):
    return f"{rows['date'].min().date()}..{rows['date'].max().date()}"


Metric = typing.Literal["minute_asleep", "minute_in_bed", "minute_awake", "sleep_efficiency", "steps"]


@tool
def compare_metric(metric: Metric) -> str:
    """Compare one daily wearable metric between the last 7 days (recent) and the 21 days before them
    (baseline): the two means, the difference, and on how many days each was observed.

    Args:
        metric: the daily column to compare.
    """
    recent, baseline = _windows()
    a, b = recent[metric].dropna(), baseline[metric].dropna()
    if a.empty or b.empty:
        return f"{metric}: not enough observed days (recent n={len(a)}/7, baseline n={len(b)}/21)."
    change = a.mean() - b.mean()
    return (f"{metric}: recent mean {a.mean():.2f} ({_span(recent)}, observed {len(a)}/7 days); "
            f"baseline mean {b.mean():.2f} ({_span(baseline)}, observed {len(b)}/21 days); "
            f"difference {change:+.2f} ({change / b.mean():+.1%})."
            + (" Main sleep only; naps are excluded." if metric.startswith(("minute_", "sleep_")) else ""))


@tool
def daily_view() -> str:
    """List the last 14 days, one date per line: minutes in bed, asleep and awake (main sleep) and steps.
    A date with no value is shown as n/a."""
    def cell(value, fmt=".0f"):
        return "n/a" if value is None or pd.isna(value) else format(value, fmt)
    lines = []
    for row in daily_frame(days=14).itertuples():
        lines.append(f"{row.date.date()} ({row.date.strftime('%a')}): in bed {cell(row.minute_in_bed)} min, "
                     f"asleep {cell(row.minute_asleep)} min, awake {cell(row.minute_awake)} min, "
                     f"steps {cell(row.steps)}")
    return "Last 14 days:\n" + "\n".join(lines)


@tool
def health_record(section: typing.Literal["conditions", "medications", "vitals", "visits"]) -> str:
    """Read one section of this person's electronic health record: diagnosed conditions, medications
    (with start dates and the prescriber's notes), vital signs, or clinic visits.

    Args:
        section: which part of the record to read.
    """
    lines = [f"{date}: {entry}" for date, entry in HEALTH_RECORD[section]]
    return (f"Health record, {section}.\n" + "\n".join(lines) +
            "\nCaution: a record says when something happened, not why sleep changed. Never advise "
            "starting, stopping or changing a medication; tell the person to ask their clinician.")


def _read_skills():
    skills = {}
    for path in sorted((ROOT / "skills").glob("*/SKILL.md")):
        _, front, body = path.read_text().split("---", 2)
        meta = dict(line.split(":", 1) for line in front.strip().splitlines())
        skills[meta["name"].strip()] = {"description": meta["description"].strip(), "body": body.strip()}
    return skills


SKILLS = _read_skills()


@tool
def load_skill(skill: str) -> str:
    """Read the full instructions of one skill from the catalog in the system prompt. Call it before
    answering when a skill's description matches the question.

    Args:
        skill: the skill's name, exactly as listed in the catalog.
    """
    if skill not in SKILLS:
        return f"No skill named {skill!r}. Available: {', '.join(SKILLS)}."
    return f"Skill {skill}\n\n{SKILLS[skill]['body']}"


def show_skills():
    """The skills in the catalog: only the name and the description sit in the prompt."""
    from .show import table
    return table([{"skill": name, "description": s["description"]} for name, s in SKILLS.items()],
                 ["skill", "description"])


TOOLS = [compare_metric, daily_view, health_record, load_skill]

SYSTEM_PROMPT = (
    "You help one person understand their own wearable data (sleep and activity) together with their health record.\n"
    "Rules:\n"
    "1. Every number you state must come from a tool result. If you have no tool result, say you cannot see the data.\n"
    "2. Report what the measurements show. Do not diagnose, and never advise starting, stopping or changing a medication.\n"
    "3. If the person's claim disagrees with the data, say so plainly and show the numbers.\n"
    "4. Keep the answer short: a few sentences or a short list.\n\n"
    "Skills (call load_skill with the name to read the full instructions):\n"
    + "\n".join(f"- {name}: {s['description']}" for name, s in SKILLS.items()))
