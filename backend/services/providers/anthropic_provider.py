from anthropic import Anthropic
from .base import BaseLLMProvider


class AnthropicProvider(BaseLLMProvider):
    def __init__(self, settings: dict):
        auth_method = settings.get("auth_method", "api_key")
        if auth_method == "oauth":
            token = settings.get("oauth_access_token", "")
            if not token:
                raise ValueError("OAuth token not configured")
            self.client = Anthropic(auth_token=token)
        else:
            api_key = settings.get("anthropic_api_key", "")
            if not api_key:
                raise ValueError("Anthropic API key not configured")
            self.client = Anthropic(api_key=api_key)

    def chat(self, messages: list[dict], system_prompt: str, model: str) -> dict:
        response = self.client.messages.create(
            model=model,
            max_tokens=4096,
            system=system_prompt,
            messages=messages,
        )
        content = response.content[0].text if response.content else ""
        tokens = (response.usage.input_tokens or 0) + (response.usage.output_tokens or 0)
        return {"content": content, "tokens_used": tokens}

    def chat_stream(self, messages: list[dict], system_prompt: str, model: str):
        with self.client.messages.stream(
            model=model,
            max_tokens=4096,
            system=system_prompt,
            messages=messages,
        ) as stream:
            for text in stream.text_stream:
                yield {"text": text}
            final = stream.get_final_message()
            tokens = (final.usage.input_tokens or 0) + (final.usage.output_tokens or 0)
            yield {"done": True, "tokens_used": tokens}
