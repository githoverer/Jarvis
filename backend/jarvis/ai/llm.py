
import ollama

from jarvis.config import (
    MODEL_NAME,
    OLLAMA_HOST,
    SYSTEM_PROMPT,
)

client = ollama.AsyncClient(host=OLLAMA_HOST)


async def generate_response(messages: list[dict]) -> str:
    """
    Send conversation messages to the local Ollama model
    and return its response.
    """

    conversation = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        }
    ]

    conversation.extend(messages)

    response = await client.chat(
        model=MODEL_NAME,
        messages=conversation,
        think=False,
        options={
            "temperature": 0.7,
            "num_ctx": 4096,
        },
    )

    return response.message.content or ""
    