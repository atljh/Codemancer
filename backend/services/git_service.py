import subprocess

from models.git import (
    GitFileEntry,
    GitStatusResponse,
    GitBranchEntry,
    GitBranchesResponse,
    GitCommitResponse,
)


class GitService:
    def __init__(self, cwd: str):
        self.cwd = cwd

    def _run(self, args: list[str], check: bool = True) -> subprocess.CompletedProcess:
        return subprocess.run(
            ["git"] + args,
            cwd=self.cwd,
            capture_output=True,
            text=True,
            check=check,
            shell=False,
        )

    def is_git_repo(self) -> bool:
        try:
            r = self._run(["rev-parse", "--is-inside-work-tree"], check=False)
            return r.returncode == 0 and r.stdout.strip() == "true"
        except FileNotFoundError:
            return False

    def status(self) -> GitStatusResponse:
        r = self._run(["status", "--porcelain=v1", "-b"])
        lines = r.stdout.splitlines()
        if not lines:
            return GitStatusResponse(branch="unknown")

        # Parse branch line: ## branch...remote [ahead N, behind M]
        branch_line = lines[0]
        branch = "unknown"
        remote_branch = None
        ahead = 0
        behind = 0

        if branch_line.startswith("## "):
            info = branch_line[3:]
            # Split off tracking info
            if " [" in info:
                branch_part, tracking = info.rsplit(" [", 1)
                tracking = tracking.rstrip("]")
                for part in tracking.split(", "):
                    part = part.strip()
                    if part.startswith("ahead "):
                        ahead = int(part.split()[1])
                    elif part.startswith("behind "):
                        behind = int(part.split()[1])
            else:
                branch_part = info

            if "..." in branch_part:
                branch, remote_branch = branch_part.split("...", 1)
            else:
                branch = branch_part

            # Handle detached HEAD
            if branch.startswith("No commits yet on "):
                branch = branch.replace("No commits yet on ", "")

        staged: list[GitFileEntry] = []
        unstaged: list[GitFileEntry] = []
        untracked: list[GitFileEntry] = []

        for line in lines[1:]:
            if len(line) < 4:
                continue

            x = line[0]  # staged status
            y = line[1]  # unstaged status
            raw_path = line[3:]

            # Handle renames (tab-separated: "new\told")
            original_path = None
            path = raw_path
            if "\t" in raw_path:
                path, original_path = raw_path.split("\t", 1)
                # git porcelain shows "new_path\told_path" for renames
                # Swap: path is new, original_path is old
                path, original_path = path, original_path

            if x == "?" and y == "?":
                untracked.append(GitFileEntry(path=path, status="?"))
                continue

            # Staged changes
            if x not in (" ", "?"):
                staged.append(GitFileEntry(
                    path=path,
                    status=x,
                    original_path=original_path,
                ))

            # Unstaged changes
            if y not in (" ", "?"):
                unstaged.append(GitFileEntry(
                    path=path,
                    status=y,
                    original_path=original_path,
                ))

        return GitStatusResponse(
            branch=branch,
            remote_branch=remote_branch,
            ahead=ahead,
            behind=behind,
            staged=staged,
            unstaged=unstaged,
            untracked=untracked,
        )

    def branches(self) -> GitBranchesResponse:
        r = self._run(["branch", "--list"])
        entries = []
        for line in r.stdout.splitlines():
            current = line.startswith("* ")
            name = line.lstrip("* ").strip()
            if name:
                entries.append(GitBranchEntry(name=name, current=current))
        return GitBranchesResponse(branches=entries)

    def stage(self, paths: list[str]) -> None:
        if not paths:
            return
        self._run(["add", "--"] + paths)

    def unstage(self, paths: list[str]) -> None:
        if not paths:
            return
        self._run(["restore", "--staged", "--"] + paths)

    def commit(self, message: str) -> GitCommitResponse:
        self._run(["commit", "-m", message])
        r = self._run(["rev-parse", "--short", "HEAD"])
        return GitCommitResponse(
            hash=r.stdout.strip(),
            message=message,
        )

    def staged_diff(self) -> str:
        """Return the diff of staged changes."""
        r = self._run(["diff", "--cached"], check=False)
        return r.stdout

    def discard(self, paths: list[str]) -> None:
        if not paths:
            return
        # Separate tracked vs untracked
        status = self.status()
        untracked_paths = {f.path for f in status.untracked}

        tracked = [p for p in paths if p not in untracked_paths]
        to_clean = [p for p in paths if p in untracked_paths]

        if tracked:
            self._run(["checkout", "--"] + tracked)
        if to_clean:
            self._run(["clean", "-f", "--"] + to_clean)
