"""多智能体协调器 - 核心调度模块"""
from typing import AsyncGenerator, Dict, List
from sqlalchemy.orm import Session
from .models import Conversation, Message, User
from .perception_planning import PerceptionPlanningModule
from .conversation_agent import ConversationAgent
from .phase_manager import PhaseManager
from .model_router import ModelRouter

class MultiAgentCoordinator:
    """多智能体协调器"""
    
    def __init__(self):
        self.perception_module = PerceptionPlanningModule()
        self.agent = ConversationAgent()
        self.phase_manager = PhaseManager()
        self.model_router = ModelRouter()
        
        # 危机应对话术
        self.crisis_response = """我注意到你现在可能很痛苦，这让我很担心。请相信，这些感受是可以改变的。

🆘 紧急求助方式：
- 心理危机热线：400-161-9995（24小时）
- 全国心理援助热线：010-82951332
- 生命热线：400-821-1215

如果情况紧急，请立即拨打 110 或前往最近的医院急诊科。

你的生命很重要，很多人关心你。专业的帮助能让情况变得更好，请不要独自承受。"""
    
    async def process_message(
        self,
        user_input: str,
        user: User,
        db: Session,
        conversation_id: int = None
    ) -> AsyncGenerator[Dict, None]:
        """
        处理用户消息的核心流程
        :param user_input: 用户输入
        :param user: 当前用户
        :param db: 数据库会话
        :param conversation_id: 对话ID
        :yield: 流式响应数据
        """
        # 步骤1：获取或创建对话
        conversation = await self._get_or_create_conversation(
            user, db, conversation_id
        )
        
        # 步骤2：保存用户消息
        user_message = Message(
            conversation_id=conversation.id,
            role="user",
            content=user_input
        )
        db.add(user_message)
        db.commit()
        
        # 更新轮次
        conversation.round_count += 1
        db.commit()
        
        # 步骤3：获取对话历史
        conversation_history = self._get_conversation_history(conversation, db)
        
        # 步骤4：执行感知规划（双层判断 - 使用本地模型）
        perception_result = await self.perception_module.execute(
            user_input, conversation_history
        )
        
        # 步骤5：危机检测
        if perception_result["is_crisis"]:
            # 危机情况：返回紧急应对话术
            conversation.status = "crisis"
            db.commit()
            
            yield {
                "type": "crisis",
                "content": self.crisis_response,
                "conversation_id": conversation.id
            }
            
            # 保存危机响应
            crisis_message = Message(
                conversation_id=conversation.id,
                role="assistant",
                content=self.crisis_response,
                agent_type="SafetyAgent",
                model_used="local"
            )
            db.add(crisis_message)
            db.commit()
            return
        
        # 步骤6：阶段管理
        should_transition, new_phase = self.phase_manager.should_transition(
            conversation.phase,
            conversation.round_count,
            user_input
        )
        if should_transition:
            conversation.phase = new_phase
            db.commit()
        
        # 步骤7：选择模型服务并生成AI响应
        model_service = self.model_router.get_model_service(
            perception_result["is_privacy_issue"],
            perception_result["is_complex_issue"]
        )
        model_name = self.model_router.get_model_name(
            perception_result["is_privacy_issue"],
            perception_result["is_complex_issue"]
        )
        
        yield {
            "type": "metadata",
            "conversation_id": conversation.id,
            "phase": conversation.phase,
            "round_count": conversation.round_count,
            "is_privacy": perception_result["is_privacy_issue"],
            "is_complex": perception_result["is_complex_issue"],
            "model_used": model_name
        }
        
        # 根据阶段构造系统提示词
        phase_prompts = {
            "emotional": self.agent.phase_prompts["emotional"],
            "rational": self.agent.phase_prompts["rational"],
            "solution": self.agent.phase_prompts["solution"]
        }
        system_prompt = phase_prompts.get(conversation.phase, self.agent.phase_prompts["emotional"])
        
        full_response = ""
        async for chunk in model_service.generate_with_prompt(
            system_prompt,
            user_input,
            conversation_history,
            stream=True
        ):
            full_response += chunk
            yield {
                "type": "chunk",
                "content": chunk
            }
        
        # 步骤8：保存AI响应
        ai_message = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=full_response,
            agent_type="ConversationAgent",
            model_used=model_name,
            is_privacy_issue=perception_result["is_privacy_issue"],
            is_complex_issue=perception_result["is_complex_issue"]
        )
        db.add(ai_message)
        db.commit()
        
        yield {"type": "end"}
    
    async def _get_or_create_conversation(
        self, 
        user: User, 
        db: Session, 
        conversation_id: int = None
    ) -> Conversation:
        """获取或创建对话"""
        if conversation_id:
            conversation = db.query(Conversation).filter(
                Conversation.id == conversation_id,
                Conversation.user_id == user.id,
                Conversation.status == "ongoing"  # 只获取进行中的对话
            ).first()
            if conversation:
                return conversation
        
        # 创建新对话
        conversation = Conversation(
            user_id=user.id,
            phase="emotional",
            round_count=0,
            status="ongoing"
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return conversation
    
    def _get_conversation_history(
        self, 
        conversation: Conversation, 
        db: Session
    ) -> List[Dict]:
        """获取对话历史"""
        messages = db.query(Message).filter(
            Message.conversation_id == conversation.id
        ).order_by(Message.created_at.asc()).limit(20).all()
        
        return [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]


# 全局协调器实例
coordinator = MultiAgentCoordinator()
