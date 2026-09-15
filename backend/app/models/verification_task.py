import uuid
from enum import Enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from ..db.postgres import Base

class VerificationTaskStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class VerificationTask(Base):
    __tablename__ = "verification_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    field_name = Column(String, nullable=False)
    current_value = Column(String, nullable=True)
    proposed_value = Column(String, nullable=True)
    status = Column(SAEnum(VerificationTaskStatus), default=VerificationTaskStatus.pending, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
