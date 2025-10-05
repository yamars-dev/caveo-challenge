#!/bin/bash

# Terraform Deploy Script - Eliminates manual scripts
# This single script deploys the entire Caveo API infrastructure

set -e

echo "🚀 Caveo API Terraform Deployment"
echo "================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    command -v terraform >/dev/null 2>&1 || error "Terraform is not installed"
    command -v aws >/dev/null 2>&1 || error "AWS CLI is not installed"
    
    log "✅ Prerequisites OK"
}

# Validate AWS credentials
validate_aws() {
    log "Validating AWS credentials..."
    
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        error "AWS credentials not configured. Run 'aws configure'"
    fi
    
    log "✅ AWS credentials valid"
}

# Initialize Terraform
init_terraform() {
    log "Initializing Terraform..."
    
    cd "$(dirname "$0")"
    
    if [ ! -f "terraform.tfvars" ]; then
        warn "terraform.tfvars not found, copying from example"
        cp terraform.tfvars.example terraform.tfvars
        error "Please edit terraform.tfvars with your values and run again"
    fi
    
    terraform init
    log "✅ Terraform initialized"
}

# Plan deployment
plan_deployment() {
    log "Planning deployment..."
    terraform plan -out=tfplan
    log "✅ Plan created"
}

# Apply deployment
apply_deployment() {
    log "Applying deployment..."
    terraform apply tfplan
    log "✅ Deployment applied"
}

# Wait for EC2 to be ready
wait_for_deployment() {
    log "Waiting for EC2 instance to be ready..."
    
    public_ip=$(terraform output -raw ec2_public_ip)
    health_url="http://$public_ip:3000/health"
    
    log "Public IP: $public_ip"
    log "Health URL: $health_url"
    
    echo -n "Waiting for application to start"
    for i in {1..60}; do
        if curl -f -s "$health_url" >/dev/null 2>&1; then
            echo ""
            log "✅ Application is ready!"
            return 0
        fi
        echo -n "."
        sleep 10
    done
    
    echo ""
    warn "Application may still be starting. Check logs on EC2 instance."
}

# Show deployment info
show_info() {
    log "🎉 Deployment completed!"
    echo ""
    echo "📊 Infrastructure Details:"
    terraform output
    echo ""
    echo "🔗 URLs:"
    echo "   Health: $(terraform output -raw health_check_url)"
    echo "   API Docs: $(terraform output -raw api_docs_url)" 
    echo "   API: $(terraform output -raw api_url)/api"
    echo ""
    echo "📡 SSH Access:"
    echo "   ssh -i $(terraform output -raw private_key_path) ubuntu@$(terraform output -raw ec2_public_ip)"
    echo ""
    echo "📜 Logs:"
    echo "   sudo docker-compose -f /opt/caveo/docker-compose.prod.yml logs -f api"
    echo ""
    echo "🔄 Update Application:"
    echo "   ssh to instance and run: /opt/caveo/update-app.sh"
}

# Main execution
main() {
    check_prerequisites
    validate_aws
    init_terraform
    plan_deployment
    
    echo ""
    read -p "Apply this plan? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        apply_deployment
        wait_for_deployment
        show_info
    else
        log "Deployment cancelled"
    fi
}

# Cleanup function
cleanup() {
    rm -f tfplan 2>/dev/null || true
}
trap cleanup EXIT

# Handle interruption
trap 'error "Deployment interrupted"' INT TERM

# Run main function
main "$@"
