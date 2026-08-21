# OUI Clearance Backend API

Node.js + Express + PostgreSQL + Socket.io backend for Oduduwa University Clearance System.

## Setup

### 1. Install dependencies
```bash
cd oui-backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your database and email credentials
```

### 3. Create PostgreSQL database
```sql
CREATE DATABASE oui_clearance;
```

### 4. Run migrations
```bash
npm run db:migrate
```

### 5. Seed demo accounts
```bash
npm run db:seed
```

### 6. Start the server
```bash
npm run dev       # development (auto-restart)
npm start         # production
```

Server runs on http://localhost:5000

## Demo Login Accounts (after seed)

| Role            | Email                   | Password |
|-----------------|-------------------------|----------|
| Student         | samuel@oui.edu.ng       | demo123  |
| Admin           | admin@oui.edu.ng        | demo123  |
| Medical Manager | medical@oui.edu.ng      | demo123  |
| Library Manager | library@oui.edu.ng      | demo123  |
| H.O.D           | hod@oui.edu.ng          | demo123  |

## API Endpoints

### Auth
| Method | Endpoint                    | Description         |
|--------|-----------------------------|---------------------|
| POST   | /api/auth/register          | Register student    |
| POST   | /api/auth/login             | Login any role      |
| GET    | /api/auth/me                | Get current user    |
| GET    | /api/auth/verify-email      | Verify email        |
| POST   | /api/auth/forgot-password   | Send reset link     |
| POST   | /api/auth/reset-password    | Reset password      |

### Clearance
| Method | Endpoint                    | Description              |
|--------|-----------------------------|--------------------------|
| POST   | /api/clearance              | Submit clearance (student)|
| GET    | /api/clearance/mine         | Get my application       |
| GET    | /api/clearance              | Get all applications     |
| GET    | /api/clearance/:id          | Get single application   |

### Stages
| Method | Endpoint                      | Description            |
|--------|-------------------------------|------------------------|
| POST   | /api/stages/:appId/review     | Review a stage         |
| POST   | /api/stages/:appId/grant      | Grant final clearance  |
| GET    | /api/stages/queue?stage=admin | Get stage queue        |

### Notifications
| Method | Endpoint                        | Description       |
|--------|---------------------------------|-------------------|
| GET    | /api/notifications              | Get all           |
| PATCH  | /api/notifications/:id/read     | Mark one read     |
| PATCH  | /api/notifications/read-all     | Mark all read     |
| GET    | /api/notifications/unread-count | Unread count      |

### Admin Only
| Method | Endpoint         | Description      |
|--------|------------------|------------------|
| GET    | /api/admin/stats | System stats     |
| GET    | /api/admin/users | All users        |
| GET    | /api/admin/audit | Audit log        |

### Upload
| Method | Endpoint     | Description              |
|--------|--------------|--------------------------|
| POST   | /api/upload  | Upload receipt files     |

## Real-Time Events (Socket.io)

| Event                | Direction       | Payload            |
|----------------------|-----------------|--------------------|
| clearance_update     | server→client   | Full app object    |
| notification         | server→client   | Notification obj   |
| cleared              | server→client   | { letterId }       |
| new_review_request   | server→client   | { appId, stage }   |

## Email Setup (Mailtrap for development)

1. Create free account at https://mailtrap.io
2. Copy SMTP credentials to .env
3. All emails go to Mailtrap inbox during development

## Database Schema

- users
- clearance_apps
- clearance_stages
- receipts
- notifications
- audit_log