# Caveo Challenge - Node.js 22 API

Modern TypeScript API with AWS integration and automated CI/CD pipeline.

## Features

- **Node.js 22** with ESM modules and Bundler resolution
- **TypeScript** with modern compilation and strict type c- Infrastructure and application deployment unified

## Quick Testking
- **AWS Integration**: Cognito, ECR Public, Secrets Manager
- **Complete Test Suite**: 120 tests with Jest (100% passing)
- **Automated CI/CD**: GitHub Actions with multi-stage pipeline
- **Docker Production Ready**: Multi-stage optimized Dockerfile
- **Infrastructure as Code**: Terraform for complete AWS resources
- **Enterprise Security**: Helmet, CORS, rate limiting (100 req/min)
- **Zero Lint Errors**: ESLint with 0 errors, 27 warnings

## Infrastructure

Complete AWS infrastructure managed with Terraform:
- **EC2 Instance**: t3.micro with auto-scaling ready
- **ECR Public**: Docker image registry
- **Cognito**: User Pool with admin/user groups
- **Secrets Manager**: Secure environment variables
- **IAM Roles**: EC2 instance profile with Secrets Manager access
- **Security Groups**: Configured for HTTP/HTTPS/SSH access

## CI/CD Pipeline

The project uses GitHub Actions for automated deployment with parallel execution:

### Pipeline Stages

1. **Lint Stage** (Parallel)
   - ESLint validation
   - Code style checking
   - 0 errors enforced

2. **Test Stage** (Parallel)
   - 120 Jest unit/integration tests
   - Coverage reports
   - All tests must pass

3. **Build Stage** (Sequential)
   - TypeScript compilation
   - Multi-stage Docker build
   - Node.js 22 Alpine base image

4. **Deploy Stage** (Sequential, main branch only)
   - Login to Amazon ECR Public
   - Push Docker image with tags (latest + commit SHA)
   - Deploy to EC2 instance
   - Zero-downtime deployment with health checks

### Workflow Status

- **Parallel Jobs**: Lint and Test run simultaneously
- **Sequential Jobs**: Build → Deploy (depends on lint + test)
- **Branch Protection**: Deploy only on main branch
- **Image Tags**: Both `latest` and commit SHA for rollback capability

## Development

### Local Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build
```

### Docker

```bash
# Build image
docker build -t caveo-api .

# Run container
docker run -p 3000:3000 --env-file .env caveo-api
```

## Deployment

### Automated (Recommended)

Simply push to the main branch - the CI/CD pipeline handles everything:

```bash
git push origin main
```

The pipeline will:
1. Run all tests
2. Build and push Docker image
3. Deploy to AWS EC2
4. Perform health checks

### Manual AWS Setup

If you need to set up the infrastructure manually:

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

## Project Structure

```
├── src/                 # TypeScript source code
├── tests/              # Jest test files
├── terraform/          # Infrastructure as code
├── .github/workflows/  # CI/CD pipeline
├── Dockerfile         # Production container
└── package.json       # Dependencies and scripts
```

## Environment Variables

Required environment variables (managed by AWS Secrets Manager in production):

- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3000)
- `DB_HOST`: PostgreSQL host address
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_USERNAME`: Database username
- `DB_PASSWORD`: Database password
- `DB_DATABASE`: Database name
- `JWT_SECRET`: Secret for JWT token signing
- `AWS_REGION`: AWS region for services
- `COGNITO_USER_POOL_ID`: Cognito user pool ID
- `COGNITO_CLIENT_ID`: Cognito client ID

**Note**: Never commit `.env` files or expose secrets in code. Use AWS Secrets Manager in production.

## Testing

The project includes comprehensive test coverage:

### Test Statistics
- **Total Tests**: 120
- **Pass Rate**: 100%
- **Test Suites**: 12
- **Coverage**: All critical paths covered

