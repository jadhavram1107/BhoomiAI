import random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from ..auth.jwt import create_access_token, verify_password, get_password_hash
from ..db.postgres import get_db
from ..models.user import AccountOtp, User, UserRole
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

router = APIRouter()

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class LoginRequest(BaseModel):
    bhoomi_id: Optional[str] = None
    email: Optional[str] = None
    password: str

class SendOtpRequest(BaseModel):
    email: str
    mobile_no: str

class VerifyOtpRequest(BaseModel):
    email: str
    mobile_no: str
    otp_code: str

class RegisterOfficialRequest(BaseModel):
    designation: str
    full_name: str
    department: str
    employee_id: str
    jurisdiction: str
    requested_role: str
    email: str
    mobile_no: str
    password: str
    otp_code: str

class ApprovalRequest(BaseModel):
    approved_by: str = "admin@bhoomiai.demo"
    role: Optional[str] = None
    reason: Optional[str] = None

def normalize_role(requested_role: Optional[str]) -> str:
    mapping = {
        "Revenue Officer": UserRole.OFFICER.value,
        "Verification Supervisor": UserRole.REVIEWER.value,
        "District Administrator": UserRole.ADMIN.value,
        "GIS Analyst": UserRole.REVIEWER.value,
        "Data Entry Operator": UserRole.USER.value,
    }
    return mapping.get(requested_role or "", UserRole.OFFICER.value)

def generate_bhoomi_id(department: str, employee_id: str) -> str:
    dept_code = "".join(ch for ch in department.upper() if ch.isalpha())[:3].ljust(3, "G")
    official_code = "".join(ch for ch in employee_id.upper() if ch.isalnum())[-4:].rjust(4, "0")
    serial = random.randint(1000, 9999)
    return f"BHOOMI-{dept_code}-{official_code}-{serial}"

def serialize_user(user: User) -> dict:
    return {
        "id": str(user.id),
        "bhoomi_id": user.bhoomi_id,
        "email": user.email,
        "name": user.name,
        "designation": user.designation,
        "department": user.department,
        "employee_id": user.employee_id,
        "jurisdiction": user.jurisdiction,
        "requested_role": user.requested_role,
        "role": user.role,
        "mobile_no": user.mobile_no,
        "account_status": user.account_status,
        "email_verified": user.email_verified,
        "mobile_verified": user.mobile_verified,
        "approved_by": user.approved_by,
        "approved_at": user.approved_at.isoformat() if user.approved_at else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "rejection_reason": user.rejection_reason,
    }

@router.post("/login", response_model=Token)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    identifier = (payload.bhoomi_id or payload.email or "").strip()
    if not identifier:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bhoomi ID is required")
    
    if "@" in identifier:
        result = await db.execute(select(User).where(User.email == identifier.lower()))
    else:
        result = await db.execute(select(User).where(User.bhoomi_id == identifier.upper()))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Bhoomi ID or password")

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Bhoomi ID or password")

    if user.account_status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {user.account_status}. Admin approval is required before sign in."
        )

    access_token = create_access_token({
        "sub": str(user.id),
        "bhoomi_id": user.bhoomi_id,
        "email": user.email,
        "role": user.role
    })
    
    return Token(
        access_token=access_token,
        user=serialize_user(user)
    )

