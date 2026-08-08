# College ERP System - Quick Start Implementation Guide

## 🚀 Getting Started in 30 Minutes

This guide will help you set up the complete development environment and start coding immediately.

---

## Step 1: System Requirements (5 mins)

### Install Required Tools

**On Windows (using Chocolatey):**
```powershell
choco install nodejs postgresql redis docker-desktop git vscode
```

**On macOS (using Homebrew):**
```bash
brew install node@18 postgresql redis docker git
brew install --cask docker visual-studio-code
```

**On Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install nodejs npm postgresql redis-server docker.io git
curl https://code.visualstudio.com/sha/download?build=stable&os=linux-x64 -o code.deb
sudo dpkg -i code.deb
```

**Verify installations:**
```bash
node --version          # Should be v18+
npm --version           # Should be v8+
psql --version          # Should be 14+
redis-cli --version     # Should be 7+
docker --version        # Should be latest
git --version
```

---

## Step 2: Create Project Structure (5 mins)

```bash
# Create main project directory
mkdir college-erp && cd college-erp

# Create backend and frontend directories
mkdir backend frontend

# Initialize git
git init
echo "node_modules/" >> .gitignore
echo ".env" >> .gitignore
echo "dist/" >> .gitignore
echo ".DS_Store" >> .gitignore

git add .
git commit -m "Initial commit"
```

---

## Step 3: Backend Setup (10 mins)

### 3.1 Initialize Backend Project
```bash
cd backend

# Initialize npm
npm init -y

# Install core dependencies
npm install express typescript ts-node @types/express @types/node @types/cors cors dotenv
npm install sequelize pg redis jsonwebtoken bcryptjs axios multer
npm install --save-dev nodemon ts-node-dev @types/jsonwebtoken @types/bcryptjs jest @types/jest

# Create TypeScript config
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Create folder structure
mkdir -p src/{config,controllers,services,models,routes,middleware,utils}

echo "✅ Backend initialized"
```

### 3.2 Create Environment File
```bash
cat > .env << 'EOF'
NODE_ENV=development
PORT=5000
API_URL=http://localhost:5000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=college_erp_db
DB_USER=erp_user
DB_PASSWORD=erp_password_123

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=college_erp_secret_key_min_32_chars_long_secure_key
JWT_EXPIRY=7d

# Email (optional for now)
SENDGRID_API_KEY=your_key_here

# SMS (optional for now)
TWILIO_ACCOUNT_SID=your_sid_here
TWILIO_AUTH_TOKEN=your_token_here

# Payment (optional for now)
RAZORPAY_KEY_ID=your_key_here
RAZORPAY_KEY_SECRET=your_secret_here

# AWS S3 (optional for now)
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
AWS_S3_BUCKET=your_bucket
AWS_REGION=ap-south-1
EOF

cat > .env.example << 'EOF'
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=college_erp_db
DB_USER=erp_user
DB_PASSWORD=erp_password_123
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRY=7d
EOF
```

### 3.3 Create Main App File
```bash
cat > src/app.ts << 'EOF'
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'College ERP API is running!' });
});

// Error handler middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
EOF

cat > src/index.ts << 'EOF'
import app from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 College ERP API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
EOF
```

### 3.4 Update package.json Scripts
```bash
cat > package.json << 'EOF'
{
  "name": "college-erp-backend",
  "version": "1.0.0",
  "description": "College ERP System Backend",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "lint": "eslint src/**/*.ts"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.1.2",
    "multer": "^1.4.5-lts.1",
    "pg": "^8.11.3",
    "redis": "^4.6.11",
    "sequelize": "^6.35.2"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.2",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/jest": "^29.5.8",
    "@types/node": "^20.0.0",
    "jest": "^29.7.0",
    "nodemon": "^3.0.2",
    "ts-jest": "^29.1.1",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.3"
  }
}
EOF
```

### 3.5 Test Backend
```bash
npm run dev

