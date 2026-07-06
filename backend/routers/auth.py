from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import secrets

from db import (
    create_user, authenticate_user, create_session, validate_session,
    get_user_count,
    create_contact, get_contacts, add_contact_to_list,
    create_list, get_lists, get_list_by_slug
)

router = APIRouter()
security = HTTPBearer()

# Dependency to get current user
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = validate_session(credentials.credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ContactCreate(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    topic: Optional[str] = None

class ListCreate(BaseModel):
    name: str
    slug: str
    bg_image_url: Optional[str] = None

class SubscribeRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    topic: Optional[str] = None

# Auth routes

@router.get("/needs-initial-setup")
async def needs_initial_setup():
    """Public endpoint: returns whether no users exist and initial admin setup is required."""
    count = get_user_count()
    return {"needs_initial_setup": count == 0}

@router.post("/initial-setup")
async def initial_setup(user_data: UserCreate):
    """Create the first admin user. Only allowed when there are zero users. No auth required."""
    if get_user_count() != 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Initial setup already completed. Use login.",
        )
    if len(user_data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña debe tener al menos 6 caracteres",
        )
    try:
        user_id = create_user(user_data.email, user_data.password)
        user = {"id": user_id, "email": user_data.email}
        session_token = create_session(user_id)
        return {
            "message": "Administrador creado correctamente",
            "session_token": session_token,
            "user": user,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
async def login(login_data: UserLogin):
    """Login user"""
    user = authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    session_token = create_session(user["id"])
    return {
        "message": "Login successful",
        "session_token": session_token,
        "user": user
    }

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout user (client should discard session token)"""
    return {"message": "Logout successful"}

@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return current_user

# Contact routes
@router.get("/contacts")
async def get_all_contacts(current_user: dict = Depends(get_current_user)):
    """Get all contacts"""
    contacts = get_contacts()
    return {"contacts": contacts}

@router.post("/contacts")
async def create_new_contact(contact_data: ContactCreate, current_user: dict = Depends(get_current_user)):
    """Create a new contact"""
    try:
        contact_id = create_contact(contact_data.email, contact_data.name, contact_data.topic)
        return {
            "message": "Contact created successfully",
            "contact_id": contact_id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# List routes
@router.get("/lists")
async def get_all_lists(current_user: dict = Depends(get_current_user)):
    """Get all lists"""
    lists = get_lists()
    return {"lists": lists}

@router.post("/lists")
async def create_new_list(list_data: ListCreate, current_user: dict = Depends(get_current_user)):
    """Create a new list"""
    try:
        list_id = create_list(list_data.name, list_data.slug, list_data.bg_image_url)
        return {
            "message": "List created successfully",
            "list_id": list_id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/lists/{slug}")
async def get_list_by_slug_public(slug: str):
    """Get list by slug (public endpoint for subscription pages)"""
    list_data = get_list_by_slug(slug)
    if not list_data:
        raise HTTPException(status_code=404, detail="List not found")
    return list_data

# Public subscription endpoint
@router.post("/subscribe/{slug}")
async def subscribe_to_list(slug: str, subscribe_data: SubscribeRequest):
    """Subscribe to a list (public endpoint)"""
    # Get list
    list_data = get_list_by_slug(slug)
    if not list_data:
        raise HTTPException(status_code=404, detail="List not found")
    
    try:
        # Create contact
        contact_id = create_contact(subscribe_data.email, subscribe_data.name, subscribe_data.topic)
        
        # Add to list
        add_contact_to_list(contact_id, list_data["id"])
        
        return {
            "message": "Successfully subscribed to list",
            "list_name": list_data["name"]
        }
    except ValueError as e:
        if "already exists" in str(e):
            return {
                "message": "Email already subscribed to this list",
                "list_name": list_data["name"]
            }
        raise HTTPException(status_code=400, detail=str(e))
