
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from jarvis.ai.llm import generate_response
from jarvis.database import (
    add_message,
    create_conversation,
    conversation_exists,
    get_latest_conversation,
    get_messages,
    list_conversations,
)

router = APIRouter(prefix="/api", tags=["Chat"])


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=12000)
    conversation_id: str


class ChatResponse(BaseModel):
    response: str
    conversation_id: str


@router.get("/conversations/latest")
async def latest_conversation():
    conversation = get_latest_conversation()
    conversation["messages"] = get_messages(conversation["id"])
    return conversation


@router.get("/conversations")
async def conversations():
    return list_conversations()


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    if not conversation_exists(conversation_id):
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    conversation = next(
        (
            item for item in list_conversations()
            if item["id"] == conversation_id
        ),
        None,
    )

    if conversation is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    conversation["messages"] = get_messages(conversation_id)
    return conversation


@router.post("/conversations")
async def new_conversation():
    conversation_id = create_conversation()
    return {"conversation_id": conversation_id}


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    conversation_id = request.conversation_id
    user_message = request.message.strip()

    if not user_message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty.",
        )

    if not conversation_exists(conversation_id):
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    try:
        add_message(conversation_id, "user", user_message)

        history = get_messages(conversation_id)

        messages = [
            {
                "role": item["role"],
                "content": item["content"],
            }
            for item in history
        ]

        answer = await generate_response(messages)

        if not answer.strip():
            raise RuntimeError("The AI model returned an empty response.")

        add_message(conversation_id, "assistant", answer)

        return ChatResponse(
            response=answer,
            conversation_id=conversation_id,
        )

    except Exception as error:
        print(f"JARVIS AI error: {error}")

        raise HTTPException(
            status_code=503,
            detail="Unable to generate a response using the local AI model.",
        )
