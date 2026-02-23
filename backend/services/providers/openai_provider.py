import json
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

    def chat_stream_with_tools(self, messages: list[dict], system_prompt: str, model: str, tools: list[dict]):
        formatted = self.format_messages_with_tool_results(messages)
        full_messages = [{"role": "system", "content": system_prompt}, *formatted]
        total_tokens = 0

        # Accumulate tool calls from the stream
        tool_calls_acc: dict[int, dict] = {}  # index -> {id, name, arguments_str}

        with self.client.chat.completions.stream(
            model=model,
            messages=full_messages,
            max_completion_tokens=4096,
            tools=tools,
        ) as stream:
            for event in stream:
                if event.type == "content.delta" and event.delta:
                    yield {"text": event.delta}
                elif event.type == "chunk":
                    chunk = event.chunk
                    if chunk.choices:
                        delta = chunk.choices[0].delta
                        if delta and delta.tool_calls:
                            for tc in delta.tool_calls:
                                idx = tc.index
                                if idx not in tool_calls_acc:
                                    tool_calls_acc[idx] = {
                                        "id": tc.id or "",
                                        "name": (tc.function.name if tc.function else "") or "",
                                        "arguments": "",
                                    }
                                if tc.id:
                                    tool_calls_acc[idx]["id"] = tc.id
                                if tc.function:
                                    if tc.function.name:
                                        tool_calls_acc[idx]["name"] = tc.function.name
                                    if tc.function.arguments:
                                        tool_calls_acc[idx]["arguments"] += tc.function.arguments

            response = stream.get_final_completion()
            if response.usage:
                total_tokens = response.usage.total_tokens

        # Yield accumulated tool calls
        for _idx in sorted(tool_calls_acc.keys()):
            tc = tool_calls_acc[_idx]
            try:
                input_data = json.loads(tc["arguments"]) if tc["arguments"] else {}
            except json.JSONDecodeError:
                input_data = {}
            yield {
                "type": "tool_use",
                "id": tc["id"],
                "name": tc["name"],
                "input": input_data,
            }

        stop_reason = "tool_use" if tool_calls_acc else "end_turn"
        if response.choices and response.choices[0].finish_reason == "tool_calls":
            stop_reason = "tool_use"
        elif response.choices and response.choices[0].finish_reason == "stop":
            stop_reason = "end_turn"

        yield {"done": True, "tokens_used": total_tokens, "stop_reason": stop_reason}

    def format_messages_with_tool_results(self, messages: list[dict]) -> list[dict]:
        """Convert Anthropic-style tool messages to OpenAI format."""
        formatted = []
        for msg in messages:
            content = msg.get("content")

            # Anthropic assistant message with tool_use blocks
            if msg["role"] == "assistant" and isinstance(content, list):
                text_parts = []
                tool_calls = []
                for block in content:
                    if block.get("type") == "text":
                        text_parts.append(block["text"])
                    elif block.get("type") == "tool_use":
                        tool_calls.append({
                            "id": block["id"],
                            "type": "function",
                            "function": {
                                "name": block["name"],
                                "arguments": json.dumps(block["input"]),
                            },
                        })
                assistant_msg: dict = {"role": "assistant"}
                if text_parts:
                    assistant_msg["content"] = "\n".join(text_parts)
                else:
                    assistant_msg["content"] = None
                if tool_calls:
                    assistant_msg["tool_calls"] = tool_calls
                formatted.append(assistant_msg)

            # Anthropic user message with tool_result blocks
            elif msg["role"] == "user" and isinstance(content, list):
                for block in content:
                    if block.get("type") == "tool_result":
                        formatted.append({
                            "role": "tool",
                            "tool_call_id": block["tool_use_id"],
                            "content": block.get("content", ""),
                        })
                    elif block.get("type") == "text":
                        formatted.append({"role": "user", "content": block["text"]})

            else:
                formatted.append(msg)

        return formatted
