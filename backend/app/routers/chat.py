"""对话相关路由"""
import json
import random
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import AsyncGenerator
from ..database import get_db
from ..models import User, Conversation, Message
from ..schemas import ChatSendRequest, Response
from ..auth import get_current_user
from ..coordinator import coordinator

router = APIRouter(prefix="/api/chat", tags=["智能对话"])

@router.post("/send")
async def send_message(
    request: ChatSendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """发送消息并获取 AI 响应（流式）"""
    
    async def generate() -> AsyncGenerator[str, None]:
        """生成 SSE 流"""
        try:
            async for event in coordinator.process_message(
                user_input=request.message,
                user=current_user,
                db=db,
                conversation_id=request.conversation_id
            ):
                # 将事件序列化为 SSE 格式
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        
        except Exception as e:
            error_event = {
                "type": "error",
                "content": f"处理失败: {str(e)}"
            }
            yield f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/active")
async def get_active_conversation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取用户当前活跃的对话"""
    conversation = db.query(Conversation).filter(
        Conversation.user_id == current_user.id,
        Conversation.status == "ongoing"
    ).order_by(Conversation.last_active.desc()).first()
    
    if not conversation:
        return {"conversation_id": None, "phase": None, "round_count": 0}
    
    return {
        "conversation_id": conversation.id,
        "phase": conversation.phase,
        "round_count": conversation.round_count,
        "status": conversation.status
    }


@router.delete("/clear", response_model=Response)
async def clear_conversation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """手动清空当前对话"""
    # 删除该用户的所有对话（不论状态）
    conversations = db.query(Conversation).filter(
        Conversation.user_id == current_user.id
    ).all()
    
    for conv in conversations:
        # 删除所有消息（隐私保护）
        db.query(Message).filter(
            Message.conversation_id == conv.id
        ).delete()
        
        # 删除对话记录
        db.delete(conv)
    
    db.commit()
    
    # 返回温暖的结束语
    ending_messages = [
        "很高兴能陪你度过这段时光！每一天都是新的开始，加油！💪",
        "你已经迈出了重要的一步！相信自己，未来会更好！🌟",
        "记住，你并不孤单。随时回来找我聊天，我一直在这里！🤗",
        "你做得很好！继续保持这份勇气和力量！✨",
        "为你的成长感到骄傲！期待你的下一次进步！🌈"
    ]
    
    return Response(
        success=True, 
        message=random.choice(ending_messages)
    )
