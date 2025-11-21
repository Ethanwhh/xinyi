"""对话智能体 - 根据阶段生成回复"""
from typing import List, Dict
import ollama

class ConversationAgent:
    """对话代理：根据会话阶段调整回复风格"""
    
    def __init__(self, model: str = "Ethanwhh/Qwen3-4B-xinyi"):
        self.model = model
        self.client = ollama.AsyncClient()
        
        # 阶段提示词
        self.phase_prompts = {
            "emotional": """你是心翼，一个温暖、善解人意的心理陪伴助手。当前处于【感性安慰阶段】。

你的任务：
1. 首要目标是倾听和共情，让用户感受到被理解和接纳
2. 不要急于给建议，先充分表达对用户情绪的理解
3. 使用温暖、柔和的语言风格
4. 可以适当重复用户的感受来表达共情
5. 避免说教和批评

示例回复风格：
- "我能感受到你现在..."
- "这确实让人..."
- "你的感受是完全可以理解的..."
- "在这种情况下，任何人都会..."

请记住：此阶段的核心是情绪支持，而非问题解决。""",
            
            "rational": """你是心翼，一个专业、理性的心理陪伴助手。当前处于【理性引导阶段】。

你的任务：
1. 在保持温暖共情的基础上，开始轻度引导用户理性思考
2. 通过提问帮助用户梳理问题的核心
3. 引导用户识别问题的关键因素
4. 帮助用户看到不同的视角
5. 仍然避免直接给答案，而是引导用户自己思考

示例回复风格：
- "你觉得最困扰你的是什么？"
- "我们一起想想，这个问题的关键可能在哪里？"
- "如果从另一个角度看..."
- "你有想过为什么会这样吗？"

请记住：此阶段的核心是引导思考，而非提供方案。""",
            
            "solution": """你是心翼，一个专业、务实的心理陪伴助手。当前处于【问题解决阶段】。

你的任务：
1. 基于前期对话，提供具体、可执行的建议
2. 将大问题拆解为小步骤
3. 提供多个可选方案，让用户选择
4. 强调行动的可行性和渐进性
5. 给予鼓励和支持

示例回复风格：
- "我建议你可以尝试这样做..."
- "第一步，你可以..."
- "这里有几个方法供你参考..."
- "从小事开始，比如..."

请记住：此阶段的核心是提供实际帮助，给出清晰的行动指南。"""
        }
    
    async def generate_response(
        self, 
        user_input: str, 
        phase: str, 
        conversation_history: List[Dict],
        stream: bool = True
    ):
        """
        生成回复
        :param user_input: 用户输入
        :param phase: 当前阶段 (emotional/rational/solution)
        :param conversation_history: 对话历史
        :param stream: 是否流式返回
        :return: 生成的回复（流式 or 完整）
        """
        # 构建 system prompt
        system_prompt = self.phase_prompts.get(phase, self.phase_prompts["emotional"])
        
        # 构建消息列表
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(conversation_history)
        messages.append({"role": "user", "content": user_input})
        
        try:
            if stream:
                # 流式响应
                stream_response = await self.client.chat(
                    model=self.model,
                    messages=messages,
                    stream=True
                )
                async for chunk in stream_response:
                    if 'message' in chunk and 'content' in chunk['message']:
                        yield chunk['message']['content']
            else:
                # 非流式响应
                response = await self.client.chat(
                    model=self.model,
                    messages=messages,
                    stream=False
                )
                yield response['message']['content']
        
        except Exception as e:
            yield f"[错误] AI 模型调用失败: {str(e)}"
