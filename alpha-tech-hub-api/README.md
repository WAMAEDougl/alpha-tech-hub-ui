# Alpha Computers Nanyuki — NestJS Backend API

Scalable REST API built with NestJS, PostgreSQL, Prisma ORM, JWT auth, M-Pesa STK Push, and PDFKit reporting.

---

## Quick Start

```bash
cd alpha-tech-hub-api
npm install

# Copy and fill in environment variables
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed the database with sample data
npx prisma db seed

# Start development server
npm run start:dev
```

Swagger docs: `http://localhost:3000/api/docs`
Prisma Studio: `npm run db:studio`

---

## Default Login Credentials (after seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@alphacomputers.co.ke | admin123 |
| Customer | customer@test.com | customer123 |

---

## API Modules

| Module | Base Path | Description |
|---|---|---|
| Auth | `/auth` | Register, login, JWT tokens |
| Users | `/users` | User management (Admin) |
| Products | `/products` | Product CRUD + stock |
| Cart | `/cart` | Per-user cart persistence |
| Orders | `/orders` | Checkout, status transitions |
| Repairs | `/repairs` | Ticket booking + public tracking |
| Payments | `/payments` | M-Pesa STK Push + card placeholder |
| Settings | `/settings` | Dynamic company branding |
| Upload | `/upload` | Image upload (Multer) |
| Reports | `/reports` | PDF reports (sales + repairs) |
| Analytics | `/analytics` | Dashboard stats |
| Build Requests | `/build-requests` | Custom PC build requests |
| Disposal | `/disposal` | E-waste disposal requests |
| Quotes | `/quotes` | Quick quote requests |

---

## Database Schema (Prisma)

Models: `User`, `Settings`, `Product`, `CartItem`, `Order`, `OrderItem`, `RepairTicket`, `BuildRequest`, `DisposalRequest`, `QuoteRequest`

```bash
# View and edit data visually
npx prisma studio

# Create a new migration after schema changes
npx prisma migrate dev --name your_change_name

# Reset database (dev only)
npx prisma migrate reset
```

---

## Order Status Flow

```
PENDING → PAID → PROCESSING → SHIPPED → DELIVERED
       ↘ CANCELLED
```

## Repair Status Flow

```
RECEIVED → DIAGNOSTIC → AWAITING_PARTS → IN_REPAIR → READY_FOR_PICKUP → COMPLETED
```

---

## Deployment (Railway)

1. Push repo to GitHub
2. Go to `railway.app` → New Project → Deploy from GitHub
3. Select `alpha-tech-hub-api/` as root directory
4. Add a PostgreSQL plugin — Railway auto-sets `DATABASE_URL`
5. Add remaining env vars from `.env.example`
6. Railway auto-runs `npm run build` then `npm run start`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 10 |
| Database | PostgreSQL |
| ORM | Prisma 5 |
| Auth | JWT + Passport |
| Validation | class-validator |
| Docs | Swagger/OpenAPI |
| PDF | PDFKit |
| Uploads | Multer (local disk) |
| Payments | M-Pesa Daraja API |
