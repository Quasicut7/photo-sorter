# Docker Setup (Optional)

This project includes **optional** Docker configuration. You can run everything manually without Docker if you prefer.

## Quick Start with Docker

**Prerequisites:**
- Docker Desktop installed
- `.env` files created in backend/ and ai-service/

**Run everything:**
```bash
docker-compose up
```

**Access:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- AI Service: http://localhost:8000

**Stop everything:**
```bash
Ctrl+C
# or
docker-compose down
```

## What Docker Does

- **Packages** all three services in containers
- **Auto-starts** everything with one command
- **Hot reload** works - code changes update instantly

## Files

- `docker/` - Contains Dockerfiles for each service
- `docker-compose.yml` - Orchestrates all services

## Don't Want to Use Docker?

No problem! Just run manually (see main README.md):
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev

# Terminal 3
cd ai-service && uvicorn app.main:app --reload
```

Both approaches work identically. Use whichever you prefer!
