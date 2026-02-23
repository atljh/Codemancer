import os
import re
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
