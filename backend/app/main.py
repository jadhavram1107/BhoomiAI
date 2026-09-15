import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy import select
from sqlalchemy import text
from .db.postgres import AsyncSessionLocal, Base, engine
from .models.user import User, UserRole
from .auth.jwt import get_password_hash
from .routers import auth, dashboard, documents, verification, gis, analytics, audit, demo, government

load_dotenv()

app = FastAPI(
    title="BhoomiAI API",
    description="Intelligent Land Record Digitization & Validation System API",
    version="1.0.0"
)

# CORS configuration - allow frontend origin
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def ensure_user_schema():
    async with engine.begin() as conn:
        dialect = conn.dialect.name
        columns = [
            ("bhoomi_id", "VARCHAR(50)", "VARCHAR(50)"),
            ("username", "VARCHAR(100)", "VARCHAR(100)"),
            ("middle_name", "VARCHAR(255)", "VARCHAR(255)"),
            ("surname", "VARCHAR(255)", "VARCHAR(255)"),
            ("designation", "VARCHAR(100)", "VARCHAR(100)"),
            ("department", "VARCHAR(100)", "VARCHAR(100)"),
            ("employee_id", "VARCHAR(50)", "VARCHAR(50)"),
            ("requested_role", "VARCHAR(100)", "VARCHAR(100)"),
            ("account_status", "VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL", "VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL"),
            ("village", "VARCHAR(100)", "VARCHAR(100)"),
            ("taluka", "VARCHAR(100)", "VARCHAR(100)"),
            ("district", "VARCHAR(100)", "VARCHAR(100)"),
            ("jurisdiction", "VARCHAR(255)", "VARCHAR(255)"),
            ("state", "VARCHAR(100) DEFAULT 'Maharashtra'", "VARCHAR(100) DEFAULT 'Maharashtra'"),
            ("mobile_no", "VARCHAR(20)", "VARCHAR(20)"),
            ("mobile_verified", "BOOLEAN DEFAULT 0", "BOOLEAN DEFAULT FALSE"),
            ("email_verified", "BOOLEAN DEFAULT 0", "BOOLEAN DEFAULT FALSE"),
            ("approved_by", "VARCHAR(255)", "VARCHAR(255)"),
            ("approved_at", "DATETIME", "TIMESTAMP"),
            ("rejection_reason", "TEXT", "TEXT"),
        ]

        if dialect == "sqlite":
            result = await conn.execute(text("PRAGMA table_info(users)"))
            existing = {row[1] for row in result.fetchall()}
            for column_name, sqlite_type, _ in columns:
                if column_name not in existing:
                    await conn.execute(text(f"ALTER TABLE users ADD COLUMN {column_name} {sqlite_type}"))
        else:
            for column_name, _, postgres_type in columns:
                await conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {column_name} {postgres_type}"))

# Startup event – create tables and demo users
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await ensure_user_schema()
        
    async with AsyncSessionLocal() as session:
        # Check admin demo user
        res_admin = await session.execute(select(User).where(User.email == "admin@bhoomiai.demo"))
        admin_user = res_admin.scalar_one_or_none()
        if not admin_user:
            admin_user = User(
                email="admin@bhoomiai.demo",
                bhoomi_id="BHOOMI-ADMIN-0001",
                name="System Administrator",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.ADMIN.value,
                account_status="ACTIVE",
                designation="System Administrator",
                department="Land Records Department",
                employee_id="ADMIN-0001",
                jurisdiction="State Headquarters",
                mobile_no="+91 90000 00001",
                email_verified=True,
                mobile_verified=True,
            )
            session.add(admin_user)
        else:
            admin_user.bhoomi_id = admin_user.bhoomi_id or "BHOOMI-ADMIN-0001"
            admin_user.hashed_password = get_password_hash("admin123")
            admin_user.role = UserRole.ADMIN.value
            admin_user.account_status = "ACTIVE"

        # Check officer demo user
        res_officer = await session.execute(select(User).where(User.email == "officer@bhoomiai.demo"))
        officer_user = res_officer.scalar_one_or_none()
        if not officer_user:
            officer_user = User(
                email="officer@bhoomiai.demo",
                bhoomi_id="BHOOMI-OFFICER-0002",
                name="Revenue Officer Patil",
                hashed_password=get_password_hash("officer123"),
                role=UserRole.OFFICER.value,
                account_status="ACTIVE",
                designation="Revenue Officer",
                department="Land Records Department",
                employee_id="OFFICER-0002",
                jurisdiction="Pune District",
                mobile_no="+91 90000 00002",
                email_verified=True,
                mobile_verified=True,
            )
            session.add(officer_user)
        else:
            officer_user.bhoomi_id = officer_user.bhoomi_id or "BHOOMI-OFFICER-0002"
            officer_user.hashed_password = get_password_hash("officer123")
            officer_user.role = UserRole.OFFICER.value
            officer_user.account_status = "ACTIVE"
            
        await session.commit()

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(verification.router, prefix="/api/verification", tags=["Verification"])
app.include_router(gis.router, prefix="/api/gis", tags=["GIS"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(audit.router, prefix="/api", tags=["Audit"])
app.include_router(demo.router, prefix="/api/demo", tags=["Demo"])
app.include_router(government.router, prefix="/api/government", tags=["Government Data"])

@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "system": "BhoomiAI Intelligent Land Record Digitization & Validation System",
        "demo_mode": True
    }
