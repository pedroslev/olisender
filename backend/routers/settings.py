from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional

from db import get_settings, update_settings, validate_session

router = APIRouter()
security = HTTPBearer()

# Dependency to get current user
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        print(f"Settings: Validating token: {credentials.credentials[:20]}...")
        
        # Use the working validate_session function
        user_data = validate_session(credentials.credentials)
        print(f"Settings: Validation result: {user_data}")
        
        if user_data:
            return user_data
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception as e:
        print(f"Settings: Auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Pydantic models
class SettingsUpdate(BaseModel):
    resend_api_key: Optional[str] = None
    sender_email: Optional[str] = None
    sender_name: Optional[str] = None
    reply_to: Optional[str] = None

@router.get("")
async def get_app_settings(current_user: dict = Depends(get_current_user)):
    """Get application settings"""
    settings = get_settings()
    return settings

@router.put("")
async def update_app_settings(
    settings_data: SettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update application settings"""
    settings_dict = settings_data.dict(exclude_unset=True)
    update_settings(**settings_dict)
    updated_settings = get_settings()
    return updated_settings
