import os
import uuid
import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from ..db.postgres import get_db
from ..models.user import Document, LandRecord, ExtractedField, ValidationResult, VerificationTask, AuditLog
from ..services.document_processor import preprocess_image, run_validation_checks, DEMO_PARCELS_DATA
from ..services.government_data import validate_against_government_sources
from ..services.ml_engine import process_document_with_ocr

router = APIRouter()

class ProcessRequest(BaseModel):
    document_id: str

class FieldUpdate(BaseModel):
    field_value: str
    user_email: Optional[str] = "officer@bhoomiai.demo"

class VerifyRequest(BaseModel):
    action: str  # approve, reject
    comment: Optional[str] = None
    user_email: Optional[str] = "officer@bhoomiai.demo"

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    language: str = Form("mr"),
    uploaded_by: str = Form("admin@bhoomiai.demo"),
    db: AsyncSession = Depends(get_db)
):
    doc_id = str(uuid.uuid4())
    filename = file.filename or "uploaded_document.png"
    file_path = f"uploads/{doc_id}_{filename}"
    
    # Save file on disk or byte buffer simulation
    os.makedirs("uploads", exist_ok=True)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
        
    doc = Document(
        id=doc_id,
        filename=filename,
        file_path=file_path,
        file_type=file.content_type or "image/png",
        file_size=len(content),
        uploaded_by=uploaded_by,
        language=language,
        status="uploaded",
        processing_stage="Uploaded"
    )
    db.add(doc)
    
    # Add audit log
    audit = AuditLog(
        user_email=uploaded_by,
        action="DOCUMENT_UPLOADED",
        document_id=doc_id,
        details=f"Uploaded file '{filename}' ({len(content)} bytes)"
    )
    db.add(audit)
    
    await db.commit()
    await db.refresh(doc)
    
    return {
        "id": doc.id,
        "filename": doc.filename,
        "status": doc.status,
        "uploaded_at": doc.uploaded_at.isoformat()
    }

@router.post("/process")
async def process_document(req: ProcessRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == req.document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Match against demo dataset, otherwise run the real OCR/extraction pipeline.
    matched_demo = None
    for item in DEMO_PARCELS_DATA:
        if item["filename"].lower() in doc.filename.lower():
            matched_demo = item
            break

    if not matched_demo:
        ocr_result = process_document_with_ocr(doc.file_path)
        if ocr_result.success:
            matched_demo = {
                "filename": doc.filename,
                "language": ocr_result.language,
                "ocr_confidence": ocr_result.ocr_confidence,
                "fields": [
                    {
                        "field_name": field.field_name,
                        "en": field.label_en,
                        "mr": field.label_mr,
                        "hi": field.label_hi,
                        "value": field.value,
                        "confidence": field.confidence,
                        "box": field.bounding_box,
                    }
                    for field in ocr_result.fields
                ],
            }
        else:
            matched_demo = DEMO_PARCELS_DATA[0]

    ocr_conf = matched_demo["ocr_confidence"]
    raw_fields = matched_demo["fields"]
    
    # Run validation engine checks
    validations = run_validation_checks(raw_fields, doc.filename)
    
    # Save extracted fields
    has_low_confidence = False
    saved_fields = []
    
    # Clear previous generated results before retrying the extraction.
    await db.execute(delete(ExtractedField).where(ExtractedField.document_id == doc.id))
    await db.execute(delete(ValidationResult).where(ValidationResult.document_id == doc.id))
    
    field_dict = {}
    for f in raw_fields:
        conf = f["confidence"]
        tier = "high" if conf >= 90 else ("medium" if conf >= 70 else "low")
        if tier == "low":
            has_low_confidence = True
            
        ef = ExtractedField(
            document_id=doc.id,
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

    government_validations = await validate_against_government_sources(field_dict)
    validations.extend(government_validations)

    # Save validation results
    for val in validations:
        vr = ValidationResult(
            document_id=doc.id,
            check_name=val["check_name"],
            severity=val["severity"],
            message=val["message"],
            field_name=val.get("field_name"),
            similarity_score=val.get("similarity_score")
        )
        db.add(vr)

    # Determine status & create human verification task if low confidence or critical validation errors
    has_critical = any(v["severity"] == "critical" for v in validations)
    
    if has_low_confidence or has_critical:
        doc.status = "pending_verification"
        doc.processing_stage = "Human Verification Required"
        
        # Create verification task
        issue_desc = "Low OCR Confidence detected" if has_low_confidence else "Validation Issue / Duplicate Alert"
        vtask = VerificationTask(
            document_id=doc.id,
            village=field_dict.get("village", "वैजापूर"),
            survey_number=field_dict.get("survey_number", "125/2"),
            issue_summary=issue_desc,
            confidence=ocr_conf,
            status="Pending"
        )
        db.add(vtask)
    else:
        doc.status = "completed"
        doc.processing_stage = "Auto Approved"
        
    doc.ocr_confidence = ocr_conf

    # Save or update LandRecord
    lr = LandRecord(
        document_id=doc.id,
        survey_number=field_dict.get("survey_number"),
        khata_number=field_dict.get("khata_number"),
        owner_name=field_dict.get("owner_name"),
        village=field_dict.get("village"),
        taluka=field_dict.get("taluka"),
        district=field_dict.get("district"),
        area=float(field_dict["area"]) if field_dict.get("area") and field_dict["area"].replace('.','',1).isdigit() else 2.45,
        land_type=field_dict.get("land_type"),
        verification_status="Verified" if doc.status == "completed" else "Pending",
        overall_confidence=ocr_conf
    )
    db.add(lr)

    # Add audit log
    audit = AuditLog(
        user_email=doc.uploaded_by,
        action="OCR_EXTRACTION_COMPLETED",
        document_id=doc.id,
        details=f"Extracted {len(raw_fields)} fields with {ocr_conf}% OCR accuracy. Status: {doc.status}"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(doc)

    return {
        "status": "success",
        "document_id": doc.id,
        "ocr_confidence": ocr_conf,
        "processing_stage": doc.processing_stage,
        "has_low_confidence": has_low_confidence,
        "has_critical_validation": has_critical,
        "fields_count": len(raw_fields)
    }

@router.get("")
async def get_all_documents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).order_by(Document.uploaded_at.desc()))
    docs = result.scalars().all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "file_type": d.file_type,
            "file_size": d.file_size,
            "uploaded_by": d.uploaded_by,
            "uploaded_at": d.uploaded_at.isoformat(),
            "status": d.status,
            "processing_stage": d.processing_stage,
            "ocr_confidence": d.ocr_confidence,
            "language": d.language
        } for d in docs
    ]

