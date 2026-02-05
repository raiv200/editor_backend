# RFP Collaboration System

Real-time collaborative RFP response platform using TipTap Cloud.

## How It Works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   User A     │     │   User B     │     │  TipTap Cloud    │
│   Browser    │     │   Browser    │     │  (Stores docs)   │
└──────┬───────┘     └──────┬───────┘     └────────┬─────────┘
       │                    │                      │
       │ 1. Login           │                      │
       ▼                    │                      │
┌──────────────┐            │                      │
│  Backend     │            │                      │
│  (Express)   │            │                      │
│  - Auth      │            │                      │
│  - JWT Gen   │            │                      │
└──────┬───────┘            │                      │
       │                    │                      │
       │ 2. TipTap JWT      │                      │
       ▼                    ▼                      │
       └────────────────────┴──────────────────────┘
                   WebSocket Connection
                   (Real-time sync via Y.js)
```

### Key Concepts:

1. **Documents stored on TipTap Cloud**: Each question = one document
2. **Document naming**: `rfp-{rfpId}-question-{questionId}`
3. **JWT Token**: Authorizes access to specific documents
4. **Real-time sync**: All users see changes instantly

## Your TipTap Cloud Settings

From your dashboard:
- **App ID**: `y9drxgjm`
- **App Secret**: `566293739659853d1b58634d7d8554fe10a5e24bab3be1fb30e7813aa79d7c83`

## Quick Start

### 1. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed sample data
npm run db:seed

# Start server
npm run dev
```

### 2. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

### 3. Access the App

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

**Demo credentials:**
- Email: `john@example.com`
- Password: `password123`

## Environment Variables

### Backend (.env)

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/rfp_collab"
JWT_SECRET="your-app-jwt-secret-at-least-32-characters-long"
TIPTAP_APP_ID="y9drxgjm"
TIPTAP_APP_SECRET="566293739659853d1b58634d7d8554fe10a5e24bab3be1fb30e7813aa79d7c83"
PORT=4000
FRONTEND_URL="http://localhost:3000"
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_TIPTAP_APP_ID=y9drxgjm
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Register |
| GET | /api/auth/me | Get current user |
| GET | /api/rfps | List RFPs |
| POST | /api/rfps | Create RFP |
| GET | /api/rfps/:id | Get RFP details |
| DELETE | /api/rfps/:id | Delete RFP |
| POST | /api/collaboration/token | Get TipTap JWT |

## How Collaboration Works

1. **User opens RFP editor**
2. **Frontend requests TipTap JWT** from backend
3. **Backend generates JWT** signed with App Secret
4. **Frontend connects to TipTap Cloud** with the JWT
5. **Real-time sync** via Y.js CRDT
6. **Documents stored on TipTap Cloud**

## Editor Features

- Bold (Ctrl+B)
- Italic (Ctrl+I)
- Underline (Ctrl+U)
- Highlight
- Real-time collaboration
- User presence indicators
- Collaborative cursors

## Future: Exporting to PDF/DOCX

Since documents are stored on TipTap Cloud:
1. On "Export" click, fetch content from each editor
2. Combine into single document
3. Generate PDF/DOCX on backend

## Tech Stack

- **Backend**: Express.js, Prisma, PostgreSQL
- **Frontend**: Next.js 15, React 19, TipTap, Tailwind CSS
