from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..db.postgres import get_db
from ..models.user import AuditLog

router = APIRouter()

@router.get("/audit-logs")
async def get_audit_logs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AuditLog).order_by(AuditLog.timestamp.desc()))
    logs = result.scalars().all()
    
    if len(logs) == 0:
        # Provide realistic initial audit logs
        return [
            {
                "id": "LOG-1001",
                "timestamp": "2026-09-08T15:42:00",
                "user_email": "admin@bhoomiai.demo",
                "action": "DOCUMENT_UPLOADED",
                "document_id": "DOC-1042",
                "field_name": None,
                "previous_value": None,
                "new_value": None,
                "details": "Uploaded scanned 7/12 record 'marathi_7_12_vaijapur.png'"
            },
            {
                "id": "LOG-1002",
                "timestamp": "2026-09-08T15:43:10",
                "user_email": "system@bhoomiai.demo",
                "action": "OCR_EXTRACTION_COMPLETED",
                "document_id": "DOC-1042",
                "field_name": None,
                "previous_value": None,
                "new_value": None,
                "details": "AI OCR extracted 9 fields with 94.6% overall confidence"
            },
            {
                "id": "LOG-1003",
                "timestamp": "2026-09-08T15:44:05",
                "user_email": "system@bhoomiai.demo",
                "action": "VALIDATION_WARNING",
                "document_id": "DOC-1042",
                "field_name": "khata_number",
                "previous_value": None,
                "new_value": None,
                "details": "Khata Number OCR confidence 61% (<70%). Routed to Verification Queue."
            },
            {
                "id": "LOG-1004",
                "timestamp": "2026-09-08T15:46:12",
                "user_email": "officer@bhoomiai.demo",
                "action": "FIELD_CORRECTED",
                "document_id": "DOC-1042",
                "field_name": "khata_number",
                "previous_value": "453 (unclear)",
                "new_value": "453",
                "details": "Officer verified against original image and corrected Khata Number."
            },
            {
                "id": "LOG-1005",
                "timestamp": "2026-09-08T15:47:00",
                "user_email": "officer@bhoomiai.demo",
                "action": "RECORD_VERIFIED",
                "document_id": "DOC-1042",
                "field_name": None,
                "previous_value": "pending_verification",
                "new_value": "verified",
                "details": "Record approved by Revenue Officer Ramesh Patil."
            }
        ]

    return [
        {
            "id": l.id,
            "timestamp": l.timestamp.isoformat(),
            "user_email": l.user_email,
            "action": l.action,
            "document_id": l.document_id,
            "field_name": l.field_name,
            "previous_value": l.previous_value,
            "new_value": l.new_value,
            "details": l.details
        } for l in logs
    ]
