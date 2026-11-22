"""The lab: everything a tutorial cell can use, in one import."""
from .agent import MAX_ROUNDS, Answer, run_agent, run_agent_checked, run_tools, show_contents, show_trace, side_by_side, send_back
from .checks import medication_advice, unsafe_example
from .data import aggregates, daily_frame, participant, plot_days, read_table, show_fields, show_table
from .llm import MODEL, Reply, call_log, call_model, mode, show_calls, tool_results_message, user_message
from .show import Html, Markdown, show_source, show_tool, show_tools
from .tools import (SKILLS, SYSTEM_PROMPT, TOOLS, compare_metric, daily_view, health_record, load_skill,
                    show_skills, tool, with_description)
