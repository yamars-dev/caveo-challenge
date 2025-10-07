# Caveo Challenge - Node.js 22 API

Modern TypeScript API with AWS integration and automated CI/CD pipeline.

## 🚀 Features

- **Node.js 22** with ESM modules
- **TypeScript** with modern compilation
- **AWS Integration**: Cognito, RDS, Secrets Manager
- **Complete Test Suite**: 120+ tests with Jest
- **Automated CI/CD**: GitHub Actions pipeline
- **Docker Production Ready**: Single, optimized Dockerfile
- **Infrastructure as Code**: Terraform for AWS resources

## 🏗️ Infrastructure

Complete AWS infrastructure managed with Terraform:
- EC2 instance with Elastic IP
- RDS PostgreSQL database
- Cognito User Pool for authentication
- Secrets Manager for secure configuration
- IAM roles and security groups

## 🔄 CI/CD Pipeline

The project uses GitHub Actions for automated deployment:

1. **Test Stage**: Runs on every push/PR
   - Linting with ESLint
   - Unit tests with Jest
   - Coverage reports
   - TypeScript compilation

2. **Deploy Stage**: Only on main branch
   - Build Docker image
   - Push to Amazon ECR
   - Deploy to EC2 instance
   - Zero-downtime deployment

## 🛠️ Development

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

## 🚀 Deployment

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

## 📁 Project Structure

```
├── src/                 # TypeScript source code
├── tests/              # Jest test files
├── terraform/          # Infrastructure as code
├── .github/workflows/  # CI/CD pipeline
├── Dockerfile         # Production container
└── package.json       # Dependencies and scripts
```

## 🔧 Environment Variables

Required environment variables (managed by AWS Secrets Manager in production):

- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3000)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token signing
- `AWS_REGION`: AWS region for services
- `COGNITO_USER_POOL_ID`: Cognito user pool ID
- `COGNITO_CLIENT_ID`: Cognito client ID

## 🧪 Testing

The project includes comprehensive test coverage:
- Unit tests for all components
- Integration tests for API endpoints
- AWS service mocking for isolated tests
- Coverage reports and CI integration

## 📝 API Documentation

The API is documented with Swagger/OpenAPI and available at `/api-docs` when running.

### Authentication Endpoints

- `POST /auth/signup` - Register a new user
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh-token` - Refresh authentication token

### User Management

- `GET /users/profile` - Get user profile (requires authentication)
- `PUT /users/profile` - Update user profile (requires authentication)

## 🏢 AWS Resources

- **EC2**: t3.micro instance (54.204.177.41)
- **RDS**: PostgreSQL 15
- **Cognito**: User authentication
- **Secrets Manager**: Environment variables
- **ECR**: Docker image registry

## 🔄 Migration from Manual Deployment

This project previously used multiple deployment strategies (scripts, docker-compose files, manual commands). The new CI/CD pipeline consolidates everything into a single, automated workflow.

Benefits of the new approach:
- ✅ Tests run automatically before deployment
- ✅ Consistent deployment process
- ✅ Zero-downtime deployments
- ✅ Rollback capabilities
- ✅ Infrastructure and application deployment unified

## ⚡ Quick Test

Test the deployed API:

```bash
curl http://54.204.177.41:3000/health
```

## 🎯 Challenge Summary

This project demonstrates:
1. **Modern Node.js 22** with ESM modules
2. **TypeScript** best practices
3. **AWS integration** (Cognito, RDS, Secrets Manager)
4. **Complete CI/CD pipeline** with GitHub Actions
5. **Infrastructure as Code** with Terraform
6. **Production-ready** Docker deployment
7. **Comprehensive testing** with 120+ tests
8. **Clean architecture** and documentation
