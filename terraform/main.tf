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
# COGNITO USER POOL - SEM VERIFICAÇÃO DE EMAIL
# ============================================
resource "aws_cognito_user_pool" "main" {
  name = "caveo-user-pool-v2"

  # ✅ Username é email, mas SEM verificação obrigatória
  username_attributes = ["email"]
  
  # ✅ CRÍTICO: Lista vazia = SEM verificação automática
  auto_verified_attributes = []
  
  # MFA desabilitado
  mfa_configuration = "OFF"

  # Política de senha
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  # Atributos obrigatórios
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

  # Configuração de email (necessário mesmo sem verificação)
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Configuração de recuperação de conta (via email, mas sem exigir verificação no cadastro)
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  tags = {
    Name         = "caveo-user-pool"
    Verification = "disabled"
    Version      = "v2"
  }
}

# ============================================
# COGNITO USER POOL CLIENT
# ============================================
resource "aws_cognito_user_pool_client" "client" {
  name         = "caveo-app-client-v2"
  user_pool_id = aws_cognito_user_pool.main.id

  # Auth flows permitidos
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  # Validade dos tokens
  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # Public client (sem secret)
  generate_secret = false

  # ✅ Atributos (removido email_verified já que não verificamos)
  read_attributes  = ["email", "name"]
  write_attributes = ["email", "name"]

  # Prevenir enumeração de usuários
  prevent_user_existence_errors = "ENABLED"
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