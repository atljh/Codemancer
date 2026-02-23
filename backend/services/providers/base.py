from abc import ABC, abstractmethod
from typing import AsyncIterator


class BaseLLMProvider(ABC):
    @abstractmethod
    def chat(self, messages: list[dict], system_prompt: str, model: str) -> dict:
        """Synchronous chat. Returns {"content": str, "tokens_used": int}."""

    @abstractmethod
    def chat_stream(self, messages: list[dict], system_prompt: str, model: str) -> AsyncIterator[dict]:
        """Streaming chat. Yields {"text": str} chunks, then {"done": True, "tokens_used": int}."""
