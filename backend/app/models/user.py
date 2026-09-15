import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text, JSON, ForeignKey
from ..db.postgres import Base

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    OFFICER = "OFFICER"
    REVIEWER = "REVIEWER"
    USER = "USER"
    TAHSILDAR = "TAHSILDAR"
    DISTRICT_MAGISTRATE = "DISTRICT_MAGISTRATE"

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    bhoomi_id = Column(String(50), unique=True, index=True, nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    username = Column(String(100), unique=True, index=True, nullable=True)
    name = Column(String(255), nullable=False)
    middle_name = Column(String(255), nullable=True)
    surname = Column(String(255), nullable=True)
    designation = Column(String(100), nullable=True)
    department = Column(String(100), nullable=True)
    employee_id = Column(String(50), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default=UserRole.USER.value, nullable=False)
    requested_role = Column(String(100), nullable=True)
    account_status = Column(String(50), default="ACTIVE", nullable=False) # ACTIVE, PENDING_APPROVAL, REJECTED
    village = Column(String(100), nullable=True)
    taluka = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    jurisdiction = Column(String(255), nullable=True)
    state = Column(String(100), default="Maharashtra", nullable=True)
    mobile_no = Column(String(20), nullable=True)
    mobile_verified = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    approved_by = Column(String(255), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AccountOtp(Base):
    __tablename__ = "account_otps"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), index=True, nullable=False)
    mobile_no = Column(String(20), index=True, nullable=False)
    otp_code = Column(String(6), nullable=False)
    purpose = Column(String(50), default="official_account_creation", nullable=False)
    verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_type = Column(String(50), default="image/png")
    file_size = Column(Integer, default=0)
    uploaded_by = Column(String(255), default="admin@bhoomiai.demo")
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="uploaded")  # uploaded, processing, completed, pending_verification, verified, rejected
    language = Column(String(50), default="mr")  # mr, hi, en
    ocr_confidence = Column(Float, default=0.0)
    processing_stage = Column(String(100), default="Uploaded")

class LandRecord(Base):
    __tablename__ = "land_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    survey_number = Column(String(100), nullable=True)
    gat_number = Column(String(100), nullable=True)
    khata_number = Column(String(100), nullable=True)
    owner_name = Column(String(255), nullable=True)
    co_owner_name = Column(String(255), nullable=True)
    village = Column(String(100), nullable=True)
    taluka = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    state = Column(String(100), default="Maharashtra")
    area = Column(Float, nullable=True)
    area_unit = Column(String(50), default="hectare")
    land_type = Column(String(100), nullable=True)
    land_use = Column(String(100), nullable=True)
    mutation_number = Column(String(100), nullable=True)
    record_date = Column(String(50), nullable=True)
    document_number = Column(String(100), nullable=True)
    verification_status = Column(String(50), default="Pending") # Pending, Verified, Rejected
    overall_confidence = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class ExtractedField(Base):
    __tablename__ = "extracted_fields"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    field_name = Column(String(100), nullable=False)
    field_label_en = Column(String(100), nullable=False)
    field_label_mr = Column(String(100), nullable=False)
    field_label_hi = Column(String(100), nullable=False)
    field_value = Column(Text, nullable=True)
    confidence = Column(Float, default=0.0)  # 0 to 100
    confidence_tier = Column(String(50), default="low") # high, medium, low
    is_missing = Column(Boolean, default=False)
    is_edited = Column(Boolean, default=False)
    original_value = Column(Text, nullable=True)
    bounding_box = Column(JSON, nullable=True)

class ValidationResult(Base):
    __tablename__ = "validation_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    check_name = Column(String(100), nullable=False)
    severity = Column(String(50), default="passed") # passed (green), warning (yellow), critical (red)
    message = Column(Text, nullable=False)
    field_name = Column(String(100), nullable=True)
    similarity_score = Column(Float, nullable=True)

class VerificationTask(Base):
    __tablename__ = "verification_tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    village = Column(String(100), nullable=True)
    survey_number = Column(String(100), nullable=True)
    issue_summary = Column(Text, nullable=False)
    confidence = Column(Float, default=0.0)
    status = Column(String(50), default="Pending") # Pending, Under Review, Approved, Rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewer_comment = Column(Text, nullable=True)
    reviewed_by = Column(String(255), nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=datetime.utcnow)
    user_email = Column(String(255), nullable=False)
    action = Column(String(100), nullable=False)
    document_id = Column(String(36), nullable=True)
    field_name = Column(String(100), nullable=True)
    previous_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    details = Column(Text, nullable=True)

class GISParcel(Base):
    __tablename__ = "gis_parcels"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    survey_number = Column(String(100), nullable=False)
    village = Column(String(100), nullable=False)
    taluka = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    owner_name = Column(String(255), nullable=False)
    area = Column(Float, nullable=False)
    area_unit = Column(String(50), default="hectare")
    land_type = Column(String(100), default="Agricultural")
    verification_status = Column(String(50), default="Verified")
    center_lat = Column(Float, nullable=False)
    center_lng = Column(Float, nullable=False)
    polygon_coordinates = Column(JSON, nullable=False)
