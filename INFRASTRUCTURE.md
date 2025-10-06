# Infrastructure Documentation

## Overview

Este documento descreve a infraestrutura completa do projeto **Caveo**, incluindo configuração AWS, containerização Docker e deploy automatizado via Terraform.

## Tech Stack

- **Runtime**: Node.js 22 (Alpine Linux)
- **Database**: PostgreSQL 15
- **Authentication**: AWS Cognito User Pools
- **Infrastructure**: Terraform + AWS
- **Containerization**: Docker + Docker Compose
- **Secrets**: AWS Secrets Manager

---

## Docker Configuration

### Development Environment

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: caveo_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
    
  api:
    build: .
    ports: ["3000:3000"]
    depends_on: [postgres]
```

### Production Environment

```yaml
# docker-compose.prod.yml
- Multi-stage builds for optimization
- Alpine-based images for security
- Health checks and restart policies
- Network isolation
```

### Commands

```bash
# Development
npm run docker:up          # Start dev environment
npm run docker:down        # Stop dev environment
npm run docker:logs        # View API logs

# Production  
npm run docker:prod        # Start prod environment
npm run docker:prod:down   # Stop prod environment
npm run docker:prod:logs   # View prod logs
```

---

## AWS Infrastructure

### Cognito User Pool

```hcl
# terraform/main.tf
resource "aws_cognito_user_pool" "main" {
  name = "caveo-user-pool-${var.environment}"
  
  # Password policy
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }
  
  # User attributes
  schema {
    name     = "email"
    required = true
  }
}
```

### Cognito Groups (Roles)

```hcl
# Admin Group
resource "aws_cognito_user_group" "admin" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Administrator users with full access"
  precedence   = 1
}

# User Group  
resource "aws_cognito_user_group" "user" {
  name         = "user"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Regular users with limited access"
  precedence   = 2
}
```

### EC2 Instance

```hcl
resource "aws_instance" "app" {
  ami           = "ami-0c02fb55956c7d316" # Amazon Linux 2
  instance_type = "t3.micro"
  
  vpc_security_group_ids = [aws_security_group.app.id]
  key_name              = aws_key_pair.app.key_name
  
  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    docker_compose_content = base64encode(file("../docker-compose.prod.yml"))
  }))
  
  tags = {
    Name        = "caveo-app-${var.environment}"
    Environment = var.environment
  }
}
```

### Secrets Manager

```hcl
resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "caveo-secrets-${var.environment}"
  description = "Application secrets for Caveo"
  
  tags = {
    Environment = var.environment
    Application = "caveo"
  }
}
```

### Security Groups

```hcl
resource "aws_security_group" "app" {
  name        = "caveo-app-sg-${var.environment}"
  description = "Security group for Caveo application"

  # HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  # HTTPS
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  # API (development only)
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Restrict in production
  }
  
  # Outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

---

## Deployment

### Terraform Commands

```bash
cd terraform

# Initialize
terraform init

# Plan changes
terraform plan -var-file="terraform.tfvars"

# Apply infrastructure
terraform apply -var-file="terraform.tfvars"

# Deploy application
./deploy.sh
```

### Environment Variables

#### Development (.env.local)
```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/caveo_db
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Production (AWS Secrets Manager)
```json
{
  "DATABASE_URL": "postgresql://user:pass@rds-endpoint:5432/caveo_prod",
  "COGNITO_USER_POOL_ID": "us-east-1_PROD_POOL_ID", 
  "COGNITO_CLIENT_ID": "PROD_CLIENT_ID",
  "JWT_SECRET": "production-jwt-secret",
  "LOG_LEVEL": "info"
}
```

### Deploy Script

```bash
#!/bin/bash
# terraform/deploy.sh

set -e

echo "Starting Caveo deployment..."

# Build and push Docker image
echo "Building Docker image..."
docker build -t caveo-api:latest ../

# Deploy to EC2
echo "Deploying to EC2..."
EC2_IP=$(terraform output -raw ec2_public_ip)

# Copy docker-compose to EC2
scp -i ~/.ssh/caveo-key.pem ../docker-compose.prod.yml ec2-user@$EC2_IP:~/

# Deploy application
ssh -i ~/.ssh/caveo-key.pem ec2-user@$EC2_IP << 'EOF'
  docker-compose -f docker-compose.prod.yml pull
  docker-compose -f docker-compose.prod.yml up -d
  docker system prune -f
EOF

echo "Deployment completed!"
echo "Application available at: http://$EC2_IP:3000"
```

---

## Database Configuration

### TypeORM Configuration

```typescript
// src/config/database.ts
export const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  entities: [UserEntity],
  migrations: ['src/migrations/*.ts'],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
});
```

---

## Security Configuration

### SSL/TLS
- **Development**: Disabled for local testing
- **Production**: Enforced via Load Balancer/CloudFront

### Network Security
- VPC with private/public subnets
- Security groups with least privilege
- NAT Gateway for outbound traffic

### Secrets Management
- No hardcoded secrets in code
- AWS Secrets Manager for production
- Environment-specific configurations

---

## Troubleshooting

### Common Issues

**Database Connection**
```bash
# Check PostgreSQL status
docker-compose logs postgres

# Test connection
psql postgresql://postgres:postgres123@localhost:5432/caveo_db
```

**Cognito Authentication**
```bash
# Verify Cognito configuration
aws cognito-idp describe-user-pool --user-pool-id YOUR_POOL_ID
```

**EC2 Deployment**
```bash
# Check EC2 instance status
ssh -i ~/.ssh/caveo-key.pem ec2-user@EC2_IP
docker ps
docker-compose logs api
```

### Performance Optimization

- **Database**: Connection pooling, indexes
- **API**: Compression, caching headers  
- **Docker**: Multi-stage builds, Alpine images
- **AWS**: Auto Scaling, Load Balancer

---

## Maintenance

### Backup Strategy
- **Database**: Automated RDS snapshots
- **Code**: Git repository with tags
- **Infrastructure**: Terraform state in S3

### Update Process
1. Test changes locally
2. Deploy to staging environment  
3. Run integration tests
4. Deploy to production
5. Monitor application health

### Cost Optimization
- **EC2**: Right-sizing instances
- **RDS**: Reserved instances for production
- **Cognito**: Monitor active users
- **Secrets Manager**: Rotate secrets regularly
