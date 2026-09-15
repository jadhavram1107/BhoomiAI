from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..db.postgres import get_db
from ..models.user import VerificationTask, Document

router = APIRouter()

@router.get("/queue")
async def get_verification_queue(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(VerificationTask).order_by(VerificationTask.created_at.desc()))
    tasks = result.scalars().all()
    
    response = []
    for t in tasks:
        d_res = await db.execute(select(Document).where(Document.id == t.document_id))
        doc = d_res.scalar_one_or_none()
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
            "reviewer_comment": t.reviewer_comment
        })
        
    return response
