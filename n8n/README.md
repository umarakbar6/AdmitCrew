# AdmitCrew n8n integration

n8n is the outer scheduling and monitoring layer. Supabase is the shared system of record. n8n never owns student data, approval decisions, documents, or WhatsApp delivery.

## Import order

1. The workflow URLs are preconfigured for the AdmitCrew Supabase project.
2. Create one n8n **Header Auth** credential named `AdmitCrew Automation Token`.
3. Set its name to `Authorization` and its value to the bearer token whose SHA-256 hash is stored in the Supabase function secret `N8N_TOKEN_SHA256`.
4. Import and publish `03-error-reporter.json`.
5. Import `01-daily-reminders.json` and `02-health-monitor.json`.
6. Select the same credential in every HTTP Request node.
7. Select the error reporter as the error workflow for both scheduled workflows.
8. Confirm the workflow timezone is `Asia/Karachi`.
9. Execute reminder and health manually. Publish schedules only after both return successful JSON.

## Retry and idempotency

- Retry transient network/server failures at most three times, waiting 30 seconds.
- Authentication and validation failures require correction, not repeated execution.
- Supabase enforces the unique reminder `send_key`; repeated runs cannot create duplicate drafts.
- The reminder workflow creates drafts only. It never sends a message.

## Data boundary

n8n may retain workflow names, execution IDs, timestamps, service status, and aggregate reminder counts. It must not retain student phone numbers, profiles, chats, documents, program records, prompts, or API keys.

## WhatsApp boundary

Do not add WhatsApp nodes. Meta webhooks are signature-verified by the Supabase `whatsapp-webhook` function, and only AdmitCrew's Delivery Agent may send a staff-approved message.
