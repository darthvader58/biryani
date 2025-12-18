# AI-Powered Math Problem Solver

An intelligent web application that helps students identify and understand their math errors by comparing their solutions with AI-powered analysis and Wolfram Alpha's computational engine.

## 🚀 Features

### Core Functionality
- **Image Upload & OCR**: Upload homework images with automatic text extraction using Tesseract.js
- **AI Analysis**: ChatGPT-4 powered error detection and explanation
- **Wolfram Alpha Integration**: Get correct solutions and step-by-step explanations
- **Error Classification**: Identifies conceptual vs computational errors
- **LaTeX Support**: Proper mathematical notation rendering

### Dashboard & Analytics
- **Performance Tracking**: Monitor accuracy and improvement over time
- **Topic Analysis**: Identify strengths and weaknesses by subject area
- **Error Patterns**: Visualize common mistake types
- **Progress Charts**: Interactive charts showing learning progress
- **Confidence Scoring**: AI-generated confidence levels for each analysis

### User Experience
- **Drag & Drop Upload**: Easy file upload interface
- **Real-time Processing**: Live feedback during analysis
- **Mobile Responsive**: Works on all devices
- **Google OAuth**: Secure authentication
- **Progress Persistence**: All data saved to your account

## 🛠 Technology Stack

### Frontend
- **React 18** - Modern UI framework
- **React Router** - Client-side routing
- **Recharts** - Interactive data visualization
- **React Dropzone** - File upload handling
- **Tesseract.js** - Client-side OCR
- **KaTeX** - Mathematical notation rendering
- **React Hot Toast** - User notifications

### Backend
- **Node.js & Express** - REST API server
- **OpenAI GPT-4** - AI-powered error analysis
- **Wolfram Alpha API** - Mathematical computation
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing

### Database
- **CockroachDB Cloud** - Distributed SQL database
- **PostgreSQL Compatible** - Standard SQL queries
- **Auto-scaling** - Handles traffic spikes automatically

### Deployment
- **Docker** - Containerized deployment
- **AWS ECS/Fargate** - Serverless container hosting
- **AWS S3 + CloudFront** - Frontend hosting and CDN
- **AWS Application Load Balancer** - Traffic distribution

## 📋 Prerequisites

- Node.js 18+ and npm
- OpenAI API key
- Wolfram Alpha App ID
- CockroachDB Cloud account (free tier available)
- AWS account (for deployment)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd math-problem-solver
```

### 2. Install Dependencies
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
```

### 3. Environment Setup
```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit with your API keys
nano backend/.env
```

Required environment variables:
```env
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
OPENAI_API_KEY=your_openai_api_key_here
WOLFRAM_APP_ID=your_wolfram_alpha_app_id_here
PORT=8080
```

### 4. Database Setup
The application will automatically create the required tables on first run.

### 5. Start Development Servers
```bash
# Start backend (from backend directory)
npm run dev

# Start frontend (from root directory)
npm start
```

Visit `http://localhost:3000` to use the application.

## 🏗 Project Structure

```
├── src/
│   ├── components/          # Reusable React components
│   │   └── Navbar.js       # Navigation component
│   ├── pages/              # Main application pages
│   │   ├── home.js         # Problem upload and analysis
│   │   ├── dashboard.js    # User analytics dashboard
│   │   ├── signin.js       # Authentication page
│   │   └── notFound.js     # 404 error page
│   ├── styles/             # CSS stylesheets
│   └── App.js              # Main application component
├── backend/
│   ├── server.js           # Express server and API routes
│   ├── package.json        # Backend dependencies
│   └── Dockerfile          # Backend container configuration
├── public/                 # Static frontend assets
├── deployment/             # Deployment configurations
│   └── aws-deployment.md   # AWS deployment guide
├── docker-compose.yml      # Local development setup
└── Dockerfile.frontend     # Frontend container configuration
```

## 🔧 API Endpoints

### Problem Analysis
- `POST /api/analyze-problem` - Analyze uploaded problem
- `GET /api/dashboard/:email` - Get user dashboard data

### Legacy Compatibility
- `GET /userFeedback/:email/` - Legacy dashboard endpoint

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Problems Table
```sql
CREATE TABLE problems (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255) REFERENCES users(email),
  problem_text TEXT NOT NULL,
  user_solution TEXT,
  correct_solution TEXT,
  wolfram_solution TEXT,
  error_type VARCHAR(100),
  error_description TEXT,
  confidence_score DECIMAL(3,2),
  topic VARCHAR(100),
  difficulty_level VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Analytics Table
```sql
CREATE TABLE user_analytics (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255) REFERENCES users(email),
  topic VARCHAR(100),
  total_problems INTEGER DEFAULT 0,
  correct_problems INTEGER DEFAULT 0,
  conceptual_errors INTEGER DEFAULT 0,
  computational_errors INTEGER DEFAULT 0,
  avg_confidence DECIMAL(3,2) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW()
);
```

## 🚀 Deployment

### Local Development with Docker
```bash
docker-compose up --build
```

### AWS Cloud Deployment
See [AWS Deployment Guide](deployment/aws-deployment.md) for detailed instructions.

### Key Deployment Steps:
1. **Database**: Set up CockroachDB Cloud cluster
2. **Backend**: Deploy to AWS ECS/Fargate
3. **Frontend**: Deploy to S3 + CloudFront
4. **Load Balancer**: Configure ALB for backend
5. **SSL**: Set up HTTPS with ACM certificates

## 💰 Cost Estimation

### Development/Testing
- **CockroachDB**: Free tier (5GB)
- **OpenAI API**: ~$10-20/month (moderate usage)
- **Wolfram Alpha**: Free tier (2000 queries/month)
- **Total**: ~$10-20/month

### Production (AWS)
- **ECS Fargate**: ~$15-30/month
- **CockroachDB**: ~$30/month (dedicated)
- **S3 + CloudFront**: ~$5-10/month
- **Load Balancer**: ~$20/month
- **API Costs**: ~$20-50/month
- **Total**: ~$90-140/month

## 🔒 Security Features

- **OAuth Authentication**: Secure Google sign-in
- **Input Validation**: Sanitized user inputs
- **CORS Protection**: Configured cross-origin policies
- **Environment Variables**: Secure API key management
- **HTTPS Enforcement**: SSL/TLS encryption
- **Rate Limiting**: API abuse prevention

## 🎯 Future Enhancements

- **Multi-language Support**: Support for different languages
- **Voice Input**: Audio problem description
- **Collaborative Features**: Share problems with tutors
- **Mobile App**: Native iOS/Android applications
- **Advanced Analytics**: ML-powered learning insights
- **Integration APIs**: Connect with learning management systems

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the deployment guide and API documentation
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Join community discussions for feature requests

## 🙏 Acknowledgments

- **OpenAI** for GPT-4 API
- **Wolfram Alpha** for computational engine
- **CockroachDB** for distributed database
- **Tesseract.js** for OCR capabilities
- **React Community** for excellent libraries and tools