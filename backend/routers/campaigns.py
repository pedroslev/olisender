from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
import requests
import os

from db import get_campaigns, create_campaign, get_settings, update_settings, validate_session, delete_campaign

router = APIRouter()
security = HTTPBearer()

# Dependency to get current user
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        print(f"Campaigns: Validating token: {credentials.credentials[:20]}...")
        
        # Use the working validate_session function
        user_data = validate_session(credentials.credentials)
        print(f"Campaigns: Validation result: {user_data}")
        
        if user_data:
            return user_data
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception as e:
        print(f"Campaigns: Auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Pydantic models
class CampaignCreate(BaseModel):
    subject: str
    html: str
    list_ids: Optional[List[int]] = []
    send_to_all: bool = False

class CampaignUpdate(BaseModel):
    subject: str
    html: str
    list_ids: Optional[List[int]] = []
    send_to_all: bool = False

class CampaignSend(BaseModel):
    campaign_id: int
    list_id: int

class ResendSettings(BaseModel):
    resend_api_key: str
    sender_email: str
    sender_name: Optional[str] = "Olivia Vélez"
    reply_to: Optional[str] = None

@router.get("")
async def get_all_campaigns(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all campaigns"""
    print("CAMPAIGNS: Getting all campaigns with auth")
    user = validate_session(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    campaigns = get_campaigns()
    return {"campaigns": campaigns, "total": len(campaigns)}

@router.post("")
async def create_new_campaign(campaign_data: CampaignCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Create a new campaign"""
    print(f"CAMPAIGNS POST: Creating campaign '{campaign_data.subject}' with auth")
    user = validate_session(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        campaign_id = create_campaign(
            campaign_data.subject, 
            campaign_data.html, 
            user["id"],
            campaign_data.list_ids,
            campaign_data.send_to_all
        )
        return {
            "message": "Campaign created successfully",
            "campaign_id": campaign_id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/send")
async def send_campaign(send_data: CampaignSend, current_user: dict = Depends(get_current_user)):
    """Send campaign to a list"""
    # Get settings
    settings = get_settings()
    if not settings.get("resend_api_key"):
        raise HTTPException(status_code=400, detail="Resend API key not configured")
    
    # Get campaign
    campaigns = get_campaigns()
    campaign = next((c for c in campaigns if c["id"] == send_data.campaign_id), None)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get contacts based on campaign settings
    from db import get_contacts_in_list, get_contacts
    contacts = []
    
    if campaign["send_to_all"]:
        # Send to all contacts
        contacts = get_contacts()
        print(f"Using send_to_all: {len(contacts)} total contacts")
    else:
        # Send to contacts from campaign's lists
        campaign_lists = campaign.get("lists", [])
        print(f"Campaign has {len(campaign_lists)} lists configured")
        if campaign_lists:
            for list_info in campaign_lists:
                print(f"Getting contacts from list {list_info['id']} ({list_info['title']})")
                list_contacts = get_contacts_in_list(list_info["id"])
                print(f"Found {len(list_contacts)} contacts in list {list_info['id']}")
                contacts.extend(list_contacts)
        else:
            # Fallback: use the list_id from the request
            print(f"No lists configured, using fallback list_id: {send_data.list_id}")
            contacts = get_contacts_in_list(send_data.list_id)
            print(f"Fallback found {len(contacts)} contacts")
    
    # Remove duplicates based on email
    seen_emails = set()
    unique_contacts = []
    for contact in contacts:
        if contact["email"] not in seen_emails:
            seen_emails.add(contact["email"])
            unique_contacts.append(contact)
    contacts = unique_contacts
    
    print(f"Campaign send_to_all: {campaign['send_to_all']}")
    print(f"Campaign lists: {campaign.get('lists', [])}")
    print(f"Total contacts to send: {len(contacts)}")
    
    # Send emails via Resend
    sent_count = 0
    failed_count = 0
    
    for contact in contacts:
        print(f"Processing contact: {contact['email']}")
        try:
            # Replace placeholders in HTML
            html_content = campaign["html"]
            html_content = html_content.replace("{{nombre}}", contact["name"] or "")
            html_content = html_content.replace("{{email}}", contact["email"])
            html_content = html_content.replace("{{tema}}", contact["topic"] or "")
            
            print(f"Sending email to: {contact['email']}")
            print(f"Subject: {campaign['subject']}")
            print(f"From: {settings['sender_name']} <{settings['sender_email']}>")
            
            # Send via Resend API
            response = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings['resend_api_key']}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": f"{settings['sender_name']} <{settings['sender_email']}>",
                    "to": [contact["email"]],
                    "subject": campaign["subject"],
                    "html": html_content,
                    "reply_to": settings.get("reply_to")
                }
            )
            
            print(f"Resend API response status: {response.status_code}")
            print(f"Resend API response: {response.text}")
            
            if response.status_code == 200:
                sent_count += 1
                print(f"Email sent successfully to {contact['email']}")
            else:
                failed_count += 1
                print(f"Failed to send email to {contact['email']}: {response.status_code}")
                print(f"Error details: {response.text}")
                    
        except Exception as e:
            failed_count += 1
            print(f"Error sending to {contact['email']}: {str(e)}")
            import traceback
            traceback.print_exc()
    
    print(f"Final result: sent={sent_count}, failed={failed_count}")
    
    return {
        "message": f"Campaign sent to {sent_count} contacts",
        "sent": sent_count,
        "failed": failed_count
    }

@router.post("/test-resend")
async def test_resend_configuration(current_user: dict = Depends(get_current_user)):
    """Test Resend configuration"""
    settings = get_settings()
    if not settings.get("resend_api_key"):
        raise HTTPException(status_code=400, detail="Resend API key not configured")
    
    try:
        # Test with a simple email
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings['resend_api_key']}",
                "Content-Type": "application/json"
            },
            json={
                "from": f"{settings['sender_name']} <{settings['sender_email']}>",
                "to": ["test@example.com"],
                "subject": "Test Email",
                "html": "<p>This is a test email</p>"
            }
        )
        
        return {
            "status_code": response.status_code,
            "response": response.text,
            "settings": {
                "sender_email": settings.get("sender_email"),
                "sender_name": settings.get("sender_name"),
                "has_api_key": bool(settings.get("resend_api_key"))
            }
        }
    except Exception as e:
        return {"error": str(e)}

