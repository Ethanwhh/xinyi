"""会话阶段管理器"""
from typing import List, Dict

class PhaseManager:
    """会话阶段管理器"""
    
    def __init__(self):
        self.phases = ["emotional", "rational", "solution"]
    
    def get_current_phase(self, round_count: int, conversation_history: List[Dict]) -> str:
        """
        根据对话轮次和历史判断当前阶段
        :param round_count: 对话轮次
        :param conversation_history: 对话历史
        :return: 当前阶段
        """
        # 基于轮次的基本判断
        if round_count <= 5:
            return "emotional"  # 前5轮：感性安慰
        elif round_count <= 10:
            return "rational"  # 6-10轮：理性引导
        else:
            return "solution"  # 10轮以上：问题解决
    
    def should_transition(
        self, 
        current_phase: str, 
        round_count: int,
        user_input: str
    ) -> tuple[bool, str]:
        """
        判断是否应该转换阶段
        :return: (是否转换, 新阶段)
        """
        user_input_lower = user_input.lower()
        
        # 如果用户主动询问解决方案，直接进入solution阶段
        solution_triggers = ["怎么办", "怎么做", "如何", "方法", "建议"]
        if any(trigger in user_input_lower for trigger in solution_triggers):
            if current_phase != "solution":
                return True, "solution"
        
        # 正常阶段转换
        if current_phase == "emotional" and round_count > 5:
            return True, "rational"
        elif current_phase == "rational" and round_count > 10:
            return True, "solution"
        
        return False, current_phase
