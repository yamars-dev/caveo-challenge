terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ============================================
# VPC (usando VPC padrão para simplificar)
# ============================================
resource "aws_default_vpc" "default" {
  tags = {
    Name = "Default VPC"
  }
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [aws_default_vpc.default.id]
  }
}

# ============================================
# SECURITY GROUP - RDS
# ============================================
resource "aws_security_group" "rds" {
  name        = "caveo-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = aws_default_vpc.default.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Libera todos os IPs (apenas para desenvolvimento/entrevista)
    description = "PostgreSQL access"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "caveo-rds-sg"
  }
}

# ============================================
# RDS POSTGRESQL
# ============================================
resource "aws_db_instance" "postgres" {
  identifier     = "caveo-db"
  engine         = "postgres"
  engine_version = "15"  # ← Mudei de 15.4 para 15
  instance_class = "db.t3.micro" # Free tier eligible

  allocated_storage = 20
  storage_type      = "gp2"
  storage_encrypted = false

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = true # Para facilitar acesso. Em produção, usar false!

  skip_final_snapshot = true
  backup_retention_period = 0 # Desabilitar backup para economizar

  tags = {
    Name = "caveo-postgres"
  }
}

# ============================================
# COGNITO USER POOL
# ============================================
resource "aws_cognito_user_pool" "main" {
  name = "caveo-user-pool"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  schema {
    name                = "name"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  tags = {
    Name = "caveo-user-pool"
  }
}

# ============================================
# COGNITO USER POOL CLIENT
# ============================================
resource "aws_cognito_user_pool_client" "client" {
  name         = "caveo-app-client"
  user_pool_id = aws_cognito_user_pool.main.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  generate_secret = false

  read_attributes  = ["email", "email_verified", "name"]
  write_attributes = ["email", "name"]
}

# ============================================
# COGNITO USER GROUPS
# ============================================
resource "aws_cognito_user_group" "admin" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Admin users group"
  precedence   = 1
}

resource "aws_cognito_user_group" "user" {
  name         = "user"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Regular users group"
  precedence   = 2
}