# MerchantHub - Multi-Tenant B2B2C SaaS Platform

A Progressive Web App (PWA) built for South African service contractors and event organizers to manage quoting, invoicing, and ticketing with Ozow Instant EFT payments integration.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [File Structure](#file-structure)
- [Core Features](#core-features)
- [Authentication Flow](#authentication-flow)
- [Payment Integration](#payment-integration)
- [Offline Capabilities](#offline-capabilities)
- [API Routes](#api-routes)
- [Security](#security)

---

## Overview

MerchantHub enables small businesses in South Africa to:

- Manage client databases
- Create and track quotes/invoices
- Accept payments via Ozow Instant EFT
- Organize events and sell tickets
- Scan tickets offline at venues
- Generate PDF invoices and send via WhatsApp

The platform uses a multi-tenant architecture where each merchant's data is isolated through Row Level Security (RLS) policies.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 13.5 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui + Radix UI |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth |
| Payments | Ozow Instant EFT |
| PDF Generation | @react-pdf/renderer |
| Email | Resend |
| Icons | Lucide React |
| PWA | Service Worker + Web Manifest |
| Deployment | Netlify |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Browser                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Next.js   │  │   Service   │  │     localStorage        │ │
│  │   App       │  │   Worker    │  │  (offline data cache)   │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
└─────────┼────────────────┼─────────────────────┼───────────────┘
          │                │                     │
          ▼                ▼                     │
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js API Routes                         │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │ /api/invoices/ │  │ /api/webhooks/ │  │ /api/invoices/   │  │
│  │     send       │  │     ozow       │  │      pdf         │  │
│  └───────┬────────┘  └───────┬────────┘  └─────────┬────────┘  │
└──────────┼───────────────────┼─────────────────────┼───────────┘
           │                   │                     │
           ▼                   ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Supabase   │  │    Ozow      │  │   WhatsApp Business  │  │
│  │   Database   │  │  Payments    │  │        API           │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow

1. **Authentication**: User logs in via Supabase Auth
2. **Authorization**: AuthGuard component checks session before rendering protected routes
3. **Data Access**: All database queries go through Supabase client with RLS enforcement
4. **Payments**: Invoice send triggers Ozow payment link generation, webhook updates payment status
5. **Offline**: Service Worker caches pages, localStorage stores data for offline invoice creation

---

## Database Schema

### Entity Relationship Diagram

```
┌──────────────┐
│    auth.     │
│    users     │
└──────┬───────┘
       │ 1:1
       ▼
┌──────────────┐      1:N      ┌──────────────┐
│  merchants   │──────────────▶│   clients    │
└──────┬───────┘               └──────┬───────┘
       │                              │
       │ 1:N                          │ 1:N
       ▼                              ▼
┌──────────────┐            ┌─────────────────┐
│   services   │            │ quotes_invoices │◀─────┐
└──────────────┘            └────────┬────────┘      │
       │                             │               │
       │                             │ 1:N           │
       │                             ▼               │
       │                    ┌─────────────────┐      │
       └───────────────────▶│  invoice_items  │──────┘
                            └─────────────────┘

┌──────────────┐      1:N      ┌──────────────┐
│   events     │──────────────▶│   tickets    │
└──────────────┘               └──────┬───────┘
       │                              │
       │                              │ N:1
       │                              ▼
       └────────────────────▶┌──────────────┐
               N:1           │   clients    │
                             └──────────────┘
```

### Tables

| Table | Purpose |
|-------|---------|
| `merchants` | Business accounts linked to Supabase Auth users with Ozow credentials and feature flags |
| `clients` | Customer records scoped to each merchant |
| `services` | Service catalog with flexible pricing (Fixed, Per Hour, Per Sqm) |
| `quotes_invoices` | Unified quote/invoice documents with payment tracking |
| `invoice_items` | Line items linking invoices to services |
| `events` | Event management for ticketing merchants |
| `tickets` | Individual ticket records with QR verification |

### Custom Types

```sql
pricing_type: 'Fixed' | 'Per Hour' | 'Per Sqm'
invoice_status: 'Draft' | 'Pending Deposit' | 'Pending Final' | 'Paid' | 'Cancelled'
ticket_status: 'Reserved' | 'Paid' | 'Scanned'
```

---

## File Structure

```
project/
├── app/                              # Next.js App Router pages
│   ├── (auth)/                       # Auth route group (no layout)
│   │   ├── login/page.tsx            # Login page with email/password
│   │   └── signup/page.tsx           # Signup with business name capture
│   ├── api/                          # API route handlers
│   │   ├── invoices/
│   │   │   ├── email/route.ts        # Email invoice endpoint
│   │   │   ├── pdf/route.ts          # PDF generation endpoint
│   │   │   └── send/route.ts         # Generate Ozow link + WhatsApp message
│   │   └── webhooks/
│   │       └── ozow/route.ts         # Ozow payment webhook handler
│   ├── dashboard/                    # Protected dashboard routes
│   │   ├── layout.tsx                # Dashboard shell with sidebar
│   │   ├── page.tsx                  # Dashboard home/overview
│   │   ├── clients/page.tsx          # Client management CRUD
│   │   ├── services/page.tsx         # Service catalog management
│   │   ├── invoices/
│   │   │   ├── page.tsx              # Invoice list view
│   │   │   ├── new/page.tsx          # Create new invoice
│   │   │   └── [id]/page.tsx         # Invoice detail view
│   │   ├── events/
│   │   │   ├── page.tsx              # Event list view
│   │   │   ├── new/page.tsx          # Create new event
│   │   │   └── [id]/page.tsx         # Event detail with attendee list
│   │   ├── reports/page.tsx          # Business analytics
│   │   └── settings/page.tsx         # Merchant settings & Ozow config
│   ├── offline/page.tsx              # Offline fallback page
│   ├── offline-scanner/
│   │   └── [event_id]/page.tsx       # Offline ticket scanner
│   ├── globals.css                   # Global styles + Tailwind
│   ├── layout.tsx                    # Root layout with providers
│   └── page.tsx                      # Landing/marketing page
│
├── components/
│   ├── ui/                           # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ... (30+ UI primitives)
│   ├── dashboard/
│   │   ├── sidebar.tsx               # Navigation sidebar
│   │   └── header.tsx                # Top header with sign out
│   ├── auth-guard.tsx                # Route protection wrapper
│   ├── offline-banner.tsx            # Offline status indicator
│   └── service-worker-registration.tsx # SW registration component
│
├── contexts/
│   ├── auth-context.tsx              # Auth state + merchant data
│   └── offline-sync-context.tsx      # Offline invoice queue management
│
├── hooks/
│   └── use-toast.ts                  # Toast notification hook
│
├── lib/
│   ├── supabase.ts                   # Supabase client (browser)
│   ├── supabase-admin.ts             # Supabase admin client (server)
│   ├── auth.ts                       # Auth helper functions
│   ├── utils.ts                      # Utility functions (cn, etc.)
│   └── pdf/
│       └── invoice-template.tsx      # React-PDF invoice template
│
├── public/
│   ├── manifest.json                 # PWA manifest
│   └── sw.js                         # Service Worker
│
├── supabase/
│   └── migrations/                   # Database migrations
│       ├── 20260323150226_create_multi_tenant_schema.sql
│       └── 20260323150909_create_merchant_on_signup_trigger.sql
│
├── schema.sql                        # Complete database schema reference
├── package.json                      # Dependencies
├── tailwind.config.ts                # Tailwind configuration
├── tsconfig.json                     # TypeScript configuration
└── netlify.toml                      # Netlify deployment config
```

---

## Core Features

### 1. Client Management (`/dashboard/clients`)

- Add, edit, delete client records
- Store name, phone (unique per merchant), email, region
- Subscription opt-in/out flag for marketing
- Quick client lookup by phone number

### 2. Service Catalog (`/dashboard/services`)

- Define services with three pricing models:
  - **Fixed**: One-time price
  - **Per Hour**: Multiply by hours worked
  - **Per Sqm**: Multiply by square meters
- Services used when creating invoices

### 3. Quotes & Invoices (`/dashboard/invoices`)

**Creating an Invoice:**
1. Select client from dropdown
2. Add line items (select service, set quantity)
3. Optionally enable deposit requirement (10-100%)
4. Save as Draft or Send immediately

**Invoice States:**
- `Draft` - Not sent to client
- `Pending Deposit` - Awaiting deposit payment
- `Pending Final` - Deposit paid, awaiting balance
- `Paid` - Fully paid
- `Cancelled` - Cancelled invoice

**Offline Mode:**
- If offline, invoices queue to localStorage
- Auto-syncs when connection restored
- Visual indicator shows offline status

### 4. Events & Ticketing (`/dashboard/events`)

**Event Management:**
- Create events with date, capacity, ticket price
- View attendee list with ticket status
- Add attendees manually (marks as Paid)
- Delete events (cascades to tickets)

**Offline Scanner (`/offline-scanner/[event_id]`):**
- Export event database for offline use
- Scan ticket IDs (manual entry or barcode scanner input)
- Visual feedback: green (valid), red (already scanned), yellow (not found)
- Sync scanned tickets back to cloud when online

### 5. Settings (`/dashboard/settings`)

- Update business name
- Toggle feature flags (Invoicing, Ticketing modules)
- Configure Ozow credentials (Site Code, Private Key, API Key)
- Credentials stored securely in merchants table

### 6. Reports (`/dashboard/reports`)

- Revenue overview
- Invoice status breakdown
- Client statistics
- Event performance metrics

---

## Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   /login    │────▶│  Supabase   │────▶│  merchant   │
│   /signup   │     │    Auth     │     │   created   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ AuthContext │
                    │  Provider   │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
   │    user     │  │   session   │  │  merchant   │
   │   (Auth)    │  │   (JWT)     │  │   (Data)    │
   └─────────────┘  └─────────────┘  └─────────────┘
```

**Key Files:**
- `contexts/auth-context.tsx` - Auth state management
- `components/auth-guard.tsx` - Route protection
- `app/(auth)/login/page.tsx` - Login form
- `app/(auth)/signup/page.tsx` - Signup with merchant creation

**Signup Process:**
1. User enters email, password, business name
2. Supabase creates auth user
3. Database trigger creates merchant record with `user_id`
4. User redirected to dashboard

---

## Payment Integration

### Ozow Payment Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Merchant   │────▶│  /api/send   │────▶│    Ozow      │
│ clicks Send  │     │  (generate)  │     │    API       │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                                  ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client     │◀────│   WhatsApp   │◀────│ Payment URL  │
│ receives msg │     │   Message    │     │  Generated   │
└──────┬───────┘     └──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client     │────▶│    Ozow      │────▶│  /api/ozow   │
│    pays      │     │   Payment    │     │   webhook    │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │   Invoice    │
                                          │   Updated    │
                                          └──────────────┘
```

### API Route: `/api/invoices/send`

1. Validates merchant's Ozow credentials
2. Builds payment request payload with SHA-512 hash
3. Calls Ozow PostPaymentRequest API
4. Returns payment URL
5. Optionally sends WhatsApp message to client

### Webhook: `/api/webhooks/ozow`

1. Receives payment notification from Ozow
2. Verifies SHA-512 hash signature
3. Updates invoice `amount_paid`, `balance_due`, `status`
4. Sends WhatsApp receipt to client

### Hash Verification

Both outgoing requests and incoming webhooks use SHA-512 hash verification:

```typescript
const hashString = [
  SiteCode, TransactionId, TransactionReference,
  Amount, Status, Optional1-5, CurrencyCode,
  IsTest, StatusMessage, PrivateKey
].join('').toLowerCase();

const hash = crypto.createHash('sha512').update(hashString).digest('hex');
```

---

## Offline Capabilities

### Service Worker (`public/sw.js`)

**Caching Strategy:**
- **Install**: Pre-cache static routes (dashboard pages)
- **Fetch**: Network-first with cache fallback
- **Next.js assets**: Cache-first for `/_next/` paths

**Cached Routes:**
```javascript
const STATIC_ASSETS = [
  '/', '/dashboard', '/dashboard/invoices',
  '/dashboard/invoices/new', '/dashboard/events',
  '/dashboard/clients', '/dashboard/services',
  '/dashboard/reports', '/dashboard/settings',
  '/offline', '/manifest.json'
];
```

### Offline Sync Context (`contexts/offline-sync-context.tsx`)

**Capabilities:**
- Detects online/offline status
- Queues invoices created while offline
- Auto-syncs when connection restored
- Persists queue to localStorage

**Usage:**
```typescript
const { isOnline, addOfflineInvoice, pendingInvoices, syncPendingInvoices } = useOfflineSync();
```

### Event Scanner Offline Mode

1. **Export**: Merchant clicks "Download for Offline" on event page
2. **Storage**: Event + tickets saved to `localStorage`
3. **Scan**: Scanner page reads from localStorage, updates locally
4. **Sync**: When online, syncs scanned status to Supabase

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/invoices/send` | POST | Generate Ozow payment link, send WhatsApp |
| `/api/invoices/pdf` | POST | Generate PDF invoice |
| `/api/invoices/email` | POST | Email invoice to client |
| `/api/webhooks/ozow` | POST | Handle Ozow payment notifications |
| `/api/webhooks/ozow` | GET | Health check endpoint |

### Authentication

API routes verify JWT token from `Authorization: Bearer <token>` header using Supabase Admin client.

---

## Security

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring merchants can only access their own data:

```sql
CREATE POLICY "Merchants can view own clients"
  ON clients FOR SELECT
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );
```

### Credential Storage

- Ozow credentials stored in `merchants` table (encrypted at rest by Supabase)
- No credentials exposed to client-side code
- Webhook validates hash signature before processing

### API Security

- All dashboard routes protected by `AuthGuard`
- API routes verify JWT and merchant ownership
- Webhook verifies Ozow hash signature
- CORS headers prevent unauthorized access

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY=      # Supabase service role key (server only)
NEXT_PUBLIC_APP_URL=            # Application URL for callbacks
WHATSAPP_ACCESS_TOKEN=          # WhatsApp Business API token
WHATSAPP_PHONE_NUMBER_ID=       # WhatsApp phone number ID
```

---

## Getting Started

1. **Clone and Install**
   ```bash
   npm install
   ```

2. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Fill in Supabase and WhatsApp credentials

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

---

## License

Proprietary - All rights reserved.
