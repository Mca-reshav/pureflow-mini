# PureFlow Mini

PureFlow Mini is a full-stack project management and capacity planning platform

The application demonstrates:

- JWT authentication with refresh sessions
- RBAC enforcement at API level
- Persona-aware frontend
- Event-driven notifications
- Async report export
- Audit trail logging
- Dockerized deployment
- AWS EC2 deployment support

---

# Architecture Overview

PureFlow Mini is implemented as a modular monolith following domain-driven boundaries while keeping deployment simple for the assignment scope.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js + TypeScript + Tailwind CSS |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Queue / Workers | BullMQ |
| Cache / Broker | Redis |
| Authentication | JWT Access + Refresh Tokens |
| API Documentation | Swagger / OpenAPI |
| Containerization | Docker + Docker Compose |
| Deployment | AWS EC2 t3.micro |

---

## System Architecture

```txt
Frontend (Next.js)
        |
        v
Backend API (NestJS)
        |
 ------------------------------------------------
 |              |              |                |
PostgreSQL     Redis         BullMQ         Prisma
(Database)     Cache         Workers         ORM
```

---

## Main Backend Modules

- Authentication & Session Management
- RBAC & Permission Guards
- User Management
- Projects
- Tasks
- Time Logging
- Notifications
- Reports Export
- Audit Trail

---

## Architectural Decisions

- Modular monolith used instead of microservices to reduce operational complexity.
- RBAC enforced at backend guard/middleware level.
- Frontend navigation dynamically generated using `/api/v1/me`.
- BullMQ used for async report export processing.
- Prisma migrations used for database consistency and reproducibility.
- Audit trail implemented as append-only events.

---

# Local Setup

## Prerequisites

- Docker
- Docker Compose
- Node.js 20+
- npm

---

## Clone Repository

```bash
git clone <repo-url>
cd pureflow-mini
```

---

## Environment Variables

Create `.env` files using `.env.example`.

---

## Start Full Application

Run from project root:

```bash
docker compose watch
```

---

## Useful Commands

### Stop containers

```bash
docker compose down
```

### Check running containers

```bash
docker compose ps
```

---

## Monitor Logs

Use 3 terminals simultaneously.

### Backend Logs

```bash
cd backend
docker logs -f pureflow-backend
```

### Frontend Logs

```bash
docker logs -f pureflow-frontend
```

### All Containers

```bash
docker compose logs -f
```

---

# Prisma Commands

## Run migrations

```bash
npx prisma migrate dev --name init
```

## Generate Prisma Client

```bash
npx prisma generate
```

## Run Seed Script

```bash
npx prisma db seed
```

## Open Prisma Studio

```bash
npx prisma studio
```

---

# Deploy to AWS Free Tier

## Infrastructure Used

- AWS EC2 t3.micro
- Elastic IP
- Ubuntu 22.04
- Docker + Docker Compose

---

## Required Security Group Rules

| Port | Purpose |
|---|---|
| 22 | SSH |
| 3000 | Frontend |
| 8080 | Backend API |
| 80 | Optional Reverse Proxy |

---

## EC2 Setup

### Install Docker

```bash
sudo apt update
sudo apt install docker.io docker-compose-v2 -y
```

---

### Enable Docker

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

---

### Clone Project

```bash
git clone <repo-url>
cd pureflow-mini
```

---

### Start Application

```bash
docker compose watch
```

---

## Attach Elastic IP

- Allocate Elastic IP from AWS Console
- Associate it with the EC2 instance

Access application:

```txt
http://<elastic-ip>:3000
```

---

## HTTPS / TLS (Future Improvement)

HTTPS can be added using:

- Nginx Reverse Proxy
- Let's Encrypt
- Certbot SSL Certificates

---

# API Documentation

Swagger documentation available at:

```txt
http://localhost:8080/api/docs
```

---

## Main API Modules

### Authentication

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/me`

### Users

- `GET /api/v1/users`
- `POST /api/v1/users`
- `PATCH /api/v1/users/:id/role`

### Projects

- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `GET /api/v1/projects/:id`

### Tasks

- `GET /api/v1/tasks`
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/:id`

### Time Entries

- `POST /api/v1/time-entries`
- `PATCH /api/v1/time-entries/:id`

### Reports

- `POST /api/v1/reports/export`
- `GET /api/v1/reports/jobs/:id`

### Audit

- `GET /api/v1/audit/events`

---

# Seed Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@pureflow.dev | Admin1234! |
| Business Manager | bm@pureflow.dev | Manager1234! |
| Analyst | analyst@pureflow.dev | Analyst1234! |

---

# AI Usage Log

| Module | Tool | What I Asked | What AI Generated | What I Changed |
|---|---|---|---|---|
| Docker Setup | ChatGPT | Docker Compose stack for full application | Initial compose setup | Added health checks and container dependency ordering |
| Prisma Schema | GitHub Copilot | Prisma model scaffolding | Initial schema models | Added indexes, relations, and audit version tables |
| Audit Trail | Claude | Audit event architecture | Audit logging structure | Added request_id tracking and append-only flow |
| Dashboard Design | ChatGPT | Simple Dashboard UI for project summary, recent tasks and logged hours chart | Dummy cards and layout | Updated and bind with actual data |
| Audit Trail Design | Copilot | Simple UI for audit trail and given parameters | Simple listing | Added pagination and filters |

---

# Assumptions & Trade-offs

1. Modular monolith architecture chosen instead of microservices for faster development and deployment simplicity.
2. BullMQ with Redis used instead of RabbitMQ to reduce infrastructure overhead.
3. SSE for notifications to keep the implementation lightweight.
4. Focus prioritized RBAC and deployment stability over simple UI.
5. Docker Compose used instead of Kubernetes due to AWS free-tier resource constraints.
6. Some list APIs use offset pagination for simplicity during assignment implementation.
7. API-first architecture was prioritized before frontend implementation.

---

# Known Issues

1. Un-authenticated routes require manual page reload.
2. `report.completed` notification event was not fully implemented because requirements were unclear.
3. Dashboard analytics may appear sparse with minimal sample data.
4. Mobile responsiveness can be further improved for smaller dashboard layouts.

