from services.tools import TOOL_DEFINITIONS


def get_anthropic_tools() -> list[dict]:
    """Return tool definitions in Anthropic format (native)."""
    return TOOL_DEFINITIONS


def get_openai_tools() -> list[dict]:
    """Convert tool definitions to OpenAI function-calling format."""
    openai_tools = []
    for tool in TOOL_DEFINITIONS:
        openai_tools.append({
            "type": "function",
            "function": {
                "name": tool["name"],
                "description": tool["description"],
                "parameters": tool["input_schema"],
            },
        })
    return openai_tools
