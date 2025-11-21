"""感知规划模块 - 基于本地模型的智能判断"""
import re
import logging
import ollama
from typing import Dict, List

logger = logging.getLogger(__name__)

class PerceptionPlanningModule:
    """感知规划模块：使用本地 Ollama 模型执行双层判断（隐私检测 + 复杂度分析）"""
    
    def __init__(self):
        self.ollama_client = ollama.AsyncClient()
        self.model_name = "ethanwhh/qwen3-4b-xinyi"
        
        # 危机关键词（保留关键词检测，因为危机情况需要快速响应）
        self.crisis_keywords = [
            "自杀", "想死", "活不下去", "结束生命", "不想活了",
            "自残", "割腕", "跳楼", "吃药", "了结",
            "暴力", "伤害", "报复", "杀", "打死"
        ]
    
    async def detect_privacy(self, user_input: str) -> tuple[bool, str]:
        """
        第一层判断：使用本地模型判断是否为隐私问题
        :return: (是否隐私问题, 判断理由)
        """
        prompt = f"""你是一个隐私检测专家。请判断用户的输入是否涉及隐私信息。

隐私信息包括但不限于：
1. 个人身份信息：身份证号、手机号、家庭住址、真实姓名、学号等
2. 情感隐私：恋爱关系、分手、出轨、性相关话题等
3. 家庭隐私：家暴、家庭矛盾、父母离婚等
4. 创伤事件：性侵、欺凌、霸凌、自残等
5. 明确的隐私表达：用户明确说"保密"、"不要记录"、"别告诉别人"等

用户输入：{user_input}

请只回答"是"或"否"，然后简短说明理由（不超过20字）。
格式：是/否|理由

例如：
- 是|涉及恋爱关系隐私
- 否|普通情绪表达"""

        try:
            response = await self.ollama_client.chat(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                options={"temperature": 0.1}  # 低温度保证判断稳定
            )
            
            result = response['message']['content'].strip()
            
            # 解析模型输出
            if '|' in result:
                decision, reason = result.split('|', 1)
                is_privacy = decision.strip() == "是"
                return is_privacy, reason.strip()
            else:
                # 如果格式不对，判断是否包含"是"
                is_privacy = "是" in result[:5]
                return is_privacy, result[:20]
                
        except Exception as e:
            logger.warning(f"隐私检测模型调用失败，降级到关键词检测: {e}")
            return self._fallback_privacy_detection(user_input)
    
    def _fallback_privacy_detection(self, user_input: str) -> tuple[bool, str]:
        """降级方案：基于关键词的隐私检测"""
        privacy_keywords = [
            "身份证", "家庭住址", "电话号码", "学号", "真名",
            "恋爱", "分手", "出轨", "暗恋", "前任", "男朋友", "女朋友",
            "父母离婚", "家暴", "家庭矛盾",
            "性侵", "欺凌", "霸凌", "保密", "隐私"
        ]
        
        user_input_lower = user_input.lower()
        for keyword in privacy_keywords:
            if keyword in user_input_lower:
                return True, f"包含隐私关键词: {keyword}"
        
        # 检查手机号和身份证号
        if re.search(r'\d{11}', user_input):
            return True, "包含疑似手机号"
        if re.search(r'\d{17}[\dxX]', user_input):
            return True, "包含疑似身份证号"
        
        return False, "未检测到隐私信息"
    
    async def analyze_complexity(self, user_input: str, conversation_history: list) -> tuple[bool, str]:
        """
        第二层判断：使用本地模型判断是否为复杂问题
        :param user_input: 用户输入
        :param conversation_history: 对话历史
        :return: (是否复杂问题, 判断理由)
        """
        # 获取最近3轮对话作为上下文
        recent_history = conversation_history[-6:] if len(conversation_history) > 6 else conversation_history
        history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in recent_history])
        
        prompt = f"""你是一个问题复杂度分析专家。请判断用户的问题是否复杂，需要调用更强大的云端模型来回答。

复杂问题的特征：
1. 需要详细的计划、步骤、方案
2. 询问"怎么办"、"如何做"、"具体方法"等需要系统性建议的问题
3. 涉及长期规划、目标制定、策略分析
4. 问题描述很长（超过100字）且信息量大
5. 对话已经持续多轮但问题还未收敛

对话历史：
{history_text}

当前用户输入：{user_input}

请只回答"是"或"否"，然后简短说明理由（不超过20字）。
格式：是/否|理由

例如：
- 是|需要详细的行动方案
- 否|简单的情绪倾诉"""

        try:
            response = await self.ollama_client.chat(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                options={"temperature": 0.1}
            )
            
            result = response['message']['content'].strip()
            
            # 解析模型输出
            if '|' in result:
                decision, reason = result.split('|', 1)
                is_complex = decision.strip() == "是"
                return is_complex, reason.strip()
            else:
                is_complex = "是" in result[:5]
                return is_complex, result[:20]
                
        except Exception as e:
            logger.warning(f"复杂度分析模型调用失败，降级到规则检测: {e}")
            return self._fallback_complexity_detection(user_input, conversation_history)
    
    def _fallback_complexity_detection(self, user_input: str, conversation_history: list) -> tuple[bool, str]:
        """降级方案：基于规则的复杂度检测"""
        complexity_keywords = [
            "计划", "步骤", "方案", "分析", "建议", "对策",
            "怎么办", "如何", "怎样", "怎么做", "具体", "详细"
        ]
        
        user_input_lower = user_input.lower()
        for keyword in complexity_keywords:
            if keyword in user_input_lower:
                return True, f"包含复杂度关键词: {keyword}"
        
        if len(user_input) > 100:
            return True, "问题描述较长"
        
        if len(conversation_history) > 16:
            return True, "对话轮次较多"
        
        return False, "问题相对简单"
    
    def detect_crisis(self, user_input: str) -> bool:
        """
        检测危机信号（保持关键词检测以确保快速响应）
        :return: True 表示检测到危机关键词
        """
        user_input_lower = user_input.lower()
        for keyword in self.crisis_keywords:
            if keyword in user_input_lower:
                return True
        return False
    
    async def execute(self, user_input: str, conversation_history: list) -> Dict[str, any]:
        """
        执行双层判断
        :return: 判断结果字典
        """
        # 危机检测（同步，快速响应）
        is_crisis = self.detect_crisis(user_input)
        if is_crisis:
            return {
                "is_privacy_issue": True,  # 危机情况强制本地
                "is_complex_issue": False,
                "is_crisis": True,
                "privacy_reason": "危机情况",
                "complexity_reason": "",
                "recommended_model": "local"
            }
        
        # 隐私检测（使用模型）
        is_privacy, privacy_reason = await self.detect_privacy(user_input)
        
        # 复杂度分析（如果不是隐私问题才分析）
        if is_privacy:
            is_complex = False
            complexity_reason = "隐私问题无需复杂度分析"
        else:
            is_complex, complexity_reason = await self.analyze_complexity(user_input, conversation_history)
        
        return {
            "is_privacy_issue": is_privacy,
            "is_complex_issue": is_complex,
            "is_crisis": is_crisis,
            "privacy_reason": privacy_reason,
            "complexity_reason": complexity_reason,
            "recommended_model": self._recommend_model(is_privacy, is_complex, is_crisis)
        }
    
    def _recommend_model(self, is_privacy: bool, is_complex: bool, is_crisis: bool) -> str:
        """推荐模型"""
        if is_crisis:
            return "local"
        if is_privacy:
            return "local"
        if is_complex:
            return "remote"
        return "local"
