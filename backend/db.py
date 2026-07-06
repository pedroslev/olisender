import sqlite3
import os
from datetime import datetime
from typing import Optional, List, Dict, Any
import hashlib
import secrets

# Database file path
DB_PATH = "data/newsletter.db"

def get_db_connection():
    """Get database connection"""
    # Ensure data directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    return sqlite3.connect(DB_PATH)

def init_db():
    """Initialize database with all tables"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Sessions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_token TEXT UNIQUE NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    # Contacts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            topic TEXT,
            status TEXT CHECK(status IN ('pending','active','unsubscribed')) DEFAULT 'active',
            confirm_token TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Lists table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            title TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            bg_image_url TEXT,
            subscription_fields TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # List contacts junction table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS list_contacts (
            list_id INTEGER NOT NULL,
            contact_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (list_id, contact_id),
            FOREIGN KEY (list_id) REFERENCES lists (id),
            FOREIGN KEY (contact_id) REFERENCES contacts (id)
        )
    """)
    
    # Campaigns table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS campaigns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject TEXT NOT NULL,
            html TEXT NOT NULL,
            send_to_all BOOLEAN DEFAULT FALSE,
            created_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users (id)
        )
    """)
    
    # Campaign lists table (many-to-many relationship)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS campaign_lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER NOT NULL,
            list_id INTEGER NOT NULL,
            FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE,
            FOREIGN KEY (list_id) REFERENCES lists (id) ON DELETE CASCADE,
            UNIQUE(campaign_id, list_id)
        )
    """)
    
    # Sent log table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sent_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER NOT NULL,
            contact_id INTEGER NOT NULL,
            status TEXT CHECK(status IN ('queued','sent','failed')) DEFAULT 'queued',
            provider_msg_id TEXT,
            error_msg TEXT,
            sent_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (campaign_id) REFERENCES campaigns (id),
            FOREIGN KEY (contact_id) REFERENCES contacts (id)
        )
    """)
    
    # Templates table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            html TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Settings table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resend_api_key TEXT,
            sender_email TEXT,
            sender_name TEXT DEFAULT 'Olivia Vélez',
            reply_to TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()
    print("Database initialized successfully")

def migrate_lists_subscription_fields():
    """Add subscription_fields column to existing lists table if it doesn't exist"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(lists)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'subscription_fields' not in columns:
            cursor.execute("ALTER TABLE lists ADD COLUMN subscription_fields TEXT DEFAULT '[]'")
            conn.commit()
            print("Added subscription_fields column to lists table")
    except Exception as e:
        print(f"Migration error: {e}")
    finally:
        conn.close()

def migrate_lists_title_field():
    """Add title column to existing lists table if it doesn't exist"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(lists)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'title' not in columns:
            cursor.execute("ALTER TABLE lists ADD COLUMN title TEXT")
            # Copy name to title for existing records
            cursor.execute("UPDATE lists SET title = name WHERE title IS NULL")
            conn.commit()
            print("Added title column to lists table")
    except Exception as e:
        print(f"Migration error: {e}")
    finally:
        conn.close()

def migrate_contacts_to_active():
    """Update existing pending contacts to active status"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("UPDATE contacts SET status = 'active' WHERE status = 'pending'")
        updated_count = cursor.rowcount
        conn.commit()
        if updated_count > 0:
            print(f"Updated {updated_count} contacts from pending to active")
    except Exception as e:
        print(f"Migration error: {e}")
    finally:
        conn.close()

def migrate_remove_double_opt_in():
    """Remove double_opt_in column from settings table if it exists"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(settings)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'double_opt_in' in columns:
            # SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
            cursor.execute("""
                CREATE TABLE settings_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    resend_api_key TEXT,
                    sender_email TEXT,
                    sender_name TEXT DEFAULT 'Olivia Vélez',
                    reply_to TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            cursor.execute("""
                INSERT INTO settings_new (id, resend_api_key, sender_email, sender_name, reply_to, created_at)
                SELECT id, resend_api_key, sender_email, sender_name, reply_to, created_at FROM settings
            """)
            
            cursor.execute("DROP TABLE settings")
            cursor.execute("ALTER TABLE settings_new RENAME TO settings")
            conn.commit()
            print("Removed double_opt_in column from settings table")
    except Exception as e:
        print(f"Migration error: {e}")
    finally:
        conn.close()

