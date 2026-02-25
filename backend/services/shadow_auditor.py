import asyncio
import re
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path

from models.shadow_audit import (
    SignatureChange,
    SignatureInfo,
    SignatureReport,
    VerificationResult,
)

# Regex patterns for signature extraction
PY_FUNC = re.compile(
    r"^(\s*)(async\s+)?def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([^\s:]+))?",
    re.MULTILINE,
)
PY_CLASS = re.compile(
    r"^(\s*)class\s+(\w+)\s*(?:\(([^)]*)\))?",
    re.MULTILINE,
)
JS_FUNC = re.compile(
    r"^(\s*)(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^\s{]+))?",
    re.MULTILINE,
)
JS_EXPORT = re.compile(
    r"^export\s+(?:default\s+)?(?:class|function|const|type|interface)\s+(\w+)",
    re.MULTILINE,
)

# Extensions we analyze
SOURCE_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx"}

# Test file patterns
TEST_PATTERNS = re.compile(
    r"(test_|_test\.|\.test\.|\.spec\.|tests/|__tests__/|specs/)",
    re.IGNORECASE,
)

# Max lines to analyze
MAX_LINES = 5000

# Allowed test runner prefixes (subset of tools.py whitelist)
ALLOWED_RUN_PREFIXES = [
    "pytest", "python -m pytest", "uv run pytest",
    "npx vitest run", "npx jest", "npm test", "pnpm test",
    "cargo test",
]


def _extract_signatures(content: str, ext: str) -> dict[str, SignatureInfo]:
    """Extract function/class signatures from source code."""
    lines = content.split("\n")[:MAX_LINES]
    text = "\n".join(lines)
    sigs: dict[str, SignatureInfo] = {}

    if ext == ".py":
        for m in PY_FUNC.finditer(text):
            name = m.group(3)
            params = m.group(4).strip()
            ret = m.group(5) or ""
            line = text[: m.start()].count("\n") + 1
            sig = f"({params})" + (f" -> {ret}" if ret else "")
            key = f"func:{name}"
            sigs[key] = SignatureInfo(kind="function", name=name, signature=sig, line=line)
        for m in PY_CLASS.finditer(text):
            name = m.group(2)
            bases = m.group(3) or ""
            line = text[: m.start()].count("\n") + 1
            sigs[f"class:{name}"] = SignatureInfo(
                kind="class", name=name, signature=f"({bases})", line=line
            )
    elif ext in (".ts", ".tsx", ".js", ".jsx"):
        for m in JS_FUNC.finditer(text):
            name = m.group(2)
            params = m.group(3).strip()
            ret = m.group(4) or ""
            line = text[: m.start()].count("\n") + 1
            sig = f"({params})" + (f": {ret}" if ret else "")
            sigs[f"func:{name}"] = SignatureInfo(
                kind="function", name=name, signature=sig, line=line
            )
        for m in JS_EXPORT.finditer(text):
            name = m.group(1)
            line = text[: m.start()].count("\n") + 1
            key = f"export:{name}"
            if key not in sigs:
                sigs[key] = SignatureInfo(
                    kind="export", name=name, signature="", line=line
                )

    return sigs


