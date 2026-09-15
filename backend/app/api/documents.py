from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
import os
import shutil
from uuid import uuid4

from ..db.postgres import get_db
from ..models import Document, DocumentStatus, User
from ..schemas.document import DocumentCreateResponse, DocumentDetailResponse
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

# Directory for storing uploaded files (local development)
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploaded_files")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/documents/upload", response_model=DocumentCreateResponse)
async def upload_document(file: UploadFile = File(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(...)):
    # Simple role check – only officers and admins can upload
    if current_user.role.value not in ("admin", "investigator", "supervisor"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    # Validate file type
    allowed_extensions = {"jpg", "jpeg", "png", "pdf"}
    filename = file.filename
    ext = filename.split('.')[-1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")

    # Store file on disk with a UUID filename to avoid collisions
    document_id = uuid4()
    stored_name = f"{document_id}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, stored_name)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Create DB record
    db_doc = Document(
        id=document_id,
        filename=filename,
        file_path=file_path,
        uploaded_by_id=current_user.id,
        status=DocumentStatus.uploaded,
    )
    db.add(db_doc)
    await db.commit()
    await db.refresh(db_doc)
    return DocumentCreateResponse(id=str(db_doc.id), filename=db_doc.filename, status=db_doc.status.value)

@router.get("/documents/{doc_id}", response_model=DocumentDetailResponse)
async def get_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        "SELECT * FROM documents WHERE id = :id",
        {"id": doc_id}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    doc = Document(**row._mapping)
    return DocumentDetailResponse(
        id=str(doc.id),
        filename=doc.filename,
        status=doc.status.value,
        uploaded_at=doc.uploaded_at,
        uploaded_by_id=str(doc.uploaded_by_id),
    )
