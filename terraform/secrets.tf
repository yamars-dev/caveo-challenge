# ============================================
# AWS SECRETS MANAGER
# ============================================

# RDS database credentials secret
resource "aws_secretsmanager_secret" "rds_credentials" {
  name        = "caveo/rds/credentials"
  description = "RDS PostgreSQL credentials for Caveo application"

  tags = {
    Name        = "caveo-rds-credentials"
    Environment = "production"
  }
}

# Store RDS credentials in secret
resource "aws_secretsmanager_secret_version" "rds_credentials" {
  secret_id = aws_secretsmanager_secret.rds_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    engine   = "postgres"
    host     = aws_db_instance.postgres.address
    port     = aws_db_instance.postgres.port
    dbname   = var.db_name
  })
}

# Application environment variables secret
resource "aws_secretsmanager_secret" "app_env" {
  name        = "caveo/app/environment"
  description = "Application environment variables"

  tags = {
    Name        = "caveo-app-environment"
    Environment = "production"
  }
}

# Store application environment variables in secret
resource "aws_secretsmanager_secret_version" "app_env" {
  secret_id = aws_secretsmanager_secret.app_env.id
  secret_string = jsonencode({
    NODE_ENV              = "production"
    PORT                  = "3000"
    DB_HOST               = aws_db_instance.postgres.address
    DB_PORT               = tostring(aws_db_instance.postgres.port)
    DB_USERNAME           = var.db_username
    DB_PASSWORD           = var.db_password
    DB_NAME               = var.db_name
    COGNITO_USER_POOL_ID  = aws_cognito_user_pool.main.id
    COGNITO_CLIENT_ID     = aws_cognito_user_pool_client.client.id
    AWS_REGION            = var.aws_region
    LOG_LEVEL             = "info"
  })
}