# In another terminal, test:
curl http://localhost:5000/api/health
# Should return: {"status":"OK","timestamp":"..."}
```

---

## Step 4: Frontend Setup (10 mins)

### 4.1 Initialize React Project
```bash
cd ../frontend

# Create Vite React TypeScript project
npm create vite@latest . -- --template react-ts

# Install dependencies
npm install
npm install axios react-router-dom zustand react-hook-form zod
npm install -D tailwindcss postcss autoprefixer

# Initialize Tailwind
npx tailwindcss init -p
```

### 4.2 Configure Tailwind
```bash
cat > tailwind.config.js << 'EOF'
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
}
EOF
```

### 4.3 Create Environment File
```bash
cat > .env << 'EOF'
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=College ERP System
VITE_APP_VERSION=1.0.0
EOF

cat > .env.example << 'EOF'
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=College ERP System
VITE_APP_VERSION=1.0.0
EOF
```

### 4.4 Create API Service
```bash
mkdir -p src/{services,pages,components,store,types}

cat > src/services/api.ts << 'EOF'
import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;
EOF
```

### 4.5 Create Simple Login Page
```bash
cat > src/pages/LoginPage.tsx << 'EOF'
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await API.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl w-96">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">College ERP</h1>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-2 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-2 border border-gray-300 rounded mb-6 focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};
EOF

cat > src/pages/DashboardPage.tsx << 'EOF'
import React from 'react';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-600 text-white p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">College ERP</h1>
          <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded hover:bg-red-600">
            Logout
          </button>
        </div>
      </nav>
      <div className="p-8">
        <h2 className="text-3xl font-bold mb-4">Welcome, {user.name}!</h2>
        <p className="text-gray-600 mb-4">Role: {user.role}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">Attendance</h3>
            <p className="text-gray-600">View your attendance details</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">Marks</h3>
            <p className="text-gray-600">Check your semester results</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">Fees</h3>
            <p className="text-gray-600">Manage fee payments</p>
          </div>
        </div>
      </div>
    </div>
  );
};
EOF
```

### 4.6 Update App Component
```bash
cat > src/App.tsx << 'EOF'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

