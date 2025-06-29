# TypeTutor Deployment Guide

## Quick Deploy (Recommended)

### 1. Backend (Railway)
```bash
# From project root
cd backend
railway login
railway init
railway up
```

### 2. Frontend (Vercel)  
```bash
# From frontend directory
cd frontend
npm install
vercel --prod
```

## Manual Setup

### Database (Supabase)
1. Create new Supabase project
2. Run SQL from `scripts/database_schema.sql`
3. Get URL and anon key from Settings > API

### Environment Variables

**Railway (Backend):**
- SUPABASE_URL
- SUPABASE_ANON_KEY  
- SECRET_KEY
- FLASK_ENV=production
- USE_DATABASE=true

**Vercel (Frontend):**
- VITE_API_URL (your Railway URL + /api)

### CORS Setup
Backend automatically allows:
- Development: localhost ports
- Production: *.vercel.app domains

## Troubleshooting

**CORS Issues:**
- Check backend CORS origins in health endpoint
- Verify frontend domain is allowed
- Test with curl: `curl -X OPTIONS -H "Origin: yourapp.vercel.app" yourapi.railway.app/api/health`

**Build Failures:**
- Clear node_modules and reinstall
- Check environment variables
- Verify API URL format

**Database Issues:**
- Test Supabase connection
- Check environment variables
- Verify schema is applied
