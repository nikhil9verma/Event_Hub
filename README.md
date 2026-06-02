# EventHub 🎓

**EventHub** is a full-stack university event management platform where students can discover, register for, and manage campus events — from hackathons and competitions to cultural fests and workshops.

> Inspired by platforms like Unstop, built for campus communities.

---

## ✨ Features

### For Students
- 🔍 **Search & Discover** — Full-text search with live suggestions across all events
- 📂 **Category Tabs** — Browse by Technology, Sports, Arts, Academic, Social, Career, Health
- 🎫 **Register & Track** — Solo, team, and crowd-event registration flows
- ⏳ **Waitlist System** — Auto-promoted when seats open
- 🔔 **Email Notifications** — Registration confirmations and event reminders via Resend
- ⭐ **Ratings & Comments** — Review events you've attended
- 👤 **Profile Management** — Course, batch, profile photo (Cloudinary)

### For Event Hosts
- ✨ **Create & Manage Events** — Rich event creation with poster, stages, prizes, deadlines
- 👥 **Team Events** — Configure min/max team size; invite teammates
- 📊 **Analytics Dashboard** — Registration trends, fill rate, daily growth charts
- 📬 **Attendee Management** — View registrations, export data, manage waitlist
- 🗑️ **Event Lifecycle** — Active → Completed → Suspended states

### For Admins (SUPER_ADMIN)
- ⚙️ **Admin Dashboard** — Platform-wide user and event oversight
- ✅ **Host Request Approval** — Review and approve HOST role requests
- 🚫 **Event Moderation** — Suspend events violating platform policy

---

## 🏗️ Architecture

```
Event_Hub/
├── EventHub Frontend/          # React + Vite + TypeScript SPA
│   └── src/
│       ├── api/                # Axios API layer (Endpoints.ts)
│       ├── components/
│       │   ├── layout/         # Navbar, Footer (Layout.tsx)
│       │   ├── event/          # EventCard, FilterPanel, Modals
│       │   └── common/         # ErrorBoundary, shared UI
│       ├── pages/              # Route-level components
│       │   ├── HomePage.tsx
│       │   ├── EventDetailPage.tsx
│       │   ├── CreateEventPage.tsx
│       │   ├── AnalyticsPage.tsx
│       │   ├── ProfilePage.tsx
│       │   ├── LoginPage.tsx / RegisterPage.tsx
│       │   └── AdminDashboard.tsx
│       ├── store/              # Zustand auth store
│       └── types/              # TypeScript interfaces
│
└── eventhub-backend/           # Spring Boot 4 REST API
    └── src/main/java/com/eventhub/eventhub_backend/
        ├── controller/         # REST endpoints
        │   ├── AuthController
        │   ├── EventController
        │   ├── RegistrationController
        │   ├── NotificationController
        │   └── AdminController
        ├── service/            # Business logic
        ├── entity/             # JPA entities
        │   ├── User, Event, Registration
        │   ├── EventStage, TeamMember
        │   ├── Comment, Rating, Notification
        │   └── HostRequest, VerificationToken
        ├── repository/         # Spring Data JPA
        ├── security/           # JWT auth + Spring Security
        ├── config/             # CORS, Cloudinary, Mail, Redis
        ├── scheduler/          # Event reminder cron jobs
        ├── dto/                # Request / Response DTOs
        └── exception/          # Global error handling
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + TypeScript | UI framework |
| Vite 7 | Build tool & dev server |
| Tailwind CSS v4 | Utility-first styling |
| TanStack Query v5 | Server state & caching |
| React Router v7 | Client-side routing |
| Zustand | Auth state management |
| React Hook Form + Zod | Form validation |
| Recharts | Analytics charts |
| MUI (Avatar, Drawer) | Select UI components |
| date-fns | Date formatting |

### Backend
| Technology | Purpose |
|---|---|
| Spring Boot 4 | Application framework |
| Spring Security + JWT | Authentication & authorization |
| Spring Data JPA + Hibernate | ORM & database access |
| PostgreSQL (Neon) | Relational database |
| Redis | Token blacklisting & caching |
| Flyway | Database migrations |
| Cloudinary | Image upload & CDN |
| Resend | Transactional email |
| Bucket4j | API rate limiting |
| SpringDoc OpenAPI | Auto-generated API docs |
| Docker | Containerization |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ & npm
- Java 21 + Maven 3.9+
- PostgreSQL (or a [Neon](https://neon.tech) database)
- Redis (local or cloud)

---

### Frontend Setup

```bash
cd "EventHub Frontend"
npm install
```

Create a `.env` file in `EventHub Frontend/`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Start the dev server:

```bash
npm run dev
# Opens at http://localhost:5173
```

---

### Backend Setup

```bash
cd eventhub-backend
```

Configure `src/main/resources/application.properties` or set environment variables:

```env
# Database
DB_URL=jdbc:postgresql://<host>/<db>?sslmode=require
DB_USERNAME=<username>
DB_PASSWORD=<password>

