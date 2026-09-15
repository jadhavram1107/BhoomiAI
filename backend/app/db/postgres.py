import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

# Use asyncpg for PostgreSQL, but fall back to SQLite (aiosqlite) for local demo
DATABASE_URL = os.getenv(
    "POSTGRES_URL",
    "sqlite+aiosqlite:///./demo.db"
)

engine = create_async_engine(DATABASE_URL, echo=False, future=True)
AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
