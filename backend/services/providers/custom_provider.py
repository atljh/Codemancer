from openai import OpenAI
from .base import BaseLLMProvider


class CustomProvider(BaseLLMProvider):
    """OpenAI-compatible provider with custom base URL (OpenRouter, Groq, Ollama, etc.)."""

    def __init__(self, settings: dict):
        base_url = settings.get("custom_base_url", "")
        if not base_url:
            raise ValueError("Custom base URL not configured")
        api_key = settings.get("custom_api_key", "") or "not-needed"
        self.client = OpenAI(api_key=api_key, base_url=base_url)

    def chat(self, messages: list[dict], system_prompt: str, model: str) -> dict:
        full_messages = [{"role": "system", "content": system_prompt}, *messages]
        response = self.client.chat.completions.create(
            model=model,
            messages=full_messages,
            max_completion_tokens=4096,
        )
        content = response.choices[0].message.content or ""
        tokens = response.usage.total_tokens if response.usage else 0
        return {"content": content, "tokens_used": tokens}

    def chat_stream(self, messages: list[dict], system_prompt: str, model: str):
        full_messages = [{"role": "system", "content": system_prompt}, *messages]
        stream = self.client.chat.completions.create(
            model=model,
            messages=full_messages,
            max_completion_tokens=4096,
            stream=True,
        )
        total_tokens = 0
        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield {"text": chunk.choices[0].delta.content}
            if chunk.usage:
                total_tokens = chunk.usage.total_tokens
        yield {"done": True, "tokens_used": total_tokens}
