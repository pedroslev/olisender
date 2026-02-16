# 📘 Documento de Requerimientos Funcionales  
**Proyecto:** OliSender
**Objetivo:** Plataforma para gestionar contactos, listas de difusión y campañas de correo electrónico, con integración a **Resend API**, branding personalizado y diseño **mobile-first**.

---

## 1. Objetivo general
Permitir que la usuaria (profesora o creadora de contenido) administre contactos, listas de difusión y campañas de email, con un panel privado simple y páginas públicas de suscripción visualmente coherentes con su marca.

---

## 2. Alcance funcional
El sistema debe ofrecer:

1. **Autenticación** para la administradora.  
2. **Gestión de contactos** (importar, editar, eliminar, exportar).  
3. **Listas de difusión** (crear, gestionar, asociar contactos).  
4. **Campañas** (crear, previsualizar, enviar con Resend).  
5. **Formularios públicos de suscripción** con branding propio de olivelez
6. **Historial y estadísticas básicas.**  
7. **Configuración visual** (colores, tipografía, fondos, logo).  
8. **Diseño mobile-first** en todas las vistas.

---

## 3. Autenticación y seguridad

### Requerimientos funcionales
- **RF-A1:** Registro inicial del usuario administrador.  
- **RF-A2:** Login por email/contraseña o magic link.  
- **RF-A3:** Sesión segura (`HttpOnly` cookie o JWT).  
- **RF-A4:** Logout.  
- **RF-A5:** Recupero de acceso.  
- **RF-A6:** Middleware para proteger rutas privadas.

### Requerimientos no funcionales
- **RNF-A1:** Hash de contraseña (`bcrypt`).  
- **RNF-A2:** Cookies seguras y CSRF token en formularios.  
- **RNF-A3:** Rate-limit de intentos de login.

---

## 4. Páginas y vistas

### Páginas públicas
| Ruta | Funcionalidad |
|------|----------------|
| `/subscribe/{slug}` | Landing para suscripción a una lista. |
| `/api/subscribe` | API para recibir altas de contacto. |
| `/thanks` | Pantalla de confirmación tras suscribirse. |
| `/u/{token}` | Baja (unsubscribe) con token único. |
| `/prefs/{token}` | Preferencias de listas (opcional). |

### Páginas privadas
| Ruta | Funcionalidad |
|------|----------------|
| `/login` | Acceso al panel. |
| `/dashboard` | Métricas básicas. |
| `/contacts` | Gestión e importación de contactos. |
| `/lists` | Gestión de listas y asignación. |
| `/campaigns` | Creación, previsualización y envío de campañas. |
| `/templates` | Plantillas de email. |
| `/settings` | Configuración general y clave de Resend. |

---

## 5. Funcionalidades principales

### Contactos
- Importar `.txt` o `.csv`.
- Validar formato de email y eliminar duplicados.
- Editar, eliminar o exportar contactos.

### Listas
- Crear, editar y eliminar listas.
- Asociar contactos a listas.
- Asignar imagen o color de fondo para formularios públicos.

### Campañas
- Crear campaña con asunto + contenido (HTML o WYSIWYG).
- Insertar placeholders (`{{nombre}}`, `{{tema}}`).
- Previsualizar y enviar prueba.
- Enviar a toda la lista o solo a contactos no enviados.
- Registrar logs de envío.

---

## 6. Diseño e interfaz

- **Mobile-first:** todo el panel y las landings deben adaptarse perfectamente a dispositivos móviles.  
- **Framework CSS recomendado:** TailwindCSS
- **Estilo:** limpio, profesional, con énfasis en legibilidad.  
- **Modo oscuro:** opcional, configurable en el panel.  
- **Componente reutilizable:** header/footer comunes a todas las vistas.

---

## 7. Modelo de datos (SQLite)

### users
| Campo | Tipo | Descripción |
|--------|------|-------------|
| id | INTEGER PK | Identificador |
| email | TEXT UNIQUE | Correo de acceso |
| password_hash | TEXT | Contraseña cifrada |
| created_at | DATETIME | Fecha de creación |

### sessions
| Campo | Tipo |
|--------|------|
| id | INTEGER PK |
| user_id | INTEGER FK → users.id |
| session_token | TEXT UNIQUE |
| expires_at | DATETIME |

### contacts
| Campo | Tipo |
|--------|------|
| id | INTEGER PK |
| email | TEXT UNIQUE |
| name | TEXT |
| topic | TEXT |
| status | TEXT CHECK(status IN ('pending','active','unsubscribed')) |
| confirm_token | TEXT |
| created_at | DATETIME |

### lists
| Campo | Tipo |
|--------|------|
| id | INTEGER PK |
| name | TEXT |
| slug | TEXT UNIQUE |
| bg_image_url | TEXT |
| created_at | DATETIME |

### list_contacts
| Campo | Tipo |
|--------|------|
| list_id | INTEGER FK → lists.id |
| contact_id | INTEGER FK → contacts.id |
| created_at | DATETIME |
**PK compuesta:** (list_id, contact_id)

