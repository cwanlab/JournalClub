"""An All of Us composite (see data/README.md): daily Fitbit medians across 273 participants, plus group-level EHR facts.

Every value is an aggregate over 20 or more participants. It is not one person's record.
"""
import functools
import json
from pathlib import Path

import pandas as pd

from .show import Html, esc

ROOT = Path(__file__).resolve().parent.parent
PERSON = "All of Us composite"
END_DATE = "2025-06-28"
DAY_0 = "2025-06-22"          # placeholder date of the first beta-blocker record

# The health record of the person in the tutorial. Written for teaching, to fit the wearable data:
# blood pressure was high on June 20, metoprolol started on day 0, sleep and steps dropped that day and are easing.
HEALTH_RECORD = {
    "conditions": [
        ("2023-03-14", "High blood pressure (hypertension)."),
        ("2024-01-09", "High cholesterol."),
        ("—", "No sleep disorder on record."),
    ],
    "medications": [
        ("2023-03-14", "Lisinopril 10 mg, once a day. Ongoing."),
        ("2024-01-09", "Atorvastatin 20 mg, once a day. Ongoing."),
        (f"{DAY_0} (day 0)", "Started metoprolol 25 mg (a beta blocker), once a day. Prescriber's note: "
                             "tiredness, vivid dreams and waking early are common in the first weeks and usually "
                             "ease within 1 to 2 weeks; call if dizzy or very tired."),
    ],
    "vitals": [
        ("2025-03-14", "Blood pressure 136/86, resting heart rate 78."),
        ("2025-06-20", "Blood pressure 158/98, resting heart rate 92."),
    ],
    "visits": [
        ("2025-03-14", "Primary care, routine check. Blood pressure near goal; no change."),
        ("2025-06-20", "Primary care. Blood pressure high on lisinopril, some palpitations. Plan: add metoprolol "
                       "from June 22; recheck in two weeks."),
        ("2025-07-06", "Primary care follow-up, scheduled: blood pressure and how the new medicine is going."),
    ],
}
TABLES = ["sleep_daily_summary", "activity_summary"]

FIELDS = {
    "minute_in_bed": "sleep_daily_summary: minutes in bed, main sleep only.",
    "minute_asleep": "sleep_daily_summary: minutes asleep, main sleep only.",
    "minute_awake": "sleep_daily_summary: minutes awake during the main sleep.",
    "sleep_efficiency": "Derived: minute_asleep / minute_in_bed.",
    "steps": "activity_summary: steps for the calendar day.",
}


@functools.lru_cache(maxsize=None)
def aggregates():
    """Everything that left the Researcher Workbench: aggregates only, every count 20 or more."""
    return json.loads((ROOT / "data" / "aou_aggregates.json").read_text())


@functools.lru_cache(maxsize=None)
def read_table(name):
    """One Fitbit table of the composite, with the All of Us column names, as a DataFrame."""
    table = pd.read_csv(ROOT / "data" / f"{name}.csv")
    for column in table.columns:
        if column.endswith("date"):
            table[column] = pd.to_datetime(table[column])
    return table


def show_table(name, rows=6):
    """The first rows of one Fitbit table: sleep_daily_summary or activity_summary."""
    return read_table(name).drop(columns=["participants"], errors="ignore").head(rows)


def participant():
    """What the composite is: a group of All of Us participants, not one person."""
    c = aggregates()["composite"]
    return pd.DataFrame([
        {"field": "source", "value": "All of Us Controlled Tier Dataset v9, aggregates only"},
        {"field": "participants", "value": c["n"]},
        {"field": "selected because", "value": "minutes asleep fell 10% or more in the week after a first beta-blocker record"},
        {"field": "each daily value", "value": f"median across {min(c['n_sleep'])} to {max(c['n_steps'])} participants"},
        {"field": "age, median [IQR]", "value": f"{c['age_median']} [{c['age_iqr'][0]}, {c['age_iqr'][1]}]"},
        {"field": "female", "value": f"{c['female_pct']}%"},
        {"field": "day 0 (first beta-blocker record)", "value": f"{DAY_0}, a placeholder date"},
    ])


def daily_frame(days=14, end_date=None):
    """One row per calendar date, ending at end_date. A date with no value stays missing (NaN)."""
    dates = pd.date_range(end=pd.Timestamp(end_date or END_DATE), periods=days, name="date")
    sleep = read_table("sleep_daily_summary")
    sleep = sleep[sleep["is_main_sleep"]].set_index("sleep_date")[["minute_in_bed", "minute_asleep", "minute_awake"]]
    activity = read_table("activity_summary").set_index("date")[["steps"]]
    rows = sleep.reindex(dates).join(activity.reindex(dates)).reset_index()
    rows.insert(4, "sleep_efficiency", rows["minute_asleep"] / rows["minute_in_bed"])
    return rows


def show_fields():
    """What each column of daily_frame() means and which All of Us table it comes from."""
    return pd.DataFrame({"column": list(FIELDS), "meaning": list(FIELDS.values())})


def plot_days(column="minute_asleep", days=28):
    """A bar per date for one column. The last 7 days are in maroon; a missing date has no bar."""
    rows = daily_frame(days=days)
    values = rows[column]
    top = float(values.max()) if values.notna().any() else 1.0
    width, height, left, base = 900, 304, 60, 250
    step = (width - left - 10) / days
    parts = [f'<svg class="chart" viewBox="0 0 {width} {height}" role="img" '
             f'aria-label="{esc(column)} per day">']
    for frac in (0, 0.5, 1):
        y = base - frac * 210
        v = top * frac
        label = "0" if frac == 0 else (f"{int(round(v)):,}" if top >= 10 else f"{v:.2f}")
        parts.append(f'<line class="grid" x1="{left}" x2="{width - 10}" y1="{y:.1f}" y2="{y:.1f}"/>'
                     f'<text class="tick" x="{left - 7}" y="{y + 4:.1f}" text-anchor="end">{label}</text>')
    for i, (date, value) in enumerate(zip(rows["date"], values)):
        x = left + i * step
        if pd.isna(value):
            parts.append(f'<text class="tick" x="{x + step / 2:.1f}" y="{base - 6}" text-anchor="middle">n/a</text>')
        else:
            h = 210 * float(value) / top
            parts.append(f'<rect class="{"bar recent" if i >= days - 7 else "bar"}" x="{x + 2:.1f}" y="{base - h:.1f}" '
                         f'width="{step - 4:.1f}" height="{h:.1f}"><title>{date.date()}: {value:.2f}</title></rect>')
        if i % 7 == 0 or i == days - 1:
            parts.append(f'<text class="tick" x="{x + step / 2:.1f}" y="{base + 18}" text-anchor="middle">'
                         f'{date.strftime("%b %-d")}</text>')
    parts.append(f'<text class="tick" x="{left}" y="{height - 8}">{esc(column)} per day. '
                 f'Red: the last 7 days. Blue: the 21 days before.</text></svg>')
    return Html("".join(parts))
