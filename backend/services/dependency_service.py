import os
import re
from pathlib import Path

from models.dependency import DepNode, DepEdge, DepGraphResponse
from services.file_service import SKIP_DIRS

SOURCE_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx"}

# Extra dirs to skip for large repos
EXTRA_SKIP = {
    "build", ".build", "vendor", ".cache", "coverage", ".coverage",
    "tmp", ".tmp", "logs", "assets", "public", "static",
    ".idea", ".vscode", ".DS_Store", "egg-info",
}
ALL_SKIP = SKIP_DIRS | EXTRA_SKIP

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

    MAX_NODES = 300
    MAX_SOURCE_FILES = 5000

    def build_graph(self, scope: str | None = None) -> DepGraphResponse:
        base = self.root / scope if scope else self.root

        # Phase 1: collect ALL source file paths (fast — no reading)
        source_files: list[Path] = []
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [d for d in dirnames if d not in ALL_SKIP]
            for fn in filenames:
                fp = Path(dirpath) / fn
                if fp.suffix in SOURCE_EXTENSIONS:
                    source_files.append(fp)
                    if len(source_files) >= self.MAX_SOURCE_FILES:
                        break
            if len(source_files) >= self.MAX_SOURCE_FILES:
                break

        # Phase 2: build node stubs (no line counting yet) and parse imports
        rel_to_path: dict[str, Path] = {}
        for fp in source_files:
            rel = str(fp.relative_to(self.root))
            rel_to_path[rel] = fp

        node_set = set(rel_to_path.keys())
        edges: list[tuple[str, str]] = []
        edge_count: dict[str, int] = {rel: 0 for rel in node_set}

        for rel, fp in rel_to_path.items():
            try:
                content = fp.read_text(errors="replace")
            except Exception:
                continue

            ext_type = EXT_TYPE.get(fp.suffix, "unknown")
            if ext_type == "python":
                deps = self._parse_python_imports(content, fp)
            else:
                deps = self._parse_js_imports(content, fp)

            for dep in deps:
                if dep in node_set and dep != rel:
                    edges.append((rel, dep))
                    edge_count[rel] = edge_count.get(rel, 0) + 1
                    edge_count[dep] = edge_count.get(dep, 0) + 1

        # Phase 3: if too many nodes, keep the most connected
        if len(node_set) > self.MAX_NODES:
            # Sort by edge count descending, keep top N
            ranked = sorted(node_set, key=lambda r: edge_count.get(r, 0), reverse=True)
            kept = set(ranked[:self.MAX_NODES])
            # Filter edges to only kept nodes
            edges = [(s, t) for s, t in edges if s in kept and t in kept]
        else:
            kept = node_set

        # Phase 4: build final nodes with line counts (only for kept nodes)
        nodes: list[DepNode] = []
        for rel in kept:
            fp = rel_to_path[rel]
            try:
                lines = sum(1 for _ in fp.open(errors="replace"))
            except Exception:
                lines = 0
            nodes.append(DepNode(
                id=rel,
                path=rel,
                name=fp.stem,
                type=EXT_TYPE.get(fp.suffix, "unknown"),
                lines=lines,
                extension=fp.suffix,
            ))

        final_edges = [DepEdge(source=s, target=t) for s, t in edges]
        return DepGraphResponse(nodes=nodes, edges=final_edges)

    def _parse_python_imports(self, content: str, file_path: Path) -> list[str]:
        results = []
        for line in content.splitlines():
            m = PY_IMPORT.match(line)
            if not m:
                continue
            module = m.group(1) or m.group(2)
            if not module:
                continue

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
                continue

            base = (file_path.parent / specifier).resolve()
            candidates = []
            for ext in [".ts", ".tsx", ".js", ".jsx"]:
                candidates.append(base.with_suffix(ext))
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
