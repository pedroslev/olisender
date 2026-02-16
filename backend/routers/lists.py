from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List

from db import get_lists, create_list, get_list_by_slug, get_contacts, add_contact_to_list, validate_session, update_list, delete_list, get_contacts_in_list

router = APIRouter()
security = HTTPBearer()

# Dependency to get current user
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        print(f"Lists: Validating token: {credentials.credentials[:20]}...")
        
        # Use the working validate_session function
        user_data = validate_session(credentials.credentials)
        print(f"Lists: Validation result: {user_data}")
        
        if user_data:
            return user_data
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception as e:
        print(f"Lists: Auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Pydantic models
class SubscriptionField(BaseModel):
    name: str
    label: str
    type: str  # "text", "email", "tel", "textarea", "select"
    required: bool = False
    options: Optional[List[str]] = None  # For select fields

class ListCreate(BaseModel):
    name: str
    title: str
    slug: str
    bg_image_url: Optional[str] = None
    subscription_fields: Optional[List[SubscriptionField]] = []

class ListUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    bg_image_url: Optional[str] = None
    subscription_fields: Optional[List[SubscriptionField]] = None

class ListContactAdd(BaseModel):
    contact_id: int

@router.get("")
async def get_all_lists(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all lists"""
    print("LISTS: Getting all lists with auth")
    user = validate_session(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    lists = get_lists()
    return {"lists": lists, "total": len(lists)}

@router.post("")
async def create_new_list(list_data: ListCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Create a new list"""
    print(f"LISTS POST: Creating list '{list_data.name}' with auth")
    user = validate_session(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        print(f"LISTS POST: Data received - name: '{list_data.name}', title: '{list_data.title}', slug: '{list_data.slug}', bg_image_url: '{list_data.bg_image_url}', fields: {list_data.subscription_fields}")
        # Convert Pydantic models to dicts for JSON serialization
        fields_data = [field.dict() for field in list_data.subscription_fields] if list_data.subscription_fields else []
        list_id = create_list(list_data.name, list_data.title, list_data.slug, list_data.bg_image_url, fields_data)
        print(f"LISTS POST: List created with ID: {list_id}")
        return {
            "message": "List created successfully",
            "list_id": list_id
        }
    except ValueError as e:
        print(f"LISTS POST: ValueError: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"LISTS POST: Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{list_id}")
async def get_list_by_id(list_id: int):
    """Get list by ID"""
    lists = get_lists()
    list_data = next((l for l in lists if l["id"] == list_id), None)
    
    if not list_data:
        raise HTTPException(status_code=404, detail="List not found")
    
    return list_data

@router.get("/slug/{slug}")
async def get_list_by_slug_endpoint(slug: str):
    """Get list by slug"""
    list_data = get_list_by_slug(slug)
    if not list_data:
        raise HTTPException(status_code=404, detail="List not found")
    return list_data

@router.post("/{list_id}/contacts")
async def add_contact_to_list_endpoint(list_id: int, contact_data: ListContactAdd):
    """Add contact to a list"""
    try:
        add_contact_to_list(contact_data.contact_id, list_id)
        return {"message": "Contact added to list successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{list_id}")
async def update_list_endpoint(list_id: int, list_data: ListUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Update a list"""
    print(f"LISTS PUT: Updating list {list_id} with auth")
    user = validate_session(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        # Convert Pydantic models to dicts for JSON serialization
        fields_data = [field.dict() for field in list_data.subscription_fields] if list_data.subscription_fields else None
        update_list(list_id, list_data.name, list_data.title, None, list_data.bg_image_url, fields_data)
        return {"message": "List updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{list_id}")
async def delete_list_endpoint(list_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Delete a list"""
    print(f"LISTS DELETE: Deleting list {list_id} with auth")
    user = validate_session(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        delete_list(list_id)
        return {"message": "List deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{list_id}/contacts")
async def get_list_contacts(list_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all contacts in a list"""
    print(f"LISTS GET CONTACTS: Getting contacts for list {list_id} with auth")
    user = validate_session(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get contacts specifically in this list
    contacts = get_contacts_in_list(list_id)
    return {"contacts": contacts, "list_id": list_id}

@router.delete("/{list_id}/contacts/{contact_id}")
async def remove_contact_from_list(list_id: int, contact_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Remove a contact from a list"""
    print(f"LISTS DELETE CONTACT: Removing contact {contact_id} from list {list_id} with auth")
    user = validate_session(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        # Import the function from db
        from db import remove_contact_from_list as db_remove_contact_from_list
        db_remove_contact_from_list(contact_id, list_id)
        return {"message": "Contact removed from list successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
