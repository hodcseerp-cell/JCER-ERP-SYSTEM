# Team Playbook: Local Setup, Collaboration, & Integration Guide

This document acts as an operational guide for our **4-member developer team** to align on environment setup, database management, task allocation, and integration testing on the **College ERP** platform.

---

## 1. Prerequisites: Local Machine Setup

Every developer must install and configure the following core technologies on their local machine before running the application:

### 1.1 Mandatory Software Stack
1. **Git**: Installed and configured locally with credentials matching GitHub.
2. **Node.js (v18.x or v20.x)**: Recommended version runtime for running frontend and backend commands.
3. **Docker & Docker Desktop**: Required for spinning up Postgres, Redis, and containerized backend/frontend environments.
4. **IDE (VS Code recommended)** with extensions:
   - *ESLint & Prettier*: For code quality and styling consistency.
   - *Docker*: For monitoring container logs and status.
   - *Thunder Client / Postman*: For quick local API testing.
   - *Database Client (e.g., DBeaver or VS Code Database Client)*: To view PostgreSQL tables.

### 1.2 Initial Workspace Setup
After cloning the repository, set up your local environmental variables:
```bash
# Clone the repository
git clone https://github.com/vyonlabsofficial-lang/Erp-system.git
cd Erp-system

# Setup Backend Environment
cd backend
cp .env.example .env

# Setup Frontend Environment
cd ../frontend
cp .env.example .env
```
> [!NOTE]
> Keep the default host configurations as `localhost` if running Node.js servers manually on your host machine, or use services hostnames (`postgres`, `redis`) if executing within Docker Compose containers.

---

## 2. Using & Managing the Database

We use **PostgreSQL 15** running as a Docker service. Developers do not need to install PostgreSQL locally on their host OS.

### 2.1 Starting the Database Services
From the project root directory, run Docker Compose to start the Postgres and Redis engines in detached mode:
```bash
docker compose up postgres redis -d
```

### 2.2 Migrations & Schema Changes (Sequelize)
Do **not** edit SQL tables manually using GUI clients. Always use migrations to keep schemas identical across all developer systems:
```bash
# In the backend directory:
# Run all pending migrations
npm run migrate

# Insert initial mock data (e.g. default roles, admin login, courses)
npm run seed
```
If you make changes to a schema, generate a new migration file:
```bash
npx sequelize-cli migration:generate --name add-phone-to-students
```

### 2.3 Visualizing Database Tables
Configure your database client (e.g., DBeaver, pgAdmin) using the configuration parameters located in your local `backend/.env` file:
* **Host**: `localhost` (or `127.0.0.1`)
* **Port**: `5432`
* **Database Name**: `college_erp_db`
* **Username**: `erp_user`
* **Password**: `erp_password_123`

---

## 3. Work Division Strategy (4-Member Team)

To maximize velocity and minimize code merge conflicts, divide the ERP system modules and responsibilities logically:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                               Team Lead                                 │
│         (Architecture, Code Reviews, Database Schema, Release)           │
├────────────────────────────────────┬────────────────────────────────────┤
│                                    │                                    │
▼                                    ▼                                    ▼
┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐
│      Developer A       │  │      Developer B       │  │      Developer C       │
│  (Frontend UI & UX)    │  │   (Backend API Dev)    │  │  (Database & DevOps)   │
│ React Pages/Components │  │ Controllers/Validators │  │ Migrations, Redis, CI  │
└────────────────────────┘  └────────────────────────┘  └────────────────────────┘
```

### Suggested Role Allocation
1. **Developer A (Frontend UI & Layout specialist)**:
   - Focuses on React styling, Tailwind layout systems, user screens, custom components (forms, tables, modals), and client routing.
2. **Developer B (Backend Business Logic specialist)**:
   - Focuses on Express controllers, validation schemas (`Joi`/`class-validator`), helper services, and email/SMS triggers.
3. **Developer C (Database & Systems Specialist)**:
   - Focuses on database schemas, Sequelize migrations, query optimization, Redis cache hooks, and workflow tasks.
4. **Developer D (Integrations & DevOps Lead / Team Lead)**:
   - Oversees overall architecture, AWS/Stripe/Razorpay third-party integrations, Docker orchestrations, branch approvals, and releases.

---

## 4. Frontend & Backend Integration

The React frontend and Express backend communicate over HTTP using JSON payloads.

```
┌───────────────────────────────┐                  ┌───────────────────────────────┐
│    Vite React Frontend        │                  │      Express Backend API      │
│   Running on localhost:5173   │                  │   Running on localhost:5000   │
├───────────────────────────────┤                  ├───────────────────────────────┤
│ Axios Request to /api/students│  ───(Proxy)───►  │ Receives request at /api/...  │
└───────────────────────────────┘                  └───────────────────────────────┘
```

### 4.1 Proxy Configuration
Vite uses a local development proxy configured in [vite.config.ts](file:///c:/Users/yuvar/Downloads/college-erp/frontend/vite.config.ts):
* When the frontend issues an Axios query to `/api/users/login`, the Vite dev server transparently redirects the request to the backend service listening at `http://localhost:5000/api/users/login`.
* This eliminates Cross-Origin Resource Sharing (CORS) security issues during local development.

