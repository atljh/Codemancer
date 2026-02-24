import os
import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

from services.file_service import FileService, SKIP_DIRS


TOOL_DEFINITIONS = [
    {
        "name": "list_files",
        "description": "List files and directories in the given path. Returns a tree structure. Use this to explore the project structure.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Directory path to list. Relative to workspace root or absolute.",
                },
                "max_depth": {
                    "type": "integer",
                    "description": "Maximum depth to recurse. Default 3.",
                    "default": 3,
                },
            },
            "required": ["path"],
        },
    },
    {
        "name": "read_file",
        "description": "Read the contents of a file. Returns the full text content.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "File path to read. Relative to workspace root or absolute.",
                },
            },
            "required": ["path"],
        },
    },
    {
        "name": "write_file",
        "description": "Write content to a file. Creates the file if it doesn't exist, overwrites if it does. Returns the diff between old and new content.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "File path to write. Relative to workspace root or absolute.",
                },
                "content": {
                    "type": "string",
                    "description": "The full content to write to the file.",
                },
            },
            "required": ["path", "content"],
        },
    },
    {
        "name": "search_text",
        "description": "Search for a regex pattern in files within a directory. Returns matching lines with file paths and line numbers.",
        "input_schema": {
            "type": "object",
            "properties": {
                "pattern": {
                    "type": "string",
                    "description": "Regex pattern to search for.",
                },
                "path": {
                    "type": "string",
                    "description": "Directory to search in. Relative to workspace root or absolute.",
                },
                "file_glob": {
                    "type": "string",
                    "description": "Glob pattern for file names to include, e.g. '*.py'. Default '*'.",
                    "default": "*",
                },
            },
            "required": ["pattern", "path"],
        },
    },
    {
        "name": "run_command",
        "description": "Run a shell command in the project workspace. Use for running tests (npm test, pytest), linters, build commands, or other dev tools. The command runs with a 60s timeout. Only whitelisted safe commands are allowed.",
        "input_schema": {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The shell command to run, e.g. 'npm test', 'python -m pytest', 'cargo build'.",
                },
            },
            "required": ["command"],
        },
    },
]

# Allowed command prefixes for run_command tool (security whitelist)
ALLOWED_RUN_PREFIXES = [
    # JS/TS
    "npm test", "npm run", "npx ", "pnpm test", "pnpm run", "pnpm exec",
    "yarn test", "yarn run", "bun test", "bun run",
    "node ", "deno ",
    # Python
    "python ", "python3 ", "uv run ", "pip ", "pytest", "mypy ", "ruff ", "black ",
    # Rust
    "cargo ",
    # Go
    "go test", "go build", "go run", "go vet",
    # General
    "make", "cat ", "ls ", "echo ", "head ", "tail ", "wc ",
    # Linters / formatters
    "eslint ", "prettier ", "tsc",
]

BLOCKED_PATTERNS = [
    "rm -rf", "rm -r /", "sudo ", "chmod ", "chown ",
    "curl ", "wget ", "> /dev/", "mkfs", "dd if=",
    "&&", "||", "|", ";", "`", "$(",
]


@dataclass
class ToolResult:
    tool_id: str
    tool_name: str
    status: str  # "success" or "error"
    content: str  # for LLM context
    summary: str  # for UI display
    exp_gained: int = 0
    mp_cost: int = 0
    bytes_processed: int = 0
    old_content: str | None = None
    new_content: str | None = None
    file_path: str | None = None
    exit_code: int | None = None
    hp_damage: int = 0


def _tree_to_text(nodes: list, indent: int = 0) -> str:
    lines: list[str] = []
    prefix = "  " * indent
    for node in nodes:
        if node.is_dir:
            lines.append(f"{prefix}{node.name}/")
            if node.children:
                lines.append(_tree_to_text(node.children, indent + 1))
        else:
            lines.append(f"{prefix}{node.name}")
    return "\n".join(lines)


