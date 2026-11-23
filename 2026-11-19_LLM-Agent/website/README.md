# Building a Personal Health Agent: tutorial website

Left: the slide. Right: Python cells that run live in one shared Python session on your own machine.
Structure adapted from the AgentLab tutorial (Jiang et al., UbiComp/ISWC 2026); text, tools and code are our own.

## Run

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python server.py
```

Then open http://127.0.0.1:8790 .

Keys: left/right arrows change page, `P` shows only the slide, `F` toggles full screen,
`N` opens the speaker notes window (keep it on the laptop screen), Shift + Enter runs a cell.

## Model

Without a key, every cell replays the saved replies in `recorded.json`, so the whole tutorial runs offline.
For live calls, copy `.env.example` to `.env`, fill in `ANTHROPIC_API_KEY`, and restart the server
(`LAB_MODE=replay` forces replay). The default model is `claude-opus-5-5`; change it with `LAB_MODEL`.

## Data

`data/` holds an **All of Us composite** (see `data/README.md`): daily medians across 273 participants and group-level
shares. Every number is an aggregate over 20 or more participants, computed inside the Researcher Workbench with
`aou/tutorial_aou.py`. No participant-level row is included. The health record used by the agent is made up for teaching.

## Layout

- `web/content.js`: the pages (slide text and cell code). `web/notes.js`: speaker notes.
- `lab/`: data access, tools, the model call, the agent loop, the harness check.
- `skills/`: the two SKILL.md files the agent can load.
- `server.py`: serves `web/` and runs cells (listens on 127.0.0.1 only).
