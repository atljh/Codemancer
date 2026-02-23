import re
from pathlib import Path
from models.quest import Quest

TODO_PATTERN = re.compile(r"#\s*TODO[:\s]+(.+)", re.IGNORECASE)

def parse_todos_from_file(file_path: str) -> list[Quest]:
    quests: list[Quest] = []
    path = Path(file_path)
    if not path.exists() or not path.is_file():
        return quests
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except Exception:
        return quests
    for i, line in enumerate(lines, start=1):
        match = TODO_PATTERN.search(line)
        if match:
            title = match.group(1).strip()
            quests.append(Quest(
                id=f"todo-{path.stem}-{i}",
                title=title,
                description=f"Found in {path.name}:{i}",
                exp_reward=50,
                source_file=str(path),
                line_number=i,
            ))
    return quests

def parse_todos_from_directory(directory: str, extensions: tuple[str, ...] = (".py", ".ts", ".tsx", ".js", ".jsx")) -> list[Quest]:
    quests: list[Quest] = []
    path = Path(directory)
    if not path.exists():
        return quests
    for ext in extensions:
        for file in path.rglob(f"*{ext}"):
            quests.extend(parse_todos_from_file(str(file)))
    return quests