# User operations
def get_user_count() -> int:
    """Return the number of users in the database (for initial setup check)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    conn.close()
    return count

def create_user(email: str, password: str) -> int:
    """Create a new user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    try:
        cursor.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (email, password_hash)
        )
        user_id = cursor.lastrowid
        conn.commit()
        return user_id
    except sqlite3.IntegrityError:
        raise ValueError("User with this email already exists")
    finally:
        conn.close()

def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate user and return user data"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    cursor.execute(
        "SELECT id, email FROM users WHERE email = ? AND password_hash = ?",
        (email, password_hash)
    )
    
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return {"id": user[0], "email": user[1]}
    return None

def create_session(user_id: int) -> str:
    """Create a new session for user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    session_token = secrets.token_urlsafe(32)
    expires_at = datetime.now().timestamp() + (7 * 24 * 60 * 60)  # 7 days
    
    cursor.execute(
        "INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)",
        (user_id, session_token, expires_at)
    )
    
    conn.commit()
    conn.close()
    return session_token

def validate_session(session_token: str) -> Optional[Dict[str, Any]]:
    """Validate session token and return user data"""
    print(f"Validating session token: {session_token[:20]}...")
    conn = get_db_connection()
    cursor = conn.cursor()
    
    current_time = datetime.now().timestamp()
    print(f"Current timestamp: {current_time}")
    
    cursor.execute("""
        SELECT u.id, u.email, s.expires_at 
        FROM users u 
        JOIN sessions s ON u.id = s.user_id 
        WHERE s.session_token = ? AND s.expires_at > ?
    """, (session_token, current_time))
    
    result = cursor.fetchone()
    conn.close()
    
    print(f"Session query result: {result}")
    
    if result:
        print(f"Session expires at: {result[2]}, current time: {current_time}")
        return {"id": result[0], "email": result[1]}
    return None

# Contact operations
def create_contact(email: str, name: str = None, topic: str = None) -> int:
    """Create a new contact"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    confirm_token = secrets.token_urlsafe(32)
    
    try:
        cursor.execute(
            "INSERT INTO contacts (email, name, topic, confirm_token, status) VALUES (?, ?, ?, ?, ?)",
            (email, name, topic, confirm_token, 'active')
        )
        contact_id = cursor.lastrowid
        conn.commit()
        return contact_id
    except sqlite3.IntegrityError:
        raise ValueError("Contact with this email already exists")
    finally:
        conn.close()

def update_contact(contact_id: int, email: str = None, name: str = None, topic: str = None):
    """Update a contact"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Build dynamic update query
    updates = []
    params = []
    
    if email is not None:
        updates.append("email = ?")
        params.append(email)
    
    if name is not None:
        updates.append("name = ?")
        params.append(name)
    
    if topic is not None:
        updates.append("topic = ?")
        params.append(topic)
    
    if not updates:
        conn.close()
        return
    
    params.append(contact_id)
    query = f"UPDATE contacts SET {', '.join(updates)} WHERE id = ?"
    
    cursor.execute(query, params)
    conn.commit()
    conn.close()

def delete_contact(contact_id: int):
    """Delete a contact"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # First delete from all lists
    cursor.execute("DELETE FROM list_contacts WHERE contact_id = ?", (contact_id,))
    
    # Then delete the contact
    cursor.execute("DELETE FROM contacts WHERE id = ?", (contact_id,))
    
    conn.commit()
    conn.close()

def get_contacts() -> List[Dict[str, Any]]:
    """Get all contacts"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, email, name, topic, status, created_at FROM contacts ORDER BY created_at DESC")
    contacts = cursor.fetchall()
    conn.close()
    
    return [
        {
            "id": contact[0],
            "email": contact[1],
            "name": contact[2],
            "topic": contact[3],
            "status": contact[4],
            "created_at": contact[5]
        }
        for contact in contacts
    ]

def add_contact_to_list(contact_id: int, list_id: int):
    """Add contact to a list"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "INSERT INTO list_contacts (contact_id, list_id) VALUES (?, ?)",
            (contact_id, list_id)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        # Contact already in list
        pass
    finally:
        conn.close()

