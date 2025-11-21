"""数据库模型定义"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    """用户模型"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    is_active = Column(Boolean, default=True)

    # 关系
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    assessment_records = relationship("AssessmentRecord", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}')>"


class Conversation(Base):
    """对话会话模型"""
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.now)
    last_active = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 会话状态
    phase = Column(String(20), default="emotional")  # emotional/rational/solution
    round_count = Column(Integer, default=0)  # 对话轮次
    status = Column(String(20), default="ongoing")  # ongoing/resolved/crisis
    
    # 元信息
    meta_info = Column(JSON, default=dict)  # 存储额外信息（如情绪历史）

    # 关系
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Conversation(id={self.id}, phase='{self.phase}', status='{self.status}')>"


class Message(Base):
    """对话消息模型"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' 或 'assistant'
    content = Column(Text, nullable=False)  # 明文存储（根据设计文档可加密）
    created_at = Column(DateTime, default=datetime.now)
    
    # AI 响应元信息
    agent_type = Column(String(50), nullable=True)  # 使用的 Agent 类型
    model_used = Column(String(100), nullable=True)  # 使用的模型
    is_privacy_issue = Column(Boolean, default=False)  # 是否隐私问题
    is_complex_issue = Column(Boolean, default=False)  # 是否复杂问题

    # 关系
    conversation = relationship("Conversation", back_populates="messages")

    def __repr__(self):
        return f"<Message(id={self.id}, role='{self.role}')>"


class AssessmentTemplate(Base):
    """心理评估量表模板"""
    __tablename__ = "assessment_templates"

    id = Column(Integer, primary_key=True, index=True)
    scale_name = Column(String(100), unique=True, nullable=False, index=True)  # 量表名称（如 PHQ-9）
    display_name = Column(String(200), nullable=False)  # 显示名称（如"患者健康问卷-9"）
    category = Column(String(50), nullable=False)  # 分类：depression/anxiety/stress/sleep/personality
    description = Column(Text, nullable=False)  # 量表描述
    question_count = Column(Integer, nullable=False)  # 题目数量
    estimated_time = Column(Integer, nullable=False)  # 预计完成时间（分钟）
    version = Column(String(20), default="1.0")  # 量表版本
    
    # 量表内容（JSON格式存储）
    questions = Column(JSON, nullable=False)  # 题目列表
    scoring_rules = Column(JSON, nullable=False)  # 评分规则
    interpretation = Column(JSON, nullable=False)  # 结果解释
    
    # 元信息
    is_active = Column(Boolean, default=True)  # 是否启用
    icon = Column(String(50), default="📋")  # 图标
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # 关系
    records = relationship("AssessmentRecord", back_populates="template", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<AssessmentTemplate(scale_name='{self.scale_name}', category='{self.category}')>"


class AssessmentRecord(Base):
    """用户评估记录"""
    __tablename__ = "assessment_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("assessment_templates.id"), nullable=False)
    
    # 评估结果
    answers = Column(JSON, nullable=False)  # 用户答案数组
    total_score = Column(Integer, nullable=False)  # 总分
    risk_level = Column(String(20), nullable=False)  # 风险等级：normal/mild/moderate/severe
    interpretation = Column(Text, nullable=False)  # 结果解释
    suggestions = Column(Text, nullable=True)  # 个性化建议
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.now, index=True)
    completed_at = Column(DateTime, nullable=True)  # 完成时间

    # 关系
    user = relationship("User", back_populates="assessment_records")
    template = relationship("AssessmentTemplate", back_populates="records")

    def __repr__(self):
        return f"<AssessmentRecord(id={self.id}, user_id={self.user_id}, score={self.total_score}, level='{self.risk_level}')>"


class TrainingTemplate(Base):
    """训练模板"""
    __tablename__ = "training_templates"

    id = Column(Integer, primary_key=True, index=True)
    training_type = Column(String(50), nullable=False, index=True)  # breathing/muscle_relaxation/mindfulness/cognitive/emotion/sleep
    training_name = Column(String(200), nullable=False)  # 训练名称
    description = Column(Text, nullable=False)  # 训练描述
    steps = Column(JSON, nullable=False)  # 训练步骤（JSON数组）
    duration = Column(Integer, nullable=False)  # 建议时长（分钟）
    frequency = Column(String(100), nullable=False)  # 建议频率
    difficulty_level = Column(String(20), default="beginner")  # 难度
    suitable_scenarios = Column(JSON, default=list)  # 适用场景（JSON数组）
    
    # 媒体资源
    media_url = Column(String(500), nullable=True)  # 引导音频/视频链接
    icon = Column(String(50), default="💪")  # 图标
    
    # 元信息
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # 关系
    records = relationship("TrainingRecord", back_populates="template", cascade="all, delete-orphan")
    plans = relationship("TrainingPlan", back_populates="template", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<TrainingTemplate(id={self.id}, name='{self.training_name}', type='{self.training_type}')>"


class TrainingRecord(Base):
    """训练记录"""
    __tablename__ = "training_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    training_id = Column(Integer, ForeignKey("training_templates.id"), nullable=False)
    
    # 训练详情
    duration = Column(Integer, nullable=False)  # 实际训练时长（分钟）
    feedback = Column(JSON, nullable=True)  # 训练反馈（评分、感受等）
    
    # 时间戳
    completed_at = Column(DateTime, default=datetime.now, index=True)
    created_at = Column(DateTime, default=datetime.now)

    # 关系
    template = relationship("TrainingTemplate", back_populates="records")

    def __repr__(self):
        return f"<TrainingRecord(id={self.id}, training_id={self.training_id}, duration={self.duration})>"


class TrainingPlan(Base):
    """训练计划"""
    __tablename__ = "training_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    training_id = Column(Integer, ForeignKey("training_templates.id"), nullable=False)
    plan_name = Column(String(200), nullable=False)  # 计划名称
    
    # 计划详情
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    frequency = Column(String(50), nullable=False)  # daily/weekly
    reminder_time = Column(String(10), nullable=True)  # 提醒时间（如 "20:00"）
    status = Column(String(20), default="active")  # active/completed/paused
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # 关系
    template = relationship("TrainingTemplate", back_populates="plans")

    def __repr__(self):
        return f"<TrainingPlan(id={self.id}, name='{self.plan_name}', status='{self.status}')>"


class Diary(Base):
    """情绪日记"""
    __tablename__ = "diaries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    diary_date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    
    # 日记内容
    content = Column(Text, nullable=False)  # 自由文本内容
    emotions = Column(JSON, nullable=True)  # 情绪列表 [{"emotion": "焦虑", "intensity": 7}, ...]
    emotion_trigger = Column(Text, nullable=True)  # 情绪触发事件
    life_dimensions = Column(JSON, nullable=True)  # 生活维度 {"sleep": 3, "diet": 4, ...}
    guided_responses = Column(JSON, nullable=True)  # 引导式问题回答
    template_used = Column(String(50), nullable=True)  # 使用的模板名称
    
    # 统计数据
    word_count = Column(Integer, default=0)  # 字数
    writing_duration = Column(Integer, default=0)  # 写作时长（分钟）
    main_emotion = Column(String(20), nullable=True)  # 主要情绪（用于爱心墙显示）
    
    # AI 分析
    ai_feedback = Column(JSON, nullable=True)  # AI 反馈内容
    ai_score = Column(Integer, nullable=True)  # AI 评分（可选，用于趋势分析）
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.now, index=True)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    def __repr__(self):
        return f"<Diary(id={self.id}, user_id={self.user_id}, date='{self.diary_date}')>"


class GrowthRecord(Base):
    """个人成长记录（用于爱心墙）"""
    __tablename__ = "growth_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    record_date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    
    # 记录详情
    has_diary = Column(Boolean, default=False)  # 是否写日记
    emotion_valence = Column(String(10), nullable=True)  # 情绪效价：positive/negative/neutral
    main_emotion = Column(String(20), nullable=True)  # 主要情绪
    emotion_intensity = Column(Integer, nullable=True)  # 情绪强度（0-10）
    
    # 关联
    diary_id = Column(Integer, ForeignKey("diaries.id"), nullable=True)  # 关联的日记ID
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.now)

    def __repr__(self):
        return f"<GrowthRecord(id={self.id}, user_id={self.user_id}, date='{self.record_date}', valence='{self.emotion_valence}')>"


class Achievement(Base):
    """成就系统"""
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_type = Column(String(50), nullable=False)  # 成就类型：starter/consistent_7/habit_30/hundred_days/yearly/sunshine_30等
    achieved_at = Column(DateTime, default=datetime.now)  # 达成时间
    is_displayed = Column(Boolean, default=False)  # 是否已展示（避免重复弹窗）
    
    # 元信息
    meta_info = Column(JSON, nullable=True)  # 额外信息（如达成时的统计数据）
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.now)

    def __repr__(self):
        return f"<Achievement(id={self.id}, user_id={self.user_id}, type='{self.achievement_type}')>"
