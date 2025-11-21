"""Pydantic 数据验证模型"""
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List

# ========== 用户相关 ==========
# 用户注册请求
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    password: str = Field(..., min_length=6, max_length=100, description="密码")

    @field_validator('username')
    @classmethod
    def username_alphanumeric(cls, v):
        """验证用户名只包含字母、数字和下划线"""
        if not v.replace('_', '').isalnum():
            raise ValueError('用户名只能包含字母、数字和下划线')
        return v

# 用户登录请求
class UserLogin(BaseModel):
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")

# Token 响应
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# 用户信息响应
class UserResponse(BaseModel):
    id: int
    username: str
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

# 通用响应
class Response(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


# ========== 对话相关 ==========
# 发送消息请求
class ChatSendRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="用户消息")
    conversation_id: Optional[int] = Field(None, description="对话ID，不传则创建新对话")

# 消息响应
class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

# 对话响应
class ConversationResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True

# 对话历史列表响应
class ConversationListResponse(BaseModel):
    conversations: List[ConversationResponse]


# ========== 评估相关 ==========
# 评估量表列表项
class AssessmentTemplateListItem(BaseModel):
    id: int
    scale_name: str
    display_name: str
    category: str
    description: str
    question_count: int
    estimated_time: int
    icon: str
    last_completed: Optional[datetime] = None  # 用户最后完成时间

    class Config:
        from_attributes = True

# 评估量表详情
class AssessmentTemplateDetail(BaseModel):
    id: int
    scale_name: str
    display_name: str
    category: str
    description: str
    question_count: int
    estimated_time: int
    questions: list  # JSON格式的题目列表
    icon: str

    class Config:
        from_attributes = True

# 提交评估请求
class AssessmentSubmitRequest(BaseModel):
    template_id: int = Field(..., description="量表模板ID")
    answers: List[int] = Field(..., description="答案数组")

# 评估结果响应
class AssessmentResultResponse(BaseModel):
    id: int
    template_id: int
    scale_name: str
    display_name: str
    total_score: int
    risk_level: str
    interpretation: str
    suggestions: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

# 评估历史记录
class AssessmentHistoryItem(BaseModel):
    id: int
    scale_name: str
    display_name: str
    total_score: int
    risk_level: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ========== 训练相关 ==========
# 训练模板列表项
class TrainingTemplateListItem(BaseModel):
    id: int
    training_type: str
    training_name: str
    description: str
    duration: int
    frequency: str
    difficulty_level: str
    icon: str
    completed_count: Optional[int] = 0  # 用户完成次数
    
    class Config:
        from_attributes = True

# 训练模板详情
class TrainingTemplateDetail(BaseModel):
    id: int
    training_type: str
    training_name: str
    description: str
    steps: list  # JSON格式的训练步骤
    duration: int
    frequency: str
    difficulty_level: str
    suitable_scenarios: list
    media_url: Optional[str]
    icon: str
    
    class Config:
        from_attributes = True

# 完成训练请求
class TrainingCompleteRequest(BaseModel):
    training_id: int = Field(..., description="训练模板ID")
    duration: int = Field(..., description="实际训练时长（分钟）")
    feedback: Optional[dict] = Field(None, description="训练反馈（评分、感受等）")

# 训练记录响应
class TrainingRecordResponse(BaseModel):
    id: int
    training_id: int
    training_name: str
    training_type: str
    duration: int
    feedback: Optional[dict]
    completed_at: datetime
    
    class Config:
        from_attributes = True

# 创建训练计划请求
class TrainingPlanCreateRequest(BaseModel):
    training_id: int = Field(..., description="训练模板ID")
    plan_name: str = Field(..., min_length=1, max_length=200, description="计划名称")
    start_date: datetime = Field(..., description="开始日期")
    end_date: datetime = Field(..., description="结束日期")
    frequency: str = Field(..., description="频率（daily/weekly）")
    reminder_time: Optional[str] = Field(None, description="提醒时间（如 20:00）")

# 训练计划响应
class TrainingPlanResponse(BaseModel):
    id: int
    training_id: int
    training_name: str
    plan_name: str
    start_date: datetime
    end_date: datetime
    frequency: str
    reminder_time: Optional[str]
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# 更新训练计划状态请求
class TrainingPlanUpdateRequest(BaseModel):
    status: str = Field(..., description="状态（active/completed/paused）")


# ========== 情绪日记相关 ==========
# 创建日记请求
class DiaryCreateRequest(BaseModel):
    diary_date: str = Field(..., description="日记日期 YYYY-MM-DD")
    content: str = Field(..., min_length=1, description="日记内容")
    emotions: Optional[List[dict]] = Field(None, description="情绪列表")
    emotion_trigger: Optional[str] = Field(None, description="情绪触发事件")
    life_dimensions: Optional[dict] = Field(None, description="生活维度记录")
    guided_responses: Optional[dict] = Field(None, description="引导式问题回答")
    template_used: Optional[str] = Field(None, description="使用的模板")
    writing_duration: Optional[int] = Field(0, description="写作时长（分钟）")

# 日记响应
class DiaryResponse(BaseModel):
    id: int
    user_id: int
    diary_date: str
    content: str
    emotions: Optional[List[dict]]
    emotion_trigger: Optional[str]
    life_dimensions: Optional[dict]
    guided_responses: Optional[dict]
    template_used: Optional[str]
    word_count: int
    writing_duration: int
    ai_feedback: Optional[dict]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# 日记列表项
class DiaryListItem(BaseModel):
    id: int
    diary_date: str
    emotions: Optional[List[dict]]
    word_count: int
    ai_score: Optional[int] = None  # AI 评分 1-5 星
    main_emotion: Optional[str] = None  # 主要情绪
    created_at: datetime
    
    class Config:
        from_attributes = True

# 更新日记请求
class DiaryUpdateRequest(BaseModel):
    content: Optional[str] = Field(None, description="日记内容")
    emotions: Optional[List[dict]] = Field(None, description="情绪列表")
    emotion_trigger: Optional[str] = Field(None, description="情绪触发事件")
    life_dimensions: Optional[dict] = Field(None, description="生活维度记录")
    guided_responses: Optional[dict] = Field(None, description="引导式问题回答")