def remove_contact_from_list(contact_id: int, list_id: int):
    """Remove contact from a list"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "DELETE FROM list_contacts WHERE contact_id = ? AND list_id = ?",
            (contact_id, list_id)
        )
        conn.commit()
    finally:
        conn.close()

def get_contacts_in_list(list_id: int) -> List[Dict[str, Any]]:
    """Get all contacts in a specific list"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    print(f"Getting contacts for list_id: {list_id}")
    
    cursor.execute("""
        SELECT c.id, c.email, c.name, c.topic, c.status, c.created_at
        FROM contacts c
        JOIN list_contacts lc ON c.id = lc.contact_id
        WHERE lc.list_id = ?
        ORDER BY c.created_at DESC
    """, (list_id,))
    
    contacts = cursor.fetchall()
    print(f"Raw contacts from DB: {contacts}")
    
    conn.close()
    
    result = [
        {
            "id": contact[0],
            "email": contact[1],
            "name": contact[2],
            "topic": contact[3],
            "status": contact[4],
            "created_at": contact[5]
        }
        for contact in contacts
    ]
    
    print(f"Processed contacts: {result}")
    return result

# List operations
def create_list(name: str, title: str, slug: str, bg_image_url: str = None, subscription_fields: List[Dict] = None) -> int:
    """Create a new list"""
    import json
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if subscription_fields is None:
        subscription_fields = []
    
    try:
        cursor.execute(
            "INSERT INTO lists (name, title, slug, bg_image_url, subscription_fields) VALUES (?, ?, ?, ?, ?)",
            (name, title, slug, bg_image_url, json.dumps(subscription_fields))
        )
        list_id = cursor.lastrowid
        conn.commit()
        return list_id
    except sqlite3.IntegrityError:
        raise ValueError("List with this slug already exists")
    finally:
        conn.close()

def get_lists() -> List[Dict[str, Any]]:
    """Get all lists"""
    import json
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, name, title, slug, bg_image_url, subscription_fields, created_at FROM lists ORDER BY created_at DESC")
    lists = cursor.fetchall()
    conn.close()
    
    return [
        {
            "id": list_[0],
            "name": list_[1],
            "title": list_[2],
            "slug": list_[3],
            "bg_image_url": list_[4],
            "subscription_fields": json.loads(list_[5]) if list_[5] else [],
            "created_at": list_[6]
        }
        for list_ in lists
    ]

def update_list(list_id: int, name: str = None, title: str = None, slug: str = None, bg_image_url: str = None, subscription_fields: List[Dict] = None):
    """Update a list"""
    import json
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Build dynamic update query
    updates = []
    params = []
    
    if name is not None:
        updates.append("name = ?")
        params.append(name)
    
    if title is not None:
        updates.append("title = ?")
        params.append(title)
    
    if slug is not None:
        updates.append("slug = ?")
        params.append(slug)
    
    if bg_image_url is not None:
        updates.append("bg_image_url = ?")
        params.append(bg_image_url)
    
    if subscription_fields is not None:
        updates.append("subscription_fields = ?")
        params.append(json.dumps(subscription_fields))
    
    if not updates:
        conn.close()
        return
    
    params.append(list_id)
    query = f"UPDATE lists SET {', '.join(updates)} WHERE id = ?"
    
    cursor.execute(query, params)
    conn.commit()
    conn.close()

def delete_list(list_id: int):
    """Delete a list"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # First delete all contacts from this list
    cursor.execute("DELETE FROM list_contacts WHERE list_id = ?", (list_id,))
    
    # Then delete the list
    cursor.execute("DELETE FROM lists WHERE id = ?", (list_id,))
    
    conn.commit()
    conn.close()

def get_list_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    """Get list by slug"""
    import json
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, name, title, slug, bg_image_url, subscription_fields, created_at FROM lists WHERE slug = ?", (slug,))
    result = cursor.fetchone()
    conn.close()
    
    if result:
        return {
            "id": result[0],
            "name": result[1],
            "title": result[2],
            "slug": result[3],
            "bg_image_url": result[4],
            "subscription_fields": json.loads(result[5]) if result[5] else [],
            "created_at": result[6]
        }
    return None

# Campaign operations
def create_campaign(subject: str, html: str, created_by: int, list_ids: List[int] = None, send_to_all: bool = False) -> int:
    """Create a new campaign"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Create the campaign
        cursor.execute(
            "INSERT INTO campaigns (subject, html, created_by, send_to_all) VALUES (?, ?, ?, ?)",
            (subject, html, created_by, send_to_all)
        )
        campaign_id = cursor.lastrowid
        
        # Add campaign-list relationships if not sending to all
        if not send_to_all and list_ids:
            for list_id in list_ids:
                cursor.execute(
                    "INSERT INTO campaign_lists (campaign_id, list_id) VALUES (?, ?)",
                    (campaign_id, list_id)
                )
        
        conn.commit()
        return campaign_id
    finally:
        conn.close()

