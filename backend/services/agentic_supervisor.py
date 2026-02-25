"""AgenticSupervisor — generates and executes action plans for high-priority signals."""
import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Generator

from models.supervisor import (
    ActionPlan,
    PlanStep,
    PlanStepType,
    PlanStepStatus,
    PlanStatus,
)
from services.providers import get_provider
from services.tools import ToolExecutor, ToolResult
from services.context_aggregator import _is_skip_path

logger = logging.getLogger("agentic_supervisor")

MAX_PLAN_STEPS = 10

SYSTEM_PROMPT = """\
You are a code assistant that creates actionable plans to resolve software issues.

Given a signal (issue / alert / message) and a project file listing, produce a \
concrete plan of tool calls that would investigate or fix the issue.

Available tools:
- read_file(path): Read file contents
- write_file(path, content): Write/overwrite a file
- list_files(path, max_depth?): List directory contents
- search_text(pattern, path?, include?): Search for text in files
- run_command(command): Execute a shell command

Return a JSON object:
{
  "steps": [
    {
      "tool": "read_file|write_file|list_files|search_text|run_command",
      "description": "Brief human-readable description of this step",
      "input": { ... tool-specific input ... },
      "file_path": "optional: primary file this step affects"
    }
  ],
  "affected_files": ["list of files this plan touches"],
  "rationale": "1-2 sentence explanation of the overall approach"
}

Rules:
- Maximum 10 steps
- Start with investigation (read/search) before modifications (write)
- Be specific: use real file paths from the project listing
- Only output valid JSON, nothing else
"""


