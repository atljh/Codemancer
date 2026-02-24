from enum import Enum

class ActionType(str, Enum):
    message = "message"                    # +10 EXP
    code_apply = "code_apply"              # +50 EXP
    bug_fix = "bug_fix"                    # +100 EXP
    lines_written = "lines_written"        # +5 EXP (per 50 lines)
    syntax_check_pass = "syntax_check_pass"  # +20 EXP
    file_save = "file_save"                # +5 EXP
    project_scan = "project_scan"          # +50 EXP
    tool_write = "tool_write"              # +25 EXP
    tool_search = "tool_search"            # +10 EXP
    git_commit = "git_commit"              # +50 EXP

EXP_REWARDS: dict[ActionType, int] = {
    ActionType.message: 10,
    ActionType.code_apply: 50,
    ActionType.bug_fix: 100,
    ActionType.lines_written: 5,
    ActionType.syntax_check_pass: 20,
    ActionType.file_save: 5,
    ActionType.project_scan: 50,
    ActionType.tool_write: 25,
    ActionType.tool_search: 10,
    ActionType.git_commit: 50,
}

def calculate_exp(action: ActionType) -> int:
    return EXP_REWARDS.get(action, 0)


def calculate_exp_with_focus(action: ActionType, player) -> int:
    base = EXP_REWARDS.get(action, 0)
    return base * 2 if getattr(player, "focus_active", False) else base
