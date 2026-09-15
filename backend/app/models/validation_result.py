import uuid
from datetime import datetime
from sqlalchemy import Column, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from ..db.postgres import Base

class ValidationResult(Base):
    __tablename__ = "validation_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    passed = Column(Boolean, default=True)
    messages = Column(JSON, nullable=True)  # list of dicts {severity, message}
    created_at = Column(DateTime, default=datetime.utcnow)