### 4.2 Dynamic Environment Variables
* **Frontend**: Utilizes Vite environmental settings (prefixed with `VITE_`). Access the API root using `import.meta.env.VITE_API_URL`.
* **Backend**: Accesses environment parameters via Node standard `process.env.VARIABLE_NAME`.

---

## 5. Collaboration Scenario: Student Dashboard Integration

Here is a practical workflow scenario showing how **Developer A (Frontend UI)** and **Developer B (Backend API)** work in parallel and test their integration together.

### The Objective
Implement a feature showing student GPA grades and class attendance summaries on the Student Dashboard page.

### Step 1: Establish the API Contract (Before Writing Code)
Before programming, Developer A and B meet to define the REST endpoint URL structure and JSON payload formats. They document it in the project's [docs/API.md](file:///c:/Users/yuvar/Downloads/college-erp/docs/API.md) file:

* **Endpoint**: `GET /api/students/:id/dashboard`
* **Response Payload Structure**:
  ```json
  {
    "status": "success",
    "data": {
      "gpa": 3.85,
      "attendancePercentage": 92.4,
      "recentGrades": [
        { "subject": "Database Systems", "grade": "A" },
        { "subject": "Software Engineering", "grade": "B+" }
      ]
    }
  }
  ```

### Step 2: Parallel Development
* **Developer A (Frontend)**: 
  - Creates the dashboard page visual layouts.
  - While Developer B is building the database query logic, Developer A creates a **Mock JSON data** file in the frontend and uses it to render the tables and metrics locally:
    ```typescript
    // Temporary mock data inside StudentDashboardPage.tsx
    const mockDashboardData = { gpa: 3.85, attendancePercentage: 92.4, recentGrades: [...] };
    ```
* **Developer B (Backend)**:
  - Develops the migration scripts for student records.
  - Builds the controller function executing queries in PostgreSQL.
  - Tests the endpoint locally using a REST client (like Thunder Client or Postman) sending queries to `http://localhost:5000/api/students/student-uuid/dashboard` and verifies the JSON output matches the API contract.

### Step 3: Integrating Frontend & Backend
Once Developer B finishes the API, they push their feature branch `feature/student-dashboard-api` to GitHub, which is merged into `develop` after code review.
1. Developer A switches to the `develop` branch and pulls the latest updates:
   ```bash
   git checkout develop
   git pull origin develop
   ```
2. Developer A removes the temporary mock data from `StudentDashboardPage.tsx` and replaces it with a live Axios call:
   ```typescript
   axios.get(`/api/students/${studentId}/dashboard`)
     .then(res => setDashboardData(res.data.data));
   ```
3. Developer A starts the local environment:
   ```bash
   # Terminal 1: Spin up Postgres/Redis Docker containers
   docker compose up postgres redis -d
   
   # Terminal 2: Start backend dev server (runs migrations automatically)
   cd backend
   npm run dev
   
   # Terminal 3: Start frontend dev server
   cd frontend
   npm run dev
   ```
4. Developer A navigates to `http://localhost:5173` in their web browser and verifies that the metrics display real database records. They check the browser's Network developer tab to confirm that requests pass to the backend and return standard JSON outputs.
