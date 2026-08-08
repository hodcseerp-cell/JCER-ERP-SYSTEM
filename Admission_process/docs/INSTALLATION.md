# 🚀 First-Time Developer Setup & Installation Guide

Welcome to the **College ERP System**! This guide contains step-by-step instructions to set up the entire development environment from scratch.

This project is a monorepo structured using **npm Workspaces**. It consists of a React frontend, an Express backend, a shared validation library, and an Admission Portal subproject.

---

## 📋 Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Step-by-Step Installation](#2-step-by-step-installation)
3. [Environment Configuration (`.env`)](#3-environment-configuration-env)
4. [Spinning Up Services (PostgreSQL & Redis)](#4-spinning-up-services-postgresql--redis)
5. [Database Migrations & Mock Data Seeding](#5-database-migrations--mock-data-seeding)
6. [Running the Application](#6-running-the-application)
7. [System Access Points](#7-system-access-points)
8. [Demo Login Accounts](#8-demo-login-accounts)
9. [Development Best Practices](#9-development-best-practices)
10. [Troubleshooting & FAQs](#10-troubleshooting--faqs)

---

## 1. Prerequisites

Before setting up the repository, make sure your machine has the following tools installed:

### 🛠️ Core Dependency Matrix
* **Node.js**: `v18.x` or `v20.x` (LTS recommended)
* **npm**: `v8.x` or higher (standard with Node)
* **Docker & Docker Compose**: Required for PostgreSQL & Redis
* **Git**: Version `2.30+`

### 💻 OS-Specific Prerequisites Installation

#### **On Windows (using Chocolatey / Powershell)**
```powershell
choco install nodejs git docker-desktop vscode postman -y
```

#### **On macOS (using Homebrew)**
```bash
brew install node@18 git docker visual-studio-code postman
brew install --cask docker
```

#### **On Linux (Ubuntu/Debian)**
```bash
sudo apt update
sudo apt install nodejs npm git docker.io docker-compose -y
```

---

## 2. Step-by-Step Installation

### Step 2.1: Clone the Repository
Clone the project repository to your workspace:
```bash
git clone https://github.com/vyonlabsofficial-lang/College.git
cd College
```

### Step 2.2: Install Workspace Dependencies
Since this project uses **npm Workspaces**, installing dependencies at the root directory installs packages for the root, backend, frontend, and all package directories simultaneously:
```bash
npm install
```
> [!IMPORTANT]
> Always run `npm install` at the **root** of the project. Do not run `npm install` in sub-folders (like `backend` or `frontend`) unless you specifically want to add a package just for that workspace.

---

## 3. Environment Configuration (`.env`)

We configure the environments using `.env` files. Template configuration files (`.env.example`) are provided in the respective directories.

### 3.1 Backend Configuration
Copy the backend environment variables template:
```bash
# On Linux/macOS:
cp backend/.env.example backend/.env

# On Windows (Command Prompt):
copy backend\.env.example backend\.env

# On Windows (PowerShell):
cp backend/.env.example backend/.env
```

Open `backend/.env` and review the default configuration values. They are pre-set for a local Docker-based setup:
* `PORT=5000`
* `DB_HOST=localhost` (Use `postgres` if running the backend *inside* Docker Compose)
* `DB_PORT=5432`
* `DB_NAME=college_erp_db`
* `DB_USER=erp_user`
* `DB_PASSWORD=erp_password_123`
* `REDIS_HOST=localhost` (Use `redis` if running the backend *inside* Docker Compose)
* `REDIS_PORT=6379`
* `JWT_SECRET=college_erp_super_secret_key_min_32_characters_long_very_secure`

### 3.2 Frontend Configuration
Copy the frontend environment variables template:
```bash
# On Linux/macOS/PowerShell:
cp frontend/.env.example frontend/.env
```

Open `frontend/.env` and check the keys:
* `VITE_API_URL=http://localhost:5000/api`
* `VITE_SOCKET_URL=http://localhost:5000`

---

## 4. Spinning Up Services (PostgreSQL & Redis)

We containerize our database and caching layers to ensure a consistent developer setup. You do not need to install PostgreSQL or Redis directly on your host machine.

From the **project root directory**, run Docker Compose to start the local services in the background:
```bash
docker-compose up -d postgres redis
```

### 🔍 Verify Health of Services
Wait 10–15 seconds, and then check if the services are running and healthy:
```bash
# Check container status
docker-compose ps

# Verify PostgreSQL is accepting connections
docker exec college_erp_postgres pg_isready -U erp_user -d college_erp_db

# Verify Redis is online (should respond with PONG)
docker exec college_erp_redis redis-cli ping
```

---

## 5. Database Migrations & Mock Data Seeding

Once the database container is online and healthy, run the migrations and seeds to build the schema and populate it with initial data.

Run these commands from the **project root**:

```bash
# 1. Run migrations to create tables and database schema
npm run migrate --workspace=backend

# 2. Load seed/mock data (Admin accounts, mock students, roles, etc.)
npm run seed --workspace=backend
```

---

## 6. Running the Application

There are two primary methods to run the ERP system depending on your development requirements.

### Method A: Running on the Host Machine (Recommended for active coding)
This method runs the services locally on your machine, enabling fast Hot Module Replacement (HMR) and easy debugger attachments.

From the **project root**:
```bash
# Start all projects (Backend, Frontend, Admission Portal) simultaneously
npm run dev
```

If you prefer to start them individually:
* **Backend API only**: `npm run dev:backend`
* **Frontend Portal only**: `npm run dev:frontend`
* **Admission Portal only**: `npm run dev:admission`

### Method B: Running Everything in Docker
If you want to verify production compatibility or run the full app without installing node dependencies on your host machine, run:
```bash
docker-compose up --build
```
This spins up the databases, backend API, frontend React app, and the Admission Portal concurrently inside Docker containers.

---

## 7. System Access Points

Below are the default addresses for access and integration:

| Component / Service | Environment | Access / Connection URI |
| :--- | :--- | :--- |
| **Main Frontend Web App** | Development | [http://localhost:5173](http://localhost:5173) |
| **Admission Portal** | Development | [http://localhost:5174](http://localhost:5174) |
| **Backend REST API Server** | Development | [http://localhost:5000](http://localhost:5000) |
| **API Health Check** | Development | [http://localhost:5000/api/health](http://localhost:5000/api/health) |
| **PostgreSQL Database** | Direct Connection | `Host: localhost`, `Port: 5432`, `DB: college_erp_db`, `User: erp_user` |
| **Redis Cache Store** | Direct Connection | `Host: localhost`, `Port: 6379` |

---

## 8. Demo Login Accounts

After seeding the database in [Step 5](#5-database-migrations--mock-data-seeding), you can log in to the dashboards using the following seeded credentials:

### 💼 Administrator Dashboard
* **Email**: `admin@college.com`
* **Password**: `admin123`

### 🏫 Principal Dashboard
* **Email**: `principal@college.com`
* **Password**: `principal123`

---

## 9. Development Best Practices

To maintain a healthy monorepo workflow across the development team, follow these rules:

1. **Monorepo Commands**: Never run `npm install` inside subdirectories. Always add dependencies from the root directory using workspaces:
   ```bash
   # Example: Adding lodash to the backend workspace
   npm install lodash --workspace=backend
   ```
2. **Schema Changes**: Do not modify PostgreSQL tables manually using visual clients (DBeaver, pgAdmin, etc.). Always create a new Sequelize migration file:
   ```bash
   npx --workspace=backend sequelize-cli migration:generate --name your-migration-name
   ```
3. **Coding Standards**: Verify code styling and run typechecks before pushing commits:
   ```bash
   # Run linter
   npm run lint
   
   # Run TypeScript compiler checks
   npm run type-check
   ```

---

## 10. Troubleshooting & FAQs

### 🛑 Port Conflict (Port 5432 or 6379 already in use)
* **Problem**: Docker Compose fails to start Postgres/Redis because port `5432` or `6379` is already bound.
* **Solution**: You likely have a native PostgreSQL or Redis service running on your host machine. Stop them:
  * **Windows**: Run `services.msc`, locate PostgreSQL/Redis services, and click Stop.
  * **macOS**: Run `brew services stop postgresql` and `brew services stop redis`.
  * **Linux**: Run `sudo systemctl stop postgresql` and `sudo systemctl stop redis-server`.

### 🛑 Database Connection Refused
* **Problem**: The backend fails to connect to the database with `ECONNREFUSED`.
* **Solution**:
  1. Verify the PostgreSQL Docker container is running: `docker ps`.
  2. If the backend is running directly on your host machine, make sure `DB_HOST` in `backend/.env` is set to `localhost`.
  3. If the backend is running inside a Docker container (using Docker Compose), ensure `DB_HOST` is set to `postgres`.

### 🛑 Shared Code Verification Errors
* **Problem**: TypeScript compilation fails for missing dependencies or shared modules.
* **Solution**: Clean your workspace dependencies and reinstall:
  ```bash
  # Delete all node_modules folders
  # Linux/macOS:
  find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
  
  # Reinstall root dependencies
  npm install
  ```
