---
name: "🐛 Bug Report"
about: Create a report to help us improve the College ERP platform.
title: "[BUG] <Short descriptive title>"
labels: ["bug", "triage"]
assignees: ""
---

## Description
A clear and concise description of what the bug is in the College ERP system.

## Affected Components
*Please select all that apply:*
- [ ] **Frontend**: React / Vite SPA UI
- [ ] **Backend**: Node.js / Express API Server
- [ ] **Database**: PostgreSQL / Sequelize migrations
- [ ] **Cache**: Redis session or query caching
- [ ] **CI/CD / Devops**: Docker Compose, GitHub Actions, Deploy scripts
- [ ] **Other** (Please specify): _________________

## Steps to Reproduce
1. Go to page '...'
2. Click on '...'
3. Enter input '...'
4. See error

## Expected Behavior
A clear and concise description of what you expected to happen under normal conditions.

## Actual Behavior / Error Logs
What actually happened? Provide raw error logs from backend container (`college_erp_backend`) or browser console log traces.

```bash
# Example command to check backend container logs:
# docker logs college_erp_backend
```

```text
<Paste error trace or log output here>
```

## Screenshots / Screen Recordings
If applicable, add screenshots or animated GIFs to help explain the visual issue.

## Environment Details
- **OS**: [e.g., Windows 11, macOS, Ubuntu]
- **Environment**: [e.g., Local Dev (Docker Compose), Local Dev (Manual), Staging, Production]
- **Node.js Version**: [e.g., v18.x.x]
- **Browser**: [e.g., Chrome, Safari, Firefox]

## Possible Fix / Context
If you have analyzed the codebase and know where the issue lies (e.g., a specific Sequelize model in `backend/src/models/`, controller code in `backend/src/controllers/`, or frontend component), please describe it here.
