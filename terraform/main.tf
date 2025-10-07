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

# ===========================
# Cognito User Pool
# ===========================

resource "aws_cognito_user_pool" "main" {
  name = "caveo-user-pool-${var.environment}"

  auto_verified_attributes = []

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  tags = {
    Application = "caveo-api"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_cognito_user_pool_client" "main" {
  name         = "caveo-app-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id
  generate_secret = false
  
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_ADMIN_USER_PASSWORD_AUTH"
  ]
}

resource "aws_cognito_user_group" "admin" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Administrator users with full system access"
  precedence   = 1
}

resource "aws_cognito_user_group" "user" {
  name         = "user"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Regular users with limited access"
  precedence   = 2
}

# ===========================
# Secrets Manager (Usando Existente)
# ===========================

# Secret existente - gerencia apenas metadados
# Importar com: terraform import aws_secretsmanager_secret.caveo_app_environment caveo/app/environment-prod
resource "aws_secretsmanager_secret" "caveo_app_environment" {
  name                    = "caveo/app/environment-prod"
  description             = "Caveo API environment variables"
  recovery_window_in_days = 7

  tags = {
    Application = "caveo-api"
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Ler o conteúdo do secret (read-only, não modifica)
data "aws_secretsmanager_secret_version" "current" {
  secret_id = aws_secretsmanager_secret.caveo_app_environment.id
}

# ===========================
# ECR Repository (Usando Existente)
# ===========================

# Importar com: terraform import aws_ecrpublic_repository.caveo_api 696661408331/caveo-api
resource "aws_ecrpublic_repository" "caveo_api" {
  repository_name = "caveo-api"

  catalog_data {
    about_text        = "Caveo API - Node.js application with TypeScript, Koa.js, and AWS Cognito integration"
    architectures     = ["x86-64"]
    description       = "Production-ready Node.js 22 API with enterprise security, rate limiting, and comprehensive logging"
    operating_systems = ["Linux"]
    usage_text        = "docker pull public.ecr.aws/caveo-api:latest"
  }

  tags = {
    Application = "caveo-api"
    Environment = var.environment
    Repository  = "caveo-challenge"
    ManagedBy   = "terraform"
  }

  lifecycle {
    ignore_changes = [repository_name]
  }
}

# ===========================
# IAM Roles and Policies
# ===========================

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

# ===========================
# Networking
# ===========================

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ===========================
# Security Groups
# ===========================

resource "aws_security_group" "caveo_api" {
  name_prefix = "caveo-api-${var.environment}-"
  description = "Security group for Caveo API EC2 instances"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "API access from anywhere (use ALB with HTTPS in production)"
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_ip != "" ? [var.admin_ip] : []
    description = var.admin_ip != "" ? "SSH access from admin IP only" : "SSH access blocked - set admin_ip variable to enable"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "caveo-api-${var.environment}"
    Application = "caveo-api"
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "caveo_rds" {
  name_prefix = "caveo-rds-${var.environment}-"
  description = "Security group for Caveo RDS PostgreSQL"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.caveo_api.id]
    description     = "PostgreSQL access from API EC2"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "caveo-rds-${var.environment}"
    Application = "caveo-api"
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ===========================
# RDS Database (Usando Existente)
# ===========================

# Importar com: terraform import aws_db_subnet_group.caveo <SUBNET_GROUP_NAME>
resource "aws_db_subnet_group" "caveo" {
  name       = "caveo-db-subnet-prod"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name        = "caveo-db-subnet-prod"
    Application = "caveo-api"
    Environment = var.environment
  }

  lifecycle {
    ignore_changes = [name, subnet_ids]
  }
}

# Importar com: terraform import aws_db_instance.caveo caveo-db-prod
resource "aws_db_instance" "caveo" {
  identifier     = "caveo-db-prod"
  engine         = "postgres"
  engine_version = "16.4"
  instance_class = "db.t3.micro"

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "caveo"
  username = "caveo_admin"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.caveo.name
  vpc_security_group_ids = [aws_security_group.caveo_rds.id]

  multi_az = false

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"

  skip_final_snapshot       = false
  final_snapshot_identifier = "caveo-db-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Name        = "caveo-db-prod"
    Application = "caveo-api"
    Environment = var.environment
  }

  lifecycle {
    ignore_changes = [
      identifier,
      final_snapshot_identifier,
      allocated_storage,
      engine_version
    ]
  }
}

# ===========================
# EC2 Instance
# ===========================

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

locals {
  user_data = templatefile("${path.module}/user-data.sh", {
    aws_region  = var.aws_region
    git_repo    = var.git_repository_url
    secret_name = aws_secretsmanager_secret.caveo_app_environment.name
    environment = var.environment
  })
}

resource "aws_instance" "caveo_api" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name              = var.key_pair_name != "" ? var.key_pair_name : null
  iam_instance_profile  = aws_iam_instance_profile.caveo_ec2_profile.name
  vpc_security_group_ids = [aws_security_group.caveo_api.id]
  
  user_data = local.user_data
  user_data_replace_on_change = false

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

  lifecycle {
    ignore_changes = [user_data, ami]
  }

  depends_on = [
    aws_db_instance.caveo,
    data.aws_secretsmanager_secret_version.current
  ]
}

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