@router.post("/register/send-otp")
async def send_registration_otp(payload: SendOtpRequest, db: AsyncSession = Depends(get_db)):
    email = payload.email.strip().lower()
    mobile_no = payload.mobile_no.strip()
    result = await db.execute(select(User).where(or_(User.email == email, User.mobile_no == mobile_no)))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Official email or mobile is already registered")

    otp_code = str(random.randint(100000, 999999))
    otp = AccountOtp(
        email=email,
        mobile_no=mobile_no,
        otp_code=otp_code,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    db.add(otp)
    await db.commit()

    return {
        "message": "OTP generated for official email/mobile verification.",
        "demo_otp": otp_code,
        "expires_in_minutes": 10,
    }

@router.post("/register/verify-otp")
async def verify_registration_otp(payload: VerifyOtpRequest, db: AsyncSession = Depends(get_db)):
    email = payload.email.strip().lower()
    mobile_no = payload.mobile_no.strip()
    result = await db.execute(
        select(AccountOtp)
        .where(
            AccountOtp.email == email,
            AccountOtp.mobile_no == mobile_no,
            AccountOtp.otp_code == payload.otp_code.strip(),
            AccountOtp.expires_at >= datetime.utcnow(),
        )
        .order_by(AccountOtp.created_at.desc())
    )
    otp = result.scalars().first()
    if not otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

    otp.verified = True
    await db.commit()
    return {"verified": True}

@router.post("/register")
async def register_official(payload: RegisterOfficialRequest, db: AsyncSession = Depends(get_db)):
    email = payload.email.strip().lower()
    mobile_no = payload.mobile_no.strip()
    result = await db.execute(select(User).where(or_(User.email == email, User.mobile_no == mobile_no)))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Official email or mobile is already registered")

    otp_result = await db.execute(
        select(AccountOtp)
        .where(
            AccountOtp.email == email,
            AccountOtp.mobile_no == mobile_no,
            AccountOtp.otp_code == payload.otp_code.strip(),
            AccountOtp.verified == True,
            AccountOtp.expires_at >= datetime.utcnow(),
        )
        .order_by(AccountOtp.created_at.desc())
    )
    if not otp_result.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP verification is required")

    bhoomi_id = generate_bhoomi_id(payload.department, payload.employee_id)
    for _ in range(5):
        existing = await db.execute(select(User).where(User.bhoomi_id == bhoomi_id))
        if not existing.scalar_one_or_none():
            break
        bhoomi_id = generate_bhoomi_id(payload.department, payload.employee_id)

    user = User(
        bhoomi_id=bhoomi_id,
        email=email,
        name=payload.full_name.strip(),
        designation=payload.designation.strip(),
        department=payload.department.strip(),
        employee_id=payload.employee_id.strip(),
        jurisdiction=payload.jurisdiction.strip(),
        requested_role=payload.requested_role.strip(),
        role=normalize_role(payload.requested_role),
        mobile_no=mobile_no,
        hashed_password=get_password_hash(payload.password),
        account_status="PENDING_APPROVAL",
        email_verified=True,
        mobile_verified=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {
        "message": "Official account request created. Admin approval is required before sign in.",
        "bhoomi_id": user.bhoomi_id,
        "account_status": user.account_status,
        "user": serialize_user(user),
    }

@router.get("/account-requests")
async def list_account_requests(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User)
        .where(User.account_status == "PENDING_APPROVAL")
        .order_by(User.created_at.desc())
    )
    return [serialize_user(user) for user in result.scalars().all()]

@router.post("/account-requests/{user_id}/approve")
async def approve_account_request(user_id: str, payload: ApprovalRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account request not found")

    user.account_status = "ACTIVE"
    user.role = payload.role or normalize_role(user.requested_role)
    user.approved_by = payload.approved_by
    user.approved_at = datetime.utcnow()
    user.rejection_reason = None
    await db.commit()
    await db.refresh(user)
    return serialize_user(user)

@router.post("/account-requests/{user_id}/reject")
async def reject_account_request(user_id: str, payload: ApprovalRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account request not found")

    user.account_status = "REJECTED"
    user.rejection_reason = payload.reason or "Rejected by administrator"
    user.approved_by = payload.approved_by
    user.approved_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    return serialize_user(user)

@router.get("/me")
async def get_current_user():
    return {
        "id": "demo-admin-id",
        "bhoomi_id": "BHOOMI-ADMIN-0001",
        "email": "admin@bhoomiai.demo",
        "name": "Bhoomi Administrator",
        "role": "ADMIN",
        "account_status": "ACTIVE",
    }
