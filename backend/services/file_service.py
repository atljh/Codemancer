import ast
import os
from pathlib import Path

from models.file import FileTreeNode, FileSearchMatch, SyntaxError_

EXTENSION_LANGUAGE_MAP: dict[str, str] = {
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".json": "json",
    ".html": "html",
    ".css": "css",
    ".scss": "scss",
    ".md": "markdown",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
    ".rs": "rust",
    ".go": "go",
    ".sql": "sql",
    ".sh": "shell",
    ".bash": "shell",
    ".zsh": "shell",
    ".xml": "xml",
    ".svg": "xml",
    ".txt": "plaintext",
}

SKIP_DIRS = {".git", "node_modules", "__pycache__", "target", ".venv", "venv", "dist", ".next", ".claude"}


class FileService:
    def __init__(self, workspace_root: str = ""):
        self.workspace_root = workspace_root

    def _validate_path(self, path: str) -> Path:
        resolved = Path(path).resolve()
        if ".." in Path(path).parts:
            raise ValueError("Path traversal not allowed")
        if self.workspace_root:
            root = Path(self.workspace_root).resolve()
            if not str(resolved).startswith(str(root)):
                raise ValueError("Path outside workspace root")
        return resolved

    def detect_language(self, path: str) -> str:
        ext = Path(path).suffix.lower()
        return EXTENSION_LANGUAGE_MAP.get(ext, "plaintext")

    def read_file(self, path: str) -> tuple[str, str]:
        resolved = self._validate_path(path)
        content = resolved.read_text(encoding="utf-8")
        language = self.detect_language(path)
        return content, language

    def write_file(self, path: str, content: str) -> bool:
        resolved = self._validate_path(path)
        resolved.write_text(content, encoding="utf-8")
        return True

    def get_file_tree(self, root: str, max_depth: int = 5) -> list[FileTreeNode]:
        root_path = self._validate_path(root)
        if not root_path.is_dir():
            return []
        return self._build_tree(root_path, max_depth, 0)

    def _build_tree(self, path: Path, max_depth: int, depth: int) -> list[FileTreeNode]:
        if depth >= max_depth:
            return []

        nodes: list[FileTreeNode] = []
        try:
            entries = sorted(path.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower()))
        except PermissionError:
            return []

        for entry in entries:
            if entry.name.startswith(".") and entry.name in SKIP_DIRS:
                continue
            if entry.name in SKIP_DIRS:
                continue

            if entry.is_dir():
                children = self._build_tree(entry, max_depth, depth + 1)
                nodes.append(FileTreeNode(
                    name=entry.name,
                    path=str(entry),
                    is_dir=True,
                    children=children,
                ))
            elif entry.is_file():
                nodes.append(FileTreeNode(
                    name=entry.name,
                    path=str(entry),
                    is_dir=False,
                ))
        return nodes

    def scan_project(self, root: str) -> dict:
        root_path = Path(root).resolve()
        if not root_path.is_dir():
            raise ValueError(f"Not a directory: {root}")

        KEY_FILE_NAMES = {
            "package.json", "pyproject.toml", "Cargo.toml", "go.mod",
            "requirements.txt", "Makefile", "Dockerfile", "tsconfig.json",
            "README.md", ".gitignore",
        }

        total_files = 0
        total_dirs = 0
        key_files: list[str] = []
        file_types: dict[str, int] = {}

        for dirpath, dirnames, filenames in os.walk(root_path):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            total_dirs += len(dirnames)

            for fname in filenames:
                total_files += 1
                ext = Path(fname).suffix.lower()
                if ext:
                    file_types[ext] = file_types.get(ext, 0) + 1
                if fname in KEY_FILE_NAMES:
                    rel = os.path.relpath(os.path.join(dirpath, fname), root_path)
                    key_files.append(rel)

        return {
            "path": str(root_path),
            "total_files": total_files,
            "total_dirs": total_dirs,
            "key_files": sorted(key_files),
            "file_types": dict(sorted(file_types.items(), key=lambda x: -x[1])),
        }

    BINARY_EXTENSIONS = {
        ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp",
        ".woff", ".woff2", ".ttf", ".eot", ".otf",
        ".zip", ".tar", ".gz", ".bz2", ".7z",
        ".exe", ".dll", ".so", ".dylib",
        ".pdf", ".doc", ".docx",
        ".mp3", ".mp4", ".wav", ".avi", ".mov",
        ".pyc", ".pyo", ".class",
    }

    def search_files(self, root: str, query: str, max_results: int = 100) -> tuple[list[FileSearchMatch], bool]:
        root_path = self._validate_path(root)
        if not root_path.is_dir():
            return [], False

        query_lower = query.lower()
        matches: list[FileSearchMatch] = []
        truncated = False

        for dirpath, dirnames, filenames in os.walk(root_path):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]

            for fname in filenames:
                ext = Path(fname).suffix.lower()
                if ext in self.BINARY_EXTENSIONS:
                    continue

                fpath = os.path.join(dirpath, fname)
                try:
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                        for line_num, line in enumerate(f, 1):
                            if query_lower in line.lower():
                                matches.append(FileSearchMatch(
                                    path=fpath,
                                    line=line_num,
                                    text=line.rstrip("\n\r")[:200],
                                ))
                                if len(matches) >= max_results:
                                    truncated = True
                                    return matches, truncated
                except (OSError, UnicodeDecodeError):
                    continue

        return matches, truncated

    def check_syntax(self, path: str, content: str) -> tuple[list[SyntaxError_], bool]:
        language = self.detect_language(path)
        if language == "python":
            return self._check_python_syntax(content)
        return [], True

    def _check_python_syntax(self, content: str) -> tuple[list[SyntaxError_], bool]:
        try:
            ast.parse(content)
            return [], True
        except SyntaxError as e:
            error = SyntaxError_(
                line=e.lineno or 1,
                column=e.offset or 0,
                message=str(e.msg),
            )
            return [error], False
