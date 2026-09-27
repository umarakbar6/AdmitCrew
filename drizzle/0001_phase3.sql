CREATE TABLE `staff_users` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `name` text NOT NULL,
  `role` text DEFAULT 'counselor' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_staff_users_email` ON `staff_users` (`email`);
--> statement-breakpoint
CREATE INDEX `idx_documents_checked_at` ON `documents` (`checked_at`);
--> statement-breakpoint
CREATE INDEX `idx_escalations_status` ON `escalations` (`status`);
--> statement-breakpoint
PRAGMA optimize;