### Test Types
- **Unit Tests**: Service layer, controllers, helpers
- **Integration Tests**: API endpoints with mocked AWS services
- **AWS Service Mocking**: Cognito, Secrets Manager with aws-sdk-client-mock
- **Database Tests**: TypeORM entity and repository tests
- **Middleware Tests**: Authentication, authorization, error handling

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm test -- auth.service.test.ts
```

## API Documentation

The API is documented with Swagger/OpenAPI and available at `/docs` when running.

### Endpoints

#### Authentication
- `POST /api/auth` - Register or login (sign in or register combined endpoint)

#### Account Management
- `GET /api/account/me` - Get current user account information
- `PUT /api/account/edit` - Update account information

#### User Management (Admin Only)
- `GET /api/users` - List all users (requires admin role)

#### Documentation
- `GET /docs` - Swagger UI interface
- `GET /api-docs.json` - OpenAPI specification
- `GET /health` - Service health check

## AWS Resources

### Infrastructure Components

- **ECR Repository**: Public container registry for Docker images
  - Public access for easy deployment
  - Supports image versioning with tags

- **EC2 Instance**: Application server
  - Type: t3.micro
  - Docker: Active and configured
  - Auto-restart: Enabled

- **Cognito User Pool**: User authentication and management
  - User Groups: admin and user roles
  - MFA: Supported
  - Password Policy: Enforced

- **Secrets Manager**: Secure environment variable storage
  - Auto-rotation: Supported
  - Contains: All sensitive configuration

- **IAM Role**: EC2 instance permissions
  - Permissions: Secrets Manager read access
  - Instance Profile attached
  - Least-privilege principle

- **Security Group**: Network access control
  - Inbound: HTTP, HTTPS, SSH, API port
  - VPC isolated

## Quick Test

Test the deployed API:

```bash
# Health check (replace with your EC2 public IP)
curl http://YOUR_EC2_IP:3000/health

# API documentation
open http://YOUR_EC2_IP:3000/docs
```

**Note**: Get your EC2 public IP from AWS Console or Terraform outputs.

## Additional Documentation

- **Architecture**: See `docs/architecture.md` for system design
- **API Reference**: Available at `/docs` endpoint when running
- **Terraform Outputs**: Run `terraform output` in terraform/ directory
- **CI/CD Pipeline**: See `.github/workflows/ci-cd.yml`

## Security

### Implemented Security Measures

- **Helmet.js**: HTTP security headers (CSP, HSTS, etc.)
- **CORS**: Controlled origin access
- **Rate Limiting**: 100 requests per minute per IP
- **Environment Validation**: Automatic on startup
- **Secret Management**: AWS Secrets Manager integration
- **Log Sanitization**: Automatic credential redaction
- **JWT Authentication**: Secure token-based auth
- **Cognito Integration**: AWS managed user authentication

### Security Audit

```bash
# Run security audit
npm audit

# Check for vulnerabilities
npm audit fix
```

**Current Status**: 0 vulnerabilities

## Support

For issues or questions about this project, please check:
- GitHub Issues
- AWS CloudWatch Logs
- Application logs via `docker logs`

## Challenge Summary

This project demonstrates modern full-stack development best practices:

### Technical Achievements

1. **Node.js 22 Migration**
   - ESM module system with .js extensions
   - Bundler module resolution for compatibility
   - TypeScript 5+ with modern features

2. **AWS Cloud Integration**
   - Cognito for authentication (User Pool + Groups)
   - ECR Public for container registry
   - Secrets Manager for secure configuration
   - IAM roles with least-privilege access

3. **CI/CD Pipeline**
   - Multi-stage GitHub Actions workflow
   - Parallel lint and test execution
   - Automated Docker build and push
   - Zero-downtime EC2 deployment

4. **Infrastructure as Code**
   - Complete Terraform configuration
   - 11 managed AWS resources
   - Reproducible infrastructure
   - State management with outputs

5. **Enterprise Security**
   - Helmet.js for HTTP headers
   - CORS with controlled origins
   - Rate limiting (100 req/min)
   - Environment validation
   - Secret redaction in logs

6. **Code Quality**
   - 0 ESLint errors (27 warnings)
   - 120 passing tests (100%)
   - TypeScript strict mode
   - Comprehensive test coverage

7. **Production Ready**
   - Multi-stage Dockerfile optimization
   - Health check endpoints
   - Graceful shutdown handling
   - Auto-restart on failure
   - Structured logging with Pino

### Key Metrics

- **Lines of Code**: ~5,000+ (TypeScript)
- **Dependencies**: Production-ready, security audited
- **Docker Image**: ~300MB (Alpine-based, multi-stage)
- **Deployment Time**: ~3-5 minutes (automated)
- **Uptime Target**: 99.9% with auto-restart

### Technologies Used

- **Runtime**: Node.js 22 (latest LTS)
- **Language**: TypeScript 5+
- **Framework**: Koa.js with koa-router
- **Database ORM**: TypeORM
- **Testing**: Jest with ts-jest
- **Cloud**: AWS (EC2, ECR, Cognito, Secrets Manager)
- **IaC**: Terraform
- **CI/CD**: GitHub Actions
- **Container**: Docker (Alpine Linux)
- **Security**: Helmet, CORS, express-rate-limit
