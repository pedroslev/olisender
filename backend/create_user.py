#!/usr/bin/env python3
"""
Script para crear el usuario administrador de OliSender
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db import create_user

def main():
    print("=== Crear Usuario Administrador para OliSender ===")
    print()
    
    email = input("Email del administrador: ").strip()
    if not email:
        print("❌ Email requerido")
        return
    
    password = input("Contraseña: ").strip()
    if not password:
        print("❌ Contraseña requerida")
        return
    
    if len(password) < 6:
        print("❌ La contraseña debe tener al menos 6 caracteres")
        return
    
    try:
        user_id = create_user(email, password)
        print(f"✅ Usuario creado exitosamente!")
        print(f"   ID: {user_id}")
        print(f"   Email: {email}")
        print()
        print("Ahora puedes iniciar sesión en:")
        print("   http://localhost:5173/login")
        print()
        print("Credenciales:")
        print(f"   Email: {email}")
        print(f"   Contraseña: {password}")
        
    except ValueError as e:
        print(f"❌ Error: {e}")
    except Exception as e:
        print(f"❌ Error inesperado: {e}")

if __name__ == "__main__":
    main()
