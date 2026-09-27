# AdmitCrew

AdmitCrew is a staff-controlled admissions operations system for Nowshera Study Abroad Consultants. Nine bounded agents collect leads, answer only from the approved program list, review generated test documents, prepare follow-ups, block unsafe claims, escalate uncertainty, deliver approved messages, and maintain an audit trail.

## Safety contract

- No outbound student message is sent without staff approval.
- University answers are grounded only in the stored program catalog.
- Unknown institutions are escalated instead of guessed.
- No agent may promise admission or visa approval.
- Reminder and delivery operations use unique keys to prevent duplicates.
- Only generated training documents may be uploaded.
- Secrets remain in deployment settings and are never committed.

The detailed ownership boundaries are in `AGENT_CONTRACTS.md`.

## Architecture

- **Dashboard:** Next.js-compatible Vinext application hosted privately on Sites.
- **Database:** Supabase PostgreSQL with Row Level Security enabled and no anonymous table policies.
- **Documents:** private Supabase Storage bucket `admitcrew-documents`.
- **Automation:** Supabase Edge Function `automation-gateway`, authenticated with a hashed bearer token.
- **Scheduling:** n8n creates reminder drafts and performs health monitoring; it never sends WhatsApp messages.
- **WhatsApp:** signed Meta webhooks enter through `whatsapp-webhook`; approved delivery remains inside AdmitCrew.
- **Authentication:** Sites supplies ChatGPT identity headers; `staff_users` enforces staff authorization.

## Project layout

```text
app/                         Dashboard and authenticated API routes
lib/                         Agents, authentication, messaging, and Supabase access
supabase/migrations/         PostgreSQL schema and security configuration
supabase/seed.sql            Idempotent fictional acceptance-test data
supabase/functions/          Protected automation and WhatsApp functions
n8n/workflows/               Importable scheduling/monitoring templates
public/test-documents/       Generated fake documents only
scripts/acceptance.ts        Seven acceptance-rule groups
```

## Environment

Copy `.env.example` to an ignored local environment file and configure values through the deployment platform in production.

Required for the shared backend:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (preferred) or legacy `SUPABASE_SERVICE_ROLE_KEY`
- `N8N_TOKEN_SHA256`

Optional integrations:

- `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_STATUS`
- `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- `META_VERIFY_TOKEN`, `META_APP_SECRET`

## Supabase deployment order

1. Create a Supabase project in the required data region.
2. Apply `supabase/migrations/202609270001_admitcrew.sql`.
3. Apply `supabase/seed.sql` for the fictional acceptance data.
4. Set `N8N_TOKEN_SHA256`, `META_VERIFY_TOKEN`, and `META_APP_SECRET` as function secrets.
5. Deploy `automation-gateway` and `whatsapp-webhook` with JWT verification disabled; both implement their own request verification.
6. Configure the Sites runtime with the Supabase URL and server secret.
7. Update the n8n HTTP nodes to the deployed `automation-gateway` URL, test, then publish.

## Local verification

```bash
npm run test:acceptance
npm run build
```

The acceptance suite verifies lead deduplication, catalog grounding, escalation, injection resistance, fake-document checks, approval-gated reminders, audit visibility, and workflow boundaries.

## Test data

The repository contains exactly three fictional leads, 15 fictional program records across the UK, Canada, Germany, and Australia, and four clearly marked fake documents. Fees and dates are training examples, not real admissions advice.

## Current deployment rule

Do not point production traffic at Supabase until the schema, seed, secrets, Edge Functions, and dashboard environment have all been verified. Keep the existing private deployment available for rollback until every acceptance case passes against Supabase.
