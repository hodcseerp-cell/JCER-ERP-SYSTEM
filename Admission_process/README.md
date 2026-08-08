# College ERP System

A comprehensive, production-ready Enterprise Resource Planning (ERP) system for college management, from admission to graduation.

## Features

### 🎓 Admission Management
- Online admission form
- Multi-step validation (Validator → Principal)
- Automated credential generation
- Status tracking and notifications

### 👨‍🎓 Student Portal
- Academic performance tracking
- Attendance monitoring
- Fee payment and status
- Study materials and assignments
- Performance analytics
- Grievance resolution

### 👨‍🏫 Teacher Portal
- Attendance marking with auto-sync
- Marks entry and grade calculation
- Study material upload
- Assignment management
- Student performance analysis

### 🏫 HOD Dashboard
- Department analytics
- Faculty management
- Student records and performance
- Department reports

### 💼 Admin Management
- Student enrollment
- Fee collection and reporting
- Timetable and exam scheduling
- Document verification
- ID card and certificate generation

### 🎯 Principal Dashboard
- College-wide analytics
- Staff management and approvals
- Budget overview
- Annual report generation

### 👨‍👩‍👦 Parent Portal
- Child academic tracking
- Attendance monitoring
- Fee status and payment
- Real-time notifications

## Tech Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS + Redux Toolkit
- **Backend:** Node.js + Express + TypeScript + Sequelize ORM
- **Database:** PostgreSQL + Redis
- **Cloud:** AWS (EC2, RDS, S3, CloudFront)
- **DevOps:** Docker, Docker Compose, GitHub Actions
- **Integrations:** Razorpay, SendGrid, Twilio, Firebase

## 🚀 Developer First-Time Setup

This repository is organized as an npm workspaces monorepo containing both the backend and frontend components.

### 🛠️ Prerequisites
Ensure you have the following installed on your machine:
- **Node.js** (version `>= 18.0.0`)
- **npm** (version `>= 8.0.0`)
- **Git**
- **Docker & Docker Compose** (highly recommended)

---

### 📥 Step 1: Clone the Repository
Clone the repository and navigate into the project directory:
```bash
git clone https://github.com/yuvarajbtalawar99-creator/Admission-process.git
cd Admission-process
```

---

### 🐳 Option A: Run Using Docker Compose (Easiest & Quickest)
If you have Docker installed, you can spin up the database, Redis cache, backend, and frontend simultaneously with a single command:

1. **Start the containers:**
   ```bash
   docker-compose up --build
   ```
2. **Verify services are running:**
   - **Backend API:** `http://localhost:5000`
   - **Frontend App & Portals:** `http://localhost:5173` (Includes Landing Page, Student Admission Portal, Admin & Principal Dashboards)
   - **PostgreSQL Database:** Port `5432`
   - **Redis Cache:** Port `6379`

---

### 💻 Option B: Run Locally (For Local Development)
If you prefer running the processes directly on your local machine:

#### 1. Set Up Databases (Postgres & Redis)
Ensure you have local instances of PostgreSQL and Redis running. 
* *Tip:* You can use Docker to spin up just the database and cache infrastructure while running backend/frontend locally:
  ```bash
  docker-compose up -d postgres redis
  ```

#### 2. Configure Environment Variables
Copy the `.env.example` templates to `.env` files and customize them:

* **Backend Environment Setup:**
  ```bash
  cp backend/.env.example backend/.env
  ```
  Open `backend/.env` and update:
  - Database credentials (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`)
  - Redis configuration (`REDIS_HOST`, `REDIS_PORT`)
  - Integration keys (SendGrid, Twilio, Razorpay, AWS S3, etc.)

* **Frontend Environment Setup:**
  ```bash
  cp frontend/.env.example frontend/.env
  ```
  Open `frontend/.env` and review the API endpoint configurations (by default set to local ports).

#### 3. Install Monorepo Dependencies
Since this is an npm workspaces project, run the installation command at the **root** of the project to install packages for all apps:
```bash
npm install
```

#### 4. Start the Development Servers
From the root directory, you can run:

* **To start both Backend and Frontend together:**
  ```bash
  npm run dev
  ```
* **To run backend only:**
  ```bash
  npm run dev:backend
  ```
* **To run frontend only:**
  ```bash
  npm run dev:frontend
  ```

---

### 🚀 Pushing Changes
When you are ready to push changes, you can use the workspace utility script:
```bash
.\push_project.bat
```
This script automatically commits local changes and pushes them to your branch on the remote repository.

## Project Structure

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed structure.

## API Documentation

See [API.md](./docs/API.md) for complete API endpoints.

## Deployment

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for production deployment guide.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

MIT License - See [LICENSE](./LICENSE) for details.

## Support

For issues and feature requests, please use GitHub Issues.

For documentation, refer to the [docs](./docs/) folder.