@router.post("/test")
async def send_test_campaign(campaign_data: CampaignCreate, test_email: str, current_user: dict = Depends(get_current_user)):
    """Send test campaign to a specific email"""
    settings = get_settings()
    if not settings.get("resend_api_key"):
        raise HTTPException(status_code=400, detail="Resend API key not configured")
    
    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings['resend_api_key']}",
                "Content-Type": "application/json"
            },
            json={
                "from": f"{settings['sender_name']} <{settings['sender_email']}>",
                "to": [test_email],
                "subject": f"[TEST] {campaign_data.subject}",
                "html": campaign_data.html,
                "reply_to": settings.get("reply_to")
            }
        )
        
        if response.status_code == 200:
            return {"message": "Test email sent successfully"}
        else:
            raise HTTPException(status_code=400, detail=f"Failed to send test email: {response.text}")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error sending test email: {str(e)}")

@router.get("/settings")
async def get_resend_settings(current_user: dict = Depends(get_current_user)):
    """Get Resend settings"""
    settings = get_settings()
    return {
        "sender_email": settings.get("sender_email"),
        "sender_name": settings.get("sender_name"),
        "reply_to": settings.get("reply_to"),
        "has_api_key": bool(settings.get("resend_api_key"))
    }

@router.post("/settings")
async def update_resend_settings(settings_data: ResendSettings, current_user: dict = Depends(get_current_user)):
    """Update Resend settings"""
    try:
        update_settings(
            resend_api_key=settings_data.resend_api_key,
            sender_email=settings_data.sender_email,
            sender_name=settings_data.sender_name,
            reply_to=settings_data.reply_to
        )
        return {"message": "Settings updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{campaign_id}")
async def delete_campaign_endpoint(campaign_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Delete a campaign"""
    print(f"CAMPAIGNS DELETE: Deleting campaign {campaign_id} with auth")
    user = validate_session(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        delete_campaign(campaign_id)
        return {"message": "Campaign deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{campaign_id}")
async def update_campaign(campaign_id: int, campaign_data: CampaignUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Update a campaign"""
    print(f"CAMPAIGNS PUT: Updating campaign {campaign_id} with auth")
    user = validate_session(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        from db import update_campaign as db_update_campaign
        db_update_campaign(
            campaign_id,
            campaign_data.subject,
            campaign_data.html,
            campaign_data.list_ids,
            campaign_data.send_to_all
        )
        return {"message": "Campaign updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
