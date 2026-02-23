from abc import ABC, abstractmethod
from typing import AsyncIterator


class BaseLLMProvider(ABC):
    @abstractmethod
    def chat(self, messages: list[dict], system_prompt: str, model: str) -> dict:
        """Synchronous chat. Returns {"content": str, "tokens_used": int}."""

    @abstractmethod
    def chat_stream(self, messages: list[dict], system_prompt: str, model: str) -> AsyncIterator[dict]:
        """Streaming chat. Yields {"text": str} chunks, then {"done": True, "tokens_used": int}."""

    def chat_stream_with_tools(self, messages: list[dict], system_prompt: str, model: str, tools: list[dict]):
        """Streaming chat with tool support. Yields:
        - {"text": str} for text deltas
        - {"type": "tool_use", "id": str, "name": str, "input": dict} for tool calls
        - {"done": True, "tokens_used": int, "stop_reason": str}

        Default implementation falls back to chat_stream (ignoring tools).
        """
        yield from self.chat_stream(messages, system_prompt, model)

    def format_messages_with_tool_results(self, messages: list[dict]) -> list[dict]:
        """Format messages containing tool_use/tool_result blocks for this provider.
        Default: return as-is (Anthropic native format).
        """
        return messages
