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

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "key_pair_name" {
  description = "Name of the EC2 Key Pair (must exist in AWS)"
  type        = string
}

variable "private_key_path" {
  description = "Path to private key file for SSH"
  type        = string
}

variable "git_repository_url" {
  description = "Git repository URL for the application"
  type        = string
}

variable "admin_ip" {
  description = "Admin IP address for SSH access (your IP/32)"
  type        = string
  default     = ""
}

# Database variables
variable "db_host" {
  description = "Database host (RDS endpoint) - leave empty to let Terraform create RDS or use Secrets Manager"
  type        = string
  default     = ""
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "caveo_db"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "caveo_user"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# Cognito variables
variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  type        = string
}

variable "cognito_client_id" {
  description = "Cognito Client ID"
  type        = string
  sensitive   = true
}
# Monitoring variables
variable "alert_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
  default     = ""
}
