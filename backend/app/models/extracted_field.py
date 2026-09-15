import uuid
from enum import Enum
from sqlalchemy import Column, String, Float, Enum as SAEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from ..db.postgres import Base

class ExtractedFieldStatus(str, Enum):
    extracted = "extracted"
    missing = "missing"
    low_confidence = "low_confidence"
    verified = "verified"

class ExtractedField(Base):
    __tablename__ = "extracted_fields"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    field_name = Column(String, nullable=False)
    value = Column(String, nullable=True)
    confidence = Column(Float, nullable=False, default=0.0)
    status = Column(SAEnum(ExtractedFieldStatus), nullable=False, default=ExtractedFieldStatus.extracted)
