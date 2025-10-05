# terraform/rds.tf (optional - uncomment if you need RDS)

# Uncomment this file if you want Terraform to create RDS for you
# Otherwise, use an existing RDS instance

/*
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

# DB Subnet Group
resource "aws_db_subnet_group" "caveo" {
  name       = "caveo-db-subnet-group-${var.environment}"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name        = "caveo-db-subnet-group-${var.environment}"
    Application = "caveo-api"
    Environment = var.environment
  }
}

# Security group for RDS
resource "aws_security_group" "rds" {
  name_prefix = "caveo-rds-${var.environment}-"
  description = "Security group for Caveo RDS instance"
  vpc_id      = data.aws_vpc.default.id

  # Allow PostgreSQL access from EC2
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.caveo_api.id]
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

# RDS Instance
resource "aws_db_instance" "caveo" {
  identifier = "caveo-db-${var.environment}"
  
  # Engine
  engine         = "postgres"
  engine_version = "15.4"
  
  # Instance
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  storage_type     = "gp3"
  storage_encrypted = true
  
  # Database
  db_name  = "caveo_db"
  username = "caveo_user"
  password = var.db_password
  
  # Network
  db_subnet_group_name   = aws_db_subnet_group.caveo.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  
  # Backup
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  # Monitoring
  performance_insights_enabled = false
  monitoring_interval         = 0
  
  # Deletion protection
  deletion_protection = false # Set to true in production
  skip_final_snapshot = true  # Set to false in production
  
  tags = {
    Name        = "caveo-db-${var.environment}"
    Application = "caveo-api"
    Environment = var.environment
  }
}

# Output RDS endpoint
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.caveo.endpoint
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.caveo.port
}
*/
