# Caveo - Authentication & User Management API

[![Node.js](https://img.shields.io/badge/Node.js-22-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![KoaJS](https://img.shields.io/badge/Koa-3.0-orange.svg)](https://koajs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![AWS Cognito](https://img.shields.io/badge/AWS-Cognito-orange.svg)](https://aws.amazon.com/cognito/)

Uma API moderna de autenticação e gerenciamento de usuários construída com **KoaJS**, **TypeORM**, **PostgreSQL** e **AWS Cognito**.

## Features

- **JWT Authentication** com AWS Cognito
- **Role-based Access Control** (Admin/User)
- **PostgreSQL** com TypeORM
- **Docker** containerized
- **Terraform** infrastructure as code
- **Swagger/OpenAPI** documentation
- **100% test coverage** (120 tests)
- **Production ready** deployment

---

## Quick Start

### Prerequisites
- Node.js 22+
- Docker & Docker Compose
- AWS Account (for Cognito)

### Installation
```bash
# Clone repository
git clone https://github.com/yamar-s/caveo.git
cd caveo

# Install dependencies  
npm install

# Setup environment
cp .env.example .env.local

# Start with Docker
npm run docker:up

# Run tests
npm test
```

### Access Points
- **API**: http://localhost:3000/api/v1
- **Swagger UI**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/health

---

## API Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/auth/signin-or-register` | Public | Sign in or register user |
| `GET` | `/account/me` | Protected | Get current user profile |
| `PUT` | `/account/edit-account` | Protected | Update profile (role-based) |
| `GET` | `/users` | Admin Only | List all users |

### Permission Matrix
| Role | `/me` | `/edit-account` | `/users` | Can Change Role |
|------|-------|----------------|----------|----------------|
| **user** | Yes | Yes (name only) | No | No |
| **admin** | Yes | Yes (name + role) | Yes | Yes |

---

## Documentation

| Document | Description |
|----------|-------------|
| **[API-GUIDE.md](./API-GUIDE.md)** | Complete API usage guide with examples |
| **[PROJECT-STRUCTURE.md](./PROJECT-STRUCTURE.md)** | Architecture & code organization |
| **[INFRASTRUCTURE.md](./INFRASTRUCTURE.md)** | AWS infrastructure & deployment |

---

## Architecture

```
                       ┌──────────────────┐    ┌─────────────────┐
                       │     Caveo API    │    │   AWS Cognito   │
                       │                  │────│                 │
                       │ Koa + TypeScript │    │ User Pool + JWT │
                       └──────────────────┘    └─────────────────┘
                                │
                       ┌──────────────────┐
                       │   PostgreSQL     │
                       │                  │
                       │ User Data + Roles│
                       └──────────────────┘
```

### Tech Stack
- **Runtime**: Node.js 22 (ESM modules)
- **Framework**: KoaJS + routing-controllers
- **Database**: PostgreSQL + TypeORM
- **Authentication**: AWS Cognito + JWT
- **Language**: TypeScript
- **Testing**: Jest (120 tests)
- **Container**: Docker + Docker Compose
- **Infrastructure**: Terraform + AWS

---

## Development

### Environment Setup
```bash
# Development mode
npm run dev

# Build for production
npm run build

# Start production build
npm start

# Run tests with coverage
npm run test:coverage

# Lint and format
npm run lint:fix
npm run format
```

### Database Schema
The database schema is managed automatically by TypeORM using entity decorators. See `src/entities/user.entity.ts` for the complete User entity definition.

---

## Deployment

### Docker Production
```bash
# Build and deploy
npm run docker:prod

# View logs
npm run docker:prod:logs
```

### AWS Terraform
```bash
# Deploy infrastructure
cd terraform
terraform init
terraform apply

# Deploy application
./deploy.sh
```

---

## Testing

```bash
# Run all tests
npm test                    # 120 tests

# Test categories
npm run test -- --testNamePattern="Controller"  # Integration tests
npm run test -- --testNamePattern="Service"     # Unit tests  
npm run test -- --testNamePattern="Middleware"  # Middleware tests

# Coverage report
npm run test:coverage       # 100% coverage maintained
```

### Test Results
```
Test Suites: 12 passed, 12 total
Tests:       120 passed, 120 total
Snapshots:   0 total
Time:        4.09 s
```

---

## Security

### Authentication Flow
1. **Login**: User authenticates with AWS Cognito
2. **JWT**: Cognito returns signed JWT token
3. **Validation**: API validates JWT on each request  
4. **Authorization**: Role middleware checks permissions

### Role Management
- **Groups in Cognito**: `admin`, `user`
- **Database Sync**: Roles synced with local database
- **Permission Control**: Route-level access control

### Security Features
- JWT token validation with Cognito JWKS
- Role-based access control (RBAC)
- Input validation with class-validator
- SQL injection protection via TypeORM
- Environment variable secrets
- HTTPS in production

---

## Project Requirements Compliance

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Node.js + KoaJS | Complete | Node.js 22 + Koa 3.0 |
| TypeORM + PostgreSQL | Complete | TypeORM 0.3.27 + PostgreSQL 15 |
| TypeScript | Complete | TypeScript 5.0 with strict mode |
| User table fields | Complete | All fields: name, email, role, isOnboarded, timestamps |
| Docker Compose | Complete | Dev + prod configurations |
| AWS Cognito | Complete | User Pool + Groups via Terraform |
| JWT Middleware | Complete | Token validation + role checking |
| Scopes & Permissions | Complete | Admin/user roles with specific permissions |
| Required Routes | Complete | `/auth`, `/me`, `/edit-account`, `/users` |
| Documentation | Complete | Swagger UI + comprehensive guides |
| Small Commits | Complete | 16 organized commits by context |

**Compliance Score: 10/10**

---

## License

This project is licensed under the ISC License.

---

## Support

- **Documentation**: [Swagger UI](http://localhost:3000/docs)
- **Issues**: [GitHub Issues](https://github.com/yamar-s/caveo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yamar-s/caveo/discussions)

---

**Built by [Yasmin Martins Vasconcellos](https://github.com/yamar-s)**
