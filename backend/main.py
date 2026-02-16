from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

from db import init_db, migrate_lists_subscription_fields, migrate_lists_title_field, migrate_contacts_to_active, migrate_remove_double_opt_in, migrate_campaigns_list_fields
from routers import auth, contacts, lists, campaigns, branding, settings

# Load environment variables
load_dotenv()

security = HTTPBearer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database on startup
    init_db()
    # Run migrations
    migrate_lists_subscription_fields()
    migrate_lists_title_field()
    migrate_contacts_to_active()
    migrate_remove_double_opt_in()
    migrate_campaigns_list_fields()
    yield

app = FastAPI(
    title="OliSender API",
    description="Email marketing platform for Olivia Vélez",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # SvelteKit dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(contacts.router, prefix="/api/contacts", tags=["contacts"])
app.include_router(lists.router, prefix="/api/lists", tags=["lists"])
app.include_router(campaigns.router, prefix="/api/campaigns", tags=["campaigns"])
app.include_router(branding.router, prefix="/api/branding", tags=["branding"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])

@app.get("/test")
async def test_endpoint():
    return {"message": "Backend is working!", "timestamp": "2025-01-27"}

@app.get("/")
async def root():
    return {"message": "OliSender API - Email marketing platform for Olivia Vélez"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