class ToolExecutor:
    def __init__(self, file_service: FileService):
        self.file_service = file_service

    def _resolve_path(self, path: str) -> str:
        """Resolve a relative path against workspace root."""
        if self.file_service.workspace_root and not os.path.isabs(path):
            return os.path.join(self.file_service.workspace_root, path)
        return path

    def execute(self, tool_name: str, tool_id: str, input_data: dict) -> ToolResult:
        try:
            if tool_name == "list_files":
                return self._list_files(tool_id, input_data)
            elif tool_name == "read_file":
                return self._read_file(tool_id, input_data)
            elif tool_name == "write_file":
                return self._write_file(tool_id, input_data)
            elif tool_name == "search_text":
                return self._search_text(tool_id, input_data)
            elif tool_name == "run_command":
                return self._run_command(tool_id, input_data)
            else:
                return ToolResult(
                    tool_id=tool_id,
                    tool_name=tool_name,
                    status="error",
                    content=f"Unknown tool: {tool_name}",
                    summary=f"Unknown tool: {tool_name}",
                )
        except Exception as e:
            return ToolResult(
                tool_id=tool_id,
                tool_name=tool_name,
                status="error",
                content=f"Error: {str(e)}",
                summary=f"Error: {str(e)[:80]}",
            )

    def _list_files(self, tool_id: str, input_data: dict) -> ToolResult:
        path = self._resolve_path(input_data["path"])
        max_depth = input_data.get("max_depth", 3)
        tree = self.file_service.get_file_tree(path, max_depth)
        text = _tree_to_text(tree)
        bytes_processed = len(text.encode("utf-8"))
        mp_cost = min(10, 2 + bytes_processed // 2048)
        count = text.count("\n") + 1 if text else 0
        return ToolResult(
            tool_id=tool_id,
            tool_name="list_files",
            status="success",
            content=text or "(empty directory)",
            summary=f"Listed {count} entries in {Path(path).name}/",
            mp_cost=mp_cost,
            bytes_processed=bytes_processed,
        )

    def _read_file(self, tool_id: str, input_data: dict) -> ToolResult:
        path = self._resolve_path(input_data["path"])
        content, language = self.file_service.read_file(path)
        lines = content.count("\n") + 1
        bytes_processed = len(content.encode("utf-8"))
        mp_cost = min(10, 2 + bytes_processed // 2048)
        return ToolResult(
            tool_id=tool_id,
            tool_name="read_file",
            status="success",
            content=content,
            summary=f"Read {lines} lines ({language})",
            mp_cost=mp_cost,
            bytes_processed=bytes_processed,
            file_path=path,
        )

    def _write_file(self, tool_id: str, input_data: dict) -> ToolResult:
        path = self._resolve_path(input_data["path"])
        new_content = input_data["content"]

        # Read old content if file exists
        old_content = ""
        try:
            old_content, _ = self.file_service.read_file(path)
        except (FileNotFoundError, ValueError):
            pass

        self.file_service.write_file(path, new_content)
        bytes_processed = len(new_content.encode("utf-8"))
        mp_cost = min(10, 2 + bytes_processed // 2048)
        lines = new_content.count("\n") + 1
        return ToolResult(
            tool_id=tool_id,
            tool_name="write_file",
            status="success",
            content=f"Successfully wrote {lines} lines to {Path(path).name}",
            summary=f"Wrote {lines} lines to {Path(path).name}",
            exp_gained=25,
            mp_cost=mp_cost,
            bytes_processed=bytes_processed,
            old_content=old_content,
            new_content=new_content,
            file_path=path,
        )

    def _search_text(self, tool_id: str, input_data: dict) -> ToolResult:
        path = self._resolve_path(input_data["path"])
        pattern = input_data["pattern"]
        file_glob = input_data.get("file_glob", "*")

        try:
            regex = re.compile(pattern, re.IGNORECASE)
        except re.error as e:
            return ToolResult(
                tool_id=tool_id,
                tool_name="search_text",
                status="error",
                content=f"Invalid regex: {e}",
                summary=f"Invalid regex pattern",
            )

        import fnmatch

        matches: list[str] = []
        bytes_processed = 0
        max_matches = 50

        for dirpath, dirnames, filenames in os.walk(path):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fname in filenames:
                if not fnmatch.fnmatch(fname, file_glob):
                    continue
                fpath = os.path.join(dirpath, fname)
                try:
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                        for i, line in enumerate(f, 1):
                            bytes_processed += len(line.encode("utf-8"))
                            if regex.search(line):
                                rel = os.path.relpath(fpath, path)
                                matches.append(f"{rel}:{i}: {line.rstrip()}")
                                if len(matches) >= max_matches:
                                    break
                    if len(matches) >= max_matches:
                        break
                except (PermissionError, OSError):
                    continue
            if len(matches) >= max_matches:
                break

        content = "\n".join(matches) if matches else "No matches found."
        mp_cost = min(10, 2 + bytes_processed // 2048)
        exp_gained = 10 if matches else 0
        return ToolResult(
            tool_id=tool_id,
            tool_name="search_text",
            status="success",
            content=content,
            summary=f"Found {len(matches)} matches for '{pattern}'",
            exp_gained=exp_gained,
            mp_cost=mp_cost,
            bytes_processed=bytes_processed,
        )

    def _run_command(self, tool_id: str, input_data: dict) -> ToolResult:
        command = input_data.get("command", "").strip()
        if not command:
            return ToolResult(
                tool_id=tool_id, tool_name="run_command",
                status="error", content="Empty command", summary="Empty command",
            )

        # Security: block dangerous patterns
        cmd_lower = command.lower()
        for blocked in BLOCKED_PATTERNS:
            if blocked in cmd_lower:
                return ToolResult(
                    tool_id=tool_id, tool_name="run_command",
                    status="error",
                    content=f"Blocked: command contains '{blocked}'",
                    summary=f"Command blocked for safety",
                )

        # Security: must match an allowed prefix
        allowed = any(cmd_lower.startswith(p) for p in ALLOWED_RUN_PREFIXES)
        if not allowed:
            return ToolResult(
                tool_id=tool_id, tool_name="run_command",
                status="error",
                content=f"Command not in whitelist: {command.split()[0]}",
                summary=f"Command not allowed: {command.split()[0]}",
            )

        cwd = self.file_service.workspace_root or os.getcwd()

        try:
            result = subprocess.run(
                command, shell=True, cwd=cwd,
                capture_output=True, text=True, timeout=60,
            )
            stdout = result.stdout or ""
            stderr = result.stderr or ""
            output = stdout + ("\n" + stderr if stderr else "")
            output = output.strip()
            # Truncate very long output
            if len(output) > 8000:
                output = output[:4000] + "\n\n... (truncated) ...\n\n" + output[-2000:]

            exit_code = result.returncode
            is_success = exit_code == 0

            # HP damage on failure (tests failing = damage to the project)
            hp_damage = 0
            if not is_success:
                hp_damage = min(20, 5 + abs(exit_code))

            return ToolResult(
                tool_id=tool_id,
                tool_name="run_command",
                status="success" if is_success else "error",
                content=output or "(no output)",
                summary=f"Exit {exit_code}: {command[:50]}",
                exp_gained=15 if is_success else 0,
                mp_cost=3,
                exit_code=exit_code,
                hp_damage=hp_damage,
            )
        except subprocess.TimeoutExpired:
            return ToolResult(
                tool_id=tool_id, tool_name="run_command",
                status="error",
                content="Command timed out after 60 seconds",
                summary=f"Timeout: {command[:50]}",
                mp_cost=3, exit_code=-1, hp_damage=10,
            )
        except Exception as e:
            return ToolResult(
                tool_id=tool_id, tool_name="run_command",
                status="error",
                content=f"Execution error: {str(e)}",
                summary=f"Error: {str(e)[:60]}",
                mp_cost=3, exit_code=-1, hp_damage=5,
            )
