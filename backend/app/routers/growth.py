"""个人成长（心翼之墙）路由"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from datetime import datetime, timedelta
from ..database import get_db
from ..models import GrowthRecord, Achievement, Diary, User
from ..auth import get_current_user

router = APIRouter(prefix="/api/growth", tags=["growth"])


# 成就类型映射
ACHIEVEMENT_TYPES = {
    "starter": {"name": "起航者", "icon": "🚀", "condition": "写下第一篇日记"},
    "consistent_7": {"name": "坚持者", "icon": "🔥", "condition": "连续写日记 7 天"},
    "habit_30": {"name": "习惯养成", "icon": "⭐", "condition": "连续写日记 30 天"},
    "hundred_days": {"name": "百日勇士", "icon": "🏅", "condition": "连续写日记 100 天"},
    "yearly": {"name": "全年守护", "icon": "👑", "condition": "连续写日记 365 天"},
    "sunshine_30": {"name": "阳光使者", "icon": "☀️", "condition": "翅膀爱心达到 30 个"},
    "happy_100": {"name": "快乐达人", "icon": "🌈", "condition": "翅膀爱心达到 100 个"},
    "emotion_master": {"name": "情绪大师", "icon": "🎯", "condition": "积极情绪占比 >= 60%"},
    "resilience": {"name": "心理韧性", "icon": "💪", "condition": "从连续 3 天消极转为 7 天积极"},
}


@router.get("/heart-wall")
async def get_heart_wall(
    year: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取爱心墙数据（365 天）"""
    # 默认当前年份
    if year is None:
        year = datetime.now().year
    
    # 计算日期范围（指定年份的 1 月 1 日到 12 月 31 日，但不超过今天）
    start_date = datetime(year, 1, 1)
    end_date = min(datetime(year, 12, 31), datetime.now())
    
    # 查询该用户指定年份的成长记录
    records = db.query(GrowthRecord).filter(
        GrowthRecord.user_id == current_user.id,
        GrowthRecord.record_date >= start_date.strftime("%Y-%m-%d"),
        GrowthRecord.record_date <= end_date.strftime("%Y-%m-%d")
    ).all()
    
    # 转换为字典（日期 -> 记录）
    records_dict = {r.record_date: r for r in records}
    
    # 生成所有日期的数据
    result = []
    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")
        record = records_dict.get(date_str)
        
        if record and record.has_diary:
            # 有日记记录
            status = "winged" if record.emotion_valence == "positive" else "normal"
            result.append({
                "date": date_str,
                "status": status,
                "emotion": record.main_emotion,
                "intensity": record.emotion_intensity
            })
        else:
            # 无日记记录
            result.append({
                "date": date_str,
                "status": "empty",
                "emotion": None,
                "intensity": None
            })
        
        current_date += timedelta(days=1)
    
    return result


