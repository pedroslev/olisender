from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import csv
import io

from db import get_contacts, create_contact, add_contact_to_list, get_lists, validate_session, get_db_connection, update_contact as db_update_contact, delete_contact as db_delete_contact, get_list_by_slug

router = APIRouter()
security = HTTPBearer()

# Dependency to get current user
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        print(f"Contacts: Validating token: {credentials.credentials[:20]}...")
        
        # Use the working validate_session function
        user_data = validate_session(credentials.credentials)
        print(f"Contacts: Validation result: {user_data}")
        
        if user_data:
            return user_data
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception as e:
        print(f"Contacts: Auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Pydantic models
class ContactUpdate(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    topic: Optional[str] = None

class ContactImport(BaseModel):
    contacts: List[dict]

class ContactAddToList(BaseModel):
    contact_id: int
    list_id: int

@router.get("")
async def get_all_contacts(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all contacts with pagination"""
    print("CONTACTS: Getting all contacts with auth")
    user = validate_session(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    contacts = get_contacts()
    return {"contacts": contacts, "total": len(contacts)}

@router.post("")
async def create_new_contact(contact_data: dict, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Create a new contact"""
    print(f"CONTACTS POST: Creating contact '{contact_data.get('email')}' with auth")
    user = validate_session(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        contact_id = create_contact(
            contact_data["email"],
            contact_data.get("name"),
            contact_data.get("topic")
        )
        return {
            "message": "Contact created successfully",
            "contact_id": contact_id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{contact_id}")
async def update_contact(contact_id: int, contact_data: ContactUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Update a contact"""
    print(f"CONTACTS PUT: Updating contact {contact_id} with auth")
    user = validate_session(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        db_update_contact(contact_id, contact_data.email, contact_data.name, contact_data.topic)
        return {"message": "Contact updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{contact_id}")
async def delete_contact(contact_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Delete a contact"""
    print(f"CONTACTS DELETE: Deleting contact {contact_id} with auth")
    user = validate_session(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        db_delete_contact(contact_id)
        return {"message": "Contact deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/import")
async def import_contacts(import_data: ContactImport, current_user: dict = Depends(get_current_user)):
    """Import multiple contacts"""
    imported = 0
    errors = []
    
    for contact_data in import_data.contacts:
        try:
            create_contact(
                contact_data["email"],
                contact_data.get("name"),
                contact_data.get("topic")
            )
            imported += 1
        except ValueError as e:
            errors.append({
                "email": contact_data["email"],
                "error": str(e)
            })
    
    return {
        "message": f"Imported {imported} contacts",
        "imported": imported,
        "errors": errors
    }

@router.post("/import-csv")
async def import_contacts_csv(file_content: str, current_user: dict = Depends(get_current_user)):
    """Import contacts from CSV content"""
    try:
        csv_file = io.StringIO(file_content)
        reader = csv.DictReader(csv_file)
        
        imported = 0
        errors = []
        
        for row in reader:
            try:
                create_contact(
                    row["email"],
                    row.get("name"),
                    row.get("topic")
                )
                imported += 1
            except ValueError as e:
                errors.append({
                    "email": row["email"],
                    "error": str(e)
                })
        
        return {
            "message": f"Imported {imported} contacts from CSV",
            "imported": imported,
            "errors": errors
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing CSV: {str(e)}")

@router.post("/add-to-list")
async def add_contact_to_list_endpoint(data: ContactAddToList, current_user: dict = Depends(get_current_user)):
    """Add contact to a list"""
    try:
        add_contact_to_list(data.contact_id, data.list_id)
        return {"message": "Contact added to list successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/subscribe")
async def subscribe_contact(contact_data: dict):
    """Subscribe a contact (public endpoint, no auth required)"""
    print(f"CONTACTS SUBSCRIBE: Creating contact '{contact_data.get('email')}' without auth")
    
    try:
        contact_id = create_contact(
            contact_data["email"],
            contact_data.get("name"),
            contact_data.get("topic")
        )
        
        # If list_slug is provided, add contact to that list
        list_slug = contact_data.get("list_slug")
        if list_slug:
            print(f"CONTACTS SUBSCRIBE: Adding contact {contact_id} to list with slug '{list_slug}'")
            list_data = get_list_by_slug(list_slug)
            if list_data:
                add_contact_to_list(contact_id, list_data["id"])
                print(f"CONTACTS SUBSCRIBE: Successfully added contact to list {list_data['id']}")
            else:
                print(f"CONTACTS SUBSCRIBE: List with slug '{list_slug}' not found")
        
        return {
            "message": "Contact subscribed successfully",
            "contact_id": contact_id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/export")
async def export_contacts(current_user: dict = Depends(get_current_user)):
    """Export all contacts as CSV"""
    contacts = get_contacts()
    
    # Create CSV content
    csv_content = "email,name,topic,status,created_at\n"
    for contact in contacts:
        csv_content += f"{contact['email']},{contact['name'] or ''},{contact['topic'] or ''},{contact['status']},{contact['created_at']}\n"
    
    return {
        "csv_content": csv_content,
        "filename": f"contacts_export_{len(contacts)}.csv"
    }