@router.get("/{doc_id}")
async def get_document_by_id(doc_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Get fields
    f_res = await db.execute(select(ExtractedField).where(ExtractedField.document_id == doc_id))
    fields = f_res.scalars().all()
    
    # Get validations
    v_res = await db.execute(select(ValidationResult).where(ValidationResult.document_id == doc_id))
    validations = v_res.scalars().all()

    return {
        "id": doc.id,
        "filename": doc.filename,
        "file_path": doc.file_path,
        "status": doc.status,
        "processing_stage": doc.processing_stage,
        "ocr_confidence": doc.ocr_confidence,
        "uploaded_at": doc.uploaded_at.isoformat(),
        "uploaded_by": doc.uploaded_by,
        "fields": [
            {
                "id": f.id,
                "field_name": f.field_name,
                "label_en": f.field_label_en,
                "label_mr": f.field_label_mr,
                "label_hi": f.field_label_hi,
                "value": f.field_value,
                "confidence": f.confidence,
                "confidence_tier": f.confidence_tier,
                "is_missing": f.is_missing,
                "is_edited": f.is_edited,
                "original_value": f.original_value,
                "bounding_box": f.bounding_box
            } for f in fields
        ],
        "validations": [
            {
                "id": v.id,
                "check_name": v.check_name,
                "severity": v.severity,
                "message": v.message,
                "field_name": v.field_name,
                "similarity_score": v.similarity_score
            } for v in validations
        ]
    }

@router.put("/{doc_id}/fields/{field_id}")
async def update_extracted_field(doc_id: str, field_id: str, payload: FieldUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ExtractedField).where(ExtractedField.id == field_id))
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
        
    old_val = field.field_value
    field.original_value = old_val if not field.is_edited else field.original_value
    field.field_value = payload.field_value
    field.is_edited = True
    field.confidence = 100.0
    field.confidence_tier = "high"
    
    audit = AuditLog(
        user_email=payload.user_email or "officer@bhoomiai.demo",
        action="FIELD_CORRECTED",
        document_id=doc_id,
        field_name=field.field_name,
        previous_value=old_val,
        new_value=payload.field_value,
        details=f"Officer manual edit for '{field.field_label_en}'"
    )
    db.add(audit)
    
    await db.commit()
    return {"status": "success", "field_name": field.field_name, "new_value": field.field_value}

@router.post("/{doc_id}/verify")
async def verify_document(doc_id: str, payload: VerifyRequest, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Document).where(Document.id == doc_id))
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if payload.action == "approve":
        doc.status = "verified"
        doc.processing_stage = "Verified & Approved"
        doc.ocr_confidence = 100.0

        await db.execute(
            update(ExtractedField)
            .where(ExtractedField.document_id == doc_id)
            .values(confidence=100.0, confidence_tier="high", is_missing=False)
        )
        await db.execute(
            update(LandRecord)
            .where(LandRecord.document_id == doc_id)
            .values(verification_status="Verified", overall_confidence=100.0)
        )
    else:
        doc.status = "rejected"
        doc.processing_stage = "Rejected by Officer"
        await db.execute(
            update(LandRecord)
            .where(LandRecord.document_id == doc_id)
            .values(verification_status="Rejected")
        )

    # Update verification task (use first() since multiple tasks may exist for re-processed docs)
    v_res = await db.execute(
        select(VerificationTask)
        .where(VerificationTask.document_id == doc_id)
        .order_by(VerificationTask.created_at.desc())
    )
    vtask = v_res.scalars().first()
    if vtask:
        vtask.status = "Approved" if payload.action == "approve" else "Rejected"
        vtask.reviewer_comment = payload.comment
        vtask.reviewed_by = payload.user_email

    audit = AuditLog(
        user_email=payload.user_email or "officer@bhoomiai.demo",
        action="RECORD_VERIFIED" if payload.action == "approve" else "RECORD_REJECTED",
        document_id=doc_id,
        details=f"Officer action: {payload.action.upper()}. Comment: '{payload.comment or 'None'}'"
    )
    db.add(audit)
    
    await db.commit()
    return {"status": "success", "doc_status": doc.status}
