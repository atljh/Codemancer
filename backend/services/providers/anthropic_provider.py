import json
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

    def chat_stream_with_tools(self, messages: list[dict], system_prompt: str, model: str, tools: list[dict]):
        with self.client.messages.stream(
            model=model,
            max_tokens=4096,
            system=system_prompt,
            messages=messages,
            tools=tools,
        ) as stream:
            current_tool_id = None
            current_tool_name = None
            tool_input_json = ""

            for event in stream:
                if event.type == "content_block_start":
                    if event.content_block.type == "tool_use":
                        current_tool_id = event.content_block.id
                        current_tool_name = event.content_block.name
                        tool_input_json = ""
                elif event.type == "content_block_delta":
                    if hasattr(event.delta, "text"):
                        yield {"text": event.delta.text}
                    elif hasattr(event.delta, "partial_json"):
                        tool_input_json += event.delta.partial_json
                elif event.type == "content_block_stop":
                    if current_tool_id and current_tool_name:
                        try:
                            input_data = json.loads(tool_input_json) if tool_input_json else {}
                        except json.JSONDecodeError:
                            input_data = {}
                        yield {
                            "type": "tool_use",
                            "id": current_tool_id,
                            "name": current_tool_name,
                            "input": input_data,
                        }
                        current_tool_id = None
                        current_tool_name = None
                        tool_input_json = ""

            final = stream.get_final_message()
            tokens = (final.usage.input_tokens or 0) + (final.usage.output_tokens or 0)
            stop_reason = final.stop_reason  # "end_turn" or "tool_use"
            yield {"done": True, "tokens_used": tokens, "stop_reason": stop_reason}
