# AdmitCrew agent contracts

All student-facing messages are drafts until staff approve them. The deterministic coordinator enforces this rule.

| Agent | Owns | Must not do |
| --- | --- | --- |
| Intake | Lead capture and phone deduplication | Promise outcomes or answer outside the list |
| University | Exact database answers and escalation | Browse, guess, or imply acceptance |
| Document | Compare fake-document fields | Authenticate documents or reject applicants |
| Follow-up | Inactivity detection and reminder drafts | Send or duplicate messages |
| Safety | Check claims, scope, and prompt injection | Supply missing facts or grant exceptions |
| Coordinator | Routing, approval, send-once keys, audit log | Generate admissions advice |

Mandatory state path: `incoming → routed → drafted → safety_checked → pending_approval → approved/rejected → sent_once`.
