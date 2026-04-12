# InsideCanada — Immigration Operating System

An AI-powered immigration case management platform for people already in Canada, starting with PGWP holders and recent graduates. Built to prevent refusals, missed deadlines, and status loss.

## Features

### Core Modules
- **Dashboard** — At-a-glance status overview with risk alerts, key dates, and next actions
- **Immigration Profile** — Track permits, passport, work history, education, and language tests
- **Timeline Engine** — Personalized immigration timeline with AI-generated milestones
- **Document Vault** — Secure upload, storage, and tracking of all immigration documents
- **PR Eligibility Checker** — Real-time eligibility analysis for CEC, FSW, and PNP pathways
- **AI Advisor** — OpenAI-powered immigration advisor with case-specific guidance
- **Risk Engine** — Automatic detection of permit expiry, missing documents, status loss risks
- **Expert Escalation** — Connect with licensed RCICs and immigration lawyers
- **Progress Tracker** — PR milestone checklist with completion tracking

### Immigration-Specific Features
- PGWP stream tracking (3-year vs 18-month)
- Maintained/implied status support
- Work permit extension workflows
- Bridging open work permit tracking
- CLB level tracking with IELTS/CELPIP score mapping
- NOC code and TEER category management
- ECA tracking for foreign credentials
- PR application document checklist

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **UI Components**: Radix UI primitives, custom shadcn-style components
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: OpenAI GPT-4o-mini for advisor, timeline generation, and eligibility analysis
- **State**: Client-side hooks with Supabase real-time

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [OpenAI](https://platform.openai.com) API key

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy the example env file:

```bash
cp .env.local.example .env.local
```

Fill in your credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-your-key
```

### 3. Set up the database

Go to your Supabase project's SQL Editor and run the contents of:

```
supabase/migrations/001_initial_schema.sql
```

This creates all tables, RLS policies, triggers, and the document storage bucket.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

```
src/
├── app/
│   ├── (auth)/          # Login & signup pages
│   ├── (dashboard)/     # All authenticated pages
│   │   ├── dashboard/   # Main dashboard
│   │   ├── profile/     # Immigration profile management
│   │   ├── timeline/    # Personalized timeline
│   │   ├── documents/   # Document vault
│   │   ├── eligibility/ # PR eligibility checker
│   │   ├── advisor/     # AI advisor chat
│   │   └── escalation/  # Expert help requests
│   └── api/ai/          # AI API routes (advisor, timeline, risk, eligibility)
├── components/
│   ├── ui/              # Reusable UI components
│   └── shared/          # Layout components (sidebar)
└── lib/
    ├── supabase/        # Supabase client configuration
    ├── types.ts         # TypeScript type definitions
    ├── constants.ts     # Immigration constants (provinces, pathways, CLB mappings)
    ├── risk-engine.ts   # Risk analysis engine
    ├── eligibility-engine.ts  # PR eligibility checker
    ├── openai.ts        # OpenAI configuration
    ├── utils.ts         # Utility functions
    └── use-case.ts      # React hook for user case data
```

## Modular Design

InsideCanada is designed to be extended with:
- **Immigration Advisors** — advisor marketplace integration
- **Employers** — LMIA tracking, employer compliance
- **Schools** — DLI verification, program completion tracking
- **PR Support Services** — settlement agencies, language training

## Security

- Row Level Security (RLS) on all tables
- User data isolated by `auth.uid()`
- Document storage with per-user folder isolation
- No sensitive data stored in client-side state
- API routes validate authentication

## Disclaimer

This tool is for informational purposes only and does not constitute legal advice. Always consult a licensed Regulated Canadian Immigration Consultant (RCIC) or immigration lawyer for advice specific to your situation.