class AgenticSupervisor:
    def __init__(self):
        self._plans: dict[str, ActionPlan] = {}

    # --- Public API ---

    @property
    def proposals(self) -> list[ActionPlan]:
        return [p for p in self._plans.values() if p.status == PlanStatus.proposed]

    def get_plans(self, status: str | None = None, limit: int = 50) -> list[ActionPlan]:
        plans = list(self._plans.values())
        if status:
            plans = [p for p in plans if p.status.value == status]
        plans.sort(key=lambda p: p.created_at, reverse=True)
        return plans[:limit]

    def get_plan(self, plan_id: str) -> ActionPlan | None:
        return self._plans.get(plan_id)

    def dismiss_plan(self, plan_id: str) -> ActionPlan | None:
        plan = self._plans.get(plan_id)
        if plan and plan.status == PlanStatus.proposed:
            plan.status = PlanStatus.dismissed
            plan.updated_at = datetime.now(timezone.utc).isoformat()
        return plan

    def on_signals_triaged(self, signals: list, settings: dict, workspace_root: str):
        """Called after triage — generate plans for high-priority signals."""
        sandbox = settings.get("supervisor_sandbox_mode", True)

        for sig in signals:
            priority = getattr(sig, "priority", None)
            if priority is None:
                continue
            # Only react to internal priority <= 2 (user priority 4-5)
            if priority > 2:
                continue

            sig_id = getattr(sig, "id", None) or str(uuid.uuid4())

            # Skip if a plan already exists for this signal and is not terminal
            existing = [
                p for p in self._plans.values()
                if p.signal_id == sig_id and p.status in (
                    PlanStatus.proposed, PlanStatus.approved, PlanStatus.executing,
                )
            ]
            if existing:
                continue

            try:
                plan = self._generate_plan(sig, settings, workspace_root, sandbox)
                if plan:
                    self._plans[plan.id] = plan
                    logger.info(f"Generated plan {plan.id} for signal {sig_id}")
            except Exception as e:
                logger.warning(f"Plan generation failed for signal {sig_id}: {e}")

    def execute_plan(self, plan_id: str, file_service) -> Generator[str, None, None]:
        """Execute a plan step-by-step, yielding SSE events."""
        plan = self._plans.get(plan_id)
        if not plan:
            yield _sse("error", {"message": "Plan not found"})
            return

        plan.status = PlanStatus.executing
        plan.updated_at = datetime.now(timezone.utc).isoformat()

        executor = ToolExecutor(file_service)

        for step in plan.steps:
            step.status = PlanStepStatus.running
            yield _sse("step_start", {
                "index": step.index,
                "tool": step.tool.value,
                "description": step.description,
            })

            try:
                result = self._execute_step(step, plan, executor)
                yield _sse("step_result", {
                    "index": step.index,
                    "status": step.status.value,
                    "summary": step.result_summary or "",
                })

                # Emit diff for write_file steps
                if step.tool == PlanStepType.write_file and step.old_content is not None:
                    yield _sse("step_diff", {
                        "index": step.index,
                        "file_path": step.file_path or "",
                        "old_content": step.old_content or "",
                        "new_content": step.new_content or "",
                        "simulated": step.status == PlanStepStatus.simulated,
                    })

            except Exception as e:
                step.status = PlanStepStatus.failed
                step.result_summary = str(e)[:200]
                plan.status = PlanStatus.failed
                plan.execution_log.append(f"Step {step.index} failed: {e}")
                plan.updated_at = datetime.now(timezone.utc).isoformat()
                yield _sse("step_result", {
                    "index": step.index,
                    "status": "failed",
                    "summary": str(e)[:200],
                })
                yield _sse("plan_complete", {
                    "plan_id": plan_id,
                    "status": "failed",
                    "message": f"Failed at step {step.index}",
                })
                return

        plan.status = PlanStatus.completed
        plan.updated_at = datetime.now(timezone.utc).isoformat()
        yield _sse("plan_complete", {
            "plan_id": plan_id,
            "status": "completed",
            "message": "All steps completed",
        })

    # --- Private ---

    def _generate_plan(
        self, signal, settings: dict, workspace_root: str, sandbox: bool,
    ) -> ActionPlan | None:
        provider = get_provider(settings)

        # Build project file listing (max 100 files)
        file_listing = ""
        if workspace_root:
            root = Path(workspace_root)
            if root.is_dir():
                files = []
                for p in root.rglob("*"):
                    if _is_skip_path(p) or not p.is_file():
                        continue
                    try:
                        files.append(str(p.relative_to(root)))
                    except ValueError:
                        pass
                    if len(files) >= 100:
                        break
                file_listing = "\n".join(files)

        sig_id = getattr(signal, "id", str(uuid.uuid4()))
        sig_title = getattr(signal, "title", "Unknown")
        sig_content = getattr(signal, "content", "")
        sig_reason = getattr(signal, "reason", None)
        sig_file = getattr(signal, "file_path", None)

        user_msg = f"""Signal: {sig_title}
Content: {sig_content}
{f"Reason: {sig_reason}" if sig_reason else ""}
{f"Related file: {sig_file}" if sig_file else ""}

Project files:
{file_listing or "(no listing available)"}"""

        try:
            response = provider.chat(
                messages=[{"role": "user", "content": user_msg}],
                system=SYSTEM_PROMPT,
            )
        except Exception as e:
            logger.warning(f"LLM call failed for plan generation: {e}")
            return None

        # Parse LLM response JSON
        text = response if isinstance(response, str) else str(response)
        # Strip markdown code fences if present
        if "```" in text:
            start = text.find("```")
            # Skip the opening fence line
            start = text.find("\n", start) + 1
            end = text.rfind("```")
            if end > start:
                text = text[start:end].strip()

        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse plan JSON: {text[:200]}")
            return None

        raw_steps = data.get("steps", [])
        if not raw_steps:
            return None

        # Cap at MAX_PLAN_STEPS
        raw_steps = raw_steps[:MAX_PLAN_STEPS]

        steps = []
        for i, raw in enumerate(raw_steps):
            tool_name = raw.get("tool", "")
            try:
                tool = PlanStepType(tool_name)
            except ValueError:
                continue
            steps.append(PlanStep(
                index=i,
                tool=tool,
                description=raw.get("description", ""),
                input=raw.get("input", {}),
                file_path=raw.get("file_path"),
            ))

        if not steps:
            return None

        plan_id = str(uuid.uuid4())
        return ActionPlan(
            id=plan_id,
            signal_id=sig_id,
            signal_title=sig_title,
            signal_reason=sig_reason or data.get("rationale", ""),
            steps=steps,
            sandbox_mode=sandbox,
            affected_files=data.get("affected_files", []),
        )

    def _execute_step(
        self, step: PlanStep, plan: ActionPlan, executor: ToolExecutor,
    ) -> ToolResult | None:
        tool_name = step.tool.value
        tool_id = f"supervisor_{plan.id}_{step.index}"

        # Sandbox enforcement
        if plan.sandbox_mode:
            if step.tool == PlanStepType.run_command:
                step.status = PlanStepStatus.skipped
                step.result_summary = "Blocked in sandbox mode"
                plan.execution_log.append(f"Step {step.index}: run_command skipped (sandbox)")
                return None

            if step.tool == PlanStepType.write_file:
                # Simulate: read old content, show diff, don't write
                file_path = step.input.get("path", step.file_path or "")
                old_content = ""
                try:
                    read_result = executor.execute("read_file", tool_id + "_read", {"path": file_path})
                    if read_result.status == "success":
                        old_content = read_result.content
                except Exception:
                    pass

                step.old_content = old_content
                step.new_content = step.input.get("content", "")
                step.file_path = file_path
                step.status = PlanStepStatus.simulated
                step.result_summary = f"Simulated write to {file_path}"
                plan.execution_log.append(f"Step {step.index}: write_file simulated for {file_path}")
                return None

        # Live execution
        result = executor.execute(tool_name, tool_id, step.input)

        if result.status == "success":
            step.status = PlanStepStatus.completed
            step.result_summary = result.summary
            if result.old_content is not None:
                step.old_content = result.old_content
            if result.new_content is not None:
                step.new_content = result.new_content
            if result.file_path:
                step.file_path = result.file_path
            plan.execution_log.append(f"Step {step.index}: {tool_name} completed")
        else:
            step.status = PlanStepStatus.failed
            step.result_summary = result.summary
            plan.execution_log.append(f"Step {step.index}: {tool_name} failed — {result.summary}")
            raise RuntimeError(result.summary)

        return result


def _sse(event: str, data: dict) -> str:
    """Format a Server-Sent Event."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"
