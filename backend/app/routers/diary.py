"""情绪日记路由"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from typing import List, Optional
from datetime import datetime, date
import json
import ollama

from ..database import get_db
from ..models import Diary, User, GrowthRecord
from ..schemas import (
    DiaryCreateRequest, DiaryResponse, DiaryListItem,
    DiaryUpdateRequest, Response
)
from ..auth import get_current_user

router = APIRouter(prefix="/api/diary", tags=["diary"])


@router.post("/create", response_model=DiaryResponse)
async def create_diary(
    request: DiaryCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建日记并生成 AI 反馈"""
    # 检查当天是否已有日记
    existing = db.query(Diary).filter(
        and_(
            Diary.user_id == current_user.id,
            Diary.diary_date == request.diary_date
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当天已有日记，请使用更新接口"
        )
    
    # 计算字数
    word_count = len(request.content)
    
    # 生成 AI 反馈（使用 Ollama）
    ai_feedback = await generate_ai_feedback_with_ollama(
        content=request.content,
        emotions=request.emotions,
        life_dimensions=request.life_dimensions,
        emotion_trigger=request.emotion_trigger
    )
    
    # 创建日记
    diary = Diary(
        user_id=current_user.id,
        diary_date=request.diary_date,
        content=request.content,
        emotions=request.emotions,
        emotion_trigger=request.emotion_trigger,
        life_dimensions=request.life_dimensions,
        guided_responses=request.guided_responses,
        template_used=request.template_used,
        word_count=word_count,
        writing_duration=request.writing_duration,
        ai_feedback=ai_feedback
    )
    
    db.add(diary)
    db.commit()
    db.refresh(diary)
    
    # 同步到成长记录
    await sync_diary_to_growth(diary, db)
    
    # 检查并触发新成就
    from app.routers.growth import check_achievements as check_achievements_func
    await check_achievements_func(current_user, db)
    
    return diary


@router.get("/list", response_model=List[DiaryListItem])
def get_diary_list(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取日记列表"""
    query = db.query(Diary).filter(Diary.user_id == current_user.id)
    
    if start_date:
        query = query.filter(Diary.diary_date >= start_date)
    if end_date:
        query = query.filter(Diary.diary_date <= end_date)
    
    diaries = query.order_by(desc(Diary.diary_date)).all()
    
    # 转换为列表项格式
    result = []
    for diary in diaries:
        main_emotion = None
        if diary.emotions and len(diary.emotions) > 0:
            main_emotion = diary.emotions[0].get("emotion")
        
        ai_score = None
        if diary.ai_feedback and "overall_score" in diary.ai_feedback:
            ai_score = diary.ai_feedback["overall_score"]
        
        result.append({
            "id": diary.id,
            "diary_date": diary.diary_date,
            "emotions": diary.emotions,
            "word_count": diary.word_count,
            "ai_score": ai_score,
            "main_emotion": main_emotion,
            "created_at": diary.created_at
        })
    
    return result


@router.get("/{diary_id}", response_model=DiaryResponse)
def get_diary_detail(
    diary_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取日记详情"""
    diary = db.query(Diary).filter(
        and_(
            Diary.id == diary_id,
            Diary.user_id == current_user.id
        )
    ).first()
    
    if not diary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="日记不存在"
        )
    
    return diary


@router.put("/{diary_id}", response_model=DiaryResponse)
async def update_diary(
    diary_id: int,
    request: DiaryUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新日记"""
    diary = db.query(Diary).filter(
        and_(
            Diary.id == diary_id,
            Diary.user_id == current_user.id
        )
    ).first()
    
    if not diary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="日记不存在"
        )
    
    # 更新字段
    if request.content is not None:
        diary.content = request.content
        diary.word_count = len(request.content)
    if request.emotions is not None:
        diary.emotions = request.emotions
    if request.emotion_trigger is not None:
        diary.emotion_trigger = request.emotion_trigger
    if request.life_dimensions is not None:
        diary.life_dimensions = request.life_dimensions
    if request.guided_responses is not None:
        diary.guided_responses = request.guided_responses
    
    diary.updated_at = datetime.now()
    
    # 重新生成 AI 反馈
    if request.content is not None:
        diary.ai_feedback = generate_simple_feedback(
            content=diary.content,
            emotions=diary.emotions,
            life_dimensions=diary.life_dimensions
        )
    
    db.commit()
    db.refresh(diary)
    
    # 同步到成长记录
    await sync_diary_to_growth(diary, db)
    
    # 检查并触发新成就
    from app.routers.growth import check_achievements as check_achievements_func
    await check_achievements_func(current_user, db)
    
    return diary


@router.delete("/{diary_id}")
def delete_diary(
    diary_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除日记"""
    diary = db.query(Diary).filter(
        and_(
            Diary.id == diary_id,
            Diary.user_id == current_user.id
        )
    ).first()
    
    if not diary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="日记不存在"
        )
    
    db.delete(diary)
    db.commit()
    
    return Response(success=True, message="日记已删除")


@router.get("/templates/list")
def get_diary_templates():
    """获取日记模板列表"""
    templates = [
        {
            "id": "gratitude",
            "name": "感恩日记",
            "description": "记录今天值得感恩的事情",
            "icon": "🙏",
            "questions": [
                "今天发生了哪些值得感恩的事情？",
                "谁给你带来了帮助或温暖？",
                "你为什么感到感恩？",
                "这些事情让你有什么感受？"
            ]
        },
        {
            "id": "stress_release",
            "name": "压力释放",
            "description": "释放内心的压力和焦虑",
            "icon": "😮‍💨",
            "questions": [
                "今天让你感到压力的事情是什么？",
                "这些压力从哪里来？",
                "你是如何应对的？",
                "有什么方法可以缓解这些压力？"
            ]
        },
        {
            "id": "conflict_resolution",
            "name": "人际冲突",
            "description": "梳理人际关系中的冲突",
            "icon": "🤝",
            "questions": [
                "发生了什么冲突？",
                "对方的立场和感受是什么？",
                "你的感受和需求是什么？",
                "如何改善这段关系？"
            ]
        },
        {
            "id": "goal_tracking",
            "name": "目标追踪",
            "description": "记录目标进展和反思",
            "icon": "🎯",
            "questions": [
                "今天在目标上取得了什么进展？",
                "遇到了哪些困难？",
                "有什么新的想法或计划？",
                "下一步要做什么？"
            ]
        },
        {
            "id": "emotion_exploration",
            "name": "情绪探索",
            "description": "深入探索内心的情绪",
            "icon": "🔍",
            "questions": [
                "今天最强烈的情绪是什么？",
                "这个情绪是如何产生的？",
                "你的身体有什么反应？",
                "这个情绪想告诉你什么？"
            ]
        }
    ]
    return templates


@router.get("/guided-questions/today")
def get_guided_questions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取今日引导式问题（随机返回一个）"""
    import random
    
    questions = [
        "今天有什么让你感到特别开心的瞬间吗？",
        "如果用一个词形容今天，会是什么？为什么？",
        "今天你对自己最满意的是什么？",
        "有什么事情是你今天想要改变的？",
        "今天你学到了什么新东西？",
        "谁是今天对你影响最大的人？",
        "如果重新过今天，你会做什么不同的选择？",
        "今天有什么让你感到意外的事情？",
        "你今天最需要的是什么？",
        "今天你给了自己多少分（1-10）？为什么？",
        "有什么话是你今天想对自己说的？",
        "今天的你和昨天的你有什么不同？",
        "今天有什么让你感到骄傲的事情？",
        "如果明天是全新的一天，你想怎么度过？",
        "今天你最想感谢的人是谁？"
    ]
    
    return {"question": random.choice(questions)}


async def generate_ai_feedback_with_ollama(content: str, emotions: Optional[List[dict]], life_dimensions: Optional[dict], emotion_trigger: Optional[str] = None) -> dict:
    """使用 Ollama 模型生成深度 AI 反馈"""
    try:
        # 构建分析提示词
        prompt = f"""你是一位专业的心理咨询师，请分析以下日记内容，并提供专业的反馈。

日记内容：
{content}

"""
        
        if emotions:
            emotion_list = ", ".join([f"{e['emotion']}（强度{e['intensity']}/10）" for e in emotions])
            prompt += f"记录的情绪：{emotion_list}\n\n"
        
        if emotion_trigger:
            prompt += f"情绪触发事件：{emotion_trigger}\n\n"
        
        if life_dimensions:
            prompt += f"""生活维度：
- 睡眠质量：{life_dimensions.get('sleep', 3)}/5
- 饮食规律：{life_dimensions.get('diet', 3)}/5
- 运动时长：{life_dimensions.get('exercise', 0)}分钟
- 社交互动：{life_dimensions.get('social', 0)}人
- 工作效率：{life_dimensions.get('productivity', 3)}/5

"""
        
        prompt += """请以 JSON 格式返回分析结果，包含以下字段：
{
  "emotion_analysis": {
    "primary_emotion": "主要情绪",
    "emotion_intensity": 情绪强度（1-10），
    "emotion_valence": "情绪效价（positive/negative/neutral）"
  },
  "cognitive_patterns": ["识别出的认知模式1", "认知模式2"],
  "life_quality": ["生活质量评价1", "评价2"],
  "positive_highlights": ["积极亮点1", "亮点2"],
  "recommendations": [
    {"type": "training", "title": "推荐训练", "reason": "原因"},
    {"type": "assessment", "title": "推荐评估", "reason": "原因"}
  ]
}

请确保返回有效的 JSON 格式。"""
        
        # 调用 Ollama 模型
        client = ollama.Client()
        response = client.chat(
            model="Ethanwhh/Qwen3-4B-xinyi",
            messages=[{"role": "user", "content": prompt}],
            format="json"
        )
        
        # 解析响应
        ai_response = response['message']['content']
        feedback = json.loads(ai_response)
        
        return feedback
        
    except Exception as e:
        # 如果 AI 分析失败，返回简单版反馈
        print(f"AI 分析失败: {str(e)}")
        return generate_simple_feedback(content, emotions, life_dimensions)


def generate_simple_feedback(content: str, emotions: Optional[List[dict]], life_dimensions: Optional[dict]) -> dict:
    """生成简单版 AI 反馈（备用方案）"""
    # 提取主要情绪
    main_emotion = "平静"
    emotion_intensity = 5
    if emotions and len(emotions) > 0:
        main_emotion = emotions[0].get("emotion", "平静")
        emotion_intensity = emotions[0].get("intensity", 5)
    
    # 判断情绪效价
    positive_emotions = ["快乐", "兴奋", "平静", "感恩", "满足", "自豪"]
    negative_emotions = ["悲伤", "焦虑", "愤怒", "失落", "孤独", "压力", "恐惧", "羞愧"]
    
    emotion_valence = "neutral"
    if main_emotion in positive_emotions:
        emotion_valence = "positive"
    elif main_emotion in negative_emotions:
        emotion_valence = "negative"
    
    # 生活质量评估
    life_quality_comment = []
    if life_dimensions:
        if life_dimensions.get("sleep", 0) < 3:
            life_quality_comment.append("睡眠质量较差，建议尝试睡前放松训练")
        if life_dimensions.get("exercise", 0) > 20:
            life_quality_comment.append("今天有运动，很棒！运动有助于缓解压力")
    
    # 积极亮点
    positive_highlights = []
    if len(content) > 100:
        positive_highlights.append("今天坚持写日记，这是很好的自我觉察习惯！")
    if emotion_valence == "positive":
        positive_highlights.append(f"今天的{main_emotion}情绪很棒，保持这种积极心态！")
    
    # 推荐内容
    recommendations = []
    if emotion_valence == "negative":
        if main_emotion == "焦虑":
            recommendations.append({
                "type": "training",
                "title": "深呼吸放松训练",
                "reason": "检测到焦虑情绪，建议尝试呼吸训练缓解"
            })
        elif main_emotion == "悲伤":
            recommendations.append({
                "type": "assessment",
                "title": "PHQ-9 抑郁量表",
                "reason": "建议进行抑郁评估，了解当前状态"
            })
    
    return {
        "emotion_analysis": {
            "primary_emotion": main_emotion,
            "emotion_intensity": emotion_intensity,
            "emotion_valence": emotion_valence
        },
        "life_quality": life_quality_comment,
        "positive_highlights": positive_highlights,
        "recommendations": recommendations,
        "overall_score": 4 if emotion_valence == "positive" else 3
    }


async def sync_diary_to_growth(diary: Diary, db: Session):
    """将日记同步到成长记录"""
    # 提取主要情绪和情绪效价
    main_emotion = None
    emotion_valence = "neutral"
    emotion_intensity = None
    
    if diary.emotions and len(diary.emotions) > 0:
        main_emotion = diary.emotions[0].get("emotion")
        emotion_intensity = diary.emotions[0].get("intensity")
    
    if diary.ai_feedback:
        emotion_analysis = diary.ai_feedback.get("emotion_analysis", {})
        if emotion_analysis:
            emotion_valence = emotion_analysis.get("emotion_valence", "neutral")
            if not main_emotion:
                main_emotion = emotion_analysis.get("primary_emotion")
            if not emotion_intensity:
                emotion_intensity = emotion_analysis.get("emotion_intensity")
    
    # 检查是否已有成长记录
    existing_record = db.query(GrowthRecord).filter(
        GrowthRecord.user_id == diary.user_id,
        GrowthRecord.record_date == diary.diary_date
    ).first()
    
    if existing_record:
        # 更新现有记录
        existing_record.has_diary = True
        existing_record.emotion_valence = emotion_valence
        existing_record.main_emotion = main_emotion
        existing_record.emotion_intensity = emotion_intensity
        existing_record.diary_id = diary.id
    else:
        # 创建新记录
        new_record = GrowthRecord(
            user_id=diary.user_id,
            record_date=diary.diary_date,
            has_diary=True,
            emotion_valence=emotion_valence,
            main_emotion=main_emotion,
            emotion_intensity=emotion_intensity,
            diary_id=diary.id
        )
        db.add(new_record)
    
    db.commit()
