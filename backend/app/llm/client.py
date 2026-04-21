"""LLM provider abstraction supporting Claude direct and OpenRouter backends."""

import json
import os
from typing import AsyncGenerator

import anthropic
import httpx

CLAUDE_MODELS = [
    "claude-opus-4-6",
    "claude-sonnet-4-6",
    "claude-haiku-4-5-20251001",
]

OPENROUTER_MODELS = [
    "anthropic/claude-opus-4-6",
    "anthropic/claude-sonnet-4-6",
    "google/gemini-2.5-pro",
    "openai/gpt-4o",
]

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


def get_models(provider: str) -> list[str]:
    """Return list of model IDs for provider ('claude' or 'openrouter')."""
    if provider == "claude":
        return CLAUDE_MODELS
    elif provider == "openrouter":
        return OPENROUTER_MODELS
    else:
        raise ValueError(f"Unknown provider: {provider!r}. Must be 'claude' or 'openrouter'.")


async def stream_chat(
    provider: str,
    model: str,
    system: str,
    messages: list[dict],
) -> AsyncGenerator[str, None]:
    """Yield text chunks as they arrive from the API.

    Args:
        provider: 'claude' or 'openrouter'
        model: Model ID string
        system: System prompt text
        messages: List of {"role": "user"/"assistant", "content": "..."} dicts
    """
    if provider == "claude":
        async for chunk in _stream_claude(model, system, messages):
            yield chunk
    elif provider == "openrouter":
        async for chunk in _stream_openrouter(model, system, messages):
            yield chunk
    else:
        raise ValueError(f"Unknown provider: {provider!r}. Must be 'claude' or 'openrouter'.")


async def _stream_claude(
    model: str,
    system: str,
    messages: list[dict],
) -> AsyncGenerator[str, None]:
    """Stream from Claude direct API via anthropic SDK."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY environment variable not set")

    client = anthropic.AsyncAnthropic(api_key=api_key)

    async with client.messages.stream(
        model=model,
        max_tokens=4096,
        system=system,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield text


async def _stream_openrouter(
    model: str,
    system: str,
    messages: list[dict],
) -> AsyncGenerator[str, None]:
    """Stream from OpenRouter via SSE over httpx."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY environment variable not set")

    all_messages = [{"role": "system", "content": system}] + messages

    payload = {
        "model": model,
        "messages": all_messages,
        "stream": True,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://etom-explorer",
        "X-Title": "eTOM Explorer",
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            OPENROUTER_URL,
            json=payload,
            headers=headers,
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data_str = line[len("data: "):]
                if data_str.strip() == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                except json.JSONDecodeError:
                    continue
                content = (
                    data.get("choices", [{}])[0]
                    .get("delta", {})
                    .get("content")
                )
                if content:
                    yield content