def get_campaigns() -> List[Dict[str, Any]]:
    """Get all campaigns"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT c.id, c.subject, c.html, c.send_to_all, c.created_by, c.created_at
        FROM campaigns c
        ORDER BY c.created_at DESC
    """)
    campaigns = cursor.fetchall()
    
    # Get lists for each campaign
    result = []
    for campaign in campaigns:
        campaign_id = campaign[0]
        
        # Get lists for this campaign
        cursor.execute("""
            SELECT l.id, l.title
            FROM campaign_lists cl
            JOIN lists l ON cl.list_id = l.id
            WHERE cl.campaign_id = ?
        """, (campaign_id,))
        lists = cursor.fetchall()
        
        result.append({
            "id": campaign[0],
            "subject": campaign[1],
            "html": campaign[2],
            "send_to_all": campaign[3],
            "created_by": campaign[4],
            "created_at": campaign[5],
            "lists": [{"id": l[0], "title": l[1]} for l in lists],
            "status": "draft"  # Default status for now
        })
    
    conn.close()
    return result

def delete_campaign(campaign_id: int):
    """Delete a campaign"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM campaigns WHERE id = ?", (campaign_id,))
        conn.commit()
    finally:
        conn.close()

def update_campaign(campaign_id: int, subject: str, html: str, list_ids: List[int] = None, send_to_all: bool = False):
    """Update a campaign"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Update campaign basic info
        cursor.execute(
            "UPDATE campaigns SET subject = ?, html = ?, send_to_all = ? WHERE id = ?",
            (subject, html, send_to_all, campaign_id)
        )
        
        # Remove existing campaign-list relationships
        cursor.execute("DELETE FROM campaign_lists WHERE campaign_id = ?", (campaign_id,))
        
        # Add new campaign-list relationships if not sending to all
        if not send_to_all and list_ids:
            for list_id in list_ids:
                cursor.execute(
                    "INSERT INTO campaign_lists (campaign_id, list_id) VALUES (?, ?)",
                    (campaign_id, list_id)
                )
        
        conn.commit()
    finally:
        conn.close()

# Settings operations
def get_settings() -> Dict[str, Any]:
    """Get application settings"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM settings ORDER BY id DESC LIMIT 1")
    result = cursor.fetchone()
    conn.close()
    
    if result:
        return {
            "id": result[0],
            "resend_api_key": result[1],
            "sender_email": result[2],
            "sender_name": result[3],
            "reply_to": result[4],
            "created_at": result[5]
        }
    return {}

def update_settings(**kwargs) -> None:
    """Update application settings"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if settings exist
    cursor.execute("SELECT COUNT(*) FROM settings")
    count = cursor.fetchone()[0]
    
    if count == 0:
        # Create new settings
        cursor.execute("""
            INSERT INTO settings (resend_api_key, sender_email, sender_name, reply_to)
            VALUES (?, ?, ?, ?)
        """, (
            kwargs.get('resend_api_key'),
            kwargs.get('sender_email'),
            kwargs.get('sender_name', 'Olivia Vélez'),
            kwargs.get('reply_to')
        ))
    else:
        # Update existing settings
        set_clause = ", ".join([f"{key} = ?" for key in kwargs.keys()])
        values = list(kwargs.values())
        
        cursor.execute(f"UPDATE settings SET {set_clause} WHERE id = (SELECT MAX(id) FROM settings)", values)
    
    conn.commit()
    conn.close()

def migrate_campaigns_list_fields():
    """Add list_id and send_to_all fields to campaigns table"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(campaigns)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'list_id' not in columns:
            cursor.execute("ALTER TABLE campaigns ADD COLUMN list_id INTEGER")
        
        if 'send_to_all' not in columns:
            cursor.execute("ALTER TABLE campaigns ADD COLUMN send_to_all BOOLEAN DEFAULT FALSE")
        
        conn.commit()
        print("Campaigns table migrated successfully")
    except Exception as e:
        print(f"Error migrating campaigns table: {e}")
    finally:
        conn.close()
