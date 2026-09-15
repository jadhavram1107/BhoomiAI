import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..db.postgres import get_db
from ..models.user import VerificationTask, Document, AuditLog

router = APIRouter()

OFFICER_LEVELS = {
    "talathi": "Talathi",
    "tehsildar": "Tehsildar",
    "sub_divisional_officer": "Sub-Divisional Officer",
    "district_magistrate": "District Magistrate",
}

DEPARTMENTS = {
    "revenue": "Revenue Department",
    "land_records": "Land Records Department",
    "survey": "Survey Department",
    "registration": "Registration Department",
}

class AssignVerificationRequest(BaseModel):
    officer_level: str
    department: str
    assigned_by: Optional[str] = "officer@bhoomiai.demo"
    remarks: Optional[str] = None

def _parse_routing_comment(comment: str | None):
    if not comment:
        return None
    try:
        data = json.loads(comment)
    except (TypeError, ValueError):
        return None
    return data if isinstance(data, dict) and data.get("type") == "verification_route" else None

@router.get("/queue")
async def get_verification_queue(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(VerificationTask).order_by(VerificationTask.created_at.desc()))
    tasks = result.scalars().all()
    
    response = []
    for t in tasks:
        d_res = await db.execute(select(Document).where(Document.id == t.document_id))
        doc = d_res.scalar_one_or_none()
        routing = _parse_routing_comment(t.reviewer_comment)
        response.append({
            "id": t.id,
            "document_id": t.document_id,
            "filename": doc.filename if doc else "Document",
            "village": t.village,
            "survey_number": t.survey_number,
            "issue_summary": t.issue_summary,
            "confidence": t.confidence,
            "status": t.status,
            "created_at": t.created_at.isoformat(),
            "reviewed_by": t.reviewed_by,
            "reviewer_comment": t.reviewer_comment,
            "assigned_officer_level": routing.get("officer_level") if routing else None,
            "assigned_officer_label": routing.get("officer_label") if routing else None,
            "assigned_department": routing.get("department") if routing else None,
            "assigned_department_label": routing.get("department_label") if routing else None,
            "assigned_by": routing.get("assigned_by") if routing else None,
            "routing_remarks": routing.get("remarks") if routing else None,
            "verification_step": routing.get("step") if routing else None,
        })
        
    return response

@router.post("/queue/{task_id}/assign")
async def assign_verification_task(
    task_id: str,
    payload: AssignVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(VerificationTask).where(VerificationTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Verification task not found")

    officer_label = OFFICER_LEVELS.get(payload.officer_level)
    department_label = DEPARTMENTS.get(payload.department)
    if not officer_label:
        raise HTTPException(status_code=400, detail="Invalid officer level")
    if not department_label:
        raise HTTPException(status_code=400, detail="Invalid department")

    routing_payload = {
        "type": "verification_route",
        "step": f"{department_label} -> {officer_label}",
        "officer_level": payload.officer_level,
        "officer_label": officer_label,
        "department": payload.department,
        "department_label": department_label,
        "assigned_by": payload.assigned_by,
        "remarks": payload.remarks or "",
    }

    task.status = "Under Review"
    task.reviewed_by = officer_label
    task.reviewer_comment = json.dumps(routing_payload)

    db.add(AuditLog(
        user_email=payload.assigned_by or "officer@bhoomiai.demo",
        action="VERIFICATION_TASK_ROUTED",
        document_id=task.document_id,
        details=f"Task routed to {officer_label} in {department_label}. Remarks: {payload.remarks or 'None'}",
    ))

    await db.commit()

    return {
        "status": "success",
        "task_id": task.id,
        "task_status": task.status,
        **routing_payload,
    }
