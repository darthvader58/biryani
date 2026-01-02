#!/bin/bash

echo "Deploying ForMath to Vercel..."

# Set environment variables in Vercel
echo "Setting environment variables..."
vercel env add DATABASE_URL
vercel env add OPENAI_API_KEY  
vercel env add WOLFRAM_APP_ID
vercel env add NODE_ENV

# Deploy to Vercel
echo "Deploying..."
vercel --prod

echo "Deployment complete!"
echo "Don't forget to add your environment variables in Vercel dashboard if not set via CLI"