-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "audit";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "iam";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notify";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "project";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "report";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "task";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "time_log";

-- CreateEnum
CREATE TYPE "iam"."Role" AS ENUM ('ADMIN', 'BM', 'ANALYST');

-- CreateEnum
CREATE TYPE "iam"."UserStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "project"."ProjectStatus" AS ENUM ('active', 'archived', 'completed');

-- CreateEnum
CREATE TYPE "task"."TaskStatus" AS ENUM ('todo', 'in_progress', 'done', 'blocked');

-- CreateEnum
CREATE TYPE "task"."TaskPriority" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "notify"."NotificationType" AS ENUM ('task_assigned', 'project_member_added', 'report_ready', 'time_late_logged');

-- CreateEnum
CREATE TYPE "report"."ReportJobStatus" AS ENUM ('queued', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "report"."ReportFormat" AS ENUM ('csv', 'xlsx');

-- CreateTable
CREATE TABLE "iam"."users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "iam"."Role" NOT NULL DEFAULT 'ANALYST',
    "status" "iam"."UserStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project"."projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "project"."ProjectStatus" NOT NULL DEFAULT 'active',
    "owner_id" TEXT NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project"."project_members" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "added_by" TEXT NOT NULL,
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task"."tasks" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "task"."TaskStatus" NOT NULL DEFAULT 'todo',
    "priority" "task"."TaskPriority" NOT NULL DEFAULT 'medium',
    "assignee_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "expected_minutes" INTEGER,
    "due_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_log"."time_entries" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "entry_date" DATE NOT NULL,
    "notes" TEXT,
    "is_late" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_log"."time_entry_versions" (
    "id" TEXT NOT NULL,
    "time_entry_id" TEXT NOT NULL,
    "version_no" INTEGER NOT NULL,
    "before_json" JSONB NOT NULL,
    "after_json" JSONB NOT NULL,
    "edited_by" TEXT NOT NULL,
    "edited_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entry_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notify"."notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "notify"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "event_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report"."report_jobs" (
    "id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "project_id" TEXT,
    "date_from" DATE,
    "date_to" DATE,
    "format" "report"."ReportFormat" NOT NULL DEFAULT 'csv',
    "status" "report"."ReportJobStatus" NOT NULL DEFAULT 'queued',
    "permission_snapshot" JSONB NOT NULL,
    "error_message" TEXT,
    "queued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "report_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report"."report_artifacts" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,

    CONSTRAINT "report_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit"."audit_events" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "before_json" JSONB,
    "after_json" JSONB,
    "request_id" TEXT,
    "service" TEXT NOT NULL DEFAULT 'api',
    "ip_hash" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "iam"."users"("email");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "iam"."sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "iam"."sessions"("expires_at");

-- CreateIndex
CREATE INDEX "projects_owner_id_idx" ON "project"."projects"("owner_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "project"."projects"("status");

-- CreateIndex
CREATE INDEX "project_members_user_id_idx" ON "project"."project_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project"."project_members"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "tasks_project_id_status_idx" ON "task"."tasks"("project_id", "status");

-- CreateIndex
CREATE INDEX "tasks_assignee_id_idx" ON "task"."tasks"("assignee_id");

-- CreateIndex
CREATE INDEX "time_entries_user_id_entry_date_idx" ON "time_log"."time_entries"("user_id", "entry_date");

-- CreateIndex
CREATE INDEX "time_entries_task_id_idx" ON "time_log"."time_entries"("task_id");

-- CreateIndex
CREATE INDEX "time_entries_project_id_entry_date_idx" ON "time_log"."time_entries"("project_id", "entry_date");

-- CreateIndex
CREATE INDEX "time_entry_versions_time_entry_id_idx" ON "time_log"."time_entry_versions"("time_entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_event_id_key" ON "notify"."notifications"("event_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notify"."notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "report_jobs_requested_by_idx" ON "report"."report_jobs"("requested_by");

-- CreateIndex
CREATE INDEX "report_jobs_status_idx" ON "report"."report_jobs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "report_artifacts_job_id_key" ON "report"."report_artifacts"("job_id");

-- CreateIndex
CREATE INDEX "audit_events_actor_id_created_at_idx" ON "audit"."audit_events"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_entity_type_entity_id_idx" ON "audit"."audit_events"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_events_action_idx" ON "audit"."audit_events"("action");

-- AddForeignKey
ALTER TABLE "iam"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project"."projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "iam"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project"."project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project"."project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task"."tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task"."tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "iam"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task"."tasks" ADD CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "iam"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_log"."time_entries" ADD CONSTRAINT "time_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_log"."time_entries" ADD CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_log"."time_entry_versions" ADD CONSTRAINT "time_entry_versions_time_entry_id_fkey" FOREIGN KEY ("time_entry_id") REFERENCES "time_log"."time_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notify"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report"."report_artifacts" ADD CONSTRAINT "report_artifacts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "report"."report_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit"."audit_events" ADD CONSTRAINT "audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "iam"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
