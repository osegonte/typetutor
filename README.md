# TypeTutor Study Edition

A modern typing practice application designed for educational use. Practice typing while learning from PDFs, textbooks, and custom content.

## ✨ Features

- 📚 **PDF Upload & Processing** - Extract text from educational PDFs
- ⌨️ **Smart Typing Practice** - Paragraph-based learning approach  
- 📊 **Detailed Analytics** - Track WPM, accuracy, and progress
- 👤 **User Authentication** - Save progress and statistics
- 🌙 **Dark/Light Mode** - Comfortable typing experience
- 📱 **Responsive Design** - Works on desktop and mobile

## 🚀 Live Demo

**Frontend:** [Your Vercel URL]
**Backend:** [Your Railway URL]

## 🛠️ Tech Stack

### Frontend
- React 18 + Vite
- Tailwind CSS
- Lucide React (icons)
- Deployed on Vercel

### Backend  
- Python Flask
- Supabase (PostgreSQL)
- JWT Authentication
- PDF processing with PyPDF2
- Deployed on Railway

## 📋 Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.9+
- Supabase account
- Railway account (for backend)
- Vercel account (for frontend)

### Backend Setup

1. **Clone and setup:**
   ```bash
   git clone <repository>
   cd typetutor/backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configure environment:**
   ```bash
   cp ../.env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Setup database:**
   - Run the SQL from `scripts/database_schema.sql` in Supabase
   - Test connection: `python -c "from database.supabase_client import test_supabase_connection; print(test_supabase_connection())"`

4. **Deploy to Railway:**
   ```bash
   # Install Railway CLI
   curl -fsSL https://railway.app/install.sh | sh
   
   # Deploy
   railway login
   railway init
   railway up
   ```

### Frontend Setup

1. **Setup and configure:**
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   # Edit .env.local with your backend URL
   ```

2. **Development:**
   ```bash
   npm run dev     # Development server
   npm run build   # Production build
   npm run preview # Test production build
   ```

3. **Deploy to Vercel:**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key  
- `SECRET_KEY` - JWT signing secret
- `USE_DATABASE=true` - Enable database features

**Frontend (.env.local):**
- `VITE_API_URL` - Backend API URL

### CORS Configuration

Backend automatically configures CORS for:
- Development: `localhost:5173`, `localhost:4173`
- Production: `*.vercel.app`, `*.netlify.app`

## 📚 API Documentation

### Core Endpoints
- `GET /api/health` - Health check
- `POST /api/upload-pdf` - Upload and process PDF
- `POST /api/process-text` - Process custom text
- `GET /api/stats` - Get user statistics
- `POST /api/save-stats` - Save typing session

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

## 🎯 Usage

1. **Upload Content:** Upload PDFs or paste custom text
2. **Practice:** Type through paragraphs with real-time feedback
3. **Track Progress:** Monitor WPM, accuracy, and improvement
4. **Save Results:** Create account to save statistics

## 🔒 Security Features

- JWT-based authentication
- CORS protection
- Input validation
- File size limits
- XSS protection headers

## 📊 Database Schema

Using Supabase PostgreSQL with tables for:
- Users and authentication
- Typing sessions and statistics  
- PDF documents and content
- Achievements and goals

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues or questions:
- Check the deployment logs
- Verify environment variables
- Test API endpoints directly
- Review CORS configuration

## 🏗️ Architecture

```
Frontend (Vercel)     Backend (Railway)     Database (Supabase)
     React     ←→         Flask        ←→      PostgreSQL
   Tailwind              JWT Auth              Row Level Security
   Vite Build            PDF Processing        Real-time subscriptions
```
