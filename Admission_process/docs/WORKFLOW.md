# Git branching and Team Collaboration Workflow

Welcome to the **College ERP** development team! To ensure a stable and consistent codebase, we follow a structured Git branching and contribution pipeline.

---

## 1. Repository Setup & Cloning

To get started, clone the repository and check out the `develop` branch:

```bash
# Clone the repository
git clone https://github.com/vyonlabsofficial-lang/Erp-system.git
cd Erp-system

# Fetch and switch to the develop branch
git checkout develop
```

---

## 2. Environment Configuration

Copy the example configuration files in both `backend` and `frontend` directories and populate them with your local configurations (database passwords, credentials, etc.):

```bash
# Backend configuration
cd backend
cp .env.example .env

# Frontend configuration
cd ../frontend
cp .env.example .env
```

---

## 3. Branching Strategy

Our team uses a **Git Flow** variant:

```
[ main ]          ──> Production releases only
   ▲
   │ Merge PR (Release)
[ develop ]       ──> Shared staging/development branch (Source of truth for devs)
   ▲
   ├─► [ feature/auth ]        ──> Custom features (branch off develop)
   ├─► [ feature/admission ]
   └─► [ bugfix/api-crash ]    ──> Bug fixes (branch off develop)
```

- **`main`**: The production branch. Direct commits are blocked. Changes are only merged here via automated releases from `develop`.
- **`develop`**: The integration branch where all developers merge their features.
- **Feature/Bugfix Branches**: Always create feature branches branching off `develop`. Name them using `feature/<feature-name>` or `bugfix/<issue-name>`.

---

## 4. Development Workflow Cycle

### Step 1: Create a Feature Branch
Ensure you have the latest updates from `develop` first:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### Step 2: Write Code and Test Locally
Ensure your code formats cleanly, compiles successfully, and passes all checks:
```bash
# For Backend validation:
cd backend
npm run lint
npm run type-check
npm test

# For Frontend validation:
cd ../frontend
npm run build
```

### Step 3: Commit Your Changes
Use descriptive, structured commit messages (following conventional commits):
```bash
git add .
git commit -m "feat(auth): add JWT login and session persistence"
```

### Step 4: Push and Open a Pull Request (PR)
Push your feature branch to GitHub:
```bash
git push origin feature/your-feature-name
```
Open a Pull Request on GitHub from `feature/your-feature-name` to `develop`.

---

## 5. Branch Protections & Review Guidelines
- **Reviews**: Every Pull Request targeting `develop` requires at least **one (1) review approval** from a team member or the team lead.
- **CI/CD Checks**: The automated tests configured in `.github/workflows/backend-test.yml` must pass successfully before the PR can be merged.
