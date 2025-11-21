"""数据分析路由"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from datetime import datetime, timedelta
from ..database import get_db
from ..models import User, Diary, AssessmentRecord, TrainingRecord, GrowthRecord
from ..auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/dashboard")
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取仪表盘概览数据"""
    # 计算近30天数据
    thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    
    # 日记统计
    diary_count = db.query(Diary).filter(
        Diary.user_id == current_user.id,
        Diary.diary_date >= thirty_days_ago
    ).count()
    
    # 评估统计
    assessment_count = db.query(AssessmentRecord).filter(
        AssessmentRecord.user_id == current_user.id,
        AssessmentRecord.created_at >= thirty_days_ago
    ).count()
    
    # 训练统计
    training_count = db.query(TrainingRecord).filter(
        TrainingRecord.user_id == current_user.id,
        TrainingRecord.completed_at >= thirty_days_ago
    ).count()
    
    training_duration = db.query(func.sum(TrainingRecord.duration)).filter(
        TrainingRecord.user_id == current_user.id,
        TrainingRecord.completed_at >= thirty_days_ago
    ).scalar() or 0
    
    # 成长记录统计（本年度）
    current_year = datetime.now().year
    start_of_year = f"{current_year}-01-01"
    
    growth_stats = db.query(GrowthRecord).filter(
        GrowthRecord.user_id == current_user.id,
        GrowthRecord.record_date >= start_of_year,
        GrowthRecord.has_diary == True
    ).all()
    
    total_diaries = len(growth_stats)
    winged_hearts = sum(1 for r in growth_stats if r.emotion_valence == "positive")
    
    # 计算连续天数
    current_streak = 0
    check_date = datetime.now()
    
    while True:
        date_str = check_date.strftime("%Y-%m-%d")
        record = next((r for r in growth_stats if r.record_date == date_str), None)
        if record and record.has_diary:
            current_streak += 1
            check_date -= timedelta(days=1)
        else:
            break
    
    return {
        "diary_count_30d": diary_count,
        "assessment_count_30d": assessment_count,
        "training_count_30d": training_count,
        "training_duration_30d": training_duration,
        "total_diaries_year": total_diaries,
        "winged_hearts_year": winged_hearts,
        "current_streak": current_streak,
        "positive_ratio": round(winged_hearts / total_diaries * 100) if total_diaries > 0 else 0
    }


@router.get("/emotion-trends")
async def get_emotion_trends(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取情绪趋势数据"""
    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    diaries = db.query(Diary).filter(
        Diary.user_id == current_user.id,
        Diary.diary_date >= start_date
    ).order_by(Diary.diary_date).all()
    
    # 构建趋势数据
    trends = []
    for diary in diaries:
        # 计算情绪得分（基于AI分析）
        emotion_score = 5  # 默认中性
        
        if diary.ai_feedback:
            emotion_analysis = diary.ai_feedback.get("emotion_analysis", {})
            valence = diary.ai_feedback.get("emotion_valence", "neutral")
            intensity = emotion_analysis.get("emotion_intensity", 5)
            
            # 根据效价和强度计算得分 (0-10)
            if valence == "positive":
                emotion_score = 5 + (intensity * 0.5)
            elif valence == "negative":
                emotion_score = 5 - (intensity * 0.5)
            else:
                emotion_score = 5
        
        trends.append({
            "date": diary.diary_date,
            "emotion": diary.main_emotion,
            "score": emotion_score,
            "word_count": diary.word_count
        })
    
    return trends


@router.get("/assessment-trends")
async def get_assessment_trends(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取评估趋势数据"""
    records = db.query(AssessmentRecord).filter(
        AssessmentRecord.user_id == current_user.id
    ).order_by(AssessmentRecord.created_at).all()
    
    # 按量表分组
    trends_by_scale = {}
    
    for record in records:
        scale_name = record.template.scale_name if record.template else "Unknown"
        
        if scale_name not in trends_by_scale:
            trends_by_scale[scale_name] = []
        
        trends_by_scale[scale_name].append({
            "date": record.created_at.strftime("%Y-%m-%d"),
            "score": record.total_score,
            "risk_level": record.risk_level
        })
    
    return trends_by_scale


@router.get("/training-stats")
async def get_training_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取训练统计数据"""
    records = db.query(TrainingRecord).filter(
        TrainingRecord.user_id == current_user.id
    ).all()
    
    # 按训练类型统计
    stats_by_type = {}
    
    for record in records:
        training_type = record.template.training_type if record.template else "Unknown"
        training_name = record.template.training_name if record.template else "Unknown"
        
        if training_type not in stats_by_type:
            stats_by_type[training_type] = {
                "name": training_name,
                "count": 0,
                "total_duration": 0
            }
        
        stats_by_type[training_type]["count"] += 1
        stats_by_type[training_type]["total_duration"] += record.duration
    
    return stats_by_type


@router.get("/emotion-distribution")
async def get_emotion_distribution(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取情绪分布数据"""
    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    diaries = db.query(Diary).filter(
        Diary.user_id == current_user.id,
        Diary.diary_date >= start_date,
        Diary.main_emotion.isnot(None)
    ).all()
    
    # 统计各情绪出现次数
    emotion_counts = {}
    
    for diary in diaries:
        emotion = diary.main_emotion
        if emotion:
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
    
    # 转换为列表格式
    distribution = [
        {"emotion": emotion, "count": count}
        for emotion, count in emotion_counts.items()
    ]
    
    # 按次数排序
    distribution.sort(key=lambda x: x["count"], reverse=True)
    
    return distribution
