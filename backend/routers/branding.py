from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, Dict, Any

from db import get_settings, update_settings

router = APIRouter()
security = HTTPBearer()

# Pydantic models
class BrandingSettings(BaseModel):
    primary_color: Optional[str] = "#F6BFA7"
    secondary_color: Optional[str] = "#90BFD6"
    accent_color: Optional[str] = "#D8D8D8"
    text_color: Optional[str] = "#333333"
    background_color: Optional[str] = "#FFF8F6"
    logo_url: Optional[str] = None
    background_image_url: Optional[str] = None
    font_family_title: Optional[str] = "Playfair Display"
    font_family_body: Optional[str] = "Inter"

class SiteSettings(BaseModel):
    site_name: Optional[str] = "OLIVELEZ"
    tagline: Optional[str] = "Las clases de Oli"
    description: Optional[str] = "Cada clase es un espacio para redescubrirte. El movimiento es fuerza, expresión y libertad."
    instagram_personal: Optional[str] = "@olivelez"
    instagram_classes: Optional[str] = "@lasclasesdeoli"
    website_url: Optional[str] = "https://olivelez.com.ar"

# Dependency to get current user
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    from db import validate_session
    user = validate_session(credentials.credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

@router.get("/")
async def get_branding_settings(current_user: dict = Depends(get_current_user)):
    """Get current branding settings"""
    settings = get_settings()
    
    # Default branding settings
    branding = {
        "primary_color": "#F6BFA7",
        "secondary_color": "#90BFD6", 
        "accent_color": "#D8D8D8",
        "text_color": "#333333",
        "background_color": "#FFF8F6",
        "logo_url": None,
        "background_image_url": None,
        "font_family_title": "Playfair Display",
        "font_family_body": "Inter",
        "site_name": "OLIVELEZ",
        "tagline": "Las clases de Oli",
        "description": "Cada clase es un espacio para redescubrirte. El movimiento es fuerza, expresión y libertad.",
        "instagram_personal": "@olivelez",
        "instagram_classes": "@lasclasesdeoli",
        "website_url": "https://olivelez.com.ar"
    }
    
    # Override with saved settings if they exist
    if settings:
        branding.update({
            "primary_color": settings.get("primary_color", branding["primary_color"]),
            "secondary_color": settings.get("secondary_color", branding["secondary_color"]),
            "accent_color": settings.get("accent_color", branding["accent_color"]),
            "text_color": settings.get("text_color", branding["text_color"]),
            "background_color": settings.get("background_color", branding["background_color"]),
            "logo_url": settings.get("logo_url"),
            "background_image_url": settings.get("background_image_url"),
            "font_family_title": settings.get("font_family_title", branding["font_family_title"]),
            "font_family_body": settings.get("font_family_body", branding["font_family_body"]),
            "site_name": settings.get("site_name", branding["site_name"]),
            "tagline": settings.get("tagline", branding["tagline"]),
            "description": settings.get("description", branding["description"]),
            "instagram_personal": settings.get("instagram_personal", branding["instagram_personal"]),
            "instagram_classes": settings.get("instagram_classes", branding["instagram_classes"]),
            "website_url": settings.get("website_url", branding["website_url"])
        })
    
    return branding

@router.post("/")
async def update_branding_settings(branding_data: BrandingSettings, current_user: dict = Depends(get_current_user)):
    """Update branding settings"""
    try:
        update_settings(**branding_data.dict())
        return {"message": "Branding settings updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/site")
async def update_site_settings(site_data: SiteSettings, current_user: dict = Depends(get_current_user)):
    """Update site settings"""
    try:
        update_settings(**site_data.dict())
        return {"message": "Site settings updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/public/{slug}")
async def get_public_branding(slug: str):
    """Get branding settings for public subscription pages"""
    settings = get_settings()
    
    # Default branding for public pages
    branding = {
        "primary_color": "#F6BFA7",
        "secondary_color": "#90BFD6",
        "accent_color": "#D8D8D8", 
        "text_color": "#333333",
        "background_color": "#FFF8F6",
        "font_family_title": "Playfair Display",
        "font_family_body": "Inter",
        "site_name": "OLIVELEZ",
        "tagline": "Las clases de Oli",
        "description": "Cada clase es un espacio para redescubrirte. El movimiento es fuerza, expresión y libertad.",
        "instagram_personal": "@olivelez",
        "instagram_classes": "@lasclasesdeoli",
        "website_url": "https://olivelez.com.ar"
    }
    
    # Override with saved settings
    if settings:
        branding.update({
            "primary_color": settings.get("primary_color", branding["primary_color"]),
            "secondary_color": settings.get("secondary_color", branding["secondary_color"]),
            "accent_color": settings.get("accent_color", branding["accent_color"]),
            "text_color": settings.get("text_color", branding["text_color"]),
            "background_color": settings.get("background_color", branding["background_color"]),
            "font_family_title": settings.get("font_family_title", branding["font_family_title"]),
            "font_family_body": settings.get("font_family_body", branding["font_family_body"]),
            "site_name": settings.get("site_name", branding["site_name"]),
            "tagline": settings.get("tagline", branding["tagline"]),
            "description": settings.get("description", branding["description"]),
            "instagram_personal": settings.get("instagram_personal", branding["instagram_personal"]),
            "instagram_classes": settings.get("instagram_classes", branding["instagram_classes"]),
            "website_url": settings.get("website_url", branding["website_url"])
        })
    
    return branding
