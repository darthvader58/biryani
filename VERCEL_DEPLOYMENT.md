# 🚀 Vercel Deployment Guide for ForMath

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Environment Variables**: Prepare your API keys and database credentials

## 📋 Step-by-Step Deployment

### 1. Install Vercel CLI (Optional)
```bash
npm install -g vercel
```

### 2. Environment Variables Setup

In your Vercel dashboard, add these environment variables:

#### Frontend Variables:
- `REACT_APP_GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
- `REACT_APP_API_URL` - Will be your Vercel app URL (e.g., https://your-app.vercel.app)

#### Backend Variables:
- `OPENAI_API_KEY` - Your OpenAI API key
- `WOLFRAM_APP_ID` - Your Wolfram Alpha App ID
- `DATABASE_URL` - Your CockroachDB connection string
- `NODE_ENV` - Set to "production"

### 3. Deploy via Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect it's a React app
5. Configure environment variables in the dashboard
6. Click "Deploy"

### 4. Deploy via CLI (Alternative)

```bash
# Login to Vercel
vercel login

# Deploy from project root
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (select your account)
# - Link to existing project? N
# - Project name: formath (or your preferred name)
# - Directory: ./
# - Override settings? N

# Deploy to production
vercel --prod
```

### 5. Post-Deployment Configuration

#### Update API URLs
After deployment, update your frontend to use the production API URL:

1. In your Vercel dashboard, note your app URL (e.g., `https://formath-xyz.vercel.app`)
2. Update environment variable `REACT_APP_API_URL` to this URL
3. Redeploy if necessary

#### Update Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services > Credentials
3. Edit your OAuth 2.0 Client ID
4. Add your Vercel domain to "Authorized JavaScript origins":
   - `https://your-app.vercel.app`
5. Add to "Authorized redirect URIs":
   - `https://your-app.vercel.app`

## 🔧 Configuration Files

The following files have been created for Vercel deployment:

### `vercel.json`
- Configures both frontend and backend deployment
- Routes API calls to the backend serverless function
- Sets up build configuration

### `.vercelignore`
- Excludes unnecessary files from deployment
- Reduces deployment size and time

## 🌐 Architecture

```
Vercel Deployment:
├── Frontend (React) - Static files served by Vercel CDN
├── Backend (Node.js) - Serverless functions
├── Database (CockroachDB) - External cloud database
└── APIs (OpenAI, Wolfram) - External services
```

## 🚨 Important Notes

1. **Serverless Functions**: The backend runs as serverless functions with a 30-second timeout
2. **Environment Variables**: Never commit `.env` files - use Vercel dashboard
3. **CORS**: The backend is configured to accept requests from your Vercel domain
4. **File Uploads**: Limited to 10MB due to serverless constraints
5. **Cold Starts**: First request might be slower due to serverless cold starts

## 🔍 Troubleshooting

### Common Issues:

1. **API Not Working**: Check environment variables in Vercel dashboard
2. **CORS Errors**: Ensure backend CORS is configured for your domain
3. **Build Failures**: Check build logs in Vercel dashboard
4. **Database Connection**: Verify DATABASE_URL is correct

### Debug Commands:
```bash
# Check deployment logs
vercel logs

# Check function logs
vercel logs --follow

# Redeploy
vercel --prod
```

## 📱 Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click "Domains" tab
3. Add your custom domain
4. Update DNS records as instructed
5. Update Google OAuth settings with new domain

## 🎉 Success!

Your ForMath app should now be live at:
- `https://your-app.vercel.app`

Test all features:
- ✅ File upload and OCR
- ✅ Google OAuth login
- ✅ Problem analysis
- ✅ Dashboard functionality
- ✅ PDF processing

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify all environment variables
3. Test API endpoints individually
4. Check browser console for errors

Happy deploying! 🚀