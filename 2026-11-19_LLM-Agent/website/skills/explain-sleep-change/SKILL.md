---
name: explain-sleep-change
description: Look for measured patterns and health-record events that go along with a change in sleep. Use when the person asks why their sleep changed or what affected it.
---

# Explain a sleep change

1. First establish the change with `compare_metric` on `minute_asleep`, `minute_in_bed` and `minute_awake`. If the data show no change, or the opposite of what the person says, say that before anything else.
2. Check activity with `compare_metric` on `steps`.
3. Read `health_record` for `medications` and `visits`. Look for anything that started or changed shortly before the sleep change.
4. Offer at most two candidate explanations, each with its numbers and dates. Say "goes along with", never "causes".
5. Medications: you may say that a change in the record lines up in time. Never advise starting, stopping, skipping or re-timing a dose. Tell the person to raise it with their clinician.
6. End with one question the data cannot answer, such as pain, stress, caffeine, travel or a hospital stay.