### campaigns
| Campo | Tipo |
|--------|------|
| id | INTEGER PK |
| subject | TEXT |
| html | TEXT |
| created_by | INTEGER FK → users.id |
| created_at | DATETIME |

### sent_log
| Campo | Tipo |
|--------|------|
| id | INTEGER PK |
| campaign_id | INTEGER FK → campaigns.id |
| contact_id | INTEGER FK → contacts.id |
| status | TEXT CHECK(status IN ('queued','sent','failed')) |
| provider_msg_id | TEXT |
| error_msg | TEXT |
| sent_at | DATETIME |

### templates
| Campo | Tipo |
|--------|------|
| id | INTEGER PK |
| name | TEXT |
| html | TEXT |
| created_at | DATETIME |

### settings
| Campo | Tipo |
|--------|------|
| id | INTEGER PK |
| resend_api_key | TEXT |
| sender_email | TEXT |
| sender_name | TEXT |
| double_opt_in | BOOLEAN |
| reply_to | TEXT |

---

## 8. Relaciones (diagrama ER)

```mermaid
erDiagram
    USERS ||--o{ SESSIONS : owns
    USERS ||--o{ CAMPAIGNS : creates
    LISTS ||--o{ LIST_CONTACTS : contains
    CONTACTS ||--o{ LIST_CONTACTS : belongs
    CAMPAIGNS ||--o{ SENT_LOG : logs
    CONTACTS ||--o{ SENT_LOG : receives
````

---

## 9. Flujo principal de uso

1. **Login** → ingreso al panel.
2. **Importar contactos** o recibir altas desde formularios.
3. **Crear lista** y asociar contactos.
4. **Diseñar campaña** → previsualizar → enviar vía Resend.
5. **Consultar historial** y reenviar si desea.
6. **Usuarios externos** se suscriben desde `/subscribe/{slug}` y pueden darse de baja con `/u/{token}`.

---

## 10. Arquitectura técnica

| Componente      | Tecnología recomendada                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| **Frontend**    | **SvelteKit** + Tailwind CSS → excelente performance, soporte SSR opcional, deploy gratuito en Vercel/Netlify. |
| **Backend/API** | **FastAPI** + SQLite → simple, estable y perfecto para Render o Railway (free tier).                           |
| **Mailer**      | **Resend API** (desde backend, nunca expuesta al cliente).                                                     |
| **Auth**        | JWT o cookies firmadas (`itsdangerous`/`fastapi-sessions`).                                                    |
| **DB local**    | SQLite file (`data/newsletter.db`).                                                                            |
| **Hosting**     | Frontend en **Vercel**, backend en **Render/Railway**.                                                         |

---

## 11. Diseño mobile-first — principios clave

* Breakpoint base: **360px** (teléfono).
* Layouts fluidos y tipografía responsiva (`text-[clamp(1rem,1vw+0.5rem,1.25rem)]`).
* Botones de acción grandes y espaciados (mínimo 44px de alto).
* Menú colapsable en panel lateral o “hamburger”.
* Formularios simples, legibles, centrados.
* Testing en dispositivos iPhone/Android y Chrome responsive.

---

## 12. Seguridad mínima

* Rate limit de suscripción pública.
* Validación de inputs.
* Tokens de confirmación y baja con expiración.
* Protección CSRF en panel.
* No exponer claves ni endpoints Resend desde el frontend.

---

## 13. Mantenimiento y backup

* Backup del archivo `newsletter.db` descargable desde `/settings`.
* Exportar contactos o listas a `.csv`.
* Logs de envío y errores consultables desde el panel.

---

## 14. Futuras extensiones (opcional)

* Programar campañas (scheduler).
* Métricas de apertura/click (pixel tracking).

---

## 15. Stack recomendado resumen

| Capa               | Opción                           | Motivo                                            |
| ------------------ | -------------------------------- | ------------------------------------------------- |
| **Frontend**       | **SvelteKit + Tailwind**         | Liviano, fácil de desplegar, mobile-first nativo. |
| **Backend**        | **FastAPI + SQLite**             | Simple, potente, gran compatibilidad con Resend.  |
| **Hosting**        | **Vercel + Render (free tiers)** | 100 % sin VPS ni costos.                          |
| **Email provider** | **Resend**                       | API limpia y confiable.                           |

---

## 16. Conclusión

La app debe ser **rápida, visualmente coherente y pensada desde el móvil hacia arriba**, evitando infraestructura compleja.
Con SvelteKit (frontend) y FastAPI (backend) podés tener todo corriendo gratis en pocas horas, con almacenamiento SQLite y la flexibilidad de escalar más adelante si crece el uso.

---

```

---

¿Querés que te agregue al final de este mismo bloque el **SQL real de creación de tablas para SQLite** (para que lo copies directo en `init.sql` o dentro de `db.py`)?  
Así te queda el esquema de datos listo para levantar el proyecto.
```
