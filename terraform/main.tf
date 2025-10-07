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
    DB_HOST             = var.db_host != "" ? var.db_host : aws_db_instance.caveo.address
    DB_PORT             = "5432"
    DB_USERNAME         = "caveo_admin"
    DB_PASSWORD         = var.db_password
    DB_DATABASE         = "caveo"
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
    description = "API access from anywhere (use ALB with HTTPS in production)"
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_ip != "" ? [var.admin_ip] : ["0.0.0.0/0"]
    description = var.admin_ip != "" ? "SSH access from admin IP only" : "SSH access from anywhere (INSECURE - set admin_ip variable)"
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

# Security Group for RDS
resource "aws_security_group" "caveo_rds" {
  name_prefix = "caveo-rds-${var.environment}-"
  description = "Security group for Caveo RDS PostgreSQL"

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
  }

  tags = {
    Name        = "caveo-rds-${var.environment}"
    Application = "caveo-api"
    Environment = var.environment
  }
}

# DB Subnet Group for RDS
resource "aws_db_subnet_group" "caveo" {
  name       = "caveo-db-subnet-${var.environment}"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name        = "caveo-db-subnet-${var.environment}"
    Application = "caveo-api"
    Environment = var.environment
  }
}

# Get default VPC
data "aws_vpc" "default" {
  default = true
}

# Get default subnets
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "caveo" {
  identifier     = "caveo-db-${var.environment}"
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

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"

  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "caveo-db-final-${var.environment}-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Name        = "caveo-db-${var.environment}"
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

# EC2 Key Pair and git repository variables are declared in variables.tf

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

# Additional variables are declared in variables.tf

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

// ec2_public_ip output is declared later in outputs (variables.tf handles variable declarations)

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
# ===========================
# CloudWatch Monitoring
# ===========================

# SNS Topic for RDS Alerts
resource "aws_sns_topic" "rds_alerts" {
  name = "caveo-rds-alerts-${var.environment}"

  tags = {
    Name        = "caveo-rds-alerts-${var.environment}"
    Application = "caveo-api"
    Environment = var.environment
  }
}

# SNS Topic Subscription (email)
resource "aws_sns_topic_subscription" "rds_alerts_email" {
  topic_arn = aws_sns_topic.rds_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# CloudWatch Alarm - RDS CPU Utilization
resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "caveo-rds-cpu-high-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300" # 5 minutes
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

# CloudWatch Alarm - RDS Free Storage Space
resource "aws_cloudwatch_metric_alarm" "rds_storage_low" {
  alarm_name          = "caveo-rds-storage-low-${var.environment}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300" # 5 minutes
  statistic           = "Average"
  threshold           = "2000000000" # 2GB in bytes
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

# CloudWatch Alarm - RDS Database Connections
resource "aws_cloudwatch_metric_alarm" "rds_connections_high" {
  alarm_name          = "caveo-rds-connections-high-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300" # 5 minutes
  statistic           = "Average"
  threshold           = "80" # 80% of max connections for t3.micro
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

# CloudWatch Alarm - RDS Read Latency
resource "aws_cloudwatch_metric_alarm" "rds_read_latency_high" {
  alarm_name          = "caveo-rds-read-latency-high-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ReadLatency"
  namespace           = "AWS/RDS"
  period              = "300" # 5 minutes
  statistic           = "Average"
  threshold           = "0.1" # 100ms
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

# CloudWatch Alarm - RDS Write Latency
resource "aws_cloudwatch_metric_alarm" "rds_write_latency_high" {
  alarm_name          = "caveo-rds-write-latency-high-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "WriteLatency"
  namespace           = "AWS/RDS"
  period              = "300" # 5 minutes
  statistic           = "Average"
  threshold           = "0.1" # 100ms
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
  value       = aws_instance.caveo_api.public_ip
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