# ===========================
# CloudWatch Monitoring
# ===========================

resource "aws_sns_topic" "rds_alerts" {
  name = "caveo-rds-alerts-${var.environment}"

  tags = {
    Name        = "caveo-rds-alerts-${var.environment}"
    Application = "caveo-api"
    Environment = var.environment
  }
}

resource "aws_sns_topic_subscription" "rds_alerts_email" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.rds_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "caveo-rds-cpu-high-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = [aws_sns_topic.rds_alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.caveo.id
  }

  tags = {
    Name        = "caveo-rds-cpu-alarm-${var.environment}"
    Application = "caveo-api"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_storage_low" {
  alarm_name          = "caveo-rds-storage-low-${var.environment}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "2000000000"
  alarm_description   = "This metric monitors RDS free storage space"
  alarm_actions       = [aws_sns_topic.rds_alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.caveo.id
  }

  tags = {
    Name        = "caveo-rds-storage-alarm-${var.environment}"
    Application = "caveo-api"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_connections_high" {
  alarm_name          = "caveo-rds-connections-high-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS database connections"
  alarm_actions       = [aws_sns_topic.rds_alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.caveo.id
  }

  tags = {
    Name        = "caveo-rds-connections-alarm-${var.environment}"
    Application = "caveo-api"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_read_latency_high" {
  alarm_name          = "caveo-rds-read-latency-high-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ReadLatency"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "0.1"
  alarm_description   = "This metric monitors RDS read latency"
  alarm_actions       = [aws_sns_topic.rds_alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.caveo.id
  }

  tags = {
    Name        = "caveo-rds-read-latency-alarm-${var.environment}"
    Application = "caveo-api"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_write_latency_high" {
  alarm_name          = "caveo-rds-write-latency-high-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "WriteLatency"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "0.1"
  alarm_description   = "This metric monitors RDS write latency"
  alarm_actions       = [aws_sns_topic.rds_alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.caveo.id
  }

  tags = {
    Name        = "caveo-rds-write-latency-alarm-${var.environment}"
    Application = "caveo-api"
    Environment = var.environment
  }
}

# ===========================
# Outputs
# ===========================

output "ec2_public_ip" {
  description = "Public IP of the EC2 instance"
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

output "api_docs_url" {
  description = "API documentation URL"
  value       = "http://${aws_eip.caveo_api.public_ip}:3000/docs"
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.caveo.address
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.caveo.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.caveo.db_name
}

output "rds_username" {
  description = "RDS master username"
  value       = aws_db_instance.caveo.username
  sensitive   = true
}

output "secret_arn" {
  description = "ARN of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.caveo_app_environment.arn
}

output "secret_name" {
  description = "Name of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.caveo_app_environment.name
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "Cognito Client ID"
  value       = aws_cognito_user_pool_client.main.id
  sensitive   = true
}

output "cognito_admin_group" {
  description = "Cognito admin group name"
  value       = aws_cognito_user_group.admin.name
}

output "cognito_user_group" {
  description = "Cognito user group name"
  value       = aws_cognito_user_group.user.name
}

output "ecr_repository_uri" {
  description = "ECR Repository URI for Docker images"
  value       = aws_ecrpublic_repository.caveo_api.repository_uri
}

output "ecr_registry_id" {
  description = "ECR Registry ID"
  value       = aws_ecrpublic_repository.caveo_api.registry_id
}

output "iam_instance_profile" {
  description = "IAM instance profile for EC2"
  value       = aws_iam_instance_profile.caveo_ec2_profile.name
}

output "security_group_id" {
  description = "Security group ID for API instances"
  value       = aws_security_group.caveo_api.id
}

output "sns_topic_arn" {
  description = "SNS topic ARN for RDS alerts"
  value       = aws_sns_topic.rds_alerts.arn
}

output "cloudwatch_alarms" {
  description = "CloudWatch alarm names for RDS monitoring"
  value = {
    cpu_high         = aws_cloudwatch_metric_alarm.rds_cpu_high.alarm_name
    storage_low      = aws_cloudwatch_metric_alarm.rds_storage_low.alarm_name
    connections_high = aws_cloudwatch_metric_alarm.rds_connections_high.alarm_name
    read_latency     = aws_cloudwatch_metric_alarm.rds_read_latency_high.alarm_name
    write_latency    = aws_cloudwatch_metric_alarm.rds_write_latency_high.alarm_name
  }
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = var.key_pair_name != "" ? "ssh -i ${var.private_key_path} ubuntu@${aws_eip.caveo_api.public_ip}" : "SSH not configured - set key_pair_name variable"
}

