import os
import re
from pathlib import Path

from models.health import ComplexFunction, CodeAnomaly, LargeFile, HealthScores, HealthScanResponse, CriticalAnomaly, HealthWatchResponse
from services.file_service import SKIP_DIRS

SOURCE_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx"}
TEST_PATTERNS = re.compile(r"(test_.*\.py|.*\.test\.(ts|tsx|js|jsx)|.*\.spec\.(ts|tsx|js|jsx))$")

# Patterns for function/class definitions
PY_DEF = re.compile(r"^(class |def )\s*(\w+)")
JS_DEF = re.compile(r"^(?:export\s+)?(?:async\s+)?(?:function|const|let|var)\s+(\w+)")

ANOMALY_TAGS = re.compile(r"(?:#|//)\s*(TODO|FIXME|HACK|XXX|BUG)\b[:\s]*(.*)", re.IGNORECASE)


class HealthService:
    def __init__(self, workspace_root: str):
        self.root = Path(workspace_root)

    def scan(self) -> HealthScanResponse:
        complex_functions = self._find_complex_functions()
        untested_files = self._find_untested_files()
        anomalies = self._find_anomalies()
        large_files = self._find_large_files()

        scores = self._compute_scores(complex_functions, untested_files, anomalies, large_files)
        return HealthScanResponse(
            scores=scores,
            complex_functions=complex_functions[:30],
            untested_files=untested_files[:30],
            anomalies=anomalies[:50],
            large_files=large_files[:20],
        )

    def _source_files(self) -> list[Path]:
        files = []
        for dirpath, dirnames, filenames in os.walk(self.root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fn in filenames:
                p = Path(dirpath) / fn
                if p.suffix in SOURCE_EXTENSIONS:
                    files.append(p)
        return files

    def _find_complex_functions(self, threshold: int = 50) -> list[ComplexFunction]:
        results = []
        for fp in self._source_files():
            try:
                lines = fp.read_text(errors="replace").splitlines()
            except Exception:
                continue

            is_python = fp.suffix == ".py"
            pattern = PY_DEF if is_python else JS_DEF

            current_name = None
            current_start = 0
            current_indent = 0

            for i, line in enumerate(lines):
                stripped = line.lstrip()
                indent = len(line) - len(stripped)
                m = pattern.match(stripped)

                if m:
                    # Close previous
                    if current_name and (i - current_start) >= threshold:
                        results.append(ComplexFunction(
                            file=str(fp.relative_to(self.root)),
                            name=current_name,
                            lines=i - current_start,
                            start_line=current_start + 1,
                        ))
                    if is_python:
                        current_name = m.group(2)
                    else:
                        current_name = m.group(1)
                    current_start = i
                    current_indent = indent

            # Close last function
            if current_name and (len(lines) - current_start) >= threshold:
                results.append(ComplexFunction(
                    file=str(fp.relative_to(self.root)),
                    name=current_name,
                    lines=len(lines) - current_start,
                    start_line=current_start + 1,
                ))

        results.sort(key=lambda x: x.lines, reverse=True)
        return results

    def _find_untested_files(self) -> list[str]:
        source_files = set()
        test_files = set()

        for fp in self._source_files():
            rel = str(fp.relative_to(self.root))
            if TEST_PATTERNS.search(fp.name):
                # Extract base name for matching
                base = fp.name
                for suffix in [".test.ts", ".test.tsx", ".test.js", ".test.jsx",
                               ".spec.ts", ".spec.tsx", ".spec.js", ".spec.jsx"]:
                    if base.endswith(suffix):
                        base = base[: -len(suffix)]
                        break
                if base.startswith("test_"):
                    base = base[5:]
                    if base.endswith(".py"):
                        base = base[:-3]
                test_files.add(base.lower())
            else:
                source_files.add(rel)

        untested = []
        for rel in sorted(source_files):
            name = Path(rel).stem.lower()
            if name not in test_files:
                untested.append(rel)
        return untested

    def _find_anomalies(self) -> list[CodeAnomaly]:
        results = []
        for fp in self._source_files():
            try:
                lines = fp.read_text(errors="replace").splitlines()
            except Exception:
                continue
            rel = str(fp.relative_to(self.root))
            for i, line in enumerate(lines):
                m = ANOMALY_TAGS.search(line)
                if m:
                    results.append(CodeAnomaly(
                        file=rel,
                        line=i + 1,
                        tag=m.group(1).upper(),
                        text=m.group(2).strip()[:120],
                    ))
        return results

    def _find_large_files(self, threshold: int = 500) -> list[LargeFile]:
        results = []
        for fp in self._source_files():
            try:
                count = sum(1 for _ in fp.open(errors="replace"))
            except Exception:
                continue
            if count >= threshold:
                results.append(LargeFile(
                    file=str(fp.relative_to(self.root)),
                    lines=count,
                ))
        results.sort(key=lambda x: x.lines, reverse=True)
        return results

    def watch(self) -> HealthWatchResponse:
        """Fast check for critical anomalies only."""
        large_files = self._find_large_files(threshold=800)
        complex_fns = self._find_complex_functions(threshold=150)
        anomalies_raw = self._find_anomalies()
        untested = self._find_untested_files()
        scores = self._compute_scores(complex_fns, untested, anomalies_raw, large_files)

        critical: list[CriticalAnomaly] = []

        # Critical: files over 800 lines (warning for 500-800)
        if large_files:
            sectors = set()
            details = []
            for lf in large_files[:5]:
                parts = lf.file.split("/")
                sector = "/".join(parts[:2]) if len(parts) > 1 else parts[0]
                sectors.add(sector)
                details.append(f"{lf.file} ({lf.lines} lines)")
            critical.append(CriticalAnomaly(
                severity="critical" if any(lf.lines >= 1200 for lf in large_files) else "warning",
                category="file_size",
                sector=", ".join(sorted(sectors)),
                message=f"Detected {len(large_files)} file(s) exceeding 800 lines",
                details=details,
            ))

        # Critical: functions over 150 lines (warning for less)
        if complex_fns:
            sectors = set()
            details = []
            for cf in complex_fns[:5]:
                parts = cf.file.split("/")
                sector = "/".join(parts[:2]) if len(parts) > 1 else parts[0]
                sectors.add(sector)
                details.append(f"{cf.file}:{cf.name} ({cf.lines} lines)")
            critical.append(CriticalAnomaly(
                severity="critical" if any(cf.lines >= 300 for cf in complex_fns) else "warning",
                category="complexity",
                sector=", ".join(sorted(sectors)),
                message=f"Detected {len(complex_fns)} function(s) exceeding 150 lines",
                details=details,
            ))

        # Critical: score below 15, Warning: below 30 (coverage exempt — no tests is common)
        for field in ("complexity", "cleanliness", "file_size"):
            val = getattr(scores, field)
            if val < 15:
                critical.append(CriticalAnomaly(
                    severity="critical",
                    category=field,
                    sector="project-wide",
                    message=f"{field.replace('_', ' ').title()} score critically low: {val}/100",
                    details=[],
                ))
            elif val < 30:
                critical.append(CriticalAnomaly(
                    severity="warning",
                    category=field,
                    sector="project-wide",
                    message=f"{field.replace('_', ' ').title()} score low: {val}/100",
                    details=[],
                ))

        # Coverage: only warn, never critical (many projects lack tests)
        if scores.coverage < 20:
            critical.append(CriticalAnomaly(
                severity="warning",
                category="coverage",
                sector="project-wide",
                message=f"Coverage score low: {scores.coverage}/100",
                details=[],
            ))

        # Warning: BUG/FIXME count high
        bug_tags = [a for a in anomalies_raw if a.tag in ("BUG", "FIXME")]
        if len(bug_tags) >= 5:
            sectors = set()
            details = []
            for bt in bug_tags[:5]:
                parts = bt.file.split("/")
                sector = "/".join(parts[:2]) if len(parts) > 1 else parts[0]
                sectors.add(sector)
                details.append(f"{bt.file}:{bt.line} — {bt.tag}: {bt.text}")
            critical.append(CriticalAnomaly(
                severity="warning",
                category="cleanliness",
                sector=", ".join(sorted(sectors)),
                message=f"High concentration of BUG/FIXME markers: {len(bug_tags)}",
                details=details,
            ))

        return HealthWatchResponse(
            has_critical=any(a.severity == "critical" for a in critical),
            anomalies=critical,
            scores=scores,
        )

    def _compute_scores(
        self,
        complex_fns: list[ComplexFunction],
        untested: list[str],
        anomalies: list[CodeAnomaly],
        large: list[LargeFile],
    ) -> HealthScores:
        all_source = self._source_files()
        total = max(len(all_source), 1)

        # Complexity: fewer complex functions = higher score
        complexity = max(0, 100 - len(complex_fns) * 10)

        # Coverage: ratio of tested files
        tested_ratio = 1 - (len(untested) / total) if total > 0 else 1
        coverage = int(tested_ratio * 100)

        # Cleanliness: fewer anomalies = higher score
        cleanliness = max(0, 100 - len(anomalies) * 3)

        # File size: fewer large files = higher score
        file_size = max(0, 100 - len(large) * 8)

        return HealthScores(
            complexity=min(complexity, 100),
            coverage=min(coverage, 100),
            cleanliness=min(cleanliness, 100),
            file_size=min(file_size, 100),
        )
