"""训练指导路由"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import TrainingTemplate, TrainingRecord, TrainingPlan, User
from ..schemas import (
    TrainingTemplateListItem, TrainingTemplateDetail,
    TrainingCompleteRequest, TrainingRecordResponse,
    TrainingPlanCreateRequest, TrainingPlanResponse, TrainingPlanUpdateRequest,
    Response
)
from ..auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/training", tags=["training"])


# 硬编码训练模板数据
TRAINING_TEMPLATES = [
    # 1. 呼吸训练
    {
        "training_type": "breathing",
        "training_name": "深呼吸放松法",
        "description": "通过有节奏的深呼吸缓解焦虑、紧张情绪,适合考试前、演讲前使用",
        "steps": [
            "找一个安静舒适的地方坐下或躺下",
            "闭上眼睛,放松全身肌肉",
            "通过鼻子慢慢吸气,数到4",
            "屏住呼吸,数到4",
            "通过嘴巴慢慢呼气,数到6",
            "重复以上步骤10次"
        ],
        "duration": 5,
        "frequency": "每日2-3次",
        "difficulty_level": "beginner",
        "suitable_scenarios": ["焦虑", "紧张", "考试前", "演讲前"],
        "icon": "🫁"
    },
    {
        "training_type": "breathing",
        "training_name": "4-7-8呼吸法(助眠版)",
        "description": "帮助快速入睡的呼吸技巧,适合失眠、入睡困难时使用",
        "steps": [
            "找一个舒适的躺姿",
            "舌尖顶住上颚",
            "完全呼出嘴里的气",
            "闭嘴,通过鼻子吸气,数到4",
            "屏住呼吸,数到7",
            "通过嘴巴呼气,数到8,发出呼呼声",
            "重复3-4次"
        ],
        "duration": 3,
        "frequency": "睡前使用",
        "difficulty_level": "beginner",
        "suitable_scenarios": ["失眠", "入睡困难", "睡眠质量差"],
        "icon": "😴"
    },
    {
        "training_type": "breathing",
        "training_name": "正念呼吸冥想",
        "description": "通过专注呼吸提升觉察力,缓解思绪混乱、注意力分散",
        "steps": [
            "以舒适的姿势坐下,背部挺直",
            "闭上眼睛或眼睛微闭",
            "将注意力集中在鼻尖的呼吸感觉",
            "感受每一次吸气和呼气",
            "当思绪漂移时,温和地将注意力拉回呼吸",
            "保持觉察5-10分钟"
        ],
        "duration": 10,
        "frequency": "每日1-2次",
        "difficulty_level": "intermediate",
        "suitable_scenarios": ["思绪混乱", "注意力分散", "情绪波动"],
        "icon": "🧘"
    },
    
    # 2. 肌肉放松训练
    {
        "training_type": "muscle_relaxation",
        "training_name": "渐进性肌肉放松(PMR)",
        "description": "通过依次紧绷和放松身体各部位肌肉,缓解全身紧张、焦虑",
        "steps": [
            "找一个安静舒适的地方躺下",
            "从脚趾开始,紧绷肌肉5秒,然后放松10秒",
            "逐步向上:脚掌→小腿→大腿→臀部",
            "继续向上:腹部→胸部→手掌→前臂→上臂",
            "最后:肩膀→颈部→面部",
            "全身放松,感受身体的轻松感"
        ],
        "duration": 15,
        "frequency": "每日1次",
        "difficulty_level": "intermediate",
        "suitable_scenarios": ["全身紧张", "焦虑", "躯体化症状"],
        "icon": "💪"
    },
    
    # 3. 正念冥想训练
    {
        "training_type": "mindfulness",
        "training_name": "身体扫描冥想",
        "description": "从头到脚逐一觉察身体感觉,提升身心连接",
        "steps": [
            "躺下或坐下,闭上眼睛",
            "从头顶开始,感受这个部位的感觉",
            "逐步向下扫描:额头→眼睛→鼻子→嘴巴→下巴",
            "继续:颈部→肩膀→手臂→胸部→腹部",
            "最后:臀部→大腿→小腿→脚掌→脚趾",
            "感受全身,保持觉察"
        ],
        "duration": 20,
        "frequency": "每日1次",
        "difficulty_level": "intermediate",
        "suitable_scenarios": ["情绪波动", "压力过大", "失眠"],
        "icon": "🌟"
    },
    {
        "training_type": "mindfulness",
        "training_name": "正念行走",
        "description": "专注行走的每一步,培养当下觉知",
        "steps": [
            "选择一个安静的地方,来回走动",
            "将注意力集中在双脚",
            "感受脚跟抬起、脚掌离地的感觉",
            "感受脚在空中移动的感觉",
            "感受脚落地、脚跟着地的感觉",
            "缓慢行走10-15分钟"
        ],
        "duration": 15,
        "frequency": "每日1-2次",
        "difficulty_level": "beginner",
        "suitable_scenarios": ["焦虑", "烦躁", "注意力不集中"],
        "icon": "🚶"
    },
    
    # 4. 认知重构训练
    {
        "training_type": "cognitive",
        "training_name": "三栏技术(认知重构)",
        "description": "识别并挑战非理性想法,形成理性替代想法",
        "steps": [
            "第一栏:写下引发负面情绪的事件",
            "第二栏:写下自动化思维(你的第一反应)",
            "第三栏:挑战这个想法,寻找证据",
            "思考:有哪些证据支持/反对这个想法?",
            "思考:最坏会怎样?最好会怎样?最可能怎样?",
            "写下更理性的替代想法"
        ],
        "duration": 10,
        "frequency": "每日记录1-2次",
        "difficulty_level": "intermediate",
        "suitable_scenarios": ["灾难化思维", "黑白思维", "过度概括"],
        "icon": "💭"
    },
    {
        "training_type": "cognitive",
        "training_name": "情绪ABC分析",
        "description": "理解情绪的来源:事件→信念→结果",
        "steps": [
            "A(事件):描述引发情绪的具体事件",
            "B(信念):你对这件事的看法和解释",
            "C(结果):你的情绪和行为反应",
            "识别B中的非理性信念",
            "用理性信念替代非理性信念",
            "想象用新信念会有什么不同的结果"
        ],
        "duration": 10,
        "frequency": "遇到情绪困扰时使用",
        "difficulty_level": "intermediate",
        "suitable_scenarios": ["情绪失控", "认知偏差", "自我责备"],
        "icon": "🔤"
    },
    
    # 5. 情绪调节训练
    {
        "training_type": "emotion",
        "training_name": "情绪命名练习",
        "description": "准确识别和命名情绪,提升情绪觉察能力",
        "steps": [
            "闭上眼睛,感受此刻的情绪",
            "问自己:我现在感觉如何?",
            "尝试用具体的词汇命名(不只是'不好')",
            "例如:失望、无助、愤怒、焦虑、孤独",
            "接纳这个情绪,告诉自己'我感到...,这很正常'",
            "观察情绪的变化"
        ],
        "duration": 5,
        "frequency": "情绪波动时使用",
        "difficulty_level": "beginner",
        "suitable_scenarios": ["情绪识别困难", "情绪压抑", "情绪失控"],
        "icon": "😊"
    },
    {
        "training_type": "emotion",
        "training_name": "情绪温度计",
        "description": "追踪情绪强度变化,培养情绪觉察",
        "steps": [
            "识别当前的主要情绪",
            "给这个情绪打分:0分(完全没有)到10分(极度强烈)",
            "记录此刻的分数和触发事件",
            "使用应对策略(深呼吸、散步等)",
            "10分钟后重新评分",
            "观察情绪强度的变化"
        ],
        "duration": 5,
        "frequency": "每日多次",
        "difficulty_level": "beginner",
        "suitable_scenarios": ["情绪波动", "情绪调节困难"],
        "icon": "🌡️"
    },
    
    # 6. 睡眠训练
    {
        "training_type": "sleep",
        "training_name": "睡前仪式建立",
        "description": "建立固定的睡前程序,改善睡眠质量",
        "steps": [
            "每天固定时间上床(如22:30)",
            "睡前1小时关闭电子设备",
            "洗个热水澡或泡脚",
            "阅读纸质书或听轻音乐15分钟",
            "练习4-7-8呼吸法",
            "关灯,保持卧室安静黑暗"
        ],
        "duration": 30,
        "frequency": "每晚睡前",
        "difficulty_level": "beginner",
        "suitable_scenarios": ["失眠", "睡眠质量差", "入睡困难"],
        "icon": "🌙"
    },
    {
        "training_type": "sleep",
        "training_name": "刺激控制疗法",
        "description": "建立床与睡眠的条件反射,提高睡眠效率",
        "steps": [
            "只有感到困倦时才上床",
            "床只用于睡眠(不工作、不玩手机)",
            "20分钟内未入睡,离开床",
            "去客厅做些放松的事(阅读、冥想)",
            "重新感到困倦时再回床上",
            "每天固定时间起床"
        ],
        "duration": 5,
        "frequency": "每晚使用",
        "difficulty_level": "intermediate",
        "suitable_scenarios": ["失眠", "睡眠效率低", "夜间醒来"],
        "icon": "⏰"
    }
]


def _ensure_templates_exist(db: Session):
    """确保训练模板存在（首次访问时自动初始化）"""
    existing = db.query(TrainingTemplate).first()
    if existing:
        return
    
    # 自动初始化
    try:
        for training_data in TRAINING_TEMPLATES:
            training = TrainingTemplate(**training_data)
            db.add(training)
        db.commit()
        logger.info(f"✅ 自动初始化 {len(TRAINING_TEMPLATES)} 个训练模板")
    except Exception as e:
        logger.error(f"❌ 自动初始化训练模板失败: {e}")
        db.rollback()


@router.get("/list", response_model=List[TrainingTemplateListItem])
def get_training_list(
    training_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取训练列表（支持按类型筛选）"""
    # 确保模板已初始化
    _ensure_templates_exist(db)
    
    query = db.query(TrainingTemplate).filter(TrainingTemplate.is_active == True)
    
    if training_type:
        query = query.filter(TrainingTemplate.training_type == training_type)
    
    templates = query.order_by(TrainingTemplate.training_type, TrainingTemplate.id).all()
    
    # 获取用户的完成次数
    result = []
    for template in templates:
        completed_count = db.query(func.count(TrainingRecord.id)).filter(
            and_(
                TrainingRecord.training_id == template.id,
                TrainingRecord.user_id == current_user.id
            )
        ).scalar()
        
        result.append({
            "id": template.id,
            "training_type": template.training_type,
            "training_name": template.training_name,
            "description": template.description,
            "duration": template.duration,
            "frequency": template.frequency,
            "difficulty_level": template.difficulty_level,
            "icon": template.icon,
            "completed_count": completed_count or 0
        })
    
    return result