# JWT
JWT_SECRET=<256-bit-secret>
JWT_EXPIRATION=2400000

# Cloudinary
CLOUDINARY_CLOUD_NAME=<name>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>

# Email (Resend)
APP_RESEND_API_KEY=<key>

# Frontend URL (for CORS & email links)
FRONTEND_URL=http://localhost:5173
```

Run the backend:

```bash
./mvnw spring-boot:run
# API available at http://localhost:5000/api
```

---

### Docker (Backend)

```bash
cd eventhub-backend
docker build -t eventhub-backend .
docker run -p 5000:8080 \
  -e DB_URL=<url> \
  -e DB_USERNAME=<user> \
  -e DB_PASSWORD=<pass> \
  -e JWT_SECRET=<secret> \
  eventhub-backend
```

---

## 📡 API Reference

Base URL: `http://localhost:5000/api`

Swagger UI available at: `http://localhost:5000/api/swagger-ui.html`

### Authentication — `/api/auth`
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Create new account | Public |
| POST | `/login` | Login, returns JWT | Public |
| POST | `/refresh` | Refresh access token | Public |
| POST | `/forgot-password` | Send reset email | Public |
| POST | `/reset-password` | Reset with token | Public |
| GET | `/verify-email` | Verify email token | Public |
| POST | `/logout` | Blacklist token | Bearer |

### Events — `/api/events`
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List events (paginated, filtered) | Public |
| GET | `/{id}` | Get event details | Public |
| POST | `/` | Create event | HOST |
| PUT | `/{id}` | Update event | HOST |
| DELETE | `/{id}` | Delete event | HOST |
| GET | `/{id}/analytics` | Event analytics | HOST |
| GET | `/my` | Host's own events | HOST |
| GET | `/{id}/attendees` | Attendee list | HOST |

### Registrations — `/api/registrations`
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/events/{id}` | Register for event | Student |
| DELETE | `/events/{id}` | Cancel registration | Student |
| GET | `/my` | My registrations | Student |
| POST | `/events/{id}/team` | Register as team | Student |
| POST | `/{id}/confirm` | Confirm pending invite | Student |

### Admin — `/api/admin`
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users` | List all users | SUPER_ADMIN |
| PUT | `/users/{id}/role` | Change user role | SUPER_ADMIN |
| GET | `/host-requests` | Pending host requests | SUPER_ADMIN |
| PUT | `/host-requests/{id}` | Approve/reject | SUPER_ADMIN |
| PUT | `/events/{id}/suspend` | Suspend an event | SUPER_ADMIN |

---

## 🔐 Roles & Permissions

| Role | Capabilities |
|------|-------------|
| `STUDENT` | Browse, register, rate, comment, manage profile |
| `HOST` | Everything STUDENT + create/manage events, view analytics |
| `SUPER_ADMIN` | Everything HOST + user management, event moderation |

> To become a HOST: request from your profile page → SUPER_ADMIN approves.

---

## 🌐 Deployment

### Frontend — Vercel
The frontend is pre-configured for Vercel with `vercel.json` (SPA redirect rules).

```bash
cd "EventHub Frontend"
npm run build
# Deploy /dist to Vercel
```

Set environment variable in Vercel:
```
VITE_API_BASE_URL=https://your-backend-url.com
```

### Backend — Any Docker Host (Railway, Render, Fly.io)
```bash
docker build -t eventhub-backend ./eventhub-backend
# Push to your registry and deploy
```

---

## 📁 Environment Variables Summary

### Frontend (`.env`)
```env
VITE_API_BASE_URL=http://localhost:5000
```

### Backend (`application.properties` / env vars)
```env
PORT=5000
DB_URL=
DB_USERNAME=
DB_PASSWORD=
JWT_SECRET=
JWT_EXPIRATION=2400000
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
APP_RESEND_API_KEY=
FRONTEND_URL=
UPLOAD_DIR=./uploads
```

---

## 🗺️ Roadmap

- [ ] Real-time notifications via WebSockets
- [ ] Certificate generation for event attendance
- [ ] QR code check-in at events
- [ ] Event calendar view
- [ ] Public event sharing links
- [ ] Multi-college / multi-campus support

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch — `git checkout -b feature/my-feature`
3. Commit your changes — `git commit -m 'feat: add my feature'`
4. Push to the branch — `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is for educational and portfolio purposes.

---

<div align="center">
  <strong>Built with ❤️ for university students</strong><br/>
  <sub>EventHub — Where campus life happens</sub>
</div>
