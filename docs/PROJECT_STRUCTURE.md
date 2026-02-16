## Estructura de carpetas

```
olisender/
│
├── frontend/                # SvelteKit + Tailwind
│   ├── src/
│   │   ├── routes/
│   │   │   ├── subscribe/[slug]/
│   │   │   ├── login/
│   │   │   ├── dashboard/
│   │   │   ├── contacts/
│   │   │   ├── lists/
│   │   │   ├── campaigns/
│   │   │   └── branding/
│   │   ├── components/
│   │   └── lib/
│   └── tailwind.config.js
│
├── backend/
│   ├── main.py               # FastAPI entry
│   ├── db.py                 # SQLite ORM models
│   ├── routers/
│   │   ├── auth.py
│   │   ├── contacts.py
│   │   ├── lists.py
│   │   ├── campaigns.py
│   │   └── branding.py
│   └── templates/            # HTML for emails
│
└── README.md
```