@router.get("/records")
def get_training_records(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取用户训练历史"""
    records = db.query(TrainingRecord, TrainingTemplate).join(
        TrainingTemplate, TrainingRecord.training_id == TrainingTemplate.id
    ).filter(
        TrainingRecord.user_id == current_user.id
    ).order_by(
        TrainingRecord.completed_at.desc()
    ).all()
    
    return [{
        "id": record.id,
        "training_id": template.id,
        "training_name": template.training_name,
        "training_type": template.training_type,
        "duration": record.duration,
        "feedback": record.feedback or {},
        "completed_at": record.completed_at.isoformat()
    } for record, template in records]


@router.get("/statistics")
def get_training_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取训练统计数据"""
    total_count = db.query(func.count(TrainingRecord.id)).filter(
        TrainingRecord.user_id == current_user.id
    ).scalar() or 0
    
    total_duration = db.query(func.sum(TrainingRecord.duration)).filter(
        TrainingRecord.user_id == current_user.id
    ).scalar() or 0
    
    type_stats = db.query(
        TrainingTemplate.training_type,
        func.count(TrainingRecord.id)
    ).join(
        TrainingRecord, TrainingTemplate.id == TrainingRecord.training_id
    ).filter(
        TrainingRecord.user_id == current_user.id
    ).group_by(
        TrainingTemplate.training_type
    ).all()
    
    return {
        "total_count": int(total_count),
        "total_duration": int(total_duration),
        "type_distribution": {row[0]: row[1] for row in type_stats}
    }


@router.get("/{training_id}", response_model=TrainingTemplateDetail)
def get_training_detail(
    training_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取训练详情"""
    template = db.query(TrainingTemplate).filter(TrainingTemplate.id == training_id).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="训练模板不存在"
        )
    
    return template


@router.post("/complete", response_model=TrainingRecordResponse)
def complete_training(
    request: TrainingCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """完成训练（记录完成时间和反馈）"""
    template = db.query(TrainingTemplate).filter(TrainingTemplate.id == request.training_id).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="训练模板不存在"
        )
    
    # 创建训练记录
    record = TrainingRecord(
        user_id=current_user.id,
        training_id=request.training_id,
        duration=request.duration,
        feedback=request.feedback or {},
        completed_at=datetime.now()
    )
    
    db.add(record)
    db.commit()
    db.refresh(record)
    
    # 返回记录详情
    return {
        "id": record.id,
        "training_id": template.id,
        "training_name": template.training_name,
        "training_type": template.training_type,
        "duration": record.duration,
        "feedback": record.feedback,
        "completed_at": record.completed_at
    }


@router.post("/plan/create", response_model=TrainingPlanResponse)
def create_training_plan(
    request: TrainingPlanCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建训练计划"""
    template = db.query(TrainingTemplate).filter(TrainingTemplate.id == request.training_id).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="训练模板不存在"
        )
    
    # 创建训练计划
    plan = TrainingPlan(
        user_id=current_user.id,
        training_id=request.training_id,
        plan_name=request.plan_name,
        start_date=request.start_date,
        end_date=request.end_date,
        frequency=request.frequency,
        reminder_time=request.reminder_time,
        status="active"
    )
    
    db.add(plan)
    db.commit()
    db.refresh(plan)
    
    return {
        "id": plan.id,
        "training_id": template.id,
        "training_name": template.training_name,
        "plan_name": plan.plan_name,
        "start_date": plan.start_date,
        "end_date": plan.end_date,
        "frequency": plan.frequency,
        "reminder_time": plan.reminder_time,
        "status": plan.status,
        "created_at": plan.created_at
    }


@router.get("/plan/list", response_model=List[TrainingPlanResponse])
def get_training_plans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取用户训练计划列表"""
    plans = db.query(TrainingPlan, TrainingTemplate).join(
        TrainingTemplate, TrainingPlan.training_id == TrainingTemplate.id
    ).filter(
        TrainingPlan.user_id == current_user.id
    ).order_by(
        TrainingPlan.created_at.desc()
    ).all()
    
    result = []
    for plan, template in plans:
        result.append({
            "id": plan.id,
            "training_id": template.id,
            "training_name": template.training_name,
            "plan_name": plan.plan_name,
            "start_date": plan.start_date,
            "end_date": plan.end_date,
            "frequency": plan.frequency,
            "reminder_time": plan.reminder_time,
            "status": plan.status,
            "created_at": plan.created_at
        })
    
    return result


@router.put("/plan/{plan_id}/status")
def update_training_plan_status(
    plan_id: int,
    request: TrainingPlanUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新训练计划状态"""
    plan = db.query(TrainingPlan).filter(
        and_(
            TrainingPlan.id == plan_id,
            TrainingPlan.user_id == current_user.id
        )
    ).first()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="训练计划不存在"
        )
    
    # 更新状态
    plan.status = request.status
    plan.updated_at = datetime.now()
    
    db.commit()
    
    return Response(
        success=True,
        message="训练计划状态已更新",
        data={"plan_id": plan.id, "status": plan.status}
    )