@router.get("/stats")
async def get_stats(
    year: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取统计数据"""
    # 默认当前年份
    if year is None:
        year = datetime.now().year
    
    # 计算日期范围
    start_date = datetime(year, 1, 1).strftime("%Y-%m-%d")
    end_date = min(datetime(year, 12, 31), datetime.now()).strftime("%Y-%m-%d")
    
    # 查询该用户指定年份的成长记录
    records = db.query(GrowthRecord).filter(
        GrowthRecord.user_id == current_user.id,
        GrowthRecord.record_date >= start_date,
        GrowthRecord.record_date <= end_date,
        GrowthRecord.has_diary == True
    ).order_by(GrowthRecord.record_date).all()
    
    # 计算统计指标
    total_days = len(records)  # 写日记总天数
    total_winged = sum(1 for r in records if r.emotion_valence == "positive")  # 翅膀爱心总数
    positive_ratio = round(total_winged / total_days * 100) if total_days > 0 else 0  # 积极占比
    
    # 计算当前连胜（从最后一天往前数）
    current_streak = 0
    today_str = datetime.now().strftime("%Y-%m-%d")
    check_date = datetime.now()
    
    while True:
        date_str = check_date.strftime("%Y-%m-%d")
        record = next((r for r in records if r.record_date == date_str), None)
        if record and record.has_diary:
            current_streak += 1
            check_date -= timedelta(days=1)
        else:
            break
    
    # 计算最长连续积极天数
    longest_positive_streak = 0
    current_positive_streak = 0
    
    for record in records:
        if record.emotion_valence == "positive":
            current_positive_streak += 1
            longest_positive_streak = max(longest_positive_streak, current_positive_streak)
        else:
            current_positive_streak = 0
    
    return {
        "current_streak": current_streak,
        "total_winged": total_winged,
        "total_days": total_days,
        "positive_ratio": positive_ratio,
        "longest_positive_streak": longest_positive_streak
    }


@router.get("/achievements")
async def get_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取成就列表"""
    # 查询用户已获得的成就
    user_achievements = db.query(Achievement).filter(
        Achievement.user_id == current_user.id
    ).all()
    
    # 构建返回数据
    result = []
    achieved_types = {a.achievement_type for a in user_achievements}
    
    for achievement_type, info in ACHIEVEMENT_TYPES.items():
        achieved = achievement_type in achieved_types
        achievement_data = {
            "type": achievement_type,
            "name": info["name"],
            "icon": info["icon"],
            "condition": info["condition"],
            "achieved": achieved,
            "achieved_at": None,
            "is_new": False
        }
        
        if achieved:
            user_achievement = next(a for a in user_achievements if a.achievement_type == achievement_type)
            achievement_data["achieved_at"] = user_achievement.achieved_at.isoformat()
            achievement_data["is_new"] = not user_achievement.is_displayed
        
        result.append(achievement_data)
    
    return result


@router.post("/check-achievements")
async def check_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """检查并触发新成就"""
    # 查询当前年份的统计数据
    year = datetime.now().year
    start_date = datetime(year, 1, 1).strftime("%Y-%m-%d")
    end_date = datetime.now().strftime("%Y-%m-%d")
    
    records = db.query(GrowthRecord).filter(
        GrowthRecord.user_id == current_user.id,
        GrowthRecord.record_date >= start_date,
        GrowthRecord.record_date <= end_date,
        GrowthRecord.has_diary == True
    ).order_by(GrowthRecord.record_date).all()
    
    total_days = len(records)
    total_winged = sum(1 for r in records if r.emotion_valence == "positive")
    positive_ratio = total_winged / total_days * 100 if total_days > 0 else 0
    
    # 计算当前连胜
    current_streak = 0
    check_date = datetime.now()
    
    while True:
        date_str = check_date.strftime("%Y-%m-%d")
        record = next((r for r in records if r.record_date == date_str), None)
        if record and record.has_diary:
            current_streak += 1
            check_date -= timedelta(days=1)
        else:
            break
    
    # 查询已获得的成就
    existing_achievements = db.query(Achievement).filter(
        Achievement.user_id == current_user.id
    ).all()
    existing_types = {a.achievement_type for a in existing_achievements}
    
    # 检查成就条件
    new_achievements = []
    
    # 起航者：写下第一篇日记
    if total_days >= 1 and "starter" not in existing_types:
        new_achievements.append(Achievement(
            user_id=current_user.id,
            achievement_type="starter",
            achieved_at=datetime.now()
        ))
    
    # 坚持者：连续写日记 7 天
    if current_streak >= 7 and "consistent_7" not in existing_types:
        new_achievements.append(Achievement(
            user_id=current_user.id,
            achievement_type="consistent_7",
            achieved_at=datetime.now()
        ))
    
    # 习惯养成：连续写日记 30 天
    if current_streak >= 30 and "habit_30" not in existing_types:
        new_achievements.append(Achievement(
            user_id=current_user.id,
            achievement_type="habit_30",
            achieved_at=datetime.now()
        ))
    
    # 百日勇士：连续写日记 100 天
    if current_streak >= 100 and "hundred_days" not in existing_types:
        new_achievements.append(Achievement(
            user_id=current_user.id,
            achievement_type="hundred_days",
            achieved_at=datetime.now()
        ))
    
    # 全年守护：连续写日记 365 天
    if current_streak >= 365 and "yearly" not in existing_types:
        new_achievements.append(Achievement(
            user_id=current_user.id,
            achievement_type="yearly",
            achieved_at=datetime.now()
        ))
    
    # 阳光使者：翅膀爱心达到 30 个
    if total_winged >= 30 and "sunshine_30" not in existing_types:
        new_achievements.append(Achievement(
            user_id=current_user.id,
            achievement_type="sunshine_30",
            achieved_at=datetime.now()
        ))
    
    # 快乐达人：翅膀爱心达到 100 个
    if total_winged >= 100 and "happy_100" not in existing_types:
        new_achievements.append(Achievement(
            user_id=current_user.id,
            achievement_type="happy_100",
            achieved_at=datetime.now()
        ))
    
    # 情绪大师：积极情绪占比 >= 60%
    if positive_ratio >= 60 and "emotion_master" not in existing_types:
        new_achievements.append(Achievement(
            user_id=current_user.id,
            achievement_type="emotion_master",
            achieved_at=datetime.now()
        ))
    
    # 保存新成就
    if new_achievements:
        db.add_all(new_achievements)
        db.commit()
    
    return {
        "new_achievements": [
            {
                "type": a.achievement_type,
                "name": ACHIEVEMENT_TYPES[a.achievement_type]["name"],
                "icon": ACHIEVEMENT_TYPES[a.achievement_type]["icon"]
            }
            for a in new_achievements
        ]
    }


@router.post("/sync-from-diary")
async def sync_from_diary(
    diary_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """从日记同步数据到成长记录"""
    # 查询日记
    diary = db.query(Diary).filter(
        Diary.id == diary_id,
        Diary.user_id == current_user.id
    ).first()
    
    if not diary:
        raise HTTPException(status_code=404, detail="日记不存在")
    
    # 检查是否已有成长记录
    existing_record = db.query(GrowthRecord).filter(
        GrowthRecord.user_id == current_user.id,
        GrowthRecord.record_date == diary.diary_date
    ).first()
    
    # 判断情绪效价
    emotion_valence = "neutral"
    if diary.ai_feedback:
        emotion_valence = diary.ai_feedback.get("emotion_valence", "neutral")
    
    if existing_record:
        # 更新现有记录
        existing_record.has_diary = True
        existing_record.emotion_valence = emotion_valence
        existing_record.main_emotion = diary.main_emotion
        existing_record.emotion_intensity = diary.ai_feedback.get("emotion_analysis", {}).get("emotion_intensity") if diary.ai_feedback else None
        existing_record.diary_id = diary.id
    else:
        # 创建新记录
        new_record = GrowthRecord(
            user_id=current_user.id,
            record_date=diary.diary_date,
            has_diary=True,
            emotion_valence=emotion_valence,
            main_emotion=diary.main_emotion,
            emotion_intensity=diary.ai_feedback.get("emotion_analysis", {}).get("emotion_intensity") if diary.ai_feedback else None,
            diary_id=diary.id
        )
        db.add(new_record)
    
    db.commit()
    
    return {"success": True}
