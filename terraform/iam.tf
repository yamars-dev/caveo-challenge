# ============================================
# IAM POLICY - SECRETS MANAGER ACCESS
# ============================================

# Policy to allow application access to Secrets Manager
resource "aws_iam_policy" "secrets_manager_access" {
  name        = "caveo-secrets-manager-access"
  description = "Allow access to Caveo secrets in AWS Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.rds_credentials.arn,
          aws_secretsmanager_secret.app_env.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:ListSecrets"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name = "caveo-secrets-manager-policy"
  }
}

# IAM role for EC2/ECS instances
resource "aws_iam_role" "app_role" {
  name = "caveo-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = [
            "ec2.amazonaws.com",
            "ecs-tasks.amazonaws.com"
          ]
        }
      }
    ]
  })

  tags = {
    Name = "caveo-app-role"
  }
}

# Attach secrets access policy to application role
resource "aws_iam_role_policy_attachment" "app_secrets_access" {
  role       = aws_iam_role.app_role.name
  policy_arn = aws_iam_policy.secrets_manager_access.arn
}

# Instance profile for EC2 instances
resource "aws_iam_instance_profile" "app_profile" {
  name = "caveo-app-profile"
  role = aws_iam_role.app_role.name
}
