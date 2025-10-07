# Caveo Challenge - Node.js 22 API

Modern TypeScript API with AWS integration and automated CI/CD pipeline.

## Features

- **Node.js 22** with ESM modules and Bundler resolution
- **TypeScript** with modern compilation and strict type checks
- **AWS Integration**: Cognito, Secrets Manager
- **Complete Test Suite**: 120 tests with Jest (100% passing)
- **Automated CI/CD**: GitHub Actions with multi-stage pipeline
- **Docker Production Ready**: Multi-stage optimized Dockerfile
- **Infrastructure as Code**: Terraform for complete AWS resources
- **Enterprise Security**: Helmet, CORS, rate limiting (100 req/min)
- **Zero Lint Errors**: ESLint with 0 errors, 27 warnings

## Infrastructure

Complete AWS infrastructure managed with Terraform:
- **RDS PostgreSQL 16.4**: db.t3.micro with 20GB storage, encrypted, auto-scaling to 100GB
- **EC2 Instance**: t3.micro with Elastic IP and IAM instance profile
- **Cognito**: User Pool with admin/user groups for authentication
- **Secrets Manager**: Secure environment variable storage with automatic injection
- **IAM Roles**: EC2 instance profile with Secrets Manager and ECR access
- **Security Groups**: Separate groups for API (ports 22, 3000) and RDS (port 5432)
- **VPC & Subnets**: Default VPC with multi-AZ subnet group for RDS

### Database

- **Engine**: PostgreSQL 16.4
- **Instance**: db.t3.micro (2 vCPU, 1 GB RAM)
- **Storage**: 20 GB SSD (gp3) with auto-scaling up to 100 GB
- **Backup**: 7-day retention with automated snapshots
- **Encryption**: Enabled at rest
- **High Availability**: Multi-AZ deployment ready
- **Monitoring**: CloudWatch logs for PostgreSQL and upgrades

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

### Automated CI/CD

The project uses a fully automated CI/CD pipeline. Any push to the `main` branch triggers automatic deployment:

```bash
# Trigger deployment with your changes
git add .
git commit -m "your changes"
git push origin main
```

The pipeline automatically:
1. ✅ Runs ESLint validation (0 errors enforced)
2. ✅ Executes 120 Jest tests (100% pass rate required)
3. ✅ Builds TypeScript and creates optimized Docker image
4. ✅ Pushes image to ECR Public with `latest` and commit SHA tags
5. ✅ Deploys to EC2 with zero-downtime strategy
6. ✅ Loads environment variables from AWS Secrets Manager
7. ✅ Connects to RDS PostgreSQL database
8. ✅ Performs health checks

**Deployment Time**: ~3-4 minutes from push to live

### Infrastructure Management

To provision or update the AWS infrastructure, use Terraform:

```bash
cd terraform

# Initialize Terraform
terraform init

# Review changes
terraform plan

# Apply infrastructure changes
terraform apply

# View outputs (EC2 IP, RDS endpoint, etc.)
terraform output
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
 
**EC2 Instance**: Application server
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

- **API Reference**: Available at `/docs` endpoint when running
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
   - Secrets Manager for secure configuration
   - IAM roles with least-privilege access

3. **CI/CD Pipeline**
   - Multi-stage GitHub Actions workflow
   - Parallel lint and test execution
   - Automated Docker build and push
   - Zero-downtime EC2 deployment

4. **Infrastructure as Code**
   - Complete Terraform configuration
   - Managed AWS resources
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
