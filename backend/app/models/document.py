import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, String, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from ..db.postgres import Base

class DocumentStatus(str, Enum):
    uploaded = "uploaded"
    processing = "processing"
    completed = "completed"
    error = "error"

class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)  # storage path on disk
    uploaded_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    status = Column(SAEnum(DocumentStatus), default=DocumentStatus.uploaded, nullable=False)