class ShadowAuditor:
    def __init__(self, workspace_root: str = ""):
        self.workspace_root = workspace_root
        self._pending: dict[str, VerificationResult] = {}
        self._tasks: dict[str, asyncio.Task] = {}

    def analyze_signatures(
        self, file_path: str, old_content: str, new_content: str
    ) -> SignatureReport:
        """Compare signatures between old and new content. Pure regex, no execution."""
        ext = Path(file_path).suffix.lower()
        if ext not in SOURCE_EXTENSIONS:
            return SignatureReport(file_path=file_path)

        old_sigs = _extract_signatures(old_content, ext)
        new_sigs = _extract_signatures(new_content, ext)

        changes: list[SignatureChange] = []

        # Removed signatures
        for key, info in old_sigs.items():
            if key not in new_sigs:
                changes.append(
                    SignatureChange(
                        kind=info.kind,
                        name=info.name,
                        change_type="removed",
                        old_signature=info.signature,
                        line=info.line,
                    )
                )

        # Added signatures
        for key, info in new_sigs.items():
            if key not in old_sigs:
                changes.append(
                    SignatureChange(
                        kind=info.kind,
                        name=info.name,
                        change_type="added",
                        new_signature=info.signature,
                        line=info.line,
                    )
                )

        # Modified signatures
        for key in old_sigs:
            if key in new_sigs and old_sigs[key].signature != new_sigs[key].signature:
                changes.append(
                    SignatureChange(
                        kind=old_sigs[key].kind,
                        name=old_sigs[key].name,
                        change_type="modified",
                        old_signature=old_sigs[key].signature,
                        new_signature=new_sigs[key].signature,
                        line=new_sigs[key].line,
                    )
                )

        has_breaking = any(c.change_type in ("removed", "modified") for c in changes)

        return SignatureReport(
            file_path=file_path,
            changes=changes,
            has_breaking=has_breaking,
        )

    def detect_test_runner(self) -> tuple[str, str] | None:
        """Detect the project's test runner. Returns (command, framework) or None."""
        root = Path(self.workspace_root) if self.workspace_root else None
        if not root or not root.exists():
            return None

        # Check package.json for JS/TS runners
        pkg_json = root / "package.json"
        if pkg_json.exists():
            try:
                import json
                pkg = json.loads(pkg_json.read_text())
                deps = {
                    **pkg.get("devDependencies", {}),
                    **pkg.get("dependencies", {}),
                }
                if "vitest" in deps:
                    return ("npx vitest run", "vitest")
                if "jest" in deps:
                    return ("npx jest", "jest")
                scripts = pkg.get("scripts", {})
                if "test" in scripts:
                    return ("npm test", "npm")
            except Exception:
                pass

        # Check for pytest
        pyproject = root / "pyproject.toml"
        pytest_ini = root / "pytest.ini"
        if pyproject.exists() or pytest_ini.exists():
            return ("pytest", "pytest")

        # Check for cargo
        cargo_toml = root / "Cargo.toml"
        if cargo_toml.exists():
            return ("cargo test", "cargo")

        return None

    @staticmethod
    def _is_test_file(file_path: str) -> bool:
        return bool(TEST_PATTERNS.search(file_path))

    async def verify_file(
        self,
        file_path: str,
        new_content: str,
        settings: dict,
        on_complete=None,
    ):
        """Background: generate tests via LLM and run them."""
        if self._is_test_file(file_path):
            self._pending[file_path] = VerificationResult(
                file_path=file_path, status="skipped"
            )
            return

        runner = self.detect_test_runner()
        if not runner:
            self._pending[file_path] = VerificationResult(
                file_path=file_path, status="skipped"
            )
            return

        command, framework = runner
        self._pending[file_path] = VerificationResult(
            file_path=file_path, status="pending"
        )

        ext = Path(file_path).suffix
        test_ext = ext if ext in (".py", ".ts", ".tsx", ".js", ".jsx") else ".py"
        test_id = uuid.uuid4().hex[:8]
        test_dir = Path(self.workspace_root) / ".codemancer_shadow_tests"
        test_dir.mkdir(exist_ok=True)
        test_file = test_dir / f"shadow_test_{test_id}{test_ext}"

        try:
            # Generate tests via LLM
            from services.providers import get_provider

            provider = get_provider(settings)
            model_key = {
                "anthropic": "claude_model",
                "openai": "openai_model",
                "gemini": "gemini_model",
                "custom": "custom_model",
            }.get(settings.get("ai_provider", "anthropic"), "claude_model")
            model = settings.get(model_key, "claude-sonnet-4-20250514")

            prompt = f"""Generate 3-5 focused unit tests for the following code.
Framework: {framework}
File: {Path(file_path).name}
Only output the test code, no explanations.

```
{new_content[:4000]}
```"""

            result = provider.chat(
                [{"role": "user", "content": prompt}],
                "You are a test generator. Output only valid test code.",
                model,
            )
            test_code = result.get("content", "")
            # Strip markdown fences
            if test_code.startswith("```"):
                lines = test_code.split("\n")
                test_code = "\n".join(lines[1:])
                if test_code.endswith("```"):
                    test_code = test_code[:-3]

            test_file.write_text(test_code)

            # Run tests
            run_cmd = f"{command} {test_file}"
            proc = await asyncio.to_thread(
                subprocess.run,
                run_cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=60,
                cwd=self.workspace_root,
            )

            status = "pass" if proc.returncode == 0 else "fail"
            self._pending[file_path] = VerificationResult(
                file_path=file_path,
                status=status,
                test_count=3,
                passed=3 if status == "pass" else 0,
                failed=0 if status == "pass" else 1,
                error_message=proc.stderr[:500] if status == "fail" else "",
                completed_at=datetime.now(timezone.utc).isoformat(),
            )

        except asyncio.CancelledError:
            self._pending[file_path] = VerificationResult(
                file_path=file_path, status="skipped"
            )
        except Exception as e:
            self._pending[file_path] = VerificationResult(
                file_path=file_path,
                status="error",
                error_message=str(e)[:300],
                completed_at=datetime.now(timezone.utc).isoformat(),
            )
        finally:
            # Cleanup temp test file
            try:
                if test_file.exists():
                    test_file.unlink()
                # Remove dir if empty
                if test_dir.exists() and not any(test_dir.iterdir()):
                    test_dir.rmdir()
            except Exception:
                pass

        if on_complete:
            on_complete(self._pending.get(file_path))

    def get_pending(self) -> dict[str, VerificationResult]:
        return dict(self._pending)

    def cancel_file(self, file_path: str):
        """Cancel a pending verification task (debounce on re-write)."""
        task = self._tasks.pop(file_path, None)
        if task and not task.done():
            task.cancel()
