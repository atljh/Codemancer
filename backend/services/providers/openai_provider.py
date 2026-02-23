from openai import OpenAI
from .base import BaseLLMProvider


class OpenAIProvider(BaseLLMProvider):
    def __init__(self, settings: dict):
        api_key = settings.get("openai_api_key", "")
        if not api_key:
            raise ValueError("OpenAI API key not configured")
        self.client = OpenAI(api_key=api_key)

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
        total_tokens = 0
        with self.client.chat.completions.stream(
            model=model,
            messages=full_messages,
            max_completion_tokens=4096,
        ) as stream:
            for event in stream:
                if event.type == "content.delta" and event.delta:
                    yield {"text": event.delta}
            response = stream.get_final_completion()
            if response.usage:
                total_tokens = response.usage.total_tokens
        yield {"done": True, "tokens_used": total_tokens}
