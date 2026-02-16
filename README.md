# 📧 OliSender - Plataforma de Email Marketing para Olivia Vélez

OliSender es una plataforma completa de gestión de email marketing diseñada específicamente para **Olivia Vélez**, profesora de Pole Dance, que permite gestionar contactos, listas de difusión y campañas de correo electrónico con branding personalizado y diseño mobile-first.

## 🌟 Características

- **Panel de Administración**: Gestión completa de contactos, listas y campañas
- **Páginas Públicas**: Landing pages de suscripción con branding personalizado
- **Integración Resend**: Envío profesional de emails
- **Branding Personalizado**: Colores, tipografías y estilos de Olivia Vélez
- **Mobile-First**: Diseño optimizado para dispositivos móviles
- **Autenticación Segura**: Sistema de login con sesiones protegidas

## 🛠 Stack Tecnológico

### Backend
- **FastAPI** - Framework web moderno y rápido
- **SQLite** - Base de datos ligera y portable
- **Resend API** - Servicio de envío de emails
- **Python 3.8+** - Lenguaje de programación

### Frontend
- **SvelteKit** - Framework web reactivo
- **Tailwind CSS** - Framework de CSS utilitario
- **TypeScript** - Tipado estático opcional

## 🚀 Instalación y Configuración

### Prerrequisitos
- Python 3.8 o superior
- Node.js 16 o superior
- npm o yarn

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd olisender
```

### 2. Configurar el Backend

```bash
cd backend
pip install -r requirements.txt
```

Crear archivo `.env` basado en `.env.example`:
```bash
cp .env.example .env
```

Editar `.env` con tus configuraciones:
```env
# Resend API (obtener de https://resend.com)
RESEND_API_KEY=tu-api-key-de-resend

# Email settings
SENDER_EMAIL=noreply@olivelez.com.ar
SENDER_NAME=Olivia Vélez
REPLY_TO=hola@olivelez.com.ar
```

### 3. Configurar el Frontend

```bash
cd frontend
npm install
```

### 4. Ejecutar en Desarrollo

**Terminal 1 - Backend:**
```bash
cd backend
python main.py
```
El backend estará disponible en `http://localhost:8000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
El frontend estará disponible en `http://localhost:5173`

## 📱 Uso

### 1. Registro e Inicio de Sesión
- Visita `http://localhost:5173/register` para crear una cuenta
- O usa `http://localhost:5173/login` si ya tienes cuenta

### 2. Configuración Inicial
- Ve a **Branding** para personalizar colores y textos
- Configura tu **API Key de Resend** en **Campañas > Configuración**

### 3. Gestión de Contactos
- Importa contactos desde CSV o agrégalos manualmente
- Organiza contactos en listas de difusión

### 4. Crear Campañas
- Diseña emails con editor HTML
- Usa placeholders: `{{nombre}}`, `{{email}}`, `{{tema}}`
- Envía pruebas antes del envío masivo

### 5. Páginas Públicas
- Las listas generan automáticamente páginas de suscripción
- URL: `http://localhost:5173/subscribe/{slug-de-la-lista}`

## 🎨 Branding de Olivia Vélez

### Paleta de Colores
- **Primario (piel cálida)**: `#F6BFA7`
- **Secundario (azul fondo)**: `#90BFD6`
- **Acento (metálico)**: `#D8D8D8`
- **Tipografía**: `#333333`
- **Fondo claro**: `#FFF8F6`

### Tipografías
- **Títulos**: Playfair Display (serif moderna, femenina)
- **Texto general**: Inter (sans-serif legible)

## 📁 Estructura del Proyecto

```
olisender/
├── backend/                 # FastAPI + SQLite
│   ├── main.py             # Punto de entrada
│   ├── db.py               # Modelos de base de datos
│   ├── routers/            # Rutas de API
│   │   ├── auth.py
│   │   ├── contacts.py
│   │   ├── lists.py
│   │   ├── campaigns.py
│   │   └── branding.py
│   └── templates/           # Plantillas de email
│
├── frontend/               # SvelteKit + Tailwind
│   ├── src/
│   │   ├── routes/         # Páginas de la aplicación
│   │   ├── lib/
│   │   │   ├── components/ # Componentes reutilizables
│   │   │   └── stores/     # Estado global
│   │   └── app.css         # Estilos globales
│   └── tailwind.config.js  # Configuración de Tailwind
│
└── docs/                   # Documentación
    ├── PRD.md
    ├── BRANDING.md
    └── PROJECT_STRUCTURE.md
```

## 🔧 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/me` - Información del usuario actual

### Contactos
- `GET /api/contacts` - Listar contactos
- `POST /api/contacts` - Crear contacto
- `POST /api/contacts/import` - Importar contactos

### Listas
- `GET /api/lists` - Listar listas
- `POST /api/lists` - Crear lista
- `GET /api/lists/{slug}` - Obtener lista por slug

### Campañas
- `GET /api/campaigns` - Listar campañas
- `POST /api/campaigns` - Crear campaña
- `POST /api/campaigns/send` - Enviar campaña

### Público
- `POST /api/subscribe/{slug}` - Suscripción pública
- `GET /api/branding/public/{slug}` - Branding público

## 🚀 Despliegue

### Frontend (Vercel)
1. Conecta tu repositorio a Vercel
2. Configura el directorio raíz como `frontend`
3. Las variables de entorno se configuran automáticamente

### Backend (Render/Railway)
1. Conecta tu repositorio
2. Configura el directorio raíz como `backend`
3. Añade las variables de entorno necesarias
4. El archivo SQLite se crea automáticamente

## 🔒 Seguridad

- Autenticación con tokens de sesión
- Validación de inputs en frontend y backend
- Rate limiting en endpoints públicos
- CORS configurado para desarrollo y producción
- Hash de contraseñas con SHA-256

## 📞 Soporte

Para soporte técnico o preguntas sobre el proyecto, contacta al desarrollador.

## 📄 Licencia

Este proyecto es privado y está diseñado específicamente para Olivia Vélez.

---

**Desarrollado con 💫 para Olivia Vélez - Las clases de Oli**
