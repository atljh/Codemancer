"""Signal providers for external service integration."""
from services.signals.base_provider import BaseSignalProvider
from services.signals.github_provider import GitHubProvider
from services.signals.jira_provider import JiraProvider
from services.signals.slack_provider import SlackProvider
from services.signals.telegram_provider import TelegramProvider

__all__ = [
    "BaseSignalProvider",
    "GitHubProvider",
    "JiraProvider",
    "SlackProvider",
    "TelegramProvider",
]
