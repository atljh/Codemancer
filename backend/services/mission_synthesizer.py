"""
AI Synthesis — The Strategist.
Groups raw signals into Operations by analyzing file paths,
content similarity, and directory proximity.
"""
import uuid
from pathlib import PurePosixPath
from datetime import datetime, timezone
from collections import defaultdict

from models.mission import Signal, Operation, OperationStatus


def synthesize_operations(signals: list[Signal], existing_ops: list[Operation] | None = None) -> list[Operation]:
    """Group signals into Operations using directory clustering + content analysis.

    Strategy:
    1. Cluster signals by top-level directory (sector)
    2. Within each cluster, sub-group by content keywords
    3. Generate an operation title that describes the cluster
    """
    if not signals:
        return []

    existing_ops = existing_ops or []
    existing_signal_ids = set()
    for op in existing_ops:
        for sig in op.signals:
            existing_signal_ids.add(sig.id)

    # Filter out signals already assigned to operations
    new_signals = [s for s in signals if s.id not in existing_signal_ids]
    if not new_signals:
        return []

    # Phase 1: cluster by directory sector
    sector_clusters: dict[str, list[Signal]] = defaultdict(list)
    no_sector: list[Signal] = []

    for signal in new_signals:
        if signal.file_path:
            parts = PurePosixPath(signal.file_path).parts
            # Use top 2 directory levels as sector key
            sector = "/".join(parts[:2]) if len(parts) > 1 else parts[0]
            sector_clusters[sector].append(signal)
        else:
            no_sector.append(signal)

    operations: list[Operation] = []
    now = datetime.now(timezone.utc).isoformat()

    for sector, cluster_signals in sector_clusters.items():
        if not cluster_signals:
            continue

        # Generate operation title from sector and content
        title = _generate_title(sector, cluster_signals)
        description = _generate_description(cluster_signals)
        related = _extract_sectors(cluster_signals)

        operations.append(Operation(
            id=f"op-{uuid.uuid4().hex[:8]}",
            title=title,
            description=description,
            status=OperationStatus.ANALYSIS,
            signals=cluster_signals,
            related_sectors=related,
            exp_reward=_calculate_reward(cluster_signals),
            created_at=now,
            updated_at=now,
        ))

    # Handle orphan signals (no file path — e.g. Telegram messages)
    if no_sector:
        operations.append(Operation(
            id=f"op-{uuid.uuid4().hex[:8]}",
            title=_generate_title("comms", no_sector),
            description=_generate_description(no_sector),
            status=OperationStatus.ANALYSIS,
            signals=no_sector,
            related_sectors=[],
            exp_reward=_calculate_reward(no_sector),
            created_at=now,
            updated_at=now,
        ))

    return operations


def _generate_title(sector: str, signals: list[Signal]) -> str:
    """Generate a tactical operation title from sector and signal content."""
    # Count signal types
    sources = defaultdict(int)
    for s in signals:
        sources[s.source] += 1

    # Keyword extraction from content
    keywords = _extract_keywords(signals)
    sector_clean = sector.replace("/", " › ").replace("_", " ").title()

    # Build title based on predominant signal type
    count = len(signals)
    if count == 1:
        return f"Investigate: {signals[0].content[:60]}"

    keyword_str = ", ".join(keywords[:2]) if keywords else sector_clean

    tag_counts = defaultdict(int)
    for s in signals:
        tag = s.metadata.get("tag", "")
        if tag:
            tag_counts[tag] += 1

    if tag_counts.get("BUG", 0) + tag_counts.get("FIXME", 0) > count / 2:
        return f"Stabilize {sector_clean}"
    if tag_counts.get("TODO", 0) > count / 2:
        return f"Implement {keyword_str}"

    return f"Operation: {sector_clean} ({count} signals)"


def _generate_description(signals: list[Signal]) -> str:
    """Build a description from signal contents."""
    lines = []
    for s in signals[:5]:
        prefix = f"[{s.source.value}]"
        loc = f" ({s.file_path}:{s.line_number})" if s.file_path and s.line_number else ""
        lines.append(f"{prefix}{loc} {s.content[:80]}")
    if len(signals) > 5:
        lines.append(f"... and {len(signals) - 5} more signals")
    return "\n".join(lines)


def _extract_sectors(signals: list[Signal]) -> list[str]:
    """Extract unique file paths / directories related to signals."""
    sectors = set()
    for s in signals:
        if s.file_path:
            sectors.add(s.file_path)
            # Also add parent directory
            parent = str(PurePosixPath(s.file_path).parent)
            if parent != ".":
                sectors.add(parent)
    return sorted(sectors)


def _extract_keywords(signals: list[Signal]) -> list[str]:
    """Extract significant keywords from signal contents."""
    word_freq: dict[str, int] = defaultdict(int)
    stop_words = {"the", "a", "an", "is", "to", "in", "for", "of", "and", "or", "this", "that", "it"}

    for s in signals:
        words = s.content.lower().split()
        for w in words:
            clean = w.strip(".,;:!?()[]{}\"'")
            if len(clean) > 2 and clean not in stop_words:
                word_freq[clean] += 1

    # Sort by frequency, return top keywords
    sorted_words = sorted(word_freq.items(), key=lambda x: -x[1])
    return [w for w, _ in sorted_words[:5]]


def _calculate_reward(signals: list[Signal]) -> int:
    """Calculate EXP reward based on signal count and severity."""
    base = 50
    per_signal = 25
    bug_bonus = 50

    reward = base + len(signals) * per_signal
    for s in signals:
        tag = s.metadata.get("tag", "")
        if tag in ("BUG", "FIXME"):
            reward += bug_bonus
        severity = s.metadata.get("severity", "")
        if severity == "critical":
            reward += bug_bonus

    return min(reward, 500)  # cap at 500
