"""Write the composite's two Fitbit tables from the All of Us aggregates (data/aou_aggregates.json).

Each row is one relative day; each value is the median across the participants with data that day (233 or more).
Day 0, the date of the first beta-blocker record, is placed on a placeholder calendar date.
"""
import csv
import datetime
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
DAY_0 = datetime.date(2025, 6, 22)          # placeholder: real dates differ from person to person
c = json.loads((HERE / "aou_aggregates.json").read_text())["composite"]

with open(HERE / "sleep_daily_summary.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["person_id", "sleep_date", "is_main_sleep", "minute_in_bed", "minute_asleep", "minute_awake", "participants"])
    for i, rel in enumerate(c["rel"]):
        w.writerow(["AOU-COMPOSITE", DAY_0 + datetime.timedelta(days=rel), True, c["in_bed_p50"][i], c["asleep_p50"][i],
                    c["awake_p50"][i], c["n_sleep"][i]])
with open(HERE / "activity_summary.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["person_id", "date", "steps", "participants"])
    for i, rel in enumerate(c["rel"]):
        w.writerow(["AOU-COMPOSITE", DAY_0 + datetime.timedelta(days=rel), c["steps_p50"][i], c["n_steps"][i]])
print("wrote sleep_daily_summary.csv and activity_summary.csv, day 0 =", DAY_0)
