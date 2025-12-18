set -e

echo "🚀 AI-Powered Math Problem Solver Deployment Script"
echo "=================================================="

# Check if required tools are installed
check_dependencies() {
    echo "📋 Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v aws &> /dev/null; then
        echo "⚠️  AWS CLI is not installed. Install it for AWS deployment."
    fi
    
    echo "✅ Dependencies check complete"
}

# Build Docker images
build_images() {
    echo "🔨 Building Docker images..."
    
    # Build backend image
    echo "Building backend image..."
    cd backend
    docker build -t math-solver-backend .
    cd ..
    
    # Build frontend image
    echo "Building frontend image..."
    docker build -f Dockerfile.frontend -t math-solver-frontend .
    
    echo "✅ Docker images built successfully"
}

# Local deployment with Docker Compose
deploy_local() {
    echo "🏠 Deploying locally with Docker Compose..."
    
    if [ ! -f "backend/.env" ]; then
        echo "Backend .env file not found. Please create it from .env.example"
        exit 1
    fi
    
    # Start services
    docker-compose up -d
    
    echo "✅ Local deployment complete!"
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔧 Backend: http://localhost:8080"
    echo "🗄️  Database: localhost:26257"
}

# AWS deployment
deploy_aws() {
    echo "☁️  Deploying to AWS..."
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo "❌ AWS credentials not configured. Run 'aws configure' first."
        exit 1
    fi
    
    # Get AWS account ID
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    REGION=${AWS_DEFAULT_REGION:-us-east-1}
    
    echo "📋 AWS Account: $ACCOUNT_ID"
    echo "📍 Region: $REGION"
    
    # Create ECR repositories if they don't exist
    echo "🏗️  Setting up ECR repositories..."
    aws ecr describe-repositories --repository-names math-solver-backend 2>/dev/null || \
        aws ecr create-repository --repository-name math-solver-backend
    
    aws ecr describe-repositories --repository-names math-solver-frontend 2>/dev/null || \
        aws ecr create-repository --repository-name math-solver-frontend
    
    # Login to ECR
    echo "🔐 Logging into ECR..."
    aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
    
    # Tag and push backend image
    echo "📤 Pushing backend image..."
    docker tag math-solver-backend:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/math-solver-backend:latest
    docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/math-solver-backend:latest
    
    # Tag and push frontend image
    echo "📤 Pushing frontend image..."
    docker tag math-solver-frontend:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/math-solver-frontend:latest
    docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/math-solver-frontend:latest
    
    echo "✅ Images pushed to ECR successfully!"
    echo "📖 Next steps:"
    echo "   1. Set up ECS cluster and task definitions"
    echo "   2. Configure Application Load Balancer"
    echo "   3. Set up S3 bucket for frontend hosting"
    echo "   4. Configure CloudFront distribution"
    echo "   📚 See deployment/aws-deployment.md for detailed instructions"
}

# Show usage information
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  local     Deploy locally using Docker Compose"
    echo "  aws       Deploy to AWS (requires AWS CLI configuration)"
    echo "  build     Build Docker images only"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 local          # Deploy locally"
    echo "  $0 aws            # Deploy to AWS"
    echo "  $0 build          # Build images only"
}

# Main script logic
main() {
    case "${1:-help}" in
        "local")
            check_dependencies
            build_images
            deploy_local
            ;;
        "aws")
            check_dependencies
            build_images
            deploy_aws
            ;;
        "build")
            check_dependencies
            build_images
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# Run main function with all arguments
main "$@"