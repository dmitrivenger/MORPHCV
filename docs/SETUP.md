# MorphCV Setup Guide

## Prerequisites
- Node.js 18+
- A Supabase account (free)
- An Anthropic API key

## 1. Database Setup (Supabase)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `docs/schema.sql`
3. Copy your **Project URL** and **anon key** from Settings → API

## 2. Backend Setup

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```
NODE_ENV=development
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=sk-ant-...
```

Install and run:
```bash
npm install
npm run dev
```

Backend runs at http://localhost:3001
Test it: http://localhost:3001/health

## 3. Frontend Setup

```bash
cd frontend
cp .env.example .env
```

`.env` is already configured for local dev (proxies to :3001).

Install and run:
```bash
npm install
npm run dev
```

Frontend runs at http://localhost:5173

## 4. Usage

1. Open http://localhost:5173
2. **Step 1**: Upload your CV (PDF, DOCX, or TXT)
3. **Step 2**: Paste a job URL or job description text
4. **Step 3**: Click "Generate Customized CV"
5. **Step 4**: Refine via chat, then download PDF

## Deployment

### Backend (Railway)
1. Push code to GitHub
2. Create Railway project, connect repo
3. Set environment variables in Railway dashboard
4. Deploy

### Frontend (Vercel)
1. Create Vercel project, connect repo
2. Set `VITE_API_URL` to your Railway URL
3. Deploy from `frontend/` directory

## Token Usage
- ~3,000 tokens per customization
- $20 Anthropic credit ≈ 2,000+ customizations
