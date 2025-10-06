# API Guide Documentation

## Overview

Guia essencial da API **Caveo** com informações de autenticação e uso básico.

## Quick Start

### Base URL
```
Development: http://localhost:3000/api/v1
Production:  https://your-domain.com/api/v1
```

### Authentication
Todas as rotas protegidas requerem um JWT token no header:
```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

### Interactive Documentation
- **Swagger UI**: `GET /docs`
- **Health Check**: `GET /health`

---

## Authentication Flow

### 1. Sign In or Register
- **Endpoint**: `POST /auth/signin-or-register`
- **Access**: Public
- Autentica usuário existente ou cria novo automaticamente

### 2. Get Profile  
- **Endpoint**: `GET /account/me`
- **Access**: Authenticated users
- Retorna perfil do usuário logado

### 3. Update Profile
- **Endpoint**: `PUT /account/edit-account`
- **Access**: Authenticated users (role-based permissions)
- Users: podem alterar apenas `name`
- Admins: podem alterar `name` e `role`

### 4. List Users
- **Endpoint**: `GET /users`
- **Access**: Admin only
- Lista todos os usuários cadastrados

---

## Role-Based Access Control

| Role | `/me` | `/edit-account` | `/users` | Can Change Role |
|------|-------|----------------|----------|----------------|
| **user** | Yes | Yes (name only) | No | No |
| **admin** | Yes | Yes (name + role) | Yes | Yes |

---

## Basic Usage Flow

### 1. Authentication
```bash
# Sign in or register
curl -X POST http://localhost:3000/api/v1/auth/signin-or-register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "SecurePass123!"}'
```

### 2. Access Protected Routes
```bash
# Get profile (replace TOKEN with actual token)
curl -X GET http://localhost:3000/api/v1/account/me \
  -H "Authorization: Bearer TOKEN"

# Update profile
curl -X PUT http://localhost:3000/api/v1/account/edit-account \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
```

---

## Support

- **Documentation**: `/docs` (Swagger UI)
- **Health Check**: `/health`
- **API Spec**: `/api-docs.json`

This guide covers the essential information for integrating with the Caveo API. For detailed endpoint specifications, refer to the Swagger documentation.

---
