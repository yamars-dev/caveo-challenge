output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "rds_address" {
  description = "RDS PostgreSQL address (without port)"
  value       = aws_db_instance.postgres.address
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.postgres.port
}

output "db_name" {
  description = "Database name"
  value       = aws_db_instance.postgres.db_name
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_client_id" {
  description = "Cognito User Pool Client ID"
  value       = aws_cognito_user_pool_client.client.id
}

output "secrets_manager_rds_arn" {
  description = "ARN of RDS credentials secret in Secrets Manager"
  value       = aws_secretsmanager_secret.rds_credentials.arn
}

output "secrets_manager_app_env_arn" {
  description = "ARN of application environment secret in Secrets Manager"
  value       = aws_secretsmanager_secret.app_env.arn
}

output "secrets_manager_rds_name" {
  description = "Name of RDS credentials secret"
  value       = aws_secretsmanager_secret.rds_credentials.name
}

output "secrets_manager_app_env_name" {
  description = "Name of application environment secret"
  value       = aws_secretsmanager_secret.app_env.name
}

output "cognito_issuer" {
  description = "Cognito JWT Issuer URL"
  value       = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
}