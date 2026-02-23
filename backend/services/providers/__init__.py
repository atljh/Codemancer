from .base import BaseLLMProvider
from .anthropic_provider import AnthropicProvider
from .openai_provider import OpenAIProvider
from .gemini_provider import GeminiProvider
from .custom_provider import CustomProvider


def get_provider(settings: dict) -> BaseLLMProvider:
    """Factory: return the appropriate LLM provider based on settings."""
    provider = settings.get("ai_provider", "anthropic")
    if provider == "openai":
        return OpenAIProvider(settings)
    elif provider == "gemini":
        return GeminiProvider(settings)
    elif provider == "custom":
        return CustomProvider(settings)
    else:
        return AnthropicProvider(settings)


__all__ = [
    "BaseLLMProvider",
    "AnthropicProvider",
    "OpenAIProvider",
    "GeminiProvider",
    "CustomProvider",
    "get_provider",
]
