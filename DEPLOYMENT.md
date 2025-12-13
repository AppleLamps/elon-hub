# Deployment Guide

## Quick Start

1. **Set up environment variables:**
   - Copy `.env.example` to `.env.local`
   - Add your xAI API key: `XAI_API_KEY=your_key_here`

2. **Run locally:**
   ```bash
   npm install
   npm run dev
   ```
   Visit http://localhost:3000

## Deploy to Vercel

### Option 1: GitHub Integration (Recommended)

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/elon-radar.git
   git push -u origin main
   ```

2. **Deploy on Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Add environment variable: `XAI_API_KEY` = your API key
   - Click "Deploy"

### Option 2: Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```
   Follow prompts and add `XAI_API_KEY` when asked.

## Environment Variables

Required environment variable:
- `XAI_API_KEY` - Your xAI API key from https://console.x.ai

## Features Enabled

- **Agentic Search**: Uses Grok-4-1-fast with autonomous tool calling
- **Web Search**: Searches trusted news domains
- **X Search**: Monitors Elon Musk and company handles
- **Image/Video Understanding**: Analyzes visual content from posts
- **Code Execution**: Performs sentiment analysis and calculations
- **Real-time Updates**: Refreshes every 15 minutes or on demand

## Cost Estimate

- API calls: ~$0.01-0.10 per query (depends on tool usage)
- Vercel hosting: Free tier includes 100GB bandwidth/month
- Expected monthly cost: $5-20 for moderate usage

## Troubleshooting

**API errors:**
- Verify `XAI_API_KEY` is set correctly
- Check API key has access to Grok-4-1-fast model
- Ensure xAI SDK version is compatible (v1.0.0+)

**Build errors:**
- Run `npm install` to ensure dependencies are installed
- Check Node.js version (18.x or higher required)
- Verify TypeScript compilation: `npm run build`

**No data showing:**
- Check browser console for errors
- Verify API route is accessible: `/api/radar`
- Test API directly with curl or Postman

