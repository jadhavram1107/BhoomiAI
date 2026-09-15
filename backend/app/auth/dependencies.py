from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from ..auth.jwt import decode_token
from ..models.user import User, Role
from ..db.postgres import get_db
from sqlalchemy.ext.asyncio import AsyncSession

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    try:
        payload = decode_token(token)
        user_id: int = int(payload.get("sub"))
        role: str = payload.get("role")
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    result = await db.execute("SELECT * FROM users WHERE id = :id", {"id": user_id})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    user = User(**row._mapping)
    return user

def role_required(required_role: Role):
    async def role_dependency(current_user: User = Depends(get_current_user)):
        if current_user.role != required_role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user
    return role_dependency

# Convenience dependencies
is_admin = role_required(Role.admin)
is_supervisor = role_required(Role.supervisor)
is_investigator = role_required(Role.investigator)
