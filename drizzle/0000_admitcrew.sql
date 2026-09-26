CREATE TABLE `leads` (`id` text PRIMARY KEY NOT NULL,`name` text NOT NULL,`phone` text NOT NULL,`normalized_phone` text NOT NULL,`country` text DEFAULT '' NOT NULL,`marks` text DEFAULT '' NOT NULL,`ielts` text DEFAULT '' NOT NULL,`last_reply` text DEFAULT 'Today' NOT NULL,`status` text DEFAULT 'Active' NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_leads_normalized_phone` ON `leads` (`normalized_phone`);
--> statement-breakpoint
CREATE TABLE `programs` (`id` text PRIMARY KEY NOT NULL,`university` text NOT NULL,`country` text NOT NULL,`program` text NOT NULL,`fee` text NOT NULL,`deadline` text NOT NULL,`min_marks` text NOT NULL,`min_ielts` text NOT NULL,`documents` text NOT NULL);
--> statement-breakpoint
CREATE TABLE `approvals` (`id` text PRIMARY KEY NOT NULL,`lead_id` text NOT NULL,`lead_name` text NOT NULL,`agent` text NOT NULL,`message` text NOT NULL,`reason` text NOT NULL,`status` text DEFAULT 'pending' NOT NULL,`send_key` text,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,`reviewed_by` text,`reviewed_at` text,`sent_at` text);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_approvals_send_key` ON `approvals` (`send_key`);
--> statement-breakpoint
CREATE INDEX `idx_approvals_status` ON `approvals` (`status`);
--> statement-breakpoint
CREATE TABLE `documents` (`id` text PRIMARY KEY NOT NULL,`lead_name` text NOT NULL,`file_name` text NOT NULL,`storage_key` text NOT NULL,`type` text NOT NULL,`status` text NOT NULL,`reason` text NOT NULL,`details` text NOT NULL,`confidence` integer DEFAULT 100 NOT NULL,`checked_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
--> statement-breakpoint
CREATE TABLE `escalations` (`id` text PRIMARY KEY NOT NULL,`lead_id` text NOT NULL,`question` text NOT NULL,`reason` text NOT NULL,`status` text DEFAULT 'open' NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
--> statement-breakpoint
CREATE TABLE `agent_runs` (`id` text PRIMARY KEY NOT NULL,`agent` text NOT NULL,`action` text NOT NULL,`input_summary` text NOT NULL,`output_summary` text NOT NULL,`status` text NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
--> statement-breakpoint
CREATE TABLE `audit_log` (`id` text PRIMARY KEY NOT NULL,`actor_id` text NOT NULL,`actor_name` text NOT NULL,`action` text NOT NULL,`detail` text NOT NULL,`tone` text DEFAULT 'blue' NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
--> statement-breakpoint
CREATE INDEX `idx_audit_created_at` ON `audit_log` (`created_at`);
