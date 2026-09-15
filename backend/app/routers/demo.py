import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from ..db.postgres import get_db
from ..models.user import Document, ExtractedField, ValidationResult, VerificationTask, AuditLog, LandRecord
from ..services.document_processor import DEMO_PARCELS_DATA, run_validation_checks

router = APIRouter()

@router.post("/seed")
async def seed_demo_data(db: AsyncSession = Depends(get_db)):
    # Clear existing demo documents to avoid duplicates
    await db.execute(delete(VerificationTask))
    await db.execute(delete(ValidationResult))
    await db.execute(delete(ExtractedField))
    await db.execute(delete(LandRecord))
    await db.execute(delete(Document))
    
    seeded_docs = []
    
    for idx, item in enumerate(DEMO_PARCELS_DATA):
        doc_id = f"DOC-100{idx+1}"
        filename = item["filename"]
        ocr_conf = item["ocr_confidence"]
        raw_fields = item["fields"]
        
        validations = run_validation_checks(raw_fields, filename)
        has_low = any(f["confidence"] < 70 for f in raw_fields)
        has_critical = any(v["severity"] == "critical" for v in validations)
        
        status = "pending_verification" if (has_low or has_critical) else "verified"
        stage = "Human Verification Required" if (has_low or has_critical) else "Verified & Approved"
        
        doc = Document(
            id=doc_id,
            filename=filename,
            file_path=f"data/demo_documents/{filename}",
            file_type="image/png" if "png" in filename else ("application/pdf" if "pdf" in filename else "image/jpeg"),
            file_size=245800 + idx*50000,
            uploaded_by="admin@bhoomiai.demo",
            language=item["language"],
            status=status,
            processing_stage=stage,
            ocr_confidence=ocr_conf
        )
        db.add(doc)
        
        field_dict = {}
        for f in raw_fields:
            conf = f["confidence"]
            tier = "high" if conf >= 90 else ("medium" if conf >= 70 else "low")
            ef = ExtractedField(
                document_id=doc_id,
                field_name=f["field_name"],
                field_label_en=f["en"],
                field_label_mr=f["mr"],
                field_label_hi=f["hi"],
                field_value=f["value"],
                confidence=conf,
                confidence_tier=tier,
                bounding_box=f.get("box")
            )
            db.add(ef)
            field_dict[f["field_name"]] = f["value"]

        for v in validations:
            vr = ValidationResult(
                document_id=doc_id,
                check_name=v["check_name"],
                severity=v["severity"],
                message=v["message"],
                field_name=v.get("field_name"),
                similarity_score=v.get("similarity_score")
            )
            db.add(vr)

        if has_low or has_critical:
            vtask = VerificationTask(
                document_id=doc_id,
                village=field_dict.get("village", "वैजापूर"),
                survey_number=field_dict.get("survey_number", "125/2"),
                issue_summary="Low OCR Confidence for Khata Number" if has_low else "Possible Duplicate / Area Warning",
                confidence=ocr_conf,
                status="Pending"
            )
            db.add(vtask)

        lr = LandRecord(
            document_id=doc_id,
            survey_number=field_dict.get("survey_number"),
            khata_number=field_dict.get("khata_number"),
            owner_name=field_dict.get("owner_name"),
            village=field_dict.get("village"),
            taluka=field_dict.get("taluka"),
            district=field_dict.get("district"),
            area=2.45,
            land_type=field_dict.get("land_type"),
            verification_status="Verified" if status == "verified" else "Pending",
            overall_confidence=ocr_conf
        )
        db.add(lr)
        
        audit = AuditLog(
            user_email="admin@bhoomiai.demo",
            action="DEMO_RECORD_LOADED",
            document_id=doc_id,
            details=f"Loaded synthetic record '{filename}' with status '{status}'"
        )
        db.add(audit)
        
        seeded_docs.append({"id": doc_id, "filename": filename, "status": status})

    await db.commit()
    return {"status": "success", "seeded_count": len(seeded_docs), "documents": seeded_docs}
