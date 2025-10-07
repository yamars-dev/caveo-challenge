terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.0"
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "db_host" {
  description = "Database host (RDS endpoint)"
  type        = string
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  type        = string
}

variable "cognito_client_id" {
  description = "Cognito Client ID"
  type        = string
}

resource "aws_secretsmanager_secret" "caveo_app_environment" {
  name                    = "caveo/app/environment"
  description             = "Caveo API environment variables"
  recovery_window_in_days = 7

  tags = {
    Application = "caveo-api"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "caveo_app_environment" {
  secret_id = aws_secretsmanager_secret.caveo_app_environment.id
  
  secret_string = jsonencode({
    NODE_ENV            = "production"
    PORT                = "3000"
    DB_HOST             = var.db_host
    DB_PORT             = "5432"
    DB_USERNAME         = "caveo_user"
    DB_PASSWORD         = var.db_password
    DB_DATABASE         = "caveo_db"
    AWS_REGION          = var.aws_region
    COGNITO_USER_POOL_ID = var.cognito_user_pool_id
    COGNITO_CLIENT_ID   = var.cognito_client_id
  })
}

# ECR Repository for Docker images
resource "aws_ecrpublic_repository" "caveo_api" {
  repository_name = "caveo-api"

  catalog_data {
    about_text        = "Caveo API - Node.js application with TypeScript, Koa.js, and AWS Cognito integration"
    architectures     = ["x86-64"]
    description       = "Production-ready Node.js 22 API with enterprise security, rate limiting, and comprehensive logging"
    logo_image_blob   = null
    operating_systems = ["Linux"]
    usage_text        = "docker pull public.ecr.aws/caveo-api:latest"
  }

  tags = {
    Application = "caveo-api"
    Environment = var.environment
    Repository  = "caveo-challenge"
  }
}

resource "aws_iam_role" "caveo_ec2_role" {
  name = "caveo-ec2-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Application = "caveo-api"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "caveo_secrets_policy" {
  name = "caveo-secrets-policy-${var.environment}"
  role = aws_iam_role.caveo_ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = aws_secretsmanager_secret.caveo_app_environment.arn
      }
    ]
  })
}

resource "aws_iam_instance_profile" "caveo_ec2_profile" {
  name = "caveo-ec2-profile-${var.environment}"
  role = aws_iam_role.caveo_ec2_role.name
}

resource "aws_security_group" "caveo_api" {
  name_prefix = "caveo-api-${var.environment}-"
  description = "Security group for Caveo API EC2 instances"

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "caveo-api-${var.environment}"
    Application = "caveo-api"
    Environment = var.environment
  }
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# User data script for EC2 initialization
locals {
  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    aws_region = var.aws_region
    git_repo   = var.git_repository_url
  }))
}

# EC2 Key Pair (you need to create this beforehand)
variable "key_pair_name" {
  description = "Name of the EC2 Key Pair"
  type        = string
}

variable "git_repository_url" {
  description = "Git repository URL for the application"
  type        = string
}

# EC2 Instance for Caveo API
resource "aws_instance" "caveo_api" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name              = var.key_pair_name
  iam_instance_profile  = aws_iam_instance_profile.caveo_ec2_profile.name
  vpc_security_group_ids = [aws_security_group.caveo_api.id]
  
  user_data = local.user_data

  root_block_device {
    volume_type = "gp3"
    volume_size = 20
    encrypted   = true
    
    tags = {
      Name = "caveo-api-root-${var.environment}"
    }
  }

  tags = {
    Name        = "caveo-api-${var.environment}"
    Application = "caveo-api"
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  # Wait for instance to be ready
  provisioner "remote-exec" {
    inline = [
      "cloud-init status --wait"
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.private_key_path)
      host        = self.public_ip
    }
  }
}

# Elastic IP for stable public IP
resource "aws_eip" "caveo_api" {
  instance = aws_instance.caveo_api.id
  domain   = "vpc"

  tags = {
    Name        = "caveo-api-eip-${var.environment}"
    Application = "caveo-api"
    Environment = var.environment
  }

  depends_on = [aws_instance.caveo_api]
}

# Additional variables
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "private_key_path" {
  description = "Path to private key file for SSH"
  type        = string
}

# Outputs
output "secret_arn" {
  description = "ARN of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.caveo_app_environment.arn
}

output "secret_name" {
  description = "Name of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.caveo_app_environment.name
}

output "iam_instance_profile" {
  description = "IAM instance profile for EC2"
  value       = aws_iam_instance_profile.caveo_ec2_profile.name
}

output "security_group_id" {
  description = "Security group ID for API instances"
  value       = aws_security_group.caveo_api.id
}

output "ec2_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_eip.caveo_api.public_ip
}

output "ec2_instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.caveo_api.id
}

output "api_url" {
  description = "URL of the Caveo API"
  value       = "http://${aws_eip.caveo_api.public_ip}:3000"
}

output "health_check_url" {
  description = "Health check URL"
  value       = "http://${aws_eip.caveo_api.public_ip}:3000/health"
}

# Cognito User Groups for role-based access control
resource "aws_cognito_user_group" "admin" {
  count        = var.cognito_user_pool_id != "" ? 1 : 0
  name         = "admin"
  user_pool_id = var.cognito_user_pool_id
  description  = "Administrator users with full system access"
  precedence   = 1
}

resource "aws_cognito_user_group" "user" {
  count        = var.cognito_user_pool_id != "" ? 1 : 0
  name         = "user"
  user_pool_id = var.cognito_user_pool_id
  description  = "Regular users with limited access"
  precedence   = 2
}

output "api_docs_url" {
  description = "API documentation URL"
  value       = "http://${aws_eip.caveo_api.public_ip}:3000/docs"
}

output "cognito_admin_group" {
  description = "Cognito admin group name"
  value       = var.cognito_user_pool_id != "" ? aws_cognito_user_group.admin[0].name : "admin"
}

output "cognito_user_group" {
  description = "Cognito user group name"
  value       = var.cognito_user_pool_id != "" ? aws_cognito_user_group.user[0].name : "user"
}

output "ecr_repository_uri" {
  description = "ECR Repository URI for Docker images"
  value       = aws_ecrpublic_repository.caveo_api.repository_uri
}

output "ecr_registry_id" {
  description = "ECR Registry ID"
  value       = aws_ecrpublic_repository.caveo_api.registry_id
}
