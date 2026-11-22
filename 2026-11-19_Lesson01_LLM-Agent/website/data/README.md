# All of Us composite

The data in this folder are **aggregates from the All of Us Research Program** (Controlled Tier Dataset v9, C2025Q4R6),
computed inside the Researcher Workbench with `aou/tutorial_aou.py`. They contain no participant-level record.

- `aou_aggregates.json`: everything that left the Workbench. Every count is 20 or more; smaller cells were suppressed.
- `sleep_daily_summary.csv`, `activity_summary.csv`: the **composite** used in the tutorial, written by
  `make_composite.py`. Column names follow the All of Us Fitbit tables. Each row is one day; each value is the median
  across the participants who had data that day (233 to 267 people). It is not one person's record.
- The composite is the 273 participants whose mean minutes asleep fell by 10% or more in the week after their first
  beta-blocker record. They were **selected for that drop**, to show a coincidence in time. The unselected numbers are
  in `aou_aggregates.json` (`after_beta_blocker`, `same_people_13_weeks_earlier`, `any_4_weeks`).
- Calendar dates are placeholders: day 0 (the first beta-blocker record) is set to 2025-06-22.


Real All of Us participant-level data must stay inside the Researcher Workbench and is not part of this project.
