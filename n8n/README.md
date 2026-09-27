# AdmitCrew n8n integration

n8n is an outer scheduling and monitoring layer. AdmitCrew remains the only owner of student data, agent decisions, approvals, send-once enforcement, documents, and WhatsApp delivery.

## Import order

1. Create one n8n **Header Auth** credential named `AdmitCrew Automation Token`.
2. Set the header name to `Authorization` and the value to `Bearer <the AdmitCrew CRON_SECRET>`.
3. Import `03-error-reporter.json`, select the credential, save, and publish it.
4. Import `01-daily-reminders.json` and `02-health-monitor.json`.
5. Select the same credential in every HTTP Request node.
6. In each scheduled workflow's settings, choose `AdmitCrew - Workflow Error Reporter` as its error workflow.
7. Confirm the workflow timezone is `Asia/Karachi`.
8. Test manually. Publish only after both test executions succeed.

The committed workflow files intentionally contain no token, Meta credential, student data, document, or OpenAI key. Their placeholder credential reference must be replaced inside n8n after import.

## Retry policy

- Retry network failures and server errors at most three times.
- Wait 30 seconds between attempts.
- Authentication and validation failures require correction, not repeated execution.
- AdmitCrew owns idempotency. n8n never creates its own send key and never sends a student message.

## WhatsApp boundary

Do not add a WhatsApp node to these workflows. AdmitCrew's Delivery Agent remains the sole sender after staff approval. Moving transport ownership to n8n later requires a separate delivery-queue contract and disabling the existing sender first.

## Data boundary

n8n may retain workflow name, execution id, timestamps, service status, and reminder counts. It must not store phone numbers, student profiles, program records, chat content, passports, transcripts, IELTS files, agent prompts, or API keys in execution data.
