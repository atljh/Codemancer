"""GitHub signal provider — fetches PRs, issues, failed CI runs."""
import subprocess
import uuid
from datetime import datetime, timezone

import httpx

from models.signal_refinery import UnifiedSignal, UnifiedSignalSource
from services.signals.base_provider import BaseSignalProvider


class GitHubProvider(BaseSignalProvider):
    name = "github"

    def is_configured(self) -> bool:
        return bool(self._settings.get("github_token", "").strip())

    def _headers(self) -> dict:
        token = self._settings["github_token"]
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    def _owner_repo(self) -> tuple[str, str]:
        owner = self._settings.get("github_owner", "").strip()
        repo = self._settings.get("github_repo", "").strip()
        if owner and repo:
            return owner, repo
        # Auto-detect from git remote
        return _detect_owner_repo(self._settings.get("workspace_root", ""))

    async def fetch_signals(self, since: str | None = None) -> list[UnifiedSignal]:
        owner, repo = self._owner_repo()
        if not owner or not repo:
            return []

        signals: list[UnifiedSignal] = []
        now = datetime.now(timezone.utc).isoformat()
        headers = self._headers()

        async with httpx.AsyncClient(timeout=30) as client:
            base = f"https://api.github.com/repos/{owner}/{repo}"

            # 1. Open PRs (sorted by updated)
            try:
                resp = await client.get(
                    f"{base}/pulls",
                    params={"state": "open", "sort": "updated", "per_page": "20"},
                    headers=headers,
                )
                if resp.status_code == 200:
                    for pr in resp.json():
                        priority = 3
                        # Review requested → priority 2
                        if pr.get("requested_reviewers"):
                            priority = 2

                        file_paths = await _get_pr_files(client, base, pr["number"], headers)

                        signals.append(UnifiedSignal(
                            id=f"gh-pr-{pr['number']}-{uuid.uuid4().hex[:6]}",
                            source=UnifiedSignalSource.GITHUB,
                            external_id=f"pr-{pr['number']}",
                            title=f"PR #{pr['number']}: {pr['title']}",
                            content=pr.get("body") or "",
                            url=pr.get("html_url", ""),
                            file_path=file_paths[0] if file_paths else None,
                            priority=priority,
                            provider_metadata={
                                "type": "pull_request",
                                "number": pr["number"],
                                "author": pr.get("user", {}).get("login", ""),
                                "changed_files": file_paths[:5],
                                "labels": [l["name"] for l in pr.get("labels", [])],
                            },
                            created_at=pr.get("created_at", now),
                            updated_at=pr.get("updated_at", now),
                            fetched_at=now,
                        ))
            except httpx.HTTPError:
                pass

            # 2. Assigned issues
            try:
                resp = await client.get(
                    f"{base}/issues",
                    params={"assignee": "@me", "state": "open", "per_page": "20"},
                    headers=headers,
                )
                if resp.status_code == 200:
                    for issue in resp.json():
                        # Skip PRs (GitHub returns PRs in issues endpoint)
                        if issue.get("pull_request"):
                            continue
                        signals.append(UnifiedSignal(
                            id=f"gh-issue-{issue['number']}-{uuid.uuid4().hex[:6]}",
                            source=UnifiedSignalSource.GITHUB,
                            external_id=f"issue-{issue['number']}",
                            title=f"Issue #{issue['number']}: {issue['title']}",
                            content=issue.get("body") or "",
                            url=issue.get("html_url", ""),
                            priority=3,
                            provider_metadata={
                                "type": "issue",
                                "number": issue["number"],
                                "labels": [l["name"] for l in issue.get("labels", [])],
                            },
                            created_at=issue.get("created_at", now),
                            updated_at=issue.get("updated_at", now),
                            fetched_at=now,
                        ))
            except httpx.HTTPError:
                pass

            # 3. Failed CI runs
            try:
                resp = await client.get(
                    f"{base}/actions/runs",
                    params={"status": "failure", "per_page": "5"},
                    headers=headers,
                )
                if resp.status_code == 200:
                    for run in resp.json().get("workflow_runs", []):
                        signals.append(UnifiedSignal(
                            id=f"gh-ci-{run['id']}-{uuid.uuid4().hex[:6]}",
                            source=UnifiedSignalSource.GITHUB,
                            external_id=f"ci-{run['id']}",
                            title=f"CI Failed: {run.get('name', 'workflow')}",
                            content=f"Branch: {run.get('head_branch', '?')}, commit: {run.get('head_sha', '?')[:8]}",
                            url=run.get("html_url", ""),
                            priority=1,
                            provider_metadata={
                                "type": "ci_failure",
                                "run_id": run["id"],
                                "branch": run.get("head_branch", ""),
                                "workflow": run.get("name", ""),
                            },
                            created_at=run.get("created_at", now),
                            updated_at=run.get("updated_at", now),
                            fetched_at=now,
                        ))
            except httpx.HTTPError:
                pass

        return signals


async def _get_pr_files(
    client: httpx.AsyncClient, base: str, pr_number: int, headers: dict
) -> list[str]:
    """Get first 5 changed files from a PR."""
    try:
        resp = await client.get(
            f"{base}/pulls/{pr_number}/files",
            params={"per_page": "5"},
            headers=headers,
        )
        if resp.status_code == 200:
            return [f["filename"] for f in resp.json()]
    except httpx.HTTPError:
        pass
    return []


def _detect_owner_repo(workspace_root: str) -> tuple[str, str]:
    """Auto-detect owner/repo from git remote origin URL."""
    try:
        result = subprocess.run(
            ["git", "remote", "get-url", "origin"],
            capture_output=True, text=True, timeout=5,
            cwd=workspace_root or None,
        )
        url = result.stdout.strip()
        if not url:
            return "", ""
        # Handle SSH: git@github.com:owner/repo.git
        if url.startswith("git@"):
            path = url.split(":")[-1]
        # Handle HTTPS: https://github.com/owner/repo.git
        elif "github.com" in url:
            path = url.split("github.com/")[-1]
        else:
            return "", ""
        path = path.removesuffix(".git")
        parts = path.split("/")
        if len(parts) >= 2:
            return parts[0], parts[1]
    except Exception:
        pass
    return "", ""
