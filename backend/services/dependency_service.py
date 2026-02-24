import os
import re
from pathlib import Path

from models.dependency import DepNode, DepEdge, DepGraphResponse
from services.file_service import SKIP_DIRS

SOURCE_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx"}

# Import patterns
PY_IMPORT = re.compile(
    r"^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))"
)
JS_IMPORT = re.compile(
    r"""(?:import\s+.*?\s+from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))"""
)

EXT_TYPE = {
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
}


class DependencyService:
    def __init__(self, workspace_root: str):
        self.root = Path(workspace_root)

    def build_graph(self, scope: str | None = None) -> DepGraphResponse:
        base = self.root / scope if scope else self.root

        # Phase 1: collect nodes
        nodes: dict[str, DepNode] = {}
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fn in filenames:
                fp = Path(dirpath) / fn
                if fp.suffix not in SOURCE_EXTENSIONS:
                    continue
                try:
                    lines = sum(1 for _ in fp.open(errors="replace"))
                except Exception:
                    lines = 0
                rel = str(fp.relative_to(self.root))
                nodes[rel] = DepNode(
                    id=rel,
                    path=rel,
                    name=fp.stem,
                    type=EXT_TYPE.get(fp.suffix, "unknown"),
                    lines=lines,
                    extension=fp.suffix,
                )

        # Phase 2: parse imports -> edges
        edges: list[DepEdge] = []
        node_set = set(nodes.keys())

        for rel, node in nodes.items():
            fp = self.root / rel
            try:
                content = fp.read_text(errors="replace")
            except Exception:
                continue

            if node.type == "python":
                deps = self._parse_python_imports(content, fp)
            else:
                deps = self._parse_js_imports(content, fp)

            for dep in deps:
                if dep in node_set and dep != rel:
                    edges.append(DepEdge(source=rel, target=dep))

        return DepGraphResponse(nodes=list(nodes.values()), edges=edges)

    def _parse_python_imports(self, content: str, file_path: Path) -> list[str]:
        results = []
        for line in content.splitlines():
            m = PY_IMPORT.match(line)
            if not m:
                continue
            module = m.group(1) or m.group(2)
            if not module:
                continue

            # Try relative from file's directory
            parts = module.split(".")
            candidates = [
                file_path.parent / "/".join(parts) / "__init__.py",
                file_path.parent / ("/".join(parts) + ".py"),
                self.root / "/".join(parts) / "__init__.py",
                self.root / ("/".join(parts) + ".py"),
            ]
            for c in candidates:
                if c.exists():
                    try:
                        results.append(str(c.relative_to(self.root)))
                    except ValueError:
                        pass
                    break
        return results

    def _parse_js_imports(self, content: str, file_path: Path) -> list[str]:
        results = []
        for m in JS_IMPORT.finditer(content):
            specifier = m.group(1) or m.group(2)
            if not specifier or not specifier.startswith("."):
                continue  # Skip bare modules (npm packages)

            base = (file_path.parent / specifier).resolve()
            # Try extensions
            candidates = []
            for ext in [".ts", ".tsx", ".js", ".jsx"]:
                candidates.append(base.with_suffix(ext))
            # index files
            for ext in [".ts", ".tsx", ".js", ".jsx"]:
                candidates.append(base / f"index{ext}")

            for c in candidates:
                if c.exists():
                    try:
                        results.append(str(c.relative_to(self.root)))
                    except ValueError:
                        pass
                    break
        return results
