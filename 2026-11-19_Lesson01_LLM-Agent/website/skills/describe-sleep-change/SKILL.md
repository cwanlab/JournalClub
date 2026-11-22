---
name: describe-sleep-change
description: Describe how the last 7 days of sleep compare with the 21 days before. Use for questions about how the person slept or what changed, when they do not ask why.
---

# Describe a sleep change

1. Call `compare_metric` with `minute_asleep` first. Report both means, the difference, and the observed days out of 7 and out of 21.
2. Then check `minute_in_bed` and `minute_awake`. Less sleep with the same time in bed means broken sleep. Less sleep with less time in bed means shorter nights.
3. The direction word must match the numbers: shorter, longer or about the same.
4. Missing nights stay missing. Say how many days were observed; never fill them in.
5. Give minutes as hours and minutes when that reads better, and keep the original number.
6. Describe only. If the person asks why, load `explain-sleep-change`.
