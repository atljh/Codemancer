from google import genai
from .base import BaseLLMProvider


class GeminiProvider(BaseLLMProvider):
    def __init__(self, settings: dict):
        api_key = settings.get("gemini_api_key", "")
        if not api_key:
            raise ValueError("Gemini API key not configured")
        self.client = genai.Client(api_key=api_key)

    def chat(self, messages: list[dict], system_prompt: str, model: str) -> dict:
        contents = _build_contents(messages)
        config = genai.types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=4096,
        )
        response = self.client.models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )
        content = response.text or ""
        tokens = 0
        if response.usage_metadata:
            tokens = (response.usage_metadata.prompt_token_count or 0) + (
                response.usage_metadata.candidates_token_count or 0
            )
        return {"content": content, "tokens_used": tokens}

    def chat_stream(self, messages: list[dict], system_prompt: str, model: str):
        contents = _build_contents(messages)
        config = genai.types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=4096,
        )
        total_tokens = 0
        for chunk in self.client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=config,
        ):
            if chunk.text:
                yield {"text": chunk.text}
            if chunk.usage_metadata:
                total_tokens = (chunk.usage_metadata.prompt_token_count or 0) + (
                    chunk.usage_metadata.candidates_token_count or 0
                )
        yield {"done": True, "tokens_used": total_tokens}


def _build_contents(messages: list[dict]) -> list[genai.types.Content]:
    contents: list[genai.types.Content] = []
    for m in messages:
        role = "model" if m["role"] == "assistant" else "user"
        contents.append(genai.types.Content(role=role, parts=[genai.types.Part(text=m["content"])]))
    return contents
