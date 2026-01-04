# ForMath

**Step-by-Step Problem Solving Analysis Helper**

ForMath is an educational tool that helps students analyze their math homework by identifying calculation errors, conceptual mistakes, and providing detailed feedback on their solutions. The application uses advanced OCR, OpenAI's GPT-4, and Wolfram Alpha to provide comprehensive mathematical analysis and tutoring help.

## Features

### Core Functionality
- **Multi-format Input Support**: Upload images (JPG, PNG, GIF, BMP) or PDF files of math homework
- **Camera Integration**: Capture math problems directly using your device's camera
- **Text Input**: Enter problems manually or paste from other sources
- **Advanced OCR**: Extract text from images and scanned PDFs using Tesseract.js
- **PDF Processing**: Direct text extraction from digital PDFs with OCR fallback for scanned documents

### AI-Powered Analysis
- **Problem Parsing**: Automatically separates original problems from student solutions
- **Error Detection**: Identifies conceptual errors, computational mistakes, or confirms correct solutions
- **Solution Verification**: Uses Wolfram Alpha to provide correct solutions for comparison
- **Detailed Feedback**: GPT-4 powered analysis with explanations, hints, and improvement suggestions
- **Topic Classification**: Categorizes problems by mathematical topic and difficulty level

## Technology Stack

### Frontend
- **React 18** - Modern UI framework
- **React Router** - Client-side routing
- **Axios** - HTTP client for API communication
- **Tesseract.js** - Client-side OCR processing
- **PDF.js** - PDF rendering and text extraction
- **React Webcam** - Camera integration
- **React Dropzone** - File upload interface
- **Recharts** - Data visualization
- **KaTeX** - Mathematical notation rendering

### Backend
- **Node.js** with Express - RESTful API server
- **PostgreSQL** (CockroachDB) - Database for user data and analytics
- **OpenAI GPT-4** - Problem analysis
- **Wolfram Alpha API** - Mathematical computation and verification
- **Multer** - File upload handling
- **PDF-Parse** - Server-side PDF text extraction

### Deployment
- **Vercel** - Frontend hosting and deployment
- **Docker** - Containerized backend deployment
- **Environment Variables** - Secure configuration management

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL database (or CockroachDB)
- OpenAI API key
- Wolfram Alpha App ID
- Google OAuth 2.0 credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/darthvader58/biryani.git
   cd biryani
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Configure environment variables**
   
   Create `.env` in the root directory:
   ```env
   REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
   ```
   
   Create `backend/.env`:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   OPENAI_API_KEY=your_openai_api_key
   WOLFRAM_APP_ID=your_wolfram_alpha_app_id
   PORT=8080
   NODE_ENV=development
   ```

5. **Set up the database**
   The application will automatically create the required tables on first run.

6. **Start the development servers**
   
   Backend server:
   ```bash
   cd backend
   npm start
   ```
   
   Frontend development server:
   ```bash
   npm start
   ```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000` (development)
   - Your production domain (e.g., `https://your-app.vercel.app`)

## Usage

### Analyzing Math Problems

1. **Sign in** with your Google account
2. **Upload your homework** using one of three methods:
   - **File Upload**: Drag and drop images or PDF files
   - **Camera**: Take a photo of your math work
   - **Text Input**: Type or paste the problem directly
3. **Review extracted text** and edit if necessary
4. **Click "Analyze Problem"** to get AI feedback
5. **View detailed results** including:
   - Original problem identification
   - Your solution analysis
   - Correct solution from Wolfram Alpha
   - Error classification and explanations
   - Hints for improvement

### Dashboard Features

- **Performance Overview**: Total problems, accuracy rates, error distribution
- **Progress Charts**: Visual tracking of improvement over time
- **Topic Analysis**: Performance breakdown by mathematical topics
- **Problem History**: Complete record of analyzed problems

## API Endpoints

### Core Endpoints
- `POST /api/analyze-problem` - Analyze a math problem
- `GET /api/dashboard/:email` - Get user dashboard data
- `POST /api/upload-file` - Upload and process files
- `POST /api/feedback` - Submit user feedback

### Authentication
The application uses Google OAuth for authentication. Users must be signed in to access analysis features and dashboard.

## File Processing

### Supported Formats
- **Images**: JPG, PNG, GIF, BMP (processed with OCR)
- **PDFs**: Digital PDFs (direct text extraction) and scanned PDFs (OCR fallback)

### Processing Pipeline
1. **File Upload**: Secure file handling with size limits (10MB)
2. **Text Extraction**: OCR for images, direct extraction for digital PDFs
3. **Content Parsing**: AI separation of problems from solutions
4. **Analysis**: Multi-step AI analysis with external verification
5. **Storage**: Secure database storage with user analytics

## Deployment

### Frontend (Vercel)
```bash
npm run build
vercel --prod
```

### Backend (Docker)
```bash
cd backend
docker build -t formath-backend .
docker run -p 8080:8080 formath-backend
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

<div align="center">

**Made with &lt;3 by [Shashwat Raj](https://github.com/shashwatraj), [Vaibhav Urs](https://github.com/vurs1), [Sahaj Rastogi](https://github.com/sahajrastogi), [Ananya Bhargava](https://github.com/aloobhaalu)**

*Because everyone deserves to look good without the stress*

[🌟 Star this repo](https://github.com/darthvader58/whatrobe) • [🐛 Report Bug](https://github.com/darthvader58/whatrobe/issues) • [💡 Request Feature](https://github.com/darthvader58/whatrobe/issues)

</div>
