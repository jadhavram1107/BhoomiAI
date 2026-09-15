from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..db.postgres import get_db
from ..models.user import Document, LandRecord, ValidationResult

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_summary(db: AsyncSession = Depends(get_db)):
    tot_docs = (await db.execute(select(func.count(Document.id)))).scalar() or 0
    proc_docs = (await db.execute(select(func.count(Document.id)).where(Document.status.in_(["completed", "verified"])))).scalar() or 0
    pending_verif = (await db.execute(select(func.count(Document.id)).where(Document.status == "pending_verification"))).scalar() or 0
    verified_cnt = (await db.execute(select(func.count(LandRecord.id)).where(LandRecord.verification_status == "Verified"))).scalar() or 0
    validation_errors = (
        await db.execute(
            select(func.count(ValidationResult.id)).where(ValidationResult.severity.in_(["warning", "critical"]))
        )
    ).scalar() or 0
    duplicate_records = (
        await db.execute(
            select(func.count(ValidationResult.id)).where(ValidationResult.check_name.ilike("%duplicate%"))
        )
    ).scalar() or 0
    avg_ocr_conf = (await db.execute(select(func.avg(Document.ocr_confidence)))).scalar()

    return {
        "total_documents": tot_docs,
        "processed_documents": proc_docs,
        "pending_verification": pending_verif,
        "verified_records": verified_cnt,
        "validation_errors": validation_errors,
        "duplicate_records": duplicate_records,
        "avg_ocr_confidence": round(float(avg_ocr_conf or 0), 1)
    }