function App() {
  const token = localStorage.getItem('token');

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route 
          path="/dashboard" 
          element={token ? <DashboardPage /> : <Navigate to="/login" />} 
        />
        <Route path="/" element={token ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
EOF
```

### 4.7 Test Frontend
```bash
npm run dev

# Opens at http://localhost:5173
# You'll see login page (can't login yet as backend auth not set up, but UI is working)
```

---

## Step 5: Database Setup (5 mins)

### 5.1 Create PostgreSQL Database
```bash
# Linux/Mac
psql -U postgres -c "CREATE USER erp_user WITH PASSWORD 'erp_password_123';"
psql -U postgres -c "CREATE DATABASE college_erp_db OWNER erp_user;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE college_erp_db TO erp_user;"

# Windows (using PowerShell)
# Start PostgreSQL and create manually using pgAdmin or command line
```

### 5.2 Verify Connection
```bash
psql -U erp_user -d college_erp_db -h localhost -c "\dt"
# Should work and return (no relations yet)
```

---

## Step 6: Docker Setup (Optional but Recommended)

### 6.1 Create Docker Compose File
```bash
# In project root (college-erp/)
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: college_erp_db
      POSTGRES_USER: erp_user
      POSTGRES_PASSWORD: erp_password_123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U erp_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
EOF

# Start services
docker-compose up -d

# Verify
docker-compose ps
# Should show both postgres and redis running
```

---

## Step 7: Run Everything Together

### Terminal 1: Start PostgreSQL & Redis
```bash
# If using Docker
cd college-erp
docker-compose up -d

# If using local installations
# PostgreSQL usually starts automatically
# Start Redis manually:
redis-server

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### Terminal 2: Start Backend
```bash
cd college-erp/backend
npm run dev

# Should show:
# 🚀 College ERP API running on http://localhost:5000
# 📊 Health check: http://localhost:5000/api/health
```

### Terminal 3: Start Frontend
```bash
cd college-erp/frontend
npm run dev

# Should show:
# ➜  Local:   http://localhost:5173/
```

### Test Everything Works
```bash
# Test API
curl http://localhost:5000/api/health
# Response: {"status":"OK","timestamp":"..."}

# Test Frontend
# Open http://localhost:5173 in browser
# Should see login page
```

---

## 📝 Next Steps After Setup

### Week 1: Database Models
1. Create all database models (User, Student, Attendance, Marks, Fee, etc.)
2. Create migrations script
3. Seed initial data

### Week 2: Authentication API
1. Implement `/api/auth/login` endpoint
2. Implement `/api/auth/register` endpoint
3. Add RBAC middleware
4. Test with Postman

### Week 3: Student APIs
1. Implement GET `/api/students/dashboard`
2. Implement GET `/api/students/profile`
3. Implement PUT `/api/students/profile`

### Week 4: Attendance APIs
1. Implement POST `/api/attendance/mark`
2. Implement GET `/api/attendance/my-attendance`
3. Add auto-sync logic

Continue with remaining phases from the main tech stack guide.

---

## 🛠️ Useful Commands Reference

### Backend Commands
```bash
cd backend

# Development
npm run dev                 # Start with auto-reload
npm run build              # Build TypeScript to JS
npm run start              # Run built version
npm test                   # Run tests
npm run lint               # Check code quality
```

### Frontend Commands
```bash
cd frontend

npm run dev                # Start dev server
npm run build              # Build for production
npm run preview            # Preview production build
npm run lint               # Check code quality
```

### Docker Commands
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs backend
docker-compose logs postgres

# Access postgres shell
docker-compose exec postgres psql -U erp_user -d college_erp_db

# Access redis shell
docker-compose exec redis redis-cli
```

### Database Commands
```bash
# Connect to PostgreSQL
psql -U erp_user -d college_erp_db -h localhost

# Common queries
\dt                         # List all tables
\d table_name               # Describe table
SELECT * FROM users;        # Query data
\q                          # Quit
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000              # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Kill process
kill -9 <PID>              # macOS/Linux
taskkill /PID <PID> /F     # Windows
```

### PostgreSQL Connection Error
```bash
# Test connection
psql -U erp_user -d college_erp_db -h localhost -c "SELECT 1"

# Check PostgreSQL status (macOS with Homebrew)
brew services list

# Restart PostgreSQL
brew services restart postgresql@15
```

### Redis Connection Error
```bash
# Test connection
redis-cli ping

# Restart Redis
redis-server

# Or with Homebrew
brew services restart redis
```

### Port 3000 Already in Use (Frontend)
Vite will automatically use port 5173 if 3000 is in use.

---

## 📚 Useful Tools to Install

### Postman (API Testing)
```bash
# macOS
brew install --cask postman

# Windows
choco install postman

# Linux
# Download from https://www.postman.com/downloads/
```

### VS Code Extensions
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- Thunder Client (API testing)
- Database Client
- Docker

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/attendance-module

# Make changes and commit
git add .
git commit -m "feat: implement attendance marking"

# Push to remote
git push origin feature/attendance-module

# Create pull request on GitHub
```

---

## 🎯 Success Checklist

- [ ] All dependencies installed without errors
- [ ] Backend server running on port 5000
- [ ] Frontend running on port 5173
- [ ] PostgreSQL database created and connected
- [ ] Redis cache running
- [ ] API health check responds successfully
- [ ] Frontend login page displays
- [ ] Backend logs show no errors
- [ ] Git repository initialized with commits

If all checkmarks are done, you're ready to start building! 🚀

---

## 📞 Need Help?

- **Backend Issues**: Check backend logs in terminal
- **Frontend Issues**: Check browser console (F12)
- **Database Issues**: Use DBeaver or pgAdmin to debug
- **Docker Issues**: Run `docker-compose logs` to see errors
- **General Issues**: Read error messages carefully - they usually indicate the problem

Good luck! Start with Week 1 tasks and build progressively. Don't try to build everything at once.
