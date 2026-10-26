SET local check_function_bodies = off;

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "authenticated";

CREATE EXTENSION "pg_cron";

CREATE TABLE "public"."contact_rate_limits" (
  "key_hash"   text                     NOT NULL,
  "hits"       integer                  NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "contact_rate_limits_hits_check" CHECK (((hits >= 1) AND (hits <= 9))),
  CONSTRAINT "contact_rate_limits_key_hash_check" CHECK ((key_hash ~ '^[a-f0-9]{64}$'::text)),
  CONSTRAINT "contact_rate_limits_pkey" PRIMARY KEY (key_hash)
);

ALTER TABLE "public"."contact_rate_limits"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."contact_rate_limits" FROM "anon", "authenticated", "service_role";

CREATE TABLE "public"."debate_comments" (
  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "debate_id"          uuid                     NOT NULL,
  "user_id"            uuid,
  "parent_id"          uuid,
  "body"               text                     NOT NULL,
  "status"             text                     NOT NULL DEFAULT 'approved'::text,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "pinned_at"          timestamp with time zone,
  "hidden_from_status" text,
  CONSTRAINT "debate_comments_body_check" CHECK (((length(btrim(body)) >= 2) AND (length(btrim(body)) <= 5000))),
  CONSTRAINT "debate_comments_id_debate_id_key" UNIQUE (id, debate_id),
  CONSTRAINT "debate_comments_pkey" PRIMARY KEY (id),
  CONSTRAINT "debate_comments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'hidden'::text, 'deleted'::text])))
);

ALTER TABLE "public"."debate_comments"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."debate_comments" FROM "anon";

CREATE TABLE "public"."debate_moderation_actions" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "actor_id"     uuid,
  "action"       text                     NOT NULL,
  "target_id"    uuid,
  "reason"       text                     NOT NULL,
  "created_at"   timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  "target_kind"  text,
  "before_value" jsonb,
  "after_value"  jsonb,
  "undo_of"      uuid,
  CONSTRAINT "debate_moderation_actions_pkey" PRIMARY KEY (id),
  CONSTRAINT "debate_moderation_actions_reason_check" CHECK (((length(btrim(reason)) >= 3) AND (length(btrim(reason)) <= 1000)))
);

ALTER TABLE "public"."debate_moderation_actions"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."debate_moderation_actions" FROM "anon";

CREATE TABLE "public"."debate_participants" (
  "id"         uuid    NOT NULL DEFAULT gen_random_uuid(),
  "debate_id"  uuid    NOT NULL,
  "speaker_id" uuid    NOT NULL,
  "stance"     text    NOT NULL DEFAULT ''::text,
  "role_label" text    NOT NULL DEFAULT 'مناظر'::text,
  "position"   integer NOT NULL DEFAULT 0,
  CONSTRAINT "debate_participants_debate_id_speaker_id_key" UNIQUE (debate_id, speaker_id),
  CONSTRAINT "debate_participants_id_debate_id_key" UNIQUE (id, debate_id),
  CONSTRAINT "debate_participants_pkey" PRIMARY KEY (id),
  CONSTRAINT "debate_participants_role_label_check" CHECK ((length(role_label) <= 100)),
  CONSTRAINT "debate_participants_stance_check" CHECK ((length(stance) <= 1000))
);

ALTER TABLE "public"."debate_participants"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."debate_participants" FROM "anon";

CREATE TABLE "public"."debate_poll_options" (
  "id"        uuid    NOT NULL DEFAULT gen_random_uuid(),
  "debate_id" uuid    NOT NULL,
  "label"     text    NOT NULL,
  "position"  integer NOT NULL DEFAULT 0,
  CONSTRAINT "debate_poll_options_debate_id_label_key" UNIQUE (debate_id, label),
  CONSTRAINT "debate_poll_options_id_debate_id_key" UNIQUE (id, debate_id),
  CONSTRAINT "debate_poll_options_label_check" CHECK (((length(btrim(label)) >= 1) AND (length(btrim(label)) <= 150))),
  CONSTRAINT "debate_poll_options_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."debate_poll_options"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."debate_poll_options" FROM "anon";

CREATE TABLE "public"."debate_polls" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "debate_id"    uuid                     NOT NULL,
  "phase"        text                     NOT NULL,
  "enabled"      boolean                  NOT NULL DEFAULT false,
  "opens_at"     timestamp with time zone,
  "closes_at"    timestamp with time zone,
  "is_closed"    boolean                  NOT NULL DEFAULT false,
  "allow_change" boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "debate_polls_check" CHECK (((closes_at IS NULL) OR (opens_at IS NULL) OR (closes_at > opens_at))),
  CONSTRAINT "debate_polls_debate_id_phase_key" UNIQUE (debate_id, phase),
  CONSTRAINT "debate_polls_id_debate_id_key" UNIQUE (id, debate_id),
  CONSTRAINT "debate_polls_phase_check" CHECK ((phase = ANY (ARRAY['before'::text, 'after'::text]))),
  CONSTRAINT "debate_polls_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."debate_polls"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."debate_polls" FROM "anon";

CREATE TABLE "public"."debate_questions" (
  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "debate_id"          uuid                     NOT NULL,
  "user_id"            uuid,
  "body"               text                     NOT NULL,
  "participant_id"     uuid,
  "axis"               text                     NOT NULL DEFAULT ''::text,
  "anonymous"          boolean                  NOT NULL DEFAULT false,
  "status"             text                     NOT NULL DEFAULT 'approved'::text,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "hidden_from_status" text,
  CONSTRAINT "debate_questions_axis_check" CHECK ((length(axis) <= 500)),
  CONSTRAINT "debate_questions_body_check" CHECK (((length(btrim(body)) >= 10) AND (length(btrim(body)) <= 2000))),
  CONSTRAINT "debate_questions_pkey" PRIMARY KEY (id),
  CONSTRAINT "debate_questions_status_check"
    CHECK ((status = ANY (ARRAY['new'::text, 'approved'::text, 'selected'::text, 'answered'::text, 'rejected'::text, 'hidden'::text, 'deleted'::text])))
);

ALTER TABLE "public"."debate_questions"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."debate_questions" FROM "anon";

CREATE TABLE "public"."debate_rate_limits" (
  "user_id"      uuid                     NOT NULL,
  "action"       text                     NOT NULL,
  "window_start" timestamp with time zone NOT NULL,
  "hits"         integer                  NOT NULL,
  CONSTRAINT "debate_rate_limits_pkey" PRIMARY KEY (user_id, action)
);

ALTER TABLE "public"."debate_rate_limits"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."debate_rate_limits" FROM "anon", "authenticated";

CREATE TABLE "public"."debate_reports" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "comment_id" uuid                     NOT NULL,
  "user_id"    uuid,
  "reason"     text                     NOT NULL,
  "status"     text                     NOT NULL DEFAULT 'open'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "debate_reports_comment_id_user_id_key" UNIQUE (comment_id, user_id),
  CONSTRAINT "debate_reports_pkey" PRIMARY KEY (id),
  CONSTRAINT "debate_reports_reason_check" CHECK (((length(btrim(reason)) >= 5) AND (length(btrim(reason)) <= 1000))),
  CONSTRAINT "debate_reports_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text, 'dismissed'::text])))
);

ALTER TABLE "public"."debate_reports"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."debate_reports" FROM "anon";

CREATE TABLE "public"."debate_result_updates" (
  "debate_id"  uuid                     NOT NULL,
  "version"    bigint                   NOT NULL DEFAULT 0,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "debate_result_updates_pkey" PRIMARY KEY (debate_id)
);

ALTER TABLE "public"."debate_result_updates"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."debate_speakers" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "slug"         text                     NOT NULL,
  "name"         text                     NOT NULL,
  "specialty"    text                     NOT NULL DEFAULT ''::text,
  "bio"          text                     NOT NULL DEFAULT ''::text,
  "photo_url"    text,
  "social_links" jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "is_published" boolean                  NOT NULL DEFAULT false,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "debate_speakers_bio_check" CHECK ((length(bio) <= 10000)),
  CONSTRAINT "debate_speakers_name_check" CHECK (((length(btrim(name)) >= 2) AND (length(btrim(name)) <= 150))),
  CONSTRAINT "debate_speakers_photo_url_check" CHECK (((photo_url IS NULL) OR ((length(photo_url) <= 1500) AND (photo_url ~ '^https://[^/@[:space:]]+(/|$)'::text)))),
  CONSTRAINT "debate_speakers_pkey" PRIMARY KEY (id),
  CONSTRAINT "debate_speakers_slug_check" CHECK ((slug ~ '^[a-z0-9][a-z0-9-]{0,119}$'::text)),
  CONSTRAINT "debate_speakers_slug_key" UNIQUE (slug),
  CONSTRAINT "debate_speakers_social_links_check" CHECK (((jsonb_typeof(social_links) = 'array'::text) AND (jsonb_array_length(social_links) <= 8))),
  CONSTRAINT "debate_speakers_specialty_check" CHECK ((length(specialty) <= 200))
);

ALTER TABLE "public"."debate_speakers"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."debate_speakers" FROM "anon";

CREATE TABLE "public"."debate_suggestions" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"             uuid,
  "title"               text                     NOT NULL,
  "question"            text                     NOT NULL,
  "explanation"         text                     NOT NULL,
  "importance"          text                     NOT NULL,
  "stances"             text                     NOT NULL,
  "suggested_speakers"  text                     NOT NULL DEFAULT ''::text,
  "status"              text                     NOT NULL DEFAULT 'pending'::text,
  "converted_debate_id" uuid,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "debate_suggestions_explanation_check" CHECK (((length(btrim(explanation)) >= 10) AND (length(btrim(explanation)) <= 3000))),
  CONSTRAINT "debate_suggestions_importance_check" CHECK (((length(btrim(importance)) >= 5) AND (length(btrim(importance)) <= 2000))),
  CONSTRAINT "debate_suggestions_pkey" PRIMARY KEY (id),
  CONSTRAINT "debate_suggestions_question_check" CHECK (((length(btrim(question)) >= 3) AND (length(btrim(question)) <= 500))),
  CONSTRAINT "debate_suggestions_stances_check" CHECK (((length(btrim(stances)) >= 3) AND (length(btrim(stances)) <= 2000))),
  CONSTRAINT "debate_suggestions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'deferred'::text, 'rejected'::text]))),
  CONSTRAINT "debate_suggestions_suggested_speakers_check" CHECK ((length(suggested_speakers) <= 1000)),
  CONSTRAINT "debate_suggestions_title_check" CHECK (((length(btrim(title)) >= 3) AND (length(btrim(title)) <= 250)))
);

ALTER TABLE "public"."debate_suggestions"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."debate_suggestions" FROM "anon";

CREATE TABLE "public"."debate_task_links" (
  "debate_id" uuid NOT NULL,
  "task_id"   uuid NOT NULL,
  CONSTRAINT "debate_task_links_pkey" PRIMARY KEY (debate_id, task_id)
);

ALTER TABLE "public"."debate_task_links"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."debate_task_links" FROM "anon";

CREATE TABLE "public"."debate_video_chapters" (
  "id"            uuid    NOT NULL DEFAULT gen_random_uuid(),
  "debate_id"     uuid    NOT NULL,
  "title"         text    NOT NULL,
  "start_seconds" integer NOT NULL,
  CONSTRAINT "debate_video_chapters_debate_id_start_seconds_key" UNIQUE (debate_id, start_seconds),
  CONSTRAINT "debate_video_chapters_pkey" PRIMARY KEY (id),
  CONSTRAINT "debate_video_chapters_start_seconds_check" CHECK (((start_seconds >= 0) AND (start_seconds <= 86400))),
  CONSTRAINT "debate_video_chapters_title_check" CHECK (((length(btrim(title)) >= 1) AND (length(btrim(title)) <= 200)))
);

ALTER TABLE "public"."debate_video_chapters"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."debate_video_chapters" FROM "anon";

CREATE TABLE "public"."debate_votes" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"           uuid                     NOT NULL,
  "debate_id"         uuid                     NOT NULL,
  "poll_id"           uuid                     NOT NULL,
  "option_id"         uuid                     NOT NULL,
  "watched_confirmed" boolean                  NOT NULL DEFAULT false,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "debate_votes_pkey" PRIMARY KEY (id),
  CONSTRAINT "debate_votes_user_id_poll_id_key" UNIQUE (user_id, poll_id)
);

ALTER TABLE "public"."debate_votes"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."debate_votes" FROM "anon";

CREATE TABLE "public"."debates" (
  "id"                           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "slug"                         text                     NOT NULL,
  "title"                        text                     NOT NULL,
  "question"                     text                     NOT NULL,
  "description"                  text                     NOT NULL DEFAULT ''::text,
  "category"                     text                     NOT NULL DEFAULT 'اجتماعية'::text,
  "debate_type"                  text                     NOT NULL,
  "publication_status"           text                     NOT NULL DEFAULT 'draft'::text,
  "stage"                        text                     NOT NULL DEFAULT 'announced'::text,
  "scheduled_at"                 timestamp with time zone,
  "cover_url"                    text,
  "live_platform"                text                     NOT NULL DEFAULT ''::text,
  "live_url"                     text,
  "recording_url"                text,
  "recording_published"          boolean                  NOT NULL DEFAULT false,
  "duration_seconds"             integer,
  "axes"                         text[]                   NOT NULL DEFAULT '{}'::text[],
  "summary"                      jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "summary_published"            boolean                  NOT NULL DEFAULT false,
  "questions_open"               boolean                  NOT NULL DEFAULT true,
  "comments_open"                boolean                  NOT NULL DEFAULT true,
  "seo_title"                    text                     NOT NULL DEFAULT ''::text,
  "seo_description"              text                     NOT NULL DEFAULT ''::text,
  "results"                      jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "results_published"            boolean                  NOT NULL DEFAULT false,
  "first_published_at"           timestamp with time zone,
  "revision"                     bigint                   NOT NULL DEFAULT 1,
  "created_by"                   uuid,
  "created_at"                   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"                   timestamp with time zone NOT NULL DEFAULT now(),
  "live_results_enabled"         boolean                  NOT NULL DEFAULT true,
  "recording_first_published_at" timestamp with time zone,
  CONSTRAINT "debates_axes_check" CHECK ((cardinality(axes) <= 20)),
  CONSTRAINT "debates_category_check" CHECK ((category = ANY (ARRAY['سياسية'::text, 'اقتصادية'::text, 'اجتماعية'::text, 'ثقافية وتاريخية'::text, 'تنموية'::text]))),
  CONSTRAINT "debates_check1" CHECK (((stage <> 'live'::text) OR ((debate_type = 'external_live'::text) AND (live_url IS NOT NULL)))),
  CONSTRAINT "debates_check2" CHECK (((NOT recording_published) OR (recording_url IS NOT NULL))),
  CONSTRAINT "debates_check3" CHECK (((NOT recording_published) OR (stage = ANY (ARRAY['ended'::text, 'recording_available'::text])))),
  CONSTRAINT "debates_check4" CHECK (((stage <> 'recording_available'::text) OR recording_published)),
  CONSTRAINT "debates_check5" CHECK (((NOT summary_published) OR (stage = ANY (ARRAY['ended'::text, 'recording_available'::text])))),
  CONSTRAINT "debates_check"
    CHECK (((debate_type <> 'prerecorded'::text) OR ((stage <> ALL (ARRAY['live'::text, 'ended'::text])) AND (live_url IS NULL) AND (live_platform = ''::text)))),
  CONSTRAINT "debates_cover_url_check" CHECK (((cover_url IS NULL) OR ((length(cover_url) <= 1500) AND (cover_url ~ '^https://[^/@[:space:]]+(/|$)'::text)))),
  CONSTRAINT "debates_debate_type_check" CHECK ((debate_type = ANY (ARRAY['external_live'::text, 'prerecorded'::text]))),
  CONSTRAINT "debates_description_check" CHECK ((length(description) <= 15000)),
  CONSTRAINT "debates_duration_seconds_check" CHECK (((duration_seconds >= 1) AND (duration_seconds <= 86400))),
  CONSTRAINT "debates_live_platform_check" CHECK ((length(live_platform) <= 100)),
  CONSTRAINT "debates_live_url_check" CHECK (((live_url IS NULL) OR ((length(live_url) <= 1500) AND (live_url ~ '^https://[^/@[:space:]]+(/|$)'::text)))),
  CONSTRAINT "debates_pkey" PRIMARY KEY (id),
  CONSTRAINT "debates_publication_status_check" CHECK ((publication_status = ANY (ARRAY['draft'::text, 'published'::text, 'hidden'::text, 'archived'::text]))),
  CONSTRAINT "debates_question_check" CHECK (((length(btrim(question)) >= 3) AND (length(btrim(question)) <= 500))),
  CONSTRAINT "debates_recording_url_check" CHECK (((recording_url IS NULL) OR ((length(recording_url) <= 1500) AND (recording_url ~ '^https://[^/@[:space:]]+(/|$)'::text)))),
  CONSTRAINT "debates_seo_description_check" CHECK ((length(seo_description) <= 500)),
  CONSTRAINT "debates_seo_title_check" CHECK ((length(seo_title) <= 250)),
  CONSTRAINT "debates_slug_check" CHECK ((slug ~ '^[a-z0-9][a-z0-9-]{0,119}$'::text)),
  CONSTRAINT "debates_slug_key" UNIQUE (slug),
  CONSTRAINT "debates_stage_check"
    CHECK ((stage = ANY (ARRAY['announced'::text, 'upcoming'::text, 'live'::text, 'ended'::text, 'recording_available'::text, 'postponed'::text, 'cancelled'::text]))),
  CONSTRAINT "debates_summary_check" CHECK (((jsonb_typeof(summary) = 'object'::text) AND (octet_length((summary)::text) <= 40000))),
  CONSTRAINT "debates_title_check" CHECK (((length(btrim(title)) >= 3) AND (length(btrim(title)) <= 250)))
);

ALTER TABLE "public"."debates"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."debates" FROM "anon";

CREATE TABLE "public"."districts" (
  "id"              text                     NOT NULL,
  "governorate_id"  text,
  "name_ar"         text                     NOT NULL,
  "name_en"         text,
  "capital"         text,
  "area_km2"        numeric,
  "population"      bigint,
  "population_year" integer,
  "description"     text,
  "landmarks"       text,
  "image_url"       text,
  "updated_at"      timestamp with time zone DEFAULT now(),
  "revision"        bigint                   NOT NULL DEFAULT 1,
  CONSTRAINT "districts_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."districts"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."editor_drafts" (
  "owner_id"   uuid                     NOT NULL,
  "draft_key"  text                     NOT NULL,
  "kind"       text                     NOT NULL,
  "value"      jsonb                    NOT NULL,
  "revision"   bigint                   NOT NULL DEFAULT 1,
  "updated_at" timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT "editor_drafts_draft_key_check" CHECK (((length(draft_key) >= 1) AND (length(draft_key) <= 160))),
  CONSTRAINT "editor_drafts_kind_check"
    CHECK
    ((kind = ANY (ARRAY['issue'::text, 'work'::text, 'company'::text, 'professional'::text, 'figure'::text, 'statistic'::text, 'statistic_source'::text, 'statistic_values'::text,
    'ranking'::text, 'page'::text, 'settings'::text, 'governorate'::text, 'district'::text, 'message'::text]))),
  CONSTRAINT "editor_drafts_pkey" PRIMARY KEY (owner_id, draft_key),
  CONSTRAINT "editor_drafts_value_check" CHECK (((jsonb_typeof(value) = 'object'::text) AND (pg_column_size(value) < 240000)))
);

ALTER TABLE "public"."editor_drafts"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."editor_drafts" FROM "anon";

CREATE TABLE "public"."editorial_audit_activation" (
  "singleton"    boolean                  NOT NULL DEFAULT true,
  "activated_at" timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT "editorial_audit_activation_pkey" PRIMARY KEY (singleton),
  CONSTRAINT "editorial_audit_activation_singleton_check" CHECK (singleton)
);

ALTER TABLE "public"."editorial_audit_activation"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."editorial_audit_activation" FROM "anon", "service_role";

CREATE TABLE "public"."editorial_contributions" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at"     timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  "transaction_id" bigint                   NOT NULL DEFAULT txid_current(),
  "actor_id"       uuid,
  "actor_name"     text                     NOT NULL,
  "actor_role"     text,
  "action"         text                     NOT NULL,
  "content_type"   text                     NOT NULL,
  "section"        text                     NOT NULL,
  "content_id"     text                     NOT NULL,
  "title"          text                     NOT NULL,
  "slug"           text,
  "path"           text,
  "is_published"   boolean,
  "changed_fields" text[]                   NOT NULL DEFAULT '{}'::text[],
  "origin"         text                     NOT NULL,
  CONSTRAINT "editorial_contributions_action_check"
    CHECK ((action = ANY (ARRAY['create'::text, 'update'::text, 'publish'::text, 'unpublish'::text, 'delete'::text, 'restore'::text, 'correction'::text]))),
  CONSTRAINT "editorial_contributions_pkey" PRIMARY KEY (id),
  CONSTRAINT "editorial_contributions_transaction_id_content_type_content_key" UNIQUE (transaction_id, content_type, content_id)
);

ALTER TABLE "public"."editorial_contributions"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."editorial_contributions" FROM "anon", "service_role";

CREATE TABLE "public"."editors" (
  "user_id"  uuid                     NOT NULL,
  "added_at" timestamp with time zone NOT NULL DEFAULT now(),
  "role"     text                     NOT NULL DEFAULT 'admin'::text,
  "added_by" uuid,
  CONSTRAINT "editors_pkey" PRIMARY KEY (user_id),
  CONSTRAINT "editors_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'management'::text])))
);

ALTER TABLE "public"."editors"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."editors" FROM "anon";

CREATE TABLE "public"."governorates" (
  "id"              text                     NOT NULL,
  "name_ar"         text                     NOT NULL,
  "name_en"         text,
  "capital"         text,
  "area_km2"        numeric,
  "population"      bigint,
  "population_year" integer,
  "district_count"  integer,
  "description"     text,
  "history"         text,
  "geography"       text,
  "economy"         text,
  "landmarks"       text,
  "image_url"       text,
  "updated_at"      timestamp with time zone DEFAULT now(),
  "revision"        bigint                   NOT NULL DEFAULT 1,
  CONSTRAINT "governorates_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."governorates"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."inline_content_audit" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "actor_id"     uuid,
  "kind"         text                     NOT NULL,
  "target_id"    text                     NOT NULL,
  "action"       text                     NOT NULL,
  "reason"       text                     NOT NULL DEFAULT 'تحديث تحريري'::text,
  "before_value" jsonb,
  "after_value"  jsonb,
  "undo_of"      uuid,
  "created_at"   timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT "inline_content_audit_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."inline_content_audit"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."inline_content_audit" FROM "anon";

CREATE TABLE "public"."issues" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "slug"         text                     NOT NULL,
  "number"       integer                  NOT NULL,
  "title"        text                     NOT NULL,
  "summary"      text                     NOT NULL DEFAULT ''::text,
  "cover_url"    text,
  "pdf_url"      text                     NOT NULL,
  "issue_date"   date                     NOT NULL,
  "is_published" boolean                  NOT NULL DEFAULT false,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "revision"     bigint                   NOT NULL DEFAULT 1,
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "issues_number_check" CHECK ((number > 0)),
  CONSTRAINT "issues_number_key" UNIQUE (number),
  CONSTRAINT "issues_pdf_url_check" CHECK ((pdf_url ~ '^https?://'::text)),
  CONSTRAINT "issues_pkey" PRIMARY KEY (id),
  CONSTRAINT "issues_slug_check" CHECK (((length(slug) >= 1) AND (length(slug) <= 120))),
  CONSTRAINT "issues_slug_key" UNIQUE (slug),
  CONSTRAINT "issues_title_check" CHECK (((length(title) >= 1) AND (length(title) <= 250)))
);

ALTER TABLE "public"."issues"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."medical_center_branches" (
  "id"                uuid         NOT NULL DEFAULT gen_random_uuid(),
  "medical_center_id" uuid         NOT NULL,
  "name"              text         NOT NULL,
  "governorate"       text,
  "city"              text,
  "district"          text,
  "address"           text,
  "latitude"          numeric(9,6),
  "longitude"         numeric(9,6),
  "map_url"           text,
  "phone"             text,
  "source_url"        text,
  "display_order"     integer      NOT NULL DEFAULT 0,
  CONSTRAINT "medical_center_branches_map_url_check" CHECK (((map_url IS NULL) OR (map_url ~* '^https?://'::text))),
  CONSTRAINT "medical_center_branches_pkey" PRIMARY KEY (id),
  CONSTRAINT "medical_center_branches_source_url_check" CHECK (((source_url IS NULL) OR (source_url ~* '^https?://'::text)))
);

ALTER TABLE "public"."medical_center_branches"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."medical_center_hours" (
  "id"                uuid    NOT NULL DEFAULT gen_random_uuid(),
  "medical_center_id" uuid    NOT NULL,
  "label"             text    NOT NULL,
  "hours_text"        text    NOT NULL,
  "source_url"        text,
  "display_order"     integer NOT NULL DEFAULT 0,
  CONSTRAINT "medical_center_hours_medical_center_id_label_key" UNIQUE (medical_center_id, label),
  CONSTRAINT "medical_center_hours_pkey" PRIMARY KEY (id),
  CONSTRAINT "medical_center_hours_source_url_check" CHECK (((source_url IS NULL) OR (source_url ~* '^https?://'::text)))
);

ALTER TABLE "public"."medical_center_hours"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."medical_center_services" (
  "id"                uuid    NOT NULL DEFAULT gen_random_uuid(),
  "medical_center_id" uuid    NOT NULL,
  "name"              text    NOT NULL,
  "details"           text    NOT NULL DEFAULT ''::text,
  "source_url"        text,
  "display_order"     integer NOT NULL DEFAULT 0,
  CONSTRAINT "medical_center_services_medical_center_id_name_key" UNIQUE (medical_center_id, name),
  CONSTRAINT "medical_center_services_pkey" PRIMARY KEY (id),
  CONSTRAINT "medical_center_services_source_url_check" CHECK (((source_url IS NULL) OR (source_url ~* '^https?://'::text)))
);

ALTER TABLE "public"."medical_center_services"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."medical_center_sources" (
  "id"                      uuid   NOT NULL DEFAULT gen_random_uuid(),
  "medical_center_id"       uuid   NOT NULL,
  "title"                   text   NOT NULL,
  "url"                     text   NOT NULL,
  "publisher"               text   NOT NULL DEFAULT ''::text,
  "source_type"             text   NOT NULL DEFAULT 'official_directory'::text,
  "checked_at"              date,
  "note"                    text   NOT NULL DEFAULT ''::text,
  "document_url"            text,
  "source_published_at"     text,
  "accessed_at"             text,
  "status_as_of"            text,
  "information_verified_at" text,
  "supports"                text[] NOT NULL DEFAULT '{}'::text[],
  "conflict_note"           text,
  CONSTRAINT "medical_center_sources_document_url_check" CHECK (((document_url IS NULL) OR (document_url ~* '^https?://'::text))),
  CONSTRAINT "medical_center_sources_medical_center_id_url_key" UNIQUE (medical_center_id, url),
  CONSTRAINT "medical_center_sources_pkey" PRIMARY KEY (id),
  CONSTRAINT "medical_center_sources_source_type_check"
    CHECK
    ((source_type = ANY (ARRAY['official_site'::text, 'government'::text, 'official_directory'::text, 'institutional'::text, 'independent'::text, 'independent_directory'::text]))),
  CONSTRAINT "medical_center_sources_url_check" CHECK ((url ~* '^https?://'::text))
);

ALTER TABLE "public"."medical_center_sources"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."medical_center_specialties" (
  "id"                uuid    NOT NULL DEFAULT gen_random_uuid(),
  "medical_center_id" uuid    NOT NULL,
  "name"              text    NOT NULL,
  "source_url"        text,
  "display_order"     integer NOT NULL DEFAULT 0,
  CONSTRAINT "medical_center_specialties_medical_center_id_name_key" UNIQUE (medical_center_id, name),
  CONSTRAINT "medical_center_specialties_pkey" PRIMARY KEY (id),
  CONSTRAINT "medical_center_specialties_source_url_check" CHECK (((source_url IS NULL) OR (source_url ~* '^https?://'::text)))
);

ALTER TABLE "public"."medical_center_specialties"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."medical_centers" (
  "id"                     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "stable_key"             text                     NOT NULL,
  "official_code"          text,
  "slug"                   text                     NOT NULL,
  "name_ar"                text                     NOT NULL,
  "name_en"                text,
  "institution_type"       text                     NOT NULL,
  "ownership"              text                     NOT NULL,
  "operator_name"          text                     NOT NULL DEFAULT ''::text,
  "summary"                text                     NOT NULL DEFAULT ''::text,
  "governorate"            text,
  "city"                   text,
  "district"               text,
  "address"                text,
  "latitude"               numeric(9,6),
  "longitude"              numeric(9,6),
  "map_url"                text,
  "logo_url"               text,
  "website"                text,
  "phone"                  text,
  "emergency_phone"        text,
  "email"                  text,
  "social_links"           jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "booking_url"            text,
  "emergency_available"    boolean,
  "operating_status"       text                     NOT NULL DEFAULT 'unknown'::text,
  "operating_status_as_of" date,
  "verification_status"    text                     NOT NULL DEFAULT 'incomplete'::text,
  "verified_at"            date,
  "facility_presence"      text                     NOT NULL DEFAULT ''::text,
  "care_level"             text                     NOT NULL DEFAULT ''::text,
  "access_status"          text                     NOT NULL DEFAULT ''::text,
  "building_status"        text                     NOT NULL DEFAULT ''::text,
  "equipment_status"       text                     NOT NULL DEFAULT ''::text,
  "is_published"           boolean                  NOT NULL DEFAULT false,
  "revision"               bigint                   NOT NULL DEFAULT 1,
  "deleted_at"             timestamp with time zone,
  "created_at"             timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  "updated_at"             timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT "medical_centers_booking_url_check" CHECK (((booking_url IS NULL) OR (booking_url ~* '^https?://'::text))),
  CONSTRAINT "medical_centers_email_check" CHECK (((email IS NULL) OR (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'::text))),
  CONSTRAINT "medical_centers_institution_type_check"
    CHECK
    ((institution_type = ANY (ARRAY['hospital'::text, 'referral_hospital'::text, 'specialized_hospital'::text, 'medical_center'::text, 'health_center'::text, 'health_unit'::text,
    'medical_complex'::text, 'specialized_clinic'::text, 'laboratory'::text, 'diagnostic_center'::text, 'dental_center'::text, 'eye_center'::text, 'other'::text]))),
  CONSTRAINT "medical_centers_latitude_check" CHECK (((latitude IS NULL) OR ((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric)))),
  CONSTRAINT "medical_centers_logo_url_check" CHECK (((logo_url IS NULL) OR (logo_url ~* '^https?://'::text))),
  CONSTRAINT "medical_centers_longitude_check" CHECK (((longitude IS NULL) OR ((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric)))),
  CONSTRAINT "medical_centers_map_url_check" CHECK (((map_url IS NULL) OR (map_url ~* '^https?://'::text))),
  CONSTRAINT "medical_centers_name_ar_check" CHECK (((length(btrim(name_ar)) >= 2) AND (length(btrim(name_ar)) <= 240))),
  CONSTRAINT "medical_centers_official_code_key" UNIQUE (official_code),
  CONSTRAINT "medical_centers_operating_status_check"
    CHECK ((operating_status = ANY (ARRAY['fully_operational'::text, 'partially_operational'::text, 'not_operational'::text, 'unknown'::text]))),
  CONSTRAINT "medical_centers_ownership_check" CHECK ((ownership = ANY (ARRAY['government'::text, 'private'::text, 'community'::text, 'civil'::text, 'other'::text]))),
  CONSTRAINT "medical_centers_pkey" PRIMARY KEY (id),
  CONSTRAINT "medical_centers_revision_check" CHECK ((revision > 0)),
  CONSTRAINT "medical_centers_slug_check" CHECK ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)),
  CONSTRAINT "medical_centers_slug_key" UNIQUE (slug),
  CONSTRAINT "medical_centers_social_links_check" CHECK ((jsonb_typeof(social_links) = 'array'::text)),
  CONSTRAINT "medical_centers_stable_key_check" CHECK (((length(btrim(stable_key)) >= 3) AND (length(btrim(stable_key)) <= 220))),
  CONSTRAINT "medical_centers_stable_key_key" UNIQUE (stable_key),
  CONSTRAINT "medical_centers_verification_status_check" CHECK ((verification_status = ANY (ARRAY['verified'::text, 'needs_review'::text, 'incomplete'::text]))),
  CONSTRAINT "medical_centers_website_check" CHECK (((website IS NULL) OR (website ~* '^https?://'::text)))
);

ALTER TABLE "public"."medical_centers"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."message_followups" (
  "message_id"  uuid                     NOT NULL,
  "assigned_to" uuid,
  "notes"       text                     NOT NULL DEFAULT ''::text,
  "task_id"     uuid,
  "revision"    bigint                   NOT NULL DEFAULT 1,
  "updated_at"  timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  "updated_by"  uuid,
  CONSTRAINT "message_followups_notes_check" CHECK ((length(notes) <= 10000)),
  CONSTRAINT "message_followups_pkey" PRIMARY KEY (message_id)
);

ALTER TABLE "public"."message_followups"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."message_followups" FROM "anon";

CREATE TABLE "public"."messages" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"              text                     NOT NULL,
  "email"             text                     NOT NULL,
  "type"              text                     NOT NULL,
  "message"           text                     NOT NULL,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "status"            text                     NOT NULL DEFAULT 'new'::text,
  "status_updated_at" timestamp with time zone,
  "status_updated_by" uuid,
  CONSTRAINT "messages_pkey" PRIMARY KEY (id),
  CONSTRAINT "messages_status_check" CHECK ((status = ANY (ARRAY['new'::text, 'in_progress'::text, 'resolved'::text])))
);

ALTER TABLE "public"."messages"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."messages" FROM "anon";

CREATE TABLE "public"."professionals" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "slug"              text                     NOT NULL,
  "full_name"         text                     NOT NULL,
  "profession_title"  text                     NOT NULL,
  "category"          text                     NOT NULL,
  "location"          text                     NOT NULL,
  "service_areas"     text[]                   NOT NULL DEFAULT '{}'::text[],
  "service_mode"      text                     NOT NULL DEFAULT 'حضوري'::text,
  "years_experience"  integer,
  "availability"      text                     NOT NULL DEFAULT ''::text,
  "bio"               text                     NOT NULL DEFAULT ''::text,
  "services"          text[]                   NOT NULL DEFAULT '{}'::text[],
  "skills"            text[]                   NOT NULL DEFAULT '{}'::text[],
  "languages"         text[]                   NOT NULL DEFAULT '{}'::text[],
  "phone"             text,
  "whatsapp"          text,
  "email"             text,
  "website"           text,
  "instagram"         text,
  "profile_image_url" text,
  "image_position"    text                     NOT NULL DEFAULT 'center'::text,
  "is_verified"       boolean                  NOT NULL DEFAULT false,
  "is_published"      boolean                  NOT NULL DEFAULT false,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "revision"          bigint                   NOT NULL DEFAULT 1,
  CONSTRAINT "professionals_full_name_check" CHECK (((length(full_name) >= 2) AND (length(full_name) <= 160))),
  CONSTRAINT "professionals_instagram_check" CHECK (((instagram IS NULL) OR (instagram ~ '^https?://'::text))),
  CONSTRAINT "professionals_pkey" PRIMARY KEY (id),
  CONSTRAINT "professionals_slug_check" CHECK ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)),
  CONSTRAINT "professionals_slug_key" UNIQUE (slug),
  CONSTRAINT "professionals_website_check" CHECK (((website IS NULL) OR (website ~ '^https?://'::text))),
  CONSTRAINT "professionals_years_experience_check" CHECK (((years_experience IS NULL) OR ((years_experience >= 0) AND (years_experience <= 80))))
);

ALTER TABLE "public"."professionals"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."public_profiles" (
  "user_id"               uuid                     NOT NULL,
  "display_name"          text                     NOT NULL,
  "avatar_url"            text,
  "show_avatar"           boolean                  NOT NULL DEFAULT false,
  "terms_accepted_at"     timestamp with time zone DEFAULT now(),
  "terms_version"         text                     NOT NULL DEFAULT '2026-10-debates'::text,
  "suspended"             boolean                  NOT NULL DEFAULT false,
  "suspension_reason"     text                     NOT NULL DEFAULT ''::text,
  "deletion_requested_at" timestamp with time zone,
  "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "comments_restricted"   boolean                  NOT NULL DEFAULT false,
  "questions_restricted"  boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "public_profiles_avatar_url_check" CHECK (((avatar_url IS NULL) OR ((length(avatar_url) <= 1500) AND (avatar_url ~ '^https://[^/@[:space:]]+(/|$)'::text)))),
  CONSTRAINT "public_profiles_display_name_check" CHECK (((length(btrim(display_name)) >= 2) AND (length(btrim(display_name)) <= 60))),
  CONSTRAINT "public_profiles_pkey" PRIMARY KEY (user_id)
);

ALTER TABLE "public"."public_profiles"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."public_profiles" FROM "anon";

CREATE TABLE "public"."ranking_indicators" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "slug"          text                     NOT NULL,
  "name"          text                     NOT NULL,
  "category"      text                     NOT NULL,
  "unit"          text                     NOT NULL,
  "code"          text                     NOT NULL,
  "direction"     text                     NOT NULL DEFAULT 'desc'::text,
  "better"        text                     NOT NULL DEFAULT 'contextual'::text,
  "description"   text                     NOT NULL DEFAULT ''::text,
  "display_order" integer                  NOT NULL DEFAULT 0,
  "is_published"  boolean                  NOT NULL DEFAULT false,
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "ranking_indicators_better_check" CHECK ((better = ANY (ARRAY['higher'::text, 'lower'::text, 'contextual'::text]))),
  CONSTRAINT "ranking_indicators_category_check" CHECK (((length(category) >= 1) AND (length(category) <= 50))),
  CONSTRAINT "ranking_indicators_code_check" CHECK ((((length(code) >= 2) AND (length(code) <= 80)) AND (code ~ '^[A-Z0-9][A-Z0-9_.]+$'::text))),
  CONSTRAINT "ranking_indicators_description_check" CHECK ((length(description) <= 3000)),
  CONSTRAINT "ranking_indicators_direction_check" CHECK ((direction = ANY (ARRAY['asc'::text, 'desc'::text]))),
  CONSTRAINT "ranking_indicators_display_order_check" CHECK (((display_order >= 0) AND (display_order <= 10000))),
  CONSTRAINT "ranking_indicators_name_check" CHECK (((length(name) >= 2) AND (length(name) <= 160))),
  CONSTRAINT "ranking_indicators_pkey" PRIMARY KEY (id),
  CONSTRAINT "ranking_indicators_slug_check" CHECK ((((length(slug) >= 1) AND (length(slug) <= 100)) AND (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))),
  CONSTRAINT "ranking_indicators_slug_key" UNIQUE (slug),
  CONSTRAINT "ranking_indicators_unit_check" CHECK (((length(unit) >= 1) AND (length(unit) <= 120)))
);

ALTER TABLE "public"."ranking_indicators"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ranking_snapshots" (
  "indicator_id" uuid                     NOT NULL,
  "payload"      jsonb                    NOT NULL,
  "summary"      jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "ranking_snapshots_payload_check" CHECK (((jsonb_typeof(payload) = 'object'::text) AND (payload @> '{"version": 1}'::jsonb))),
  CONSTRAINT "ranking_snapshots_pkey" PRIMARY KEY (indicator_id),
  CONSTRAINT "ranking_snapshots_summary_check" CHECK ((jsonb_typeof(summary) = 'object'::text))
);

ALTER TABLE "public"."ranking_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."site_settings" (
  "key"        text                     NOT NULL,
  "value"      jsonb                    NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "site_settings_pkey" PRIMARY KEY (key)
);

ALTER TABLE "public"."site_settings"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."stat_domains" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "section_id"    uuid                     NOT NULL,
  "slug"          text                     NOT NULL,
  "name"          text                     NOT NULL,
  "description"   text                     NOT NULL DEFAULT ''::text,
  "display_order" integer                  NOT NULL DEFAULT 0,
  "is_published"  boolean                  NOT NULL DEFAULT true,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "stat_domains_pkey" PRIMARY KEY (id),
  CONSTRAINT "stat_domains_slug_check" CHECK ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)),
  CONSTRAINT "stat_domains_slug_key" UNIQUE (slug)
);

ALTER TABLE "public"."stat_domains"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."stat_indicator_sources" (
  "indicator_id" uuid                     NOT NULL,
  "source_id"    uuid                     NOT NULL,
  "series_label" text                     NOT NULL DEFAULT ''::text,
  "methodology"  text                     NOT NULL DEFAULT ''::text,
  "is_adopted"   boolean                  NOT NULL DEFAULT false,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "stat_indicator_sources_pkey" PRIMARY KEY (indicator_id, source_id)
);

ALTER TABLE "public"."stat_indicator_sources"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."stat_indicators" (
  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "domain_id"             uuid                     NOT NULL,
  "slug"                  text                     NOT NULL,
  "name"                  text                     NOT NULL,
  "short_description"     text                     NOT NULL DEFAULT ''::text,
  "definition"            text                     NOT NULL DEFAULT ''::text,
  "unit"                  text                     NOT NULL,
  "improvement_direction" text                     NOT NULL DEFAULT 'contextual'::text,
  "measurement_method"    text                     NOT NULL DEFAULT ''::text,
  "data_status"           text                     NOT NULL DEFAULT 'partial'::text,
  "chart_type"            text                     NOT NULL DEFAULT 'line'::text,
  "adopted_source_id"     uuid,
  "is_published"          boolean                  NOT NULL DEFAULT false,
  "hide_when_incomplete"  boolean                  NOT NULL DEFAULT true,
  "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"            timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "stat_indicators_chart_type_check" CHECK ((chart_type = ANY (ARRAY['line'::text, 'bar'::text, 'area'::text]))),
  CONSTRAINT "stat_indicators_data_status_check" CHECK ((data_status = ANY (ARRAY['complete'::text, 'partial'::text, 'limited'::text, 'discontinued'::text]))),
  CONSTRAINT "stat_indicators_improvement_direction_check" CHECK ((improvement_direction = ANY (ARRAY['increase'::text, 'decrease'::text, 'neutral'::text, 'contextual'::text]))),
  CONSTRAINT "stat_indicators_pkey" PRIMARY KEY (id),
  CONSTRAINT "stat_indicators_slug_check" CHECK ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)),
  CONSTRAINT "stat_indicators_slug_key" UNIQUE (slug)
);

ALTER TABLE "public"."stat_indicators"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."stat_sections" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "slug"          text                     NOT NULL,
  "name"          text                     NOT NULL,
  "description"   text                     NOT NULL DEFAULT ''::text,
  "display_order" integer                  NOT NULL DEFAULT 0,
  "is_published"  boolean                  NOT NULL DEFAULT true,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "stat_sections_pkey" PRIMARY KEY (id),
  CONSTRAINT "stat_sections_slug_check" CHECK ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)),
  CONSTRAINT "stat_sections_slug_key" UNIQUE (slug)
);

ALTER TABLE "public"."stat_sections"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."stat_sources" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"        text                     NOT NULL,
  "publisher"   text                     NOT NULL DEFAULT ''::text,
  "url"         text,
  "description" text                     NOT NULL DEFAULT ''::text,
  "is_active"   boolean                  NOT NULL DEFAULT true,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "stat_sources_name_key" UNIQUE (name),
  CONSTRAINT "stat_sources_pkey" PRIMARY KEY (id),
  CONSTRAINT "stat_sources_url_check" CHECK (((url IS NULL) OR (url ~ '^https?://'::text)))
);

ALTER TABLE "public"."stat_sources"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."stat_values" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "indicator_id"     uuid                     NOT NULL,
  "source_id"        uuid                     NOT NULL,
  "year"             integer                  NOT NULL,
  "value"            numeric                  NOT NULL,
  "document_url"     text,
  "publication_date" date,
  "national_scope"   boolean                  NOT NULL DEFAULT true,
  "methodology_note" text                     NOT NULL DEFAULT ''::text,
  "value_status"     text                     NOT NULL DEFAULT 'official'::text,
  "is_published"     boolean                  NOT NULL DEFAULT false,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "stat_values_document_url_check" CHECK (((document_url IS NULL) OR (document_url ~ '^https?://'::text))),
  CONSTRAINT "stat_values_indicator_id_year_source_id_key" UNIQUE (indicator_id, year, source_id),
  CONSTRAINT "stat_values_national_scope_check" CHECK ((national_scope = true)),
  CONSTRAINT "stat_values_pkey" PRIMARY KEY (id),
  CONSTRAINT "stat_values_value_status_check" CHECK ((value_status = ANY (ARRAY['official'::text, 'estimated'::text]))),
  CONSTRAINT "stat_values_year_check" CHECK (((year >= 1990) AND (year <= 2100)))
);

ALTER TABLE "public"."stat_values"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."task_activity" (
  "id"         bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "task_id"    uuid,
  "actor_id"   uuid,
  "action"     text                     NOT NULL,
  "field"      text,
  "old_value"  jsonb,
  "new_value"  jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "task_activity_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."task_activity"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."task_activity" FROM "anon";

CREATE TABLE "public"."task_comments" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "task_id"     uuid                     NOT NULL,
  "body"        text                     NOT NULL,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "edited_at"   timestamp with time zone,
  "parent_id"   uuid,
  "deleted_at"  timestamp with time zone,
  "revision"    bigint                   NOT NULL DEFAULT 1,
  "mention_ids" uuid[]                   NOT NULL DEFAULT '{}'::uuid[],
  CONSTRAINT "task_comments_body_check" CHECK (((length(btrim(body)) >= 1) AND (length(btrim(body)) <= 5000))),
  CONSTRAINT "task_comments_mentions_limit" CHECK ((cardinality(mention_ids) <= 20)),
  CONSTRAINT "task_comments_not_self" CHECK ((parent_id IS DISTINCT FROM id)),
  CONSTRAINT "task_comments_pkey" PRIMARY KEY (id),
  CONSTRAINT "task_comments_task_identity" UNIQUE (task_id, id),
  "author_id"   uuid                     NOT NULL DEFAULT auth.uid()
);

ALTER TABLE "public"."task_comments"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."task_comments" FROM "anon";

CREATE TABLE "public"."task_members" (
  "task_id"    uuid                     NOT NULL,
  "user_id"    uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT "task_members_pkey" PRIMARY KEY (task_id, user_id),
  "added_by"   uuid                     NOT NULL DEFAULT auth.uid()
);

ALTER TABLE "public"."task_members"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."task_members" FROM "anon";

CREATE TABLE "public"."task_notifications" (
  "id"         bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "user_id"    uuid                     NOT NULL,
  "task_id"    uuid                     NOT NULL,
  "kind"       text                     NOT NULL,
  "dedupe_key" text                     NOT NULL,
  "read_at"    timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "comment_id" uuid,
  CONSTRAINT "task_notifications_kind_check"
    CHECK
    ((kind = ANY (ARRAY['assignment'::text, 'unassigned'::text, 'due_soon'::text, 'overdue'::text, 'review'::text, 'reopened'::text, 'comment'::text, 'reply'::text,
    'mention'::text, 'status'::text]))),
  CONSTRAINT "task_notifications_pkey" PRIMARY KEY (id),
  CONSTRAINT "task_notifications_user_id_dedupe_key_key" UNIQUE (user_id, dedupe_key)
);

ALTER TABLE "public"."task_notifications"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."task_notifications" FROM "anon";

CREATE TABLE "public"."task_projects" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"       text                     NOT NULL,
  "is_active"  boolean                  NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "task_projects_name_check" CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 120))),
  CONSTRAINT "task_projects_name_key" UNIQUE (name),
  CONSTRAINT "task_projects_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."task_projects"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."task_projects" FROM "anon";

CREATE TABLE "public"."task_subtasks" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "task_id"      uuid                     NOT NULL,
  "title"        text                     NOT NULL,
  "position"     integer                  NOT NULL DEFAULT 0,
  "is_completed" boolean                  NOT NULL DEFAULT false,
  "completed_at" timestamp with time zone,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "task_subtasks_check" CHECK ((is_completed = (completed_at IS NOT NULL))),
  CONSTRAINT "task_subtasks_pkey" PRIMARY KEY (id),
  CONSTRAINT "task_subtasks_position_check" CHECK ((("position" >= 0) AND ("position" <= 100000))),
  CONSTRAINT "task_subtasks_title_check" CHECK (((length(btrim(title)) >= 1) AND (length(btrim(title)) <= 250)))
);

ALTER TABLE "public"."task_subtasks"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."task_subtasks" FROM "anon";

CREATE TABLE "public"."tasks" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "title"             text                     NOT NULL,
  "description"       text                     NOT NULL DEFAULT ''::text,
  "notes"             text                     NOT NULL DEFAULT ''::text,
  "project_id"        uuid,
  "status"            text                     NOT NULL DEFAULT 'not_started'::text,
  "priority"          text                     NOT NULL DEFAULT 'normal'::text,
  "start_at"          timestamp with time zone,
  "due_at"            timestamp with time zone,
  "due_date"          date,
  "due_timezone"      text                     NOT NULL DEFAULT 'UTC'::text,
  "estimated_minutes" integer,
  "tags"              text[]                   NOT NULL DEFAULT '{}'::text[],
  "links"             text[]                   NOT NULL DEFAULT '{}'::text[],
  "requires_review"   boolean                  NOT NULL DEFAULT false,
  "recurrence"        text                     NOT NULL DEFAULT 'none'::text,
  "recurrence_of"     uuid,
  "completed_at"      timestamp with time zone,
  "completed_by"      uuid,
  "archived_at"       timestamp with time zone,
  "deleted_at"        timestamp with time zone,
  "revision"          bigint                   NOT NULL DEFAULT 1,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "source_type"       text,
  "source_id"         text,
  "source_url"        text,
  "auto_archive_at"   timestamp with time zone,
  "auto_archived"     boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "tasks_check1" CHECK ((((status = 'completed'::text) AND (completed_at IS NOT NULL) AND (completed_by IS
    NOT NULL)) OR ((status <> 'completed'::text) AND (completed_at IS NULL) AND (completed_by IS NULL)))),
  CONSTRAINT "tasks_check" CHECK (((due_at IS NULL) OR (due_date IS NULL))),
  CONSTRAINT "tasks_description_check" CHECK ((length(description) <= 15000)),
  CONSTRAINT "tasks_due_at_check" CHECK (((due_at >= '1900-01-01 00:00:00+00'::timestamp with time zone) AND (due_at <= '9999-12-31 00:00:00+00'::timestamp with time zone))),
  CONSTRAINT "tasks_due_date_check" CHECK (((due_date >= '1900-01-01'::date) AND (due_date <= '9999-12-31'::date))),
  CONSTRAINT "tasks_estimated_minutes_check" CHECK (((estimated_minutes >= 1) AND (estimated_minutes <= 525600))),
  CONSTRAINT "tasks_links_check" CHECK ((cardinality(links) <= 20)),
  CONSTRAINT "tasks_notes_check" CHECK ((length(notes) <= 10000)),
  CONSTRAINT "tasks_pkey" PRIMARY KEY (id),
  CONSTRAINT "tasks_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))),
  CONSTRAINT "tasks_recurrence_check" CHECK ((recurrence = ANY (ARRAY['none'::text, 'daily'::text, 'weekly'::text, 'monthly'::text]))),
  CONSTRAINT "tasks_recurrence_of_key" UNIQUE (recurrence_of),
  CONSTRAINT "tasks_source_id_check" CHECK (((source_id IS NULL) OR (length(source_id) <= 150))),
  CONSTRAINT "tasks_source_type_check" CHECK (((source_type IS NULL) OR ((length(source_type) >= 1) AND (length(source_type) <= 60)))),
  CONSTRAINT "tasks_source_url_check"
    CHECK
    (((source_url IS NULL) OR ((length(source_url) <= 2000) AND ((source_url = '/'::text) OR (source_url ~ '^/[^/]'::text)) AND (source_url !~ '[[:cntrl:]]'::text) AND
    (POSITION((chr(92)) IN (source_url)) = 0)))),
  CONSTRAINT "tasks_start_at_check" CHECK (((start_at >= '1900-01-01 00:00:00+00'::timestamp with time zone) AND (start_at <= '9999-12-31 00:00:00+00'::timestamp with time zone))),
  CONSTRAINT "tasks_status_check"
    CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'in_review'::text, 'blocked'::text, 'completed'::text, 'cancelled'::text]))),
  CONSTRAINT "tasks_tags_check" CHECK ((cardinality(tags) <= 20)),
  CONSTRAINT "tasks_title_check" CHECK (((length(btrim(title)) >= 1) AND (length(btrim(title)) <= 250))),
  "created_by"        uuid                     NOT NULL DEFAULT auth.uid(),
  "assigned_to"       uuid                     NOT NULL DEFAULT auth.uid()
);

ALTER TABLE "public"."tasks"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."tasks" FROM "anon";

CREATE TABLE "public"."universities" (
  "id"                   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "stable_key"           text                     NOT NULL,
  "slug"                 text                     NOT NULL,
  "name_ar"              text                     NOT NULL,
  "name_en"              text,
  "institution_type"     text                     NOT NULL,
  "ownership"            text                     NOT NULL,
  "founded_year"         integer,
  "summary"              text                     NOT NULL DEFAULT ''::text,
  "governorate"          text,
  "city"                 text,
  "district"             text,
  "address"              text,
  "latitude"             numeric(9,6),
  "longitude"            numeric(9,6),
  "map_url"              text,
  "logo_url"             text,
  "website"              text,
  "phone"                text,
  "email"                text,
  "social_links"         jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "admission_info"       text                     NOT NULL DEFAULT ''::text,
  "tuition_info"         text                     NOT NULL DEFAULT ''::text,
  "tuition_as_of"        date,
  "registration_url"     text,
  "languages"            text[]                   NOT NULL DEFAULT '{}'::text[],
  "study_modes"          text[]                   NOT NULL DEFAULT '{}'::text[],
  "education_levels"     text[]                   NOT NULL DEFAULT '{}'::text[],
  "accreditation_status" text                     NOT NULL DEFAULT 'not_asserted'::text,
  "accrediting_body"     text                     NOT NULL DEFAULT ''::text,
  "operating_status"     text                     NOT NULL DEFAULT 'unknown'::text,
  "verification_status"  text                     NOT NULL DEFAULT 'incomplete'::text,
  "verified_at"          date,
  "is_published"         boolean                  NOT NULL DEFAULT false,
  "revision"             bigint                   NOT NULL DEFAULT 1,
  "deleted_at"           timestamp with time zone,
  "created_at"           timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  "updated_at"           timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT "universities_accreditation_status_check" CHECK ((accreditation_status = ANY (ARRAY['verified'::text, 'not_asserted'::text, 'needs_review'::text]))),
  CONSTRAINT "universities_email_check" CHECK (((email IS NULL) OR (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'::text))),
  CONSTRAINT "universities_founded_year_check" CHECK (((founded_year IS NULL) OR ((founded_year >= 1800) AND (founded_year <= 2200)))),
  CONSTRAINT "universities_institution_type_check"
    CHECK
    ((institution_type = ANY (ARRAY['university'::text, 'community_college'::text, 'independent_college'::text, 'higher_institute'::text, 'technical_institute'::text,
    'vocational_institute'::text, 'specialized_institution'::text]))),
  CONSTRAINT "universities_latitude_check" CHECK (((latitude IS NULL) OR ((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric)))),
  CONSTRAINT "universities_logo_url_check" CHECK (((logo_url IS NULL) OR (logo_url ~* '^https?://'::text))),
  CONSTRAINT "universities_longitude_check" CHECK (((longitude IS NULL) OR ((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric)))),
  CONSTRAINT "universities_map_url_check" CHECK (((map_url IS NULL) OR (map_url ~* '^https?://'::text))),
  CONSTRAINT "universities_name_ar_check" CHECK (((length(btrim(name_ar)) >= 2) AND (length(btrim(name_ar)) <= 240))),
  CONSTRAINT "universities_operating_status_check"
    CHECK ((operating_status = ANY (ARRAY['operating'::text, 'temporarily_closed'::text, 'closed'::text, 'listed_for_admission'::text, 'unknown'::text]))),
  CONSTRAINT "universities_ownership_check" CHECK ((ownership = ANY (ARRAY['government'::text, 'private'::text, 'community'::text, 'civil'::text, 'other'::text]))),
  CONSTRAINT "universities_pkey" PRIMARY KEY (id),
  CONSTRAINT "universities_registration_url_check" CHECK (((registration_url IS NULL) OR (registration_url ~* '^https?://'::text))),
  CONSTRAINT "universities_revision_check" CHECK ((revision > 0)),
  CONSTRAINT "universities_slug_check" CHECK ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)),
  CONSTRAINT "universities_slug_key" UNIQUE (slug),
  CONSTRAINT "universities_social_links_check" CHECK ((jsonb_typeof(social_links) = 'array'::text)),
  CONSTRAINT "universities_stable_key_check" CHECK (((length(btrim(stable_key)) >= 3) AND (length(btrim(stable_key)) <= 220))),
  CONSTRAINT "universities_stable_key_key" UNIQUE (stable_key),
  CONSTRAINT "universities_verification_status_check" CHECK ((verification_status = ANY (ARRAY['verified'::text, 'needs_review'::text, 'incomplete'::text]))),
  CONSTRAINT "universities_website_check" CHECK (((website IS NULL) OR (website ~* '^https?://'::text)))
);

ALTER TABLE "public"."universities"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."university_branches" (
  "id"            uuid         NOT NULL DEFAULT gen_random_uuid(),
  "university_id" uuid         NOT NULL,
  "name"          text         NOT NULL,
  "governorate"   text,
  "city"          text,
  "district"      text,
  "address"       text,
  "latitude"      numeric(9,6),
  "longitude"     numeric(9,6),
  "map_url"       text,
  "phone"         text,
  "source_url"    text,
  "display_order" integer      NOT NULL DEFAULT 0,
  CONSTRAINT "university_branches_map_url_check" CHECK (((map_url IS NULL) OR (map_url ~* '^https?://'::text))),
  CONSTRAINT "university_branches_pkey" PRIMARY KEY (id),
  CONSTRAINT "university_branches_source_url_check" CHECK (((source_url IS NULL) OR (source_url ~* '^https?://'::text)))
);

ALTER TABLE "public"."university_branches"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."university_programs" (
  "id"            uuid    NOT NULL DEFAULT gen_random_uuid(),
  "university_id" uuid    NOT NULL,
  "faculty"       text    NOT NULL DEFAULT ''::text,
  "department"    text    NOT NULL DEFAULT ''::text,
  "name"          text    NOT NULL,
  "field"         text    NOT NULL DEFAULT ''::text,
  "qualification" text    NOT NULL DEFAULT ''::text,
  "language"      text    NOT NULL DEFAULT ''::text,
  "study_mode"    text    NOT NULL DEFAULT ''::text,
  "source_url"    text,
  "display_order" integer NOT NULL DEFAULT 0,
  CONSTRAINT "university_programs_pkey" PRIMARY KEY (id),
  CONSTRAINT "university_programs_source_url_check" CHECK (((source_url IS NULL) OR (source_url ~* '^https?://'::text))),
  CONSTRAINT "university_programs_university_id_name_qualification_study__key" UNIQUE (university_id, name, qualification, study_mode)
);

ALTER TABLE "public"."university_programs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."university_sources" (
  "id"                      uuid   NOT NULL DEFAULT gen_random_uuid(),
  "university_id"           uuid   NOT NULL,
  "title"                   text   NOT NULL,
  "url"                     text   NOT NULL,
  "publisher"               text   NOT NULL DEFAULT ''::text,
  "source_type"             text   NOT NULL DEFAULT 'official_directory'::text,
  "checked_at"              date,
  "note"                    text   NOT NULL DEFAULT ''::text,
  "document_url"            text,
  "source_published_at"     text,
  "accessed_at"             text,
  "status_as_of"            text,
  "information_verified_at" text,
  "supports"                text[] NOT NULL DEFAULT '{}'::text[],
  "conflict_note"           text,
  CONSTRAINT "university_sources_document_url_check" CHECK (((document_url IS NULL) OR (document_url ~* '^https?://'::text))),
  CONSTRAINT "university_sources_pkey" PRIMARY KEY (id),
  CONSTRAINT "university_sources_source_type_check"
    CHECK
    ((source_type = ANY (ARRAY['official_site'::text, 'government'::text, 'official_directory'::text, 'institutional'::text, 'independent'::text, 'independent_directory'::text]))),
  CONSTRAINT "university_sources_university_id_url_key" UNIQUE (university_id, url),
  CONSTRAINT "university_sources_url_check" CHECK ((url ~* '^https?://'::text))
);

ALTER TABLE "public"."university_sources"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."works" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "slug"          text                     NOT NULL,
  "title"         text                     NOT NULL,
  "summary"       text                     NOT NULL DEFAULT ''::text,
  "category"      text                     NOT NULL DEFAULT 'المجتمع'::text,
  "platform"      text                     NOT NULL DEFAULT 'إنستغرام'::text,
  "external_url"  text                     NOT NULL,
  "thumbnail_url" text,
  "published_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "is_published"  boolean                  NOT NULL DEFAULT false,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "debate_id"     uuid,
  "debate_slug"   text,
  "revision"      bigint                   NOT NULL DEFAULT 1,
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "works_debate_id_key" UNIQUE (debate_id),
  CONSTRAINT "works_external_url_check" CHECK ((external_url ~ '^https?://'::text)),
  CONSTRAINT "works_pkey" PRIMARY KEY (id),
  CONSTRAINT "works_slug_check" CHECK (((length(slug) >= 1) AND (length(slug) <= 120))),
  CONSTRAINT "works_slug_key" UNIQUE (slug),
  CONSTRAINT "works_title_check" CHECK (((length(title) >= 1) AND (length(title) <= 250)))
);

ALTER TABLE "public"."works"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."yemeni_companies" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "slug"            text                     NOT NULL,
  "name"            text                     NOT NULL,
  "legal_name"      text                     NOT NULL DEFAULT ''::text,
  "category"        text                     NOT NULL,
  "location"        text                     NOT NULL,
  "scale"           text                     NOT NULL DEFAULT ''::text,
  "entity_type"     text                     NOT NULL DEFAULT ''::text,
  "ownership"       text                     NOT NULL DEFAULT ''::text,
  "owner_name"      text                     NOT NULL DEFAULT ''::text,
  "ceo_name"        text                     NOT NULL DEFAULT ''::text,
  "founded"         text                     NOT NULL DEFAULT ''::text,
  "team_size"       text                     NOT NULL DEFAULT ''::text,
  "address"         text                     NOT NULL DEFAULT ''::text,
  "website"         text,
  "email"           text,
  "phone"           text,
  "summary"         text                     NOT NULL DEFAULT ''::text,
  "story"           text                     NOT NULL DEFAULT ''::text,
  "impact"          text                     NOT NULL DEFAULT ''::text,
  "strengths"       text[]                   NOT NULL DEFAULT '{}'::text[],
  "markets"         text[]                   NOT NULL DEFAULT '{}'::text[],
  "products"        jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "image_url"       text,
  "image_position"  text                     NOT NULL DEFAULT 'center'::text,
  "is_published"    boolean                  NOT NULL DEFAULT false,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "google_maps_url" text,
  "revision"        bigint                   NOT NULL DEFAULT 1,
  CONSTRAINT "yemeni_companies_google_maps_url_check" CHECK (((google_maps_url IS NULL) OR (google_maps_url ~ '^https?://'::text))),
  CONSTRAINT "yemeni_companies_name_check" CHECK (((length(name) >= 2) AND (length(name) <= 180))),
  CONSTRAINT "yemeni_companies_pkey" PRIMARY KEY (id),
  CONSTRAINT "yemeni_companies_products_check" CHECK ((jsonb_typeof(products) = 'array'::text)),
  CONSTRAINT "yemeni_companies_slug_check" CHECK ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)),
  CONSTRAINT "yemeni_companies_slug_key" UNIQUE (slug),
  CONSTRAINT "yemeni_companies_website_check" CHECK (((website IS NULL) OR (website ~ '^https?://'::text)))
);

ALTER TABLE "public"."yemeni_companies"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."yemeni_figures" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "slug"             text                     NOT NULL,
  "full_name"        text                     NOT NULL,
  "known_for"        text                     NOT NULL DEFAULT ''::text,
  "field"            text                     NOT NULL,
  "governorate_id"   text                     NOT NULL,
  "governorate_name" text                     NOT NULL,
  "era"              text                     NOT NULL,
  "birth_year"       integer,
  "death_year"       integer,
  "short_bio"        text                     NOT NULL DEFAULT ''::text,
  "image_url"        text,
  "website"          text,
  "facebook_url"     text,
  "instagram_url"    text,
  "x_url"            text,
  "youtube_url"      text,
  "image_credit"     text                     NOT NULL DEFAULT ''::text,
  "image_source_url" text,
  "display_order"    integer                  NOT NULL DEFAULT 0,
  "is_published"     boolean                  NOT NULL DEFAULT false,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "yemeni_figures_birth_year_check" CHECK (((birth_year IS NULL) OR ((birth_year >= 500) AND (birth_year <= 2100)))),
  CONSTRAINT "yemeni_figures_check" CHECK (((death_year IS NULL) OR (birth_year IS NULL) OR (death_year >= birth_year))),
  CONSTRAINT "yemeni_figures_death_year_check" CHECK (((death_year IS NULL) OR ((death_year >= 500) AND (death_year <= 2100)))),
  CONSTRAINT "yemeni_figures_era_check" CHECK ((era = ANY (ARRAY['معاصرة'::text, 'تاريخية'::text]))),
  CONSTRAINT "yemeni_figures_facebook_url_check" CHECK (((facebook_url IS NULL) OR (facebook_url ~ '^https?://'::text))),
  CONSTRAINT "yemeni_figures_full_name_check" CHECK (((length(full_name) >= 2) AND (length(full_name) <= 160))),
  CONSTRAINT "yemeni_figures_image_source_url_check" CHECK (((image_source_url IS NULL) OR (image_source_url ~ '^https?://'::text))),
  CONSTRAINT "yemeni_figures_instagram_url_check" CHECK (((instagram_url IS NULL) OR (instagram_url ~ '^https?://'::text))),
  CONSTRAINT "yemeni_figures_pkey" PRIMARY KEY (id),
  CONSTRAINT "yemeni_figures_slug_check" CHECK ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)),
  CONSTRAINT "yemeni_figures_slug_key" UNIQUE (slug),
  CONSTRAINT "yemeni_figures_website_check" CHECK (((website IS NULL) OR (website ~ '^https?://'::text))),
  CONSTRAINT "yemeni_figures_x_url_check" CHECK (((x_url IS NULL) OR (x_url ~ '^https?://'::text))),
  CONSTRAINT "yemeni_figures_youtube_url_check" CHECK (((youtube_url IS NULL) OR (youtube_url ~ '^https?://'::text)))
);

ALTER TABLE "public"."yemeni_figures"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.contact_message_status_audit()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
 if NEW.status is distinct from OLD.status then NEW.status_updated_at:=clock_timestamp(); NEW.status_updated_by:=auth.uid(); end if;
 return NEW;
end $function$;

CREATE OR REPLACE FUNCTION public.contact_rate_limit (
  p_key text
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare n integer; ts timestamptz:=clock_timestamp();
begin
 if p_key is null or p_key !~ '^[a-f0-9]{64}$' then raise exception 'Invalid rate key' using errcode='22023'; end if;
 delete from public.contact_rate_limits where expires_at<=ts;
 insert into public.contact_rate_limits as r(key_hash,hits,expires_at) values(p_key,1,ts+interval '10 minutes')
 on conflict(key_hash) do update set hits=least(r.hits+1,9)
 returning hits into n;
 return n<=8;
end $function$;

REVOKE ALL ON FUNCTION "public"."contact_rate_limit"(text) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.debate_admin_mutate (
  p_action   text,
  p_id       uuid   DEFAULT NULL::uuid,
  p_revision bigint DEFAULT NULL::bigint,
  p_data     jsonb  DEFAULT '{}'::jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare before_children jsonb; after_children jsonb; result jsonb; parent jsonb; fields text[];
begin
 if p_action='save' then
  -- Original RPC remains the authority for capability, revision and validation.
  if p_id is not null then perform 1 from public.debates where id=p_id for update;end if;
  before_children:=public.editorial_debate_children(p_id);
  perform set_config('app967.editorial_debate_batch','true',true);
 end if;
 result:=public.editorial_debate_mutate_legacy(p_action,p_id,p_revision,p_data);
 if p_action='save' then
  perform set_config('app967.editorial_debate_batch','false',true);
  after_children:=public.editorial_debate_children((result->>'id')::uuid);
  select array_agg(k order by k) into fields from jsonb_object_keys(after_children) k where before_children->k is distinct from after_children->k;
  if cardinality(fields)>0 then
   select to_jsonb(d) into parent from public.debates d where id=(result->>'id')::uuid;
   perform public.editorial_emit('debate','debates',parent->>'id',parent,parent,'/debates/'||(parent->>'slug'),fields);
  end if;
 end if;
 return result;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."debate_admin_mutate"(text, uuid, bigint, jsonb) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.debate_admin_mutate_base (
  p_action   text,
  p_id       uuid   DEFAULT NULL::uuid,
  p_revision bigint DEFAULT NULL::bigint,
  p_data     jsonb  DEFAULT '{}'::jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare r text:=public.debate_role(); d public.debates; old_d public.debates; speaker_record public.debate_speakers; x jsonb; k text; saved uuid; reason text:=coalesce(p_data->>'reason','تحديث تحريري'); has_votes boolean; result jsonb; task_title text; t jsonb; link_id uuid;
begin
 if r is null then raise exception 'Editor required' using errcode='42501'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>180000 then raise exception 'Invalid request data' using errcode='22023'; end if;
 if p_action in ('suspend','delete','anonymize','results_visibility') and r<>'management' then raise exception 'Management required' using errcode='42501'; end if;
 if p_action='speaker' then
 if exists(select 1 from jsonb_array_elements(coalesce(p_data->'social_links','[]')) z where jsonb_typeof(z)<>'object' or length(coalesce(z->>'label',''))>100 or coalesce(z->>'url','') !~ '^https://[^/@[:space:]]+(/|$)') then raise exception 'Invalid social link' using errcode='22023'; end if;
 select * into speaker_record from public.debate_speakers where id=p_id for update;
 speaker_record:=jsonb_populate_record(speaker_record,p_data-array['reason']);
 if p_id is null then insert into public.debate_speakers(slug,name,specialty,bio,photo_url,social_links,is_published) values(speaker_record.slug,speaker_record.name,coalesce(speaker_record.specialty,''),coalesce(speaker_record.bio,''),speaker_record.photo_url,coalesce(speaker_record.social_links,'[]'),coalesce(speaker_record.is_published,false)) returning id into saved;
 else update public.debate_speakers set slug=speaker_record.slug,name=speaker_record.name,specialty=speaker_record.specialty,bio=speaker_record.bio,photo_url=speaker_record.photo_url,social_links=speaker_record.social_links,is_published=speaker_record.is_published,updated_at=clock_timestamp() where id=p_id returning id into saved; end if;
 if not speaker_record.is_published then
 update public.debates set publication_status='hidden',revision=revision+1,updated_at=clock_timestamp() where publication_status in ('published','archived') and id in (select debate_id from public.debate_participants where speaker_id=saved);
 update public.works set is_published=false where debate_id in (select debate_id from public.debate_participants where speaker_id=saved);
 end if;
 elsif p_action in ('suspend','anonymize') then
 if length(btrim(coalesce(p_data->>'reason','')))<3 then raise exception 'Reason required' using errcode='22023'; end if;
 if p_action='suspend' then update public.public_profiles set suspended=(p_data->>'suspended')::boolean,suspension_reason=reason,updated_at=clock_timestamp() where user_id=p_id returning user_id into saved;
 else
 if not exists(select 1 from public.public_profiles where user_id=p_id and deletion_requested_at is not null) then raise exception 'Deletion request required' using errcode='22023'; end if;
 update public.public_profiles set display_name='حساب محذوف',avatar_url=null,show_avatar=false,suspended=true,updated_at=clock_timestamp() where user_id=p_id returning user_id into saved;
 update public.debate_comments set user_id=null where user_id=p_id;
 update public.debate_questions set user_id=null where user_id=p_id;
 delete from public.debate_votes where user_id=p_id;
 update public.debate_suggestions set user_id=null where user_id=p_id;
 end if;
 elsif p_action='moderate' then
 if length(btrim(coalesce(p_data->>'reason','')))<3 then raise exception 'Reason required' using errcode='22023'; end if;
 case p_data->>'kind'
 when 'comments' then
 if not exists(select 1 from public.debate_comments where id=p_id and updated_at=(p_data->>'updated_at')::timestamptz for update) then raise exception 'Comment changed; review it again' using errcode='40001'; end if;
 update public.debate_comments set status=p_data->>'status',updated_at=clock_timestamp() where id=p_id and status<>'deleted' and p_data->>'status' in ('approved','rejected','hidden') returning id into saved;
 when 'questions' then update public.debate_questions set status=p_data->>'status' where id=p_id returning id into saved;
 when 'suggestions' then update public.debate_suggestions set status=p_data->>'status' where id=p_id returning id into saved;
 when 'reports' then update public.debate_reports set status=p_data->>'status' where id=p_id returning id into saved;
 else raise exception 'Invalid moderation kind' using errcode='22023'; end case;
 elsif p_action='convert' then
 select to_jsonb(z) into x from public.debate_suggestions z where id=p_id for update;
 if x is null or x->>'converted_debate_id' is not null then raise exception 'Suggestion unavailable or already converted' using errcode='23505'; end if;
 insert into public.debates(slug,title,question,description,debate_type,created_by) values('debate-'||substr(gen_random_uuid()::text,1,12),x->>'title',x->>'question',x->>'explanation','prerecorded',auth.uid()) returning id into saved;
 update public.debate_suggestions set status='accepted',converted_debate_id=saved where id=p_id;
 else
 if p_action='save' and p_id is null then
 insert into public.debates(slug,title,question,debate_type,created_by) values(p_data->>'slug',p_data->>'title',p_data->>'question',p_data->>'debate_type',auth.uid()) returning * into d;
 else
 select * into d from public.debates where id=p_id for update;
 if not found then raise exception 'Debate not found' using errcode='P0002'; end if;
 if p_revision is distinct from d.revision then raise exception 'Revision conflict' using errcode='40001'; end if;
 end if;
 old_d:=d; saved:=d.id;
 select exists(select 1 from public.debate_votes where debate_id=d.id) into has_votes;
 case p_action
 when 'save' then
 if jsonb_array_length(coalesce(p_data->'participants','[]'))>20 or jsonb_array_length(coalesce(p_data->'options','[]'))>12 or jsonb_array_length(coalesce(p_data->'polls','[]'))>2 or jsonb_array_length(coalesce(p_data->'chapters','[]'))>100 or jsonb_array_length(coalesce(p_data->'axes','[]'))>20 then raise exception 'Too many items' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements_text(coalesce(p_data->'axes','[]')) a where length(btrim(a)) not between 1 and 500) then raise exception 'Invalid debate axis' using errcode='22023'; end if;
 for k in select jsonb_object_keys(p_data) loop
 if k<>all(array['slug','title','question','description','category','debate_type','publication_status','stage','scheduled_at','cover_url','live_platform','live_url','recording_url','recording_published','duration_seconds','axes','summary','summary_published','questions_open','comments_open','seo_title','seo_description','participants','options','polls','chapters','reason']) then raise exception 'Invalid debate field' using errcode='22023'; end if; end loop;
 d:=jsonb_populate_record(d,p_data-array['participants','options','polls','chapters','reason']);
 if d.slug in ('suggest','speakers') then raise exception 'Reserved debate slug' using errcode='22023'; end if;
 -- Only management can repair a previously published reserved URL, with a reason.
 if (old_d.first_published_at is not null or has_votes) and
 (d.debate_type<>old_d.debate_type or (d.slug<>old_d.slug and not (old_d.slug in ('suggest','speakers') and r='management' and length(btrim(coalesce(p_data->>'reason','')))>=3)))
 then raise exception 'Published type and URL are locked' using errcode='22023'; end if;
 if (has_votes or old_d.results<>'{}'::jsonb) and d.question<>old_d.question then raise exception 'Question is locked after voting' using errcode='22023'; end if;
 if old_d.stage='live' and d.stage not in ('live','ended','postponed','cancelled') then raise exception 'End the live broadcast first' using errcode='22023'; end if;
 if d.stage='live' and old_d.stage not in ('live','announced','upcoming','postponed') then raise exception 'Invalid live transition' using errcode='22023'; end if;
 if old_d.recording_published and not d.recording_published and r<>'management' then raise exception 'Management required to withdraw recording' using errcode='42501'; end if;
 if (has_votes or old_d.results<>'{}'::jsonb) and (p_data ? 'options') then
 if (select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'label',o.label) order by o.position,o.id),'[]') from public.debate_poll_options o where debate_id=d.id) is distinct from (select coalesce(jsonb_agg(jsonb_build_object('id',a.x->>'id','label',a.x->>'label') order by a.ord),'[]') from jsonb_array_elements(p_data->'options') with ordinality as a(x,ord)) then raise exception 'Options are locked after voting' using errcode='22023'; end if;
 elsif p_data ? 'options' then
 delete from public.debate_poll_options where debate_id=d.id;
 for x in select value from jsonb_array_elements(p_data->'options') loop insert into public.debate_poll_options(id,debate_id,label,position) values(coalesce((x->>'id')::uuid,gen_random_uuid()),d.id,x->>'label',coalesce((x->>'position')::integer,0)); end loop;
 end if;
 if p_data ? 'participants' then
 if exists(select 1 from public.debate_participants p join public.debate_questions q on q.participant_id=p.id and q.debate_id=p.debate_id
 where p.debate_id=d.id and not exists(select 1 from jsonb_array_elements(p_data->'participants') z where (z->>'speaker_id')::uuid=p.speaker_id))
 then raise exception 'Participant has audience questions' using errcode='22023'; end if;
 -- Preserve participant IDs used by questions; remove only unreferenced entries.
 delete from public.debate_participants p where debate_id=d.id and not exists(select 1 from jsonb_array_elements(p_data->'participants') z where (z->>'speaker_id')::uuid=p.speaker_id);
 for x in select value from jsonb_array_elements(p_data->'participants') loop
 insert into public.debate_participants(debate_id,speaker_id,stance,role_label,position) values(d.id,(x->>'speaker_id')::uuid,coalesce(x->>'stance',''),coalesce(x->>'role_label','مناظر'),coalesce((x->>'position')::integer,0)) on conflict(debate_id,speaker_id) do update set stance=excluded.stance,role_label=excluded.role_label,position=excluded.position; end loop;
 end if;
 if p_data ? 'polls' then
 for x in select value from jsonb_array_elements(p_data->'polls') loop
 if (has_votes or old_d.results<>'{}'::jsonb) and exists(select 1 from public.debate_polls where debate_id=d.id and phase=x->>'phase' and ((is_closed and coalesce((x->>'is_closed')::boolean,false)=false) or allow_change is distinct from coalesce((x->>'allow_change')::boolean,false) or opens_at is distinct from (x->>'opens_at')::timestamptz or closes_at is distinct from (x->>'closes_at')::timestamptz)) then
 if r<>'management' or length(btrim(coalesce(p_data->>'reason','')))<3 or old_d.results ? (x->>'phase') then raise exception 'Sensitive poll change requires management reason; published results are frozen' using errcode='42501'; end if; end if;
 insert into public.debate_polls(debate_id,phase,enabled,opens_at,closes_at,is_closed,allow_change) values(d.id,x->>'phase',coalesce((x->>'enabled')::boolean,false),(x->>'opens_at')::timestamptz,(x->>'closes_at')::timestamptz,coalesce((x->>'is_closed')::boolean,false),coalesce((x->>'allow_change')::boolean,false)) on conflict(debate_id,phase) do update set enabled=excluded.enabled,opens_at=excluded.opens_at,closes_at=excluded.closes_at,is_closed=excluded.is_closed,allow_change=excluded.allow_change;
 end loop;
 end if;
 if p_data ? 'chapters' then
 delete from public.debate_video_chapters where debate_id=d.id;
 for x in select value from jsonb_array_elements(p_data->'chapters') loop
 if d.duration_seconds is not null and (x->>'start_seconds')::int>=d.duration_seconds then raise exception 'Chapter exceeds duration' using errcode='22023'; end if;
 insert into public.debate_video_chapters(debate_id,title,start_seconds) values(d.id,x->>'title',(x->>'start_seconds')::integer); end loop; end if;
 if d.publication_status in ('published','archived') then
 if (select count(*) from public.debate_participants p join public.debate_speakers s on s.id=p.speaker_id and s.is_published where p.debate_id=d.id)<2 then raise exception 'Publish at least two approved speakers' using errcode='22023'; end if;
 if exists(select 1 from public.debate_polls where debate_id=d.id and enabled) and (select count(*) from public.debate_poll_options where debate_id=d.id)<2 then raise exception 'Poll requires at least two options' using errcode='22023'; end if;
 d.first_published_at:=coalesce(old_d.first_published_at,clock_timestamp()); end if;
 update public.debates set slug=d.slug,title=d.title,question=d.question,description=d.description,category=d.category,debate_type=d.debate_type,publication_status=d.publication_status,stage=d.stage,scheduled_at=d.scheduled_at,cover_url=d.cover_url,live_platform=d.live_platform,live_url=d.live_url,recording_url=d.recording_url,recording_published=d.recording_published,duration_seconds=d.duration_seconds,axes=d.axes,summary=d.summary,summary_published=d.summary_published,questions_open=d.questions_open,comments_open=d.comments_open,seo_title=d.seo_title,seo_description=d.seo_description,first_published_at=d.first_published_at,revision=revision+1,updated_at=clock_timestamp() where id=d.id;
 when 'results_publish' then
 if d.results ? coalesce(p_data->>'phase','after') then raise exception 'Result snapshot already published' using errcode='23505'; end if;
 result:=public.debate_result_snapshot(d.id,coalesce(p_data->>'phase','after'));
 if not (result ? coalesce(p_data->>'phase','after')) then raise exception 'No enabled poll for this phase' using errcode='22023'; end if;
 update public.debates set results=results||result,results_published=live_results_enabled,revision=revision+1,updated_at=clock_timestamp() where id=d.id;
 when 'results_visibility' then
 if length(btrim(coalesce(p_data->>'reason','')))<3 or not (p_data ? 'visible') then raise exception 'Visibility and reason required' using errcode='22023'; end if;
 update public.debates set results_published=(p_data->>'visible')::boolean,live_results_enabled=(p_data->>'visible')::boolean,revision=revision+1,updated_at=clock_timestamp() where id=d.id;
 when 'tasks' then
 if exists(select 1 from public.debate_task_links where debate_id=d.id) then raise exception 'Preparation tasks already created' using errcode='23505'; end if;
 for task_title in select unnest(array['تحديد الموضوع','التواصل مع المناظرين','إعداد الأسئلة والمحاور','تأكيد الموعد','تجهيز الغلاف',case when d.debate_type='external_live' then 'تجهيز رابط البث' else 'تجهيز رابط التسجيل' end,'مراجعة أسئلة الجمهور','نشر إعلان المناظرة',case when d.debate_type='external_live' then 'إضافة التسجيل بعد انتهاء البث' else 'مراجعة نشر التسجيل' end,'إعداد الملخص','نشر نتائج التصويت']) loop
 t:=public.task_mutate('create',null,null,jsonb_build_object('title',task_title||' — '||left(d.title,150),'description','مناظرة: '||d.title,'assigned_to',auth.uid(),'tags',jsonb_build_array('مناظرات 967'),'links',jsonb_build_array('https://967-initiative.vercel.app/admin/debates?debate='||d.id), 'project_id',(select id from public.task_projects where name='مناظرات 967' limit 1)));
 insert into public.debate_task_links values(d.id,(t->>'id')::uuid); end loop;
 when 'media' then
 if not d.recording_published or d.publication_status not in ('published','archived') then raise exception 'Publish the recording first' using errcode='22023'; end if;
 insert into public.works(slug,title,summary,category,platform,external_url,thumbnail_url,is_published,debate_id) values('debate-'||d.slug,d.title,left(d.description,1000),'مناظرات 967','فيديو',d.recording_url,d.cover_url,true,d.id) on conflict(debate_id) do update set title=excluded.title,summary=excluded.summary,external_url=excluded.external_url,thumbnail_url=excluded.thumbnail_url,is_published=true;
 when 'delete' then
 if length(btrim(coalesce(p_data->>'reason','')))<3 then raise exception 'Reason required' using errcode='22023'; end if;
 delete from public.debates where id=d.id;
 else raise exception 'Invalid action' using errcode='22023'; end case;
 -- Synchronize the optional media listing, including withdrawal and visibility.
 if p_action='save' then update public.works set title=d.title,summary=left(d.description,1000),external_url=coalesce(d.recording_url,external_url),thumbnail_url=d.cover_url,is_published=d.recording_published and d.publication_status in ('published','archived') where debate_id=d.id; end if;
 end if;
 if saved is null then raise exception 'Record not found' using errcode='P0002'; end if;
 insert into public.debate_moderation_actions(actor_id,action,target_id,reason) values(auth.uid(),p_action,saved,reason);
 return jsonb_build_object('id',saved);
end $function$;

REVOKE ALL ON FUNCTION "public"."debate_admin_mutate_base"(text, uuid, bigint, jsonb) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.debate_audience_mutate (
  p_action text,
  p_id     uuid  DEFAULT NULL::uuid,
  p_data   jsonb DEFAULT '{}'::jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare d public.debates; p public.debate_polls; current_phase text;
begin
 if p_action in ('question','vote') then
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  -- Publication uses FOR UPDATE on this same row. A stale request cannot pass
  -- this check and commit after an incompatible publication transition.
  select * into d from public.debates where id=(p_data->>'debate_id')::uuid for share;
  if not found or d.publication_status not in ('published','archived') then raise exception 'Debate unavailable' using errcode='42501'; end if;
  if p_action='question' and (d.recording_published or d.recording_first_published_at is not null) then raise exception 'Questions closed after recording publication' using errcode='P0QCL'; end if;
  if p_action='vote' then
   current_phase:=case when d.recording_published or d.recording_first_published_at is not null then 'after' else 'before' end;
   select * into p from public.debate_polls where id=p_id and debate_id=d.id for update;
   if not found then raise exception 'Poll unavailable' using errcode='P0002'; end if;
   if p.phase<>current_phase or (current_phase='after' and not d.recording_published) then raise exception 'Poll phase changed or recording unavailable' using errcode='P0VPH'; end if;
  end if;
 end if;
 return public.debate_audience_mutate_pre_lifecycle(p_action,p_id,p_data);
end $function$;

REVOKE ALL ON FUNCTION "public"."debate_audience_mutate"(text, uuid, jsonb) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.debate_audience_mutate_pre_lifecycle (
  p_action text,
  p_id     uuid  DEFAULT NULL::uuid,
  p_data   jsonb DEFAULT '{}'::jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare u uuid:=auth.uid(); d public.debates; poll public.debate_polls; c public.debate_comments; saved uuid; existing_vote public.debate_votes;
begin
 if u is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>180000 then raise exception 'Invalid request data' using errcode='22023'; end if;
 if p_action='profile' then
 if coalesce(p_data->>'accepted','false')<>'true' and not exists(select 1 from public.public_profiles where user_id=u and terms_accepted_at is not null) then raise exception 'Accept privacy policy and terms' using errcode='22023'; end if;
 insert into public.public_profiles(user_id,display_name,avatar_url,show_avatar) values(u,p_data->>'display_name',nullif(p_data->>'avatar_url',''),coalesce((p_data->>'show_avatar')::boolean,false))
 on conflict(user_id) do update set display_name=excluded.display_name,avatar_url=excluded.avatar_url,show_avatar=excluded.show_avatar,terms_accepted_at=coalesce(public.public_profiles.terms_accepted_at,excluded.terms_accepted_at),updated_at=clock_timestamp();
 return jsonb_build_object('id',u);
 elsif p_action='comment_delete' then
 -- Removing one's own content is independent of eligibility to participate.
 perform public.debate_delete_rate();
 select * into c from public.debate_comments where id=p_id for update;
 if not found or c.user_id is distinct from u or c.status='deleted' then raise exception 'Comment unavailable' using errcode='42501'; end if;
 update public.debate_comments set status='deleted',body='حُذف التعليق',updated_at=clock_timestamp() where id=p_id;
 return jsonb_build_object('id',p_id);
 elsif p_action='deletion_request' then
 -- Existing Auth accounts may have no audience profile yet. Deletion must not
 -- require consent to participate or fabricate an acceptance timestamp.
 insert into public.public_profiles(user_id,display_name,terms_accepted_at,deletion_requested_at) values(u,'حساب يطلب الحذف',null,clock_timestamp())
 on conflict(user_id) do update set deletion_requested_at=clock_timestamp(),updated_at=clock_timestamp();
 return jsonb_build_object('requested',true);
 end if;
 perform public.debate_require_user(case when p_action in ('comment','comment_edit','comment_delete') then 'comment' else p_action end);
 if p_action='suggestion' then
 insert into public.debate_suggestions(user_id,title,question,explanation,importance,stances,suggested_speakers) values(u,p_data->>'title',p_data->>'question',p_data->>'explanation',p_data->>'importance',p_data->>'stances',coalesce(p_data->>'suggested_speakers','')) returning id into saved;
 return jsonb_build_object('id',saved);
 elsif p_action='report' then
 if not exists(select 1 from public.debate_comments where id=p_id and status='approved' and public.debate_visible(debate_id)) then raise exception 'Comment unavailable' using errcode='P0002'; end if;
 insert into public.debate_reports(comment_id,user_id,reason) values(p_id,u,p_data->>'reason') returning id into saved;
 return jsonb_build_object('id',saved);
 elsif p_action in ('comment_edit','comment_delete') then
 select * into c from public.debate_comments where id=p_id for update;
 if not found or c.user_id is distinct from u or c.status='deleted' then raise exception 'Comment unavailable' using errcode='42501'; end if;
 if p_action='comment_delete' then update public.debate_comments set status='deleted',body='حُذف التعليق',updated_at=clock_timestamp() where id=p_id;
 else update public.debate_comments set body=p_data->>'body',status=status,updated_at=clock_timestamp() where id=p_id; end if;
 return jsonb_build_object('id',p_id);
 end if;
 select * into d from public.debates where id=(p_data->>'debate_id')::uuid for share;
 if not found or d.publication_status not in ('published','archived') or d.stage='cancelled' then raise exception 'Debate unavailable' using errcode='42501'; end if;
 case p_action
 when 'vote' then
 select * into poll from public.debate_polls where id=p_id and debate_id=d.id for update;
 if not found or not poll.enabled or poll.is_closed or (poll.opens_at is not null and poll.opens_at>clock_timestamp()) or (poll.closes_at is not null and poll.closes_at<=clock_timestamp()) or d.publication_status='archived' then raise exception 'Poll is closed' using errcode='22023'; end if;
 if poll.phase='after' and ((d.debate_type='external_live' and d.stage not in ('ended','recording_available')) or (d.debate_type='prerecorded' and (not d.recording_published or coalesce((p_data->>'watched_confirmed')::boolean,false)=false))) then raise exception 'Confirm you watched the published recording' using errcode='22023'; end if;
 if not exists(select 1 from public.debate_poll_options where id=(p_data->>'option_id')::uuid and debate_id=d.id) then raise exception 'Invalid option' using errcode='22023'; end if;
 select * into existing_vote from public.debate_votes where user_id=u and poll_id=p_id;
 if found and not poll.allow_change then raise exception 'Already voted' using errcode='23505'; end if;
 insert into public.debate_votes(user_id,debate_id,poll_id,option_id,watched_confirmed) values(u,d.id,p_id,(p_data->>'option_id')::uuid,coalesce((p_data->>'watched_confirmed')::boolean,false))
 on conflict(user_id,poll_id) do update set option_id=excluded.option_id,watched_confirmed=excluded.watched_confirmed,updated_at=clock_timestamp() returning id into saved;
 when 'question' then
 if not d.questions_open or d.publication_status='archived' then raise exception 'Questions closed' using errcode='22023'; end if;
 if coalesce(p_data->>'axis','')<>'' and not (p_data->>'axis'=any(d.axes)) then raise exception 'Invalid axis' using errcode='22023'; end if;
 insert into public.debate_questions(debate_id,user_id,body,participant_id,axis,anonymous,status) values(d.id,u,p_data->>'body',(p_data->>'participant_id')::uuid,coalesce(p_data->>'axis',''),coalesce((p_data->>'anonymous')::boolean,false),'approved') returning id into saved;
 when 'comment' then
 if not d.comments_open or d.publication_status='archived' then raise exception 'Comments closed' using errcode='22023'; end if;
 if p_data->>'parent_id' is not null and not exists(select 1 from public.debate_comments where id=(p_data->>'parent_id')::uuid and debate_id=d.id and status='approved' and parent_id is null) then raise exception 'Reply to a published top-level comment' using errcode='22023'; end if;
 insert into public.debate_comments(debate_id,user_id,parent_id,body,status) values(d.id,u,(p_data->>'parent_id')::uuid,p_data->>'body','approved') returning id into saved;
 else raise exception 'Invalid action' using errcode='22023';
 end case;
 return jsonb_build_object('id',saved);
end $function$;

REVOKE ALL ON FUNCTION "public"."debate_audience_mutate_pre_lifecycle"(text, uuid, jsonb) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.debate_catalog()
  RETURNS jsonb
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
 select coalesce(jsonb_agg(public.debate_public_record(d) order by d.scheduled_at desc nulls last,d.created_at desc),'[]'::jsonb)
 from public.debates d where publication_status in ('published','archived')
$function$;

CREATE OR REPLACE FUNCTION public.debate_delete_rate()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare u uuid:=auth.uid(); n integer;
begin
 if u is null then raise exception 'Sign in required' using errcode='42501'; end if;
 insert into public.debate_rate_limits as r values(u,'comment_delete',clock_timestamp(),1)
 on conflict(user_id,action) do update set hits=case when r.window_start<clock_timestamp()-interval '1 minute' then 1 else r.hits+1 end,
 window_start=case when r.window_start<clock_timestamp()-interval '1 minute' then clock_timestamp() else r.window_start end returning hits into n;
 if n>5 then raise exception 'Please wait before trying again' using errcode='P0429'; end if;
end $function$;

REVOKE ALL ON FUNCTION "public"."debate_delete_rate"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.debate_detail (
  p_slug text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare result jsonb;
begin
 result:=public.debate_detail_pre_lifecycle(p_slug);if result is null then return null; end if;
 if result->>'recording_first_published_at' is null and result->>'recording_published'<>'true' then
  result:=jsonb_set(result,'{results}',coalesce(result->'results','{}'::jsonb)-array['after','paired']);
 end if;
 return result;
end $function$;

CREATE OR REPLACE FUNCTION public.debate_detail_pre_lifecycle (
  p_slug text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare d public.debates; result jsonb;
begin
 select * into d from public.debates where slug=p_slug and publication_status in ('published','archived');
 if not found then return null; end if;
 result:=public.debate_public_record(d);
 return result||jsonb_build_object(
 'polls',coalesce((select jsonb_agg(to_jsonb(p) order by phase desc) from public.debate_polls p where debate_id=d.id),'[]'::jsonb),
 'options',coalesce((select jsonb_agg(to_jsonb(o) order by position,id) from public.debate_poll_options o where debate_id=d.id),'[]'::jsonb),
 'chapters',case when d.recording_published then coalesce((select jsonb_agg(to_jsonb(c) order by start_seconds) from public.debate_video_chapters c where debate_id=d.id),'[]'::jsonb) else '[]'::jsonb end,
 'results',case when d.results_published then d.results else '{}'::jsonb end);
end $function$;

REVOKE ALL ON FUNCTION "public"."debate_detail_pre_lifecycle"(text) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.debate_discussion (
  p_debate uuid,
  p_kind   text,
  p_page   integer DEFAULT 1,
  p_order  text    DEFAULT 'newest'::text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare items jsonb; total integer; offset_n integer:=greatest(0,least(p_page,10000)-1)*20;
begin
 if not public.debate_visible(p_debate) then return jsonb_build_object('items','[]'::jsonb,'total',0); end if;
 if p_kind='comments' then
 select count(*) into total from public.debate_comments where debate_id=p_debate and status='approved';
 select coalesce(jsonb_agg(v.row),'[]') into items from (
  select jsonb_build_object('id',c.id,'body',c.body,'parent_id',c.parent_id,'created_at',c.created_at,'updated_at',c.updated_at,'pinned',c.pinned_at is not null,'display_name',coalesce(p.display_name,'حساب محذوف'),'avatar_url',case when p.show_avatar then p.avatar_url end) row
  from public.debate_comments c left join public.public_profiles p on p.user_id=c.user_id where c.debate_id=p_debate and c.status='approved'
  order by (c.pinned_at is not null) desc,case when p_order='oldest' then c.created_at end asc,case when p_order<>'oldest' then c.created_at end desc,c.id limit 20 offset offset_n) v;
 elsif p_kind='questions' then
 select count(*) into total from public.debate_questions where debate_id=p_debate and status in ('approved','selected','answered');
 select coalesce(jsonb_agg(v.row),'[]') into items from (
  select jsonb_build_object('id',q.id,'body',q.body,'axis',q.axis,'participant_id',q.participant_id,'status',q.status,'created_at',q.created_at,'display_name',case when q.anonymous then 'مشارك' else coalesce(p.display_name,'حساب محذوف') end) row
  from public.debate_questions q left join public.public_profiles p on p.user_id=q.user_id where q.debate_id=p_debate and q.status in ('approved','selected','answered') order by q.created_at desc,q.id limit 20 offset offset_n) v;
 else raise exception 'Invalid discussion kind' using errcode='22023'; end if;
 return jsonb_build_object('items',items,'total',total,'page',greatest(1,p_page));
end $function$;

CREATE OR REPLACE FUNCTION public.debate_discussion_target (
  p_debate uuid,
  p_kind   text,
  p_id     uuid,
  p_order  text DEFAULT 'newest'::text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare position_n bigint; page_n integer; discussion jsonb; item jsonb;
begin
 if p_kind not in ('comments','questions') or p_order not in ('newest','oldest') then raise exception 'Invalid discussion target' using errcode='22023'; end if;
 if not public.debate_visible(p_debate) then return null; end if;
 if p_kind='comments' then
  select a.n into position_n from (select id,row_number() over(order by (pinned_at is not null) desc,case when p_order='oldest' then created_at end asc,case when p_order<>'oldest' then created_at end desc,id) n from public.debate_comments where debate_id=p_debate and status='approved') a where a.id=p_id;
 else
  select a.n into position_n from (select id,row_number() over(order by created_at desc,id) n from public.debate_questions where debate_id=p_debate and status in ('approved','selected','answered')) a where a.id=p_id;
 end if;
 if position_n is null then return null; end if;
 page_n:=ceil(position_n/20.0)::integer;
 if page_n>10000 then return null; end if;
 discussion:=public.debate_discussion(p_debate,p_kind,page_n,p_order);
 select value into item from jsonb_array_elements(discussion->'items') where value->>'id'=p_id::text;
 if item is null then return null; end if;
 return jsonb_build_object('item',item,'page',page_n);
end $function$;

CREATE OR REPLACE FUNCTION public.debate_live_results (
  p_debate uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare state jsonb; totals jsonb; results jsonb; visible boolean;
begin
 state:=public.debate_participation_state(p_debate);if state is null then return null; end if;
 visible:=public.debate_live_results_visible(p_debate);
 totals:=public.debate_live_results_pre_lifecycle(p_debate);results:=coalesce(totals->'results','{}'::jsonb);
 if state->>'recording_first_published_at' is null and state->>'recording_published'<>'true' then results:=results-array['after','paired']; end if;
 return jsonb_build_object('results',results,'results_visible',visible,'participation',state,'updated_at',statement_timestamp());
end $function$;

CREATE OR REPLACE FUNCTION public.debate_live_results_pre_lifecycle (
  p_debate uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare p public.debate_polls; result jsonb:='{}'; total_n bigint; distribution jsonb; paired_n bigint; changed_n bigint;
begin
 if not public.debate_live_results_visible(p_debate) then return null; end if;
 for p in select * from public.debate_polls where debate_id=p_debate and enabled order by phase loop
 select count(*) into total_n from public.debate_votes where poll_id=p.id;
 select coalesce(jsonb_agg(jsonb_build_object('option_id',o.id,'label',o.label,'count',coalesce(v.n,0),
 'percent',case when total_n=0 then 0 else round(coalesce(v.n,0)*100.0/total_n,1) end) order by o.position,o.id),'[]'::jsonb)
 into distribution from public.debate_poll_options o left join
 (select option_id,count(*) n from public.debate_votes where poll_id=p.id group by option_id) v on v.option_id=o.id where o.debate_id=p_debate;
 result:=result||jsonb_build_object(p.phase,jsonb_build_object('participants',total_n,'options',distribution,'approximate',false));
 end loop;
 if result ? 'before' and result ? 'after' then
 select count(*),count(*) filter(where a.option_id<>b.option_id) into paired_n,changed_n
 from public.debate_votes a join public.debate_polls pa on pa.id=a.poll_id and pa.phase='before'
 join public.debate_votes b on b.user_id=a.user_id and b.debate_id=a.debate_id
 join public.debate_polls pb on pb.id=b.poll_id and pb.phase='after' where a.debate_id=p_debate;
 if paired_n>0 then result:=result||jsonb_build_object('paired',jsonb_build_object('participants',paired_n,'changed_percent',round(changed_n*100.0/paired_n,1)));end if;
 end if;
 return jsonb_build_object('results',result,'updated_at',statement_timestamp());
end $function$;

REVOKE ALL ON FUNCTION "public"."debate_live_results_pre_lifecycle"(uuid) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.debate_live_results_visible (
  p_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
 select exists(select 1 from public.debates where id=p_id and publication_status in ('published','archived') and live_results_enabled)
$function$;

CREATE OR REPLACE FUNCTION public.debate_participation_state (
  p_debate uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare d public.debates;
begin
 select * into d from public.debates where id=p_debate and publication_status in ('published','archived');
 if not found then return null; end if;
 return jsonb_build_object('id',d.id,'publication_status',d.publication_status,'stage',d.stage,
  'recording_published',d.recording_published,'recording_first_published_at',d.recording_first_published_at,
  'questions_open',d.questions_open,'comments_open',d.comments_open,'updated_at',d.updated_at,
  'question',d.question,'axes',d.axes,'participants',public.debate_public_record(d)->'participants',
  'polls',coalesce((select jsonb_agg(to_jsonb(p) order by phase) from public.debate_polls p where p.debate_id=d.id),'[]'::jsonb),
  'options',coalesce((select jsonb_agg(to_jsonb(o) order by position,id) from public.debate_poll_options o where o.debate_id=d.id),'[]'::jsonb));
end $function$;

CREATE OR REPLACE FUNCTION public.debate_profile_signup()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 if new.raw_user_meta_data->>'audience_terms'='true' and length(btrim(new.raw_user_meta_data->>'display_name')) between 2 and 60 then
 insert into public.public_profiles(user_id,display_name) values(new.id,btrim(new.raw_user_meta_data->>'display_name')) on conflict do nothing;
 end if;
 return new;
end $function$;

REVOKE ALL ON FUNCTION "public"."debate_profile_signup"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.debate_public_record (
  p_debate public.debates
)
  RETURNS jsonb
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
 select (to_jsonb(p_debate)-array['created_by','revision','results','recording_url','summary','results_published','duration_seconds']) || jsonb_build_object(
 'recording_url',case when p_debate.recording_published then p_debate.recording_url end,
 'duration_seconds',case when p_debate.recording_published then p_debate.duration_seconds end,
 'summary',case when p_debate.summary_published then p_debate.summary else '{}'::jsonb end,
 'participants',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'stance',p.stance,'role_label',p.role_label,'speaker',to_jsonb(s)-'created_at'-'updated_at') order by p.position,p.id) from public.debate_participants p join public.debate_speakers s on s.id=p.speaker_id and s.is_published where p.debate_id=p_debate.id),'[]'::jsonb))
$function$;

REVOKE ALL ON FUNCTION "public"."debate_public_record"(public.debates) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.debate_recording_lifecycle_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
 if tg_op='UPDATE' and old.recording_first_published_at is not null then new.recording_first_published_at:=old.recording_first_published_at;
 elsif new.recording_published and new.publication_status in ('published','archived') then new.recording_first_published_at:=clock_timestamp();
 else new.recording_first_published_at:=null; end if;
 return new;
end $function$;

REVOKE ALL ON FUNCTION "public"."debate_recording_lifecycle_guard"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.debate_require_user (
  p_action text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 if exists(select 1 from public.public_profiles where user_id=auth.uid() and ((p_action='comment' and comments_restricted) or (p_action='question' and questions_restricted))) then raise exception 'Participation restricted' using errcode='42501'; end if;
 return public.debate_require_user_base(p_action);
end $function$;

REVOKE ALL ON FUNCTION "public"."debate_require_user"(text) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.debate_require_user_base (
  p_action text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare u uuid:=auth.uid(); n integer; lim integer;
begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null) then raise exception 'Confirm your email before participating' using errcode='42501'; end if;
 if not exists(select 1 from public.public_profiles where user_id=u and terms_accepted_at is not null and not suspended and deletion_requested_at is null) then raise exception 'Complete your profile or contact moderation' using errcode='42501'; end if;
 lim:=case p_action when 'vote' then 20 when 'suggestion' then 3 when 'report' then 6 else 5 end;
 insert into public.debate_rate_limits as r values(u,p_action,clock_timestamp(),1)
 on conflict(user_id,action) do update set hits=case when r.window_start<clock_timestamp()-interval '1 minute' then 1 else r.hits+1 end,
 window_start=case when r.window_start<clock_timestamp()-interval '1 minute' then clock_timestamp() else r.window_start end returning hits into n;
 if n>lim then raise exception 'Please wait before trying again' using errcode='P0429'; end if;
 return u;
end $function$;

REVOKE ALL ON FUNCTION "public"."debate_require_user_base"(text) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.debate_result_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 if tg_op<>'INSERT' and public.debate_live_results_visible(old.debate_id) then perform public.debate_touch_results(old.debate_id); end if;
 if tg_op='INSERT' then
 if public.debate_live_results_visible(new.debate_id) then perform public.debate_touch_results(new.debate_id); end if;
 elsif tg_op='UPDATE' and new.debate_id<>old.debate_id and public.debate_live_results_visible(new.debate_id) then perform public.debate_touch_results(new.debate_id); end if;
 return null;
end $function$;

REVOKE ALL ON FUNCTION "public"."debate_result_change"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.debate_result_debate_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin perform public.debate_touch_results(new.id);return null;end $function$;

REVOKE ALL ON FUNCTION "public"."debate_result_debate_change"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.debate_result_snapshot (
  p_id    uuid,
  p_phase text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare p public.debate_polls; total_n integer; small boolean; distribution jsonb; result jsonb:='{}'; paired integer; changed integer;
begin
 if not exists(select 1 from public.debate_polls where debate_id=p_id and phase=p_phase and enabled) then raise exception 'No enabled poll for this phase' using errcode='22023'; end if;
 if p_phase not in ('before','after') then raise exception 'Invalid result phase' using errcode='22023'; end if;
 for p in select * from public.debate_polls where debate_id=p_id and enabled and phase=p_phase order by phase loop
 if not p.is_closed and (p.closes_at is null or p.closes_at>now()) then raise exception 'Close enabled polls before publishing results' using errcode='22023'; end if;
 select count(*) into total_n from public.debate_votes where poll_id=p.id;
 select exists(select 1 from public.debate_votes where poll_id=p.id group by option_id having count(*) between 1 and 4) into small;
 if total_n<10 or small then result:=result||jsonb_build_object(p.phase,jsonb_build_object('suppressed',true));
 else
 select jsonb_agg(jsonb_build_object('option_id',o.id,'label',o.label,'percent',round((select count(*) from public.debate_votes v where v.poll_id=p.id and v.option_id=o.id)*100.0/total_n/5)*5) order by o.position,o.id) into distribution from public.debate_poll_options o where o.debate_id=p_id;
 result:=result||jsonb_build_object(p.phase,jsonb_build_object('participants',total_n/5*5,'options',distribution,'approximate',true)); end if;
 end loop;
 select count(*),count(*) filter(where a.option_id<>b.option_id) into paired,changed from public.debate_votes a join public.debate_polls pa on pa.id=a.poll_id and pa.phase='before' join public.debate_votes b on b.user_id=a.user_id and b.debate_id=a.debate_id join public.debate_polls pb on pb.id=b.poll_id and pb.phase='after' where a.debate_id=p_id;
 if p_phase='after' and (select count(*) from public.debate_polls where debate_id=p_id and enabled)=2 and not exists(select 1 from public.debate_polls where debate_id=p_id and enabled and not is_closed and (closes_at is null or closes_at>now())) and paired>=10 and (changed=0 or changed>=5) and (paired-changed=0 or paired-changed>=5) then result:=result||jsonb_build_object('paired',jsonb_build_object('participants',paired/5*5,'changed_percent',round(changed*100.0/paired/5)*5)); end if;
 return result;
end $function$;

REVOKE ALL ON FUNCTION "public"."debate_result_snapshot"(uuid, text) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.debate_result_updates_visible (
  p_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
 select exists(select 1 from public.debates where id=p_id and publication_status in ('published','archived'))
$function$;

CREATE OR REPLACE FUNCTION public.debate_role()
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
 select role from public.editors where user_id=auth.uid() and role in ('admin','management')
$function$;

REVOKE ALL ON FUNCTION "public"."debate_role"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.debate_slug_route_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 if new.slug in ('suggest','speakers') and (tg_op='INSERT' or new.slug is distinct from old.slug) then raise exception 'Reserved debate slug' using errcode='22023'; end if;
 return new;
end $function$;

REVOKE ALL ON FUNCTION "public"."debate_slug_route_guard"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.debate_speaker_public (
  p_slug text
)
  RETURNS jsonb
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
 select jsonb_build_object('speaker',to_jsonb(s),'debates',coalesce((select jsonb_agg(public.debate_public_record(d) order by d.created_at desc) from public.debates d join public.debate_participants p on p.debate_id=d.id where p.speaker_id=s.id and d.publication_status in ('published','archived')),'[]'::jsonb)) from public.debate_speakers s where s.slug=p_slug and is_published
$function$;

CREATE OR REPLACE FUNCTION public.debate_touch_results (
  p_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 insert into public.debate_result_updates as r(debate_id,version,updated_at)
 select id,1,clock_timestamp() from public.debates where id=p_id
 on conflict(debate_id) do update set version=r.version+1,updated_at=excluded.updated_at;
end $function$;

REVOKE ALL ON FUNCTION "public"."debate_touch_results"(uuid) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.debate_visible (
  p_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
 select exists(select 1 from public.debates where id=p_id and publication_status in ('published','archived'))
$function$;

REVOKE ALL ON FUNCTION "public"."debate_visible"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.debate_work_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare d public.debates;
begin
 if tg_op='UPDATE' and old.debate_id is not null and new.debate_id is distinct from old.debate_id then raise exception 'Manage linked media from its debate' using errcode='42501'; end if;
 if new.debate_id is not null then
 select * into d from public.debates where id=new.debate_id;
 if not found then raise exception 'Debate missing' using errcode='23503'; end if;
 new.title:=d.title;new.summary:=left(d.description,1000);new.external_url:=coalesce(d.recording_url,new.external_url);new.thumbnail_url:=d.cover_url;new.debate_slug:=d.slug;
 new.is_published:=d.recording_published and d.publication_status in ('published','archived');
 else new.debate_slug:=null;
 end if;
 return new;
end $function$;

REVOKE ALL ON FUNCTION "public"."debate_work_guard"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.directory_assert_writer()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 if auth.role()<>'service_role' and not exists(select 1 from public.editors e join auth.users u on u.id=e.user_id where e.user_id=auth.uid() and e.role in ('admin','management') and u.email_confirmed_at is not null and (nullif(to_jsonb(u)->>'banned_until','') is null or (to_jsonb(u)->>'banned_until')::timestamptz<=now())) then
  raise exception 'Verified editor required' using errcode='42501';
 end if;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."directory_assert_writer"() FROM PUBLIC, "anon", "authenticated", "service_role";

CREATE OR REPLACE FUNCTION public.directory_editorial_trigger()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare item jsonb; before_row jsonb; after_row jsonb; parent jsonb; parent_id uuid; kind text; section_name text; route text;
begin
 if current_setting('app967.directory_batch',true)='true' then return coalesce(new,old);end if;
 if TG_OP<>'INSERT' then before_row:=to_jsonb(old);end if;if TG_OP<>'DELETE' then after_row:=to_jsonb(new);end if;item:=coalesce(after_row,before_row);
 if TG_TABLE_NAME='universities' then kind:='university';section_name:='universities';route:='/universities/'||(item->>'slug');
  if TG_OP='UPDATE' and before_row->>'deleted_at' is null and after_row->>'deleted_at' is not null then perform public.editorial_emit(kind,section_name,item->>'id',before_row,null,route);return coalesce(new,old);end if;
  if TG_OP='UPDATE' and before_row->>'deleted_at' is not null and after_row->>'deleted_at' is null then perform public.editorial_emit(kind,section_name,item->>'id',null,after_row,route);update public.editorial_contributions set action='restore' where transaction_id=txid_current() and content_type=kind and content_id=item->>'id';return coalesce(new,old);end if;
 elsif TG_TABLE_NAME='medical_centers' then kind:='medical_center';section_name:='medicalCenters';route:='/medical-centers/'||(item->>'slug');
  if TG_OP='UPDATE' and before_row->>'deleted_at' is null and after_row->>'deleted_at' is not null then perform public.editorial_emit(kind,section_name,item->>'id',before_row,null,route);return coalesce(new,old);end if;
  if TG_OP='UPDATE' and before_row->>'deleted_at' is not null and after_row->>'deleted_at' is null then perform public.editorial_emit(kind,section_name,item->>'id',null,after_row,route);update public.editorial_contributions set action='restore' where transaction_id=txid_current() and content_type=kind and content_id=item->>'id';return coalesce(new,old);end if;
 else
  parent_id:=coalesce((item->>'university_id')::uuid,(item->>'medical_center_id')::uuid);
  if item ? 'university_id' then select to_jsonb(p) into parent from public.universities p where p.id=parent_id;kind:='university';section_name:='universities';route:='/universities/'||(parent->>'slug');
  else select to_jsonb(p) into parent from public.medical_centers p where p.id=parent_id;kind:='medical_center';section_name:='medicalCenters';route:='/medical-centers/'||(parent->>'slug');end if;
  if parent is null then return coalesce(new,old);end if;
  perform public.editorial_emit(kind,section_name,parent->>'id',parent,parent,route,array[TG_TABLE_NAME]);return coalesce(new,old);
 end if;
 perform public.editorial_emit(kind,section_name,item->>'id',before_row,after_row,route);return coalesce(new,old);
end;
$function$;

REVOKE ALL ON FUNCTION "public"."directory_editorial_trigger"() FROM PUBLIC, "anon", "authenticated", "service_role";

CREATE OR REPLACE FUNCTION public.directory_jsonb_array_equal (
  p_left  jsonb,
  p_right jsonb
)
  RETURNS boolean
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
 select jsonb_typeof(coalesce(p_left,'[]'))='array'
    and jsonb_typeof(coalesce(p_right,'[]'))='array'
    and jsonb_array_length(coalesce(p_left,'[]'))=jsonb_array_length(coalesce(p_right,'[]'))
    and coalesce(p_left,'[]') @> coalesce(p_right,'[]')
    and coalesce(p_right,'[]') @> coalesce(p_left,'[]')
$function$;

REVOKE ALL ON FUNCTION "public"."directory_jsonb_array_equal"(jsonb, jsonb) FROM PUBLIC, "anon", "authenticated", "service_role";

CREATE OR REPLACE FUNCTION public.directory_save_medical_center (
  p_id          uuid,
  p_revision    bigint,
  p_record      jsonb,
  p_specialties jsonb  DEFAULT '[]'::jsonb,
  p_services    jsonb  DEFAULT '[]'::jsonb,
  p_hours       jsonb  DEFAULT '[]'::jsonb,
  p_branches    jsonb  DEFAULT '[]'::jsonb,
  p_sources     jsonb  DEFAULT '[]'::jsonb,
  p_origin      text   DEFAULT 'admin:directory'::text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare saved public.medical_centers; original public.medical_centers; candidate public.medical_centers; before_bundle jsonb; after_bundle jsonb; approved_import_publication boolean;
begin
 perform public.directory_assert_writer();
 if jsonb_typeof(p_record)<>'object' or jsonb_typeof(p_specialties)<>'array' or jsonb_typeof(p_services)<>'array' or jsonb_typeof(p_hours)<>'array' or jsonb_typeof(p_branches)<>'array' or jsonb_typeof(p_sources)<>'array' then raise exception 'Invalid directory payload' using errcode='22023';end if;
 if exists(select 1 from jsonb_object_keys(p_record) k where k<>all(array['stable_key','official_code','slug','name_ar','name_en','institution_type','ownership','operator_name','summary','governorate','city','district','address','latitude','longitude','map_url','logo_url','website','phone','emergency_phone','email','social_links','booking_url','emergency_available','operating_status','operating_status_as_of','verification_status','verified_at','facility_presence','care_level','access_status','building_status','equipment_status','is_published'])) then raise exception 'Protected medical-center field' using errcode='42501';end if;
 perform set_config('app967.editorial_origin',case when auth.role()='service_role' then left(coalesce(p_origin,'import:institution-directory'),220) else 'admin:directory' end,true);perform set_config('app967.directory_batch','true',true);
 if p_id is null then
  if p_revision is not null then raise exception 'Invalid revision for new medical center' using errcode='22023';end if;
  approved_import_publication:=auth.role()<>'service_role' or p_origin='import:institution-directory:approved-publish:'||(p_record->>'stable_key');
  insert into public.medical_centers(stable_key,official_code,slug,name_ar,name_en,institution_type,ownership,operator_name,summary,governorate,city,district,address,latitude,longitude,map_url,logo_url,website,phone,emergency_phone,email,social_links,booking_url,emergency_available,operating_status,operating_status_as_of,verification_status,verified_at,facility_presence,care_level,access_status,building_status,equipment_status,is_published)
  select stable_key,official_code,slug,name_ar,name_en,institution_type,ownership,coalesce(operator_name,''),coalesce(summary,''),governorate,city,district,address,latitude,longitude,map_url,logo_url,website,phone,emergency_phone,email,coalesce(social_links,'[]'),booking_url,emergency_available,coalesce(operating_status,'unknown'),operating_status_as_of,coalesce(verification_status,'incomplete'),verified_at,coalesce(facility_presence,''),coalesce(care_level,''),coalesce(access_status,''),coalesce(building_status,''),coalesce(equipment_status,''),case when approved_import_publication then coalesce(is_published,false) else false end from jsonb_populate_record(null::public.medical_centers,p_record) returning * into saved;
 else
  select * into original from public.medical_centers where id=p_id for update;
  if not found or p_revision is null or original.revision<>p_revision then raise exception 'Stale medical-center revision' using errcode='40001';end if;
  if p_record->>'stable_key' is distinct from original.stable_key or p_record->>'slug' is distinct from original.slug then raise exception 'Stable medical-center identity cannot be changed' using errcode='42501';end if;
  before_bundle:=to_jsonb(original)||jsonb_build_object('specialties',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.name) from public.medical_center_specialties c where c.medical_center_id=original.id),'[]'),'services',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.name) from public.medical_center_services c where c.medical_center_id=original.id),'[]'),'hours',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.label) from public.medical_center_hours c where c.medical_center_id=original.id),'[]'),'branches',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.name) from public.medical_center_branches c where c.medical_center_id=original.id),'[]'),'sources',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.url) from public.medical_center_sources c where c.medical_center_id=original.id),'[]'));
  select * into candidate from jsonb_populate_record(original,p_record);
  if to_jsonb(original)-array['id','revision','deleted_at','created_at','updated_at']=to_jsonb(candidate)-array['id','revision','deleted_at','created_at','updated_at']
   and public.directory_jsonb_array_equal(before_bundle->'specialties',p_specialties) and public.directory_jsonb_array_equal(before_bundle->'services',p_services) and public.directory_jsonb_array_equal(before_bundle->'hours',p_hours) and public.directory_jsonb_array_equal(before_bundle->'branches',p_branches) and public.directory_jsonb_array_equal(before_bundle->'sources',p_sources) then
   perform set_config('app967.directory_batch','false',true);return to_jsonb(original);
  end if;
  update public.medical_centers m set official_code=x.official_code,name_ar=x.name_ar,name_en=x.name_en,institution_type=x.institution_type,ownership=x.ownership,operator_name=coalesce(x.operator_name,''),summary=coalesce(x.summary,''),governorate=x.governorate,city=x.city,district=x.district,address=x.address,latitude=x.latitude,longitude=x.longitude,map_url=x.map_url,logo_url=x.logo_url,website=x.website,phone=x.phone,emergency_phone=x.emergency_phone,email=x.email,social_links=coalesce(x.social_links,'[]'),booking_url=x.booking_url,emergency_available=x.emergency_available,operating_status=coalesce(x.operating_status,'unknown'),operating_status_as_of=x.operating_status_as_of,verification_status=coalesce(x.verification_status,'incomplete'),verified_at=x.verified_at,facility_presence=coalesce(x.facility_presence,''),care_level=coalesce(x.care_level,''),access_status=coalesce(x.access_status,''),building_status=coalesce(x.building_status,''),equipment_status=coalesce(x.equipment_status,''),is_published=coalesce(x.is_published,false)
  from jsonb_populate_record(null::public.medical_centers,p_record) x where m.id=p_id returning m.* into saved;
 end if;
 delete from public.medical_center_specialties where medical_center_id=saved.id;insert into public.medical_center_specialties(medical_center_id,name,source_url,display_order) select saved.id,x.name,x.source_url,coalesce(x.display_order,0) from jsonb_to_recordset(p_specialties) x(name text,source_url text,display_order int);
 delete from public.medical_center_services where medical_center_id=saved.id;insert into public.medical_center_services(medical_center_id,name,details,source_url,display_order) select saved.id,x.name,coalesce(x.details,''),x.source_url,coalesce(x.display_order,0) from jsonb_to_recordset(p_services) x(name text,details text,source_url text,display_order int);
 delete from public.medical_center_hours where medical_center_id=saved.id;insert into public.medical_center_hours(medical_center_id,label,hours_text,source_url,display_order) select saved.id,x.label,x.hours_text,x.source_url,coalesce(x.display_order,0) from jsonb_to_recordset(p_hours) x(label text,hours_text text,source_url text,display_order int);
 delete from public.medical_center_branches where medical_center_id=saved.id;insert into public.medical_center_branches(medical_center_id,name,governorate,city,district,address,latitude,longitude,map_url,phone,source_url,display_order) select saved.id,x.name,x.governorate,x.city,x.district,x.address,x.latitude,x.longitude,x.map_url,x.phone,x.source_url,coalesce(x.display_order,0) from jsonb_to_recordset(p_branches) x(name text,governorate text,city text,district text,address text,latitude numeric,longitude numeric,map_url text,phone text,source_url text,display_order int);
 delete from public.medical_center_sources where medical_center_id=saved.id;insert into public.medical_center_sources(medical_center_id,title,url,publisher,source_type,checked_at,note,document_url,source_published_at,accessed_at,status_as_of,information_verified_at,supports,conflict_note) select saved.id,x.title,x.url,coalesce(x.publisher,''),coalesce(x.source_type,'official_directory'),x.checked_at,coalesce(x.note,''),x.document_url,x.source_published_at,x.accessed_at,x.status_as_of,x.information_verified_at,coalesce(x.supports,'{}'),x.conflict_note from jsonb_to_recordset(p_sources) x(title text,url text,publisher text,source_type text,checked_at date,note text,document_url text,source_published_at text,accessed_at text,status_as_of text,information_verified_at text,supports text[],conflict_note text);
 select * into saved from public.medical_centers where id=saved.id;if saved.is_published and not exists(select 1 from public.medical_center_sources where medical_center_id=saved.id) then raise exception 'Published medical center requires a source' using errcode='23514';end if;
 after_bundle:=to_jsonb(saved)||jsonb_build_object('specialties',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.name) from public.medical_center_specialties c where c.medical_center_id=saved.id),'[]'),'services',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.name) from public.medical_center_services c where c.medical_center_id=saved.id),'[]'),'hours',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.label) from public.medical_center_hours c where c.medical_center_id=saved.id),'[]'),'branches',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.name) from public.medical_center_branches c where c.medical_center_id=saved.id),'[]'),'sources',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.url) from public.medical_center_sources c where c.medical_center_id=saved.id),'[]'));
 perform set_config('app967.directory_batch','false',true);perform public.editorial_emit('medical_center','medicalCenters',saved.id::text,before_bundle,after_bundle,'/medical-centers/'||saved.slug);return to_jsonb(saved);
end;
$function$;

REVOKE ALL ON FUNCTION "public"."directory_save_medical_center"(uuid, bigint, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.directory_save_university (
  p_id       uuid,
  p_revision bigint,
  p_record   jsonb,
  p_programs jsonb  DEFAULT '[]'::jsonb,
  p_branches jsonb  DEFAULT '[]'::jsonb,
  p_sources  jsonb  DEFAULT '[]'::jsonb,
  p_origin   text   DEFAULT 'admin:directory'::text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare saved public.universities; original public.universities; candidate public.universities; before_bundle jsonb; after_bundle jsonb; approved_import_publication boolean;
begin
 perform public.directory_assert_writer();
 if jsonb_typeof(p_record)<>'object' or jsonb_typeof(p_programs)<>'array' or jsonb_typeof(p_branches)<>'array' or jsonb_typeof(p_sources)<>'array' then raise exception 'Invalid directory payload' using errcode='22023';end if;
 if exists(select 1 from jsonb_object_keys(p_record) k where k<>all(array['stable_key','slug','name_ar','name_en','institution_type','ownership','founded_year','summary','governorate','city','district','address','latitude','longitude','map_url','logo_url','website','phone','email','social_links','admission_info','tuition_info','tuition_as_of','registration_url','languages','study_modes','education_levels','accreditation_status','accrediting_body','operating_status','verification_status','verified_at','is_published'])) then raise exception 'Protected university field' using errcode='42501';end if;
 perform set_config('app967.editorial_origin',case when auth.role()='service_role' then left(coalesce(p_origin,'import:institution-directory'),220) else 'admin:directory' end,true);
 perform set_config('app967.directory_batch','true',true);
 if p_id is null then
  if p_revision is not null then raise exception 'Invalid revision for new university' using errcode='22023';end if;
  approved_import_publication:=auth.role()<>'service_role' or p_origin='import:institution-directory:approved-publish:'||(p_record->>'stable_key');
  insert into public.universities(stable_key,slug,name_ar,name_en,institution_type,ownership,founded_year,summary,governorate,city,district,address,latitude,longitude,map_url,logo_url,website,phone,email,social_links,admission_info,tuition_info,tuition_as_of,registration_url,languages,study_modes,education_levels,accreditation_status,accrediting_body,operating_status,verification_status,verified_at,is_published)
  select stable_key,slug,name_ar,name_en,institution_type,ownership,founded_year,coalesce(summary,''),governorate,city,district,address,latitude,longitude,map_url,logo_url,website,phone,email,coalesce(social_links,'[]'),coalesce(admission_info,''),coalesce(tuition_info,''),tuition_as_of,registration_url,coalesce(languages,'{}'),coalesce(study_modes,'{}'),coalesce(education_levels,'{}'),coalesce(accreditation_status,'not_asserted'),coalesce(accrediting_body,''),coalesce(operating_status,'unknown'),coalesce(verification_status,'incomplete'),verified_at,case when approved_import_publication then coalesce(is_published,false) else false end from jsonb_populate_record(null::public.universities,p_record) returning * into saved;
 else
  select * into original from public.universities where id=p_id for update;
  if not found or p_revision is null or original.revision<>p_revision then raise exception 'Stale university revision' using errcode='40001';end if;
  if p_record->>'stable_key' is distinct from original.stable_key or p_record->>'slug' is distinct from original.slug then raise exception 'Stable university identity cannot be changed' using errcode='42501';end if;
  before_bundle:=to_jsonb(original)||jsonb_build_object(
   'programs',coalesce((select jsonb_agg(to_jsonb(c)-array['id','university_id'] order by c.display_order,c.name) from public.university_programs c where c.university_id=original.id),'[]'),
   'branches',coalesce((select jsonb_agg(to_jsonb(c)-array['id','university_id'] order by c.display_order,c.name) from public.university_branches c where c.university_id=original.id),'[]'),
   'sources',coalesce((select jsonb_agg(to_jsonb(c)-array['id','university_id'] order by c.url) from public.university_sources c where c.university_id=original.id),'[]'));
  select * into candidate from jsonb_populate_record(original,p_record);
  if to_jsonb(original)-array['id','revision','deleted_at','created_at','updated_at']=to_jsonb(candidate)-array['id','revision','deleted_at','created_at','updated_at']
   and public.directory_jsonb_array_equal(before_bundle->'programs',p_programs)
   and public.directory_jsonb_array_equal(before_bundle->'branches',p_branches)
   and public.directory_jsonb_array_equal(before_bundle->'sources',p_sources) then
   perform set_config('app967.directory_batch','false',true);return to_jsonb(original);
  end if;
  update public.universities u set name_ar=x.name_ar,name_en=x.name_en,institution_type=x.institution_type,ownership=x.ownership,founded_year=x.founded_year,summary=coalesce(x.summary,''),governorate=x.governorate,city=x.city,district=x.district,address=x.address,latitude=x.latitude,longitude=x.longitude,map_url=x.map_url,logo_url=x.logo_url,website=x.website,phone=x.phone,email=x.email,social_links=coalesce(x.social_links,'[]'),admission_info=coalesce(x.admission_info,''),tuition_info=coalesce(x.tuition_info,''),tuition_as_of=x.tuition_as_of,registration_url=x.registration_url,languages=coalesce(x.languages,'{}'),study_modes=coalesce(x.study_modes,'{}'),education_levels=coalesce(x.education_levels,'{}'),accreditation_status=coalesce(x.accreditation_status,'not_asserted'),accrediting_body=coalesce(x.accrediting_body,''),operating_status=coalesce(x.operating_status,'unknown'),verification_status=coalesce(x.verification_status,'incomplete'),verified_at=x.verified_at,is_published=coalesce(x.is_published,false)
  from jsonb_populate_record(null::public.universities,p_record) x where u.id=p_id returning u.* into saved;
 end if;
 delete from public.university_programs where university_id=saved.id;
 insert into public.university_programs(university_id,faculty,department,name,field,qualification,language,study_mode,source_url,display_order) select saved.id,coalesce(x.faculty,''),coalesce(x.department,''),x.name,coalesce(x.field,''),coalesce(x.qualification,''),coalesce(x.language,''),coalesce(x.study_mode,''),x.source_url,coalesce(x.display_order,0) from jsonb_to_recordset(p_programs) x(faculty text,department text,name text,field text,qualification text,language text,study_mode text,source_url text,display_order int);
 delete from public.university_branches where university_id=saved.id;
 insert into public.university_branches(university_id,name,governorate,city,district,address,latitude,longitude,map_url,phone,source_url,display_order) select saved.id,x.name,x.governorate,x.city,x.district,x.address,x.latitude,x.longitude,x.map_url,x.phone,x.source_url,coalesce(x.display_order,0) from jsonb_to_recordset(p_branches) x(name text,governorate text,city text,district text,address text,latitude numeric,longitude numeric,map_url text,phone text,source_url text,display_order int);
 delete from public.university_sources where university_id=saved.id;
 insert into public.university_sources(university_id,title,url,publisher,source_type,checked_at,note,document_url,source_published_at,accessed_at,status_as_of,information_verified_at,supports,conflict_note) select saved.id,x.title,x.url,coalesce(x.publisher,''),coalesce(x.source_type,'official_directory'),x.checked_at,coalesce(x.note,''),x.document_url,x.source_published_at,x.accessed_at,x.status_as_of,x.information_verified_at,coalesce(x.supports,'{}'),x.conflict_note from jsonb_to_recordset(p_sources) x(title text,url text,publisher text,source_type text,checked_at date,note text,document_url text,source_published_at text,accessed_at text,status_as_of text,information_verified_at text,supports text[],conflict_note text);
 select * into saved from public.universities where id=saved.id;
 if saved.is_published and not exists(select 1 from public.university_sources where university_id=saved.id) then raise exception 'Published university requires a source' using errcode='23514';end if;
 after_bundle:=to_jsonb(saved)||jsonb_build_object('programs',coalesce((select jsonb_agg(to_jsonb(c)-array['id','university_id'] order by c.display_order,c.name) from public.university_programs c where c.university_id=saved.id),'[]'),'branches',coalesce((select jsonb_agg(to_jsonb(c)-array['id','university_id'] order by c.display_order,c.name) from public.university_branches c where c.university_id=saved.id),'[]'),'sources',coalesce((select jsonb_agg(to_jsonb(c)-array['id','university_id'] order by c.url) from public.university_sources c where c.university_id=saved.id),'[]'));
 perform set_config('app967.directory_batch','false',true);perform public.editorial_emit('university','universities',saved.id::text,before_bundle,after_bundle,'/universities/'||saved.slug);return to_jsonb(saved);
end;
$function$;

REVOKE ALL ON FUNCTION "public"."directory_save_university"(uuid, bigint, jsonb, jsonb, jsonb, jsonb, text) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.directory_set_deleted (
  p_kind     text,
  p_id       uuid,
  p_revision bigint,
  p_deleted  boolean
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare saved jsonb;
begin
 if not exists(select 1 from public.editors e join auth.users u on u.id=e.user_id where e.user_id=auth.uid() and e.role='management' and u.email_confirmed_at is not null) then raise exception 'Management role required' using errcode='42501';end if;
 if p_kind='university' then update public.universities set deleted_at=case when p_deleted then clock_timestamp() else null end where id=p_id and revision=p_revision returning to_jsonb(universities) into saved;
 elsif p_kind='medical_center' then update public.medical_centers set deleted_at=case when p_deleted then clock_timestamp() else null end where id=p_id and revision=p_revision returning to_jsonb(medical_centers) into saved;
 else raise exception 'Unknown directory kind' using errcode='22023';end if;
 if saved is null then raise exception 'Stale directory revision' using errcode='40001';end if;
 return saved;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."directory_set_deleted"(text, uuid, bigint, boolean) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.directory_touch_revision()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
 new.revision:=old.revision+1;
 new.updated_at:=greatest(clock_timestamp(),old.updated_at+interval '1 millisecond');
 return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.editor_delete_draft (
  p_key      text,
  p_revision bigint
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare saved public.editor_drafts;actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from public.editors where user_id=actor and role in ('admin','management')) then raise exception 'Editor required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text||':'||p_key,0));
 select * into saved from public.editor_drafts where owner_id=actor and draft_key=p_key for update;
 if not found then return true;end if;
 if saved.revision is distinct from p_revision then raise exception 'Draft changed' using errcode='40001';end if;
 delete from public.editor_drafts where owner_id=actor and draft_key=p_key;
 return true;
end $function$;

REVOKE ALL ON FUNCTION "public"."editor_delete_draft"(text, bigint) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.editor_message_update (
  p_id       uuid,
  p_revision bigint,
  p_data     jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare entry public.messages; followup public.message_followups; actor uuid:=auth.uid(); role_name text; assignee uuid; linked jsonb; k text;
begin
 select role into role_name from public.editors where user_id=actor and role in ('admin','management');
 if role_name is null then raise exception 'Editor required' using errcode='42501'; end if;
 if jsonb_typeof(p_data)<>'object' then raise exception 'Invalid data' using errcode='22023'; end if;
 for k in select jsonb_object_keys(p_data) loop if k<>all(array['status','assigned_to','notes','create_task']) then raise exception 'Invalid field' using errcode='22023'; end if; end loop;
 select * into entry from public.messages where id=p_id for update;if not found then raise exception 'Message missing' using errcode='P0002'; end if;
 select * into followup from public.message_followups where message_id=p_id;
 if coalesce(followup.revision,0) is distinct from p_revision then raise exception 'Message changed' using errcode='40001'; end if;
 assignee:=case when p_data?'assigned_to' then nullif(p_data->>'assigned_to','')::uuid else followup.assigned_to end;
 if assignee is not null and not exists(select 1 from public.editors where user_id=assignee and role in ('admin','management')) then raise exception 'Invalid assignee' using errcode='22023'; end if;
 if p_data?'notes' and (jsonb_typeof(p_data->'notes')<>'string' or length(p_data->>'notes')>10000) then raise exception 'Invalid notes' using errcode='22023'; end if;
 if p_data?'status' and p_data->>'status' not in ('new','in_progress','resolved') then raise exception 'Invalid status' using errcode='22023'; end if;
 if coalesce((p_data->>'create_task')::boolean,false) and followup.task_id is null then
  linked:=public.task_mutate('create',null,null,jsonb_build_object('title',left('متابعة طلب: '||entry.type||' — '||entry.name,250),'description',left(entry.message,15000),'assigned_to',case when role_name='management' then coalesce(assignee,actor) else actor end));
  followup.task_id:=(linked->>'id')::uuid;
 end if;
 insert into public.message_followups(message_id,assigned_to,notes,task_id,updated_by)
 values(p_id,assignee,coalesce(p_data->>'notes',followup.notes,''),followup.task_id,actor)
 on conflict(message_id) do update set assigned_to=excluded.assigned_to,notes=excluded.notes,task_id=excluded.task_id,updated_by=actor,updated_at=clock_timestamp(),revision=message_followups.revision+1
 returning * into followup;
 if p_data?'status' then update public.messages set status=p_data->>'status' where id=p_id; end if;
 return to_jsonb(followup);
end $function$;

REVOKE ALL ON FUNCTION "public"."editor_message_update"(uuid, bigint, jsonb) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.editor_messages (
  p_filters jsonb DEFAULT '{}'::jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare result jsonb; n integer; page_n integer:=greatest(1,least(100000,coalesce((p_filters->>'page')::int,1))); needle text:=left(coalesce(p_filters->>'q',''),150); types jsonb; members jsonb; zone_name text:=coalesce(p_filters->>'tz','UTC');
begin
 if not exists(select 1 from public.editors where user_id=auth.uid() and role in ('admin','management')) then raise exception 'Editor required' using errcode='42501'; end if;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=zone_name) then raise exception 'Invalid timezone' using errcode='22023'; end if;
 select coalesce(jsonb_agg(distinct type),'[]') into types from public.messages;
 select coalesce(jsonb_agg(jsonb_build_object('user_id',e.user_id,'display_name',coalesce(nullif(u.raw_user_meta_data->>'full_name',''),'محرر'))),'[]') into members from public.editors e join auth.users u on u.id=e.user_id where e.role in ('admin','management');
 with filtered as (
 select m.*,f.assigned_to,f.notes as internal_notes,f.task_id,coalesce(f.revision,0) as followup_revision
 from public.messages m left join public.message_followups f on f.message_id=m.id
 where (needle='' or position(lower(needle) in lower(m.name||' '||m.email||' '||m.message))>0)
 and (coalesce(p_filters->>'status','') in ('','all') or m.status=p_filters->>'status')
 and (coalesce(p_filters->>'type','') in ('','all') or m.type=p_filters->>'type')
 and (coalesce(p_filters->>'assignee','') in ('','all') or f.assigned_to::text=p_filters->>'assignee')
 and (coalesce(p_filters->>'from','')='' or m.created_at>=((p_filters->>'from')::date::timestamp at time zone zone_name))
 and (coalesce(p_filters->>'to','')='' or m.created_at<(((p_filters->>'to')::date+interval '1 day') at time zone zone_name))
 ), numbered as (select *,count(*) over() as full_count from filtered)
 select coalesce(jsonb_agg(to_jsonb(row)-'full_count'),'[]'),coalesce(max(full_count),0) into result,n
 from (select * from numbered order by created_at desc,id desc offset (page_n-1)*20 limit 20) row;
 return jsonb_build_object('messages',result,'total',n,'page',page_n,'pages',greatest(1,ceil(n/20.0)),'types',types,'members',members);
end $function$;

REVOKE ALL ON FUNCTION "public"."editor_messages"(jsonb) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.editor_save_draft (
  p_kind     text,
  p_key      text,
  p_value    jsonb,
  p_revision bigint DEFAULT NULL::bigint
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare saved public.editor_drafts; actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from public.editors where user_id=actor and role in ('admin','management')) then raise exception 'Editor required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text||':'||p_key,0));
 select * into saved from public.editor_drafts where owner_id=actor and draft_key=p_key for update;
 if (saved.owner_id is null and p_revision is not null) or (saved.owner_id is not null and saved.revision is distinct from p_revision) then raise exception 'Draft changed' using errcode='40001'; end if;
 insert into public.editor_drafts(owner_id,draft_key,kind,value) values(actor,p_key,p_kind,p_value)
 on conflict(owner_id,draft_key) do update set kind=excluded.kind,value=excluded.value,revision=editor_drafts.revision+1,updated_at=clock_timestamp()
 returning * into saved;
 return to_jsonb(saved)-'owner_id';
end $function$;

REVOKE ALL ON FUNCTION "public"."editor_save_draft"(text, text, jsonb, bigint) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.editorial_can_read()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
 select exists(select 1 from public.editors e join auth.users u on u.id=e.user_id where e.user_id=auth.uid() and e.role in ('admin','management') and u.email_confirmed_at is not null and (nullif(to_jsonb(u)->>'banned_until','') is null or (to_jsonb(u)->>'banned_until')::timestamptz<=now()));
$function$;

CREATE OR REPLACE FUNCTION public.editorial_content_trigger()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare b jsonb; a jsonb; item jsonb; kind text; sec text; route text; target text; oldpage jsonb; newpage jsonb; pageid text; parent jsonb; before_pages jsonb; extras text[]:='{}';
begin
 if TG_OP<>'INSERT' then b:=to_jsonb(old); end if; if TG_OP<>'DELETE' then a:=to_jsonb(new); end if; item:=coalesce(a,b); target:=item->>'id';
 case TG_TABLE_NAME
 when 'issues' then kind:='issue';sec:='magazine';route:='/magazine/'||(item->>'slug');
 when 'works' then kind:='work';sec:='works';route:=case when nullif(item->>'debate_slug','') is not null then '/debates/'||(item->>'debate_slug') else '/works/'||(item->>'slug') end;
 when 'yemeni_companies' then kind:='company';sec:='products';route:='/yemeni-products/'||(item->>'slug');
 when 'professionals' then kind:='professional';sec:='professionals';route:='/professionals/'||(item->>'slug');
 when 'yemeni_figures' then kind:='figure';sec:='figures';route:='/yemen-map/figures/'||(item->>'slug'); if current_setting('app967.editorial_profile_changed',true)='true' then extras:=array['profile']; end if;
 when 'governorates','districts' then kind:=case TG_TABLE_NAME when 'governorates' then 'governorate' else 'district' end;sec:='atlas';route:='/yemen-map?'||case kind when 'district' then 'district=' else 'region=' end||target;
 when 'debates' then kind:='debate';sec:='debates';route:='/debates/'||(item->>'slug');
 when 'debate_speakers' then kind:='speaker';sec:='debates';route:='/debates/speakers/'||(item->>'slug');
 when 'debate_participants','debate_polls','debate_poll_options','debate_video_chapters' then
  if current_setting('app967.editorial_debate_batch',true)='true' then return coalesce(new,old);end if;
  select to_jsonb(d) into parent from public.debates d where d.id=(item->>'debate_id')::uuid;
  if parent is null then return coalesce(new,old); end if;
  if b is not distinct from a then return coalesce(new,old); end if;
  perform public.editorial_emit('debate','debates',parent->>'id',parent,parent,'/debates/'||(parent->>'slug'),array[TG_TABLE_NAME]);return coalesce(new,old);
 when 'stat_sections','stat_domains','stat_sources' then kind:=case TG_TABLE_NAME when 'stat_sections' then 'statistic_section' when 'stat_domains' then 'statistic_domain' else 'statistic_source' end;sec:='statistics';route:='/yemen-in-numbers'||case when TG_TABLE_NAME='stat_domains' then '/'||(item->>'slug') else '' end;
 when 'stat_indicators' then kind:='statistic';sec:='statistics';route:='/yemen-in-numbers/indicator/'||(item->>'slug');
 when 'stat_values' then
  select to_jsonb(i) into parent from public.stat_indicators i where i.id=(item->>'indicator_id')::uuid;
  if parent is null then
   if TG_OP='DELETE' then
    select jsonb_build_object('title',c.title) into parent from public.editorial_contributions c where content_type='statistic_value' and content_id=target order by created_at desc,id desc limit 1;
    b:=b||jsonb_build_object('title',coalesce(parent->>'title','قيمة إحصائية — '||(item->>'year')));
    perform public.editorial_emit('statistic_value','statistics',target,b,null,null);
   end if;
   return coalesce(new,old);
  end if;
  kind:='statistic_value';sec:='statistics';route:='/yemen-in-numbers/indicator/'||(parent->>'slug');
  if a is not null then a:=a||jsonb_build_object('title',(parent->>'name')||' — '||(item->>'year')); end if;
  if b is not null then b:=b||jsonb_build_object('title',(parent->>'name')||' — '||(item->>'year')); end if;
 when 'stat_indicator_sources' then
  select to_jsonb(i) into parent from public.stat_indicators i where i.id=(item->>'indicator_id')::uuid;
  if parent is null or b is not distinct from a then return coalesce(new,old); end if;
  perform public.editorial_emit('statistic','statistics',parent->>'id',parent,parent,'/yemen-in-numbers/indicator/'||(parent->>'slug'),array['sources']);return coalesce(new,old);
 when 'ranking_indicators','ranking_snapshots' then
  kind:='ranking';sec:='rankings';route:='/yemen-ranking?indicator='||(item->>'slug');
  if TG_TABLE_NAME='ranking_snapshots' then
   select to_jsonb(i) into parent from public.ranking_indicators i where i.id=(item->>'indicator_id')::uuid;
   if parent is null or (b-array['updated_at']) is not distinct from (a-array['updated_at']) then return coalesce(new,old); end if;
   perform public.editorial_emit(kind,sec,parent->>'id',parent,parent,'/yemen-ranking?indicator='||(parent->>'slug'),array['dataset']);return coalesce(new,old);
  end if;
 when 'site_settings' then
  target:=item->>'key';
  if target='public_content_pages_v1' then
   before_pages:=b->'value'->'pages';
   if before_pages is null then
    before_pages:=nullif(current_setting('app967.editorial_page_baseline',true),'')::jsonb;
    if jsonb_typeof(before_pages) is distinct from 'array' then raise exception 'First catalog write requires the verified existing public page baseline' using errcode='42501';end if;
   end if;
   for pageid in select distinct v->>'id' from (select jsonb_array_elements(before_pages) v union all select jsonb_array_elements(coalesce(a->'value'->'pages','[]'))) s loop
    select v into oldpage from jsonb_array_elements(before_pages) v where v->>'id'=pageid;
    select v into newpage from jsonb_array_elements(coalesce(a->'value'->'pages','[]')) v where v->>'id'=pageid;
    perform public.editorial_emit('page','pages',pageid,oldpage,newpage,case when coalesce(newpage,oldpage)->>'slug' in ('about','help','privacy','terms','privacy-requests') then '/'||(coalesce(newpage,oldpage)->>'slug') else '/pages/'||(coalesce(newpage,oldpage)->>'slug') end);
   end loop; return coalesce(new,old);
  elsif target like 'public_district_profile_v1_%' then
   target:=substr(target,length('public_district_profile_v1_')+1); kind:='district';sec:='atlas';route:='/yemen-map?district='||target;
   a:=a->'value'->'profile'; b:=coalesce(b->'value'->'profile','{}');
   if a is not null then a:=a||jsonb_build_object('title',coalesce(a->>'name',(select name_ar from public.districts where id=target),target)); end if;
   b:=b||jsonb_build_object('title',coalesce(b->>'name',(select name_ar from public.districts where id=target),target));
  elsif target in ('site_content','home_marquee_items','public_page_visibility_v1') then
   kind:='setting';sec:='settings';route:=case target when 'site_content' then '/about' else '/' end;
   a:=case when a is not null then jsonb_build_object('title',target,'content',a->'value') end; b:=case when b is not null then jsonb_build_object('title',target,'content',b->'value') end;
  else return coalesce(new,old); end if;
 else raise exception 'Unmapped editorial table %',TG_TABLE_NAME;
 end case;
 perform public.editorial_emit(kind,sec,target,b,a,route,extras);return coalesce(new,old);
end;
$function$;

REVOKE ALL ON FUNCTION "public"."editorial_content_trigger"() FROM PUBLIC, "anon", "authenticated", "service_role";

CREATE OR REPLACE FUNCTION public.editorial_current_path (
  p_type  text,
  p_id    text,
  p_known text
)
  RETURNS text
  LANGUAGE plpgsql
  STABLE
  SET search_path TO ''
  AS $function$
declare path text;
begin
 if not public.editorial_can_read() then raise exception 'Editor required' using errcode='42501';end if;
 if p_type='statistic_value' then select '/yemen-in-numbers/indicator/'||i.slug into path from public.stat_values v join public.stat_indicators i on i.id=v.indicator_id where v.id=p_id::uuid;return path;end if;return p_known;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."editorial_current_path"(text, text, text) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.editorial_debate_children (
  p_id uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare t text; result jsonb:='{}'; items jsonb;
begin
 foreach t in array array['debate_participants','debate_polls','debate_poll_options','debate_video_chapters'] loop
  execute format('select coalesce(jsonb_agg(v order by v::text),''[]'') from (select to_jsonb(r)-array[''id'',''created_at'',''updated_at'',''revision''] v from public.%I r where debate_id=$1) s',t) into items using p_id;
  result:=result||jsonb_build_object(t,items);
 end loop;return result;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."editorial_debate_children"(uuid) FROM PUBLIC, "anon", "authenticated", "service_role";

CREATE OR REPLACE FUNCTION public.editorial_debate_mutate_legacy (
  p_action   text,
  p_id       uuid   DEFAULT NULL::uuid,
  p_revision bigint DEFAULT NULL::bigint,
  p_data     jsonb  DEFAULT '{}'::jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare r text:=public.debate_role(); old_value jsonb; new_value jsonb; x jsonb; result jsonb; saved uuid; audit_id uuid; k text:=p_data->>'kind'; wanted text:=p_data->>'status'; started timestamptz:=clock_timestamp(); reason text:=coalesce(p_data->>'reason','تحديث تحريري');
begin
 if r is null then raise exception 'Editor required' using errcode='42501'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>180000 then raise exception 'Invalid data' using errcode='22023'; end if;
 if p_action='moderate' and k in ('comments','questions','reports') then
  if length(btrim(reason)) not between 3 and 1000 then raise exception 'Reason required' using errcode='22023'; end if;
  if k='comments' then perform 1 from public.debate_comments where id=p_id for update;
  elsif k='questions' then perform 1 from public.debate_questions where id=p_id for update;
  else perform 1 from public.debate_reports where id=p_id for update; end if;
  old_value:=public.inline_item(k,p_id);
  if (p_data->>'updated_at')::timestamptz is distinct from (old_value->>'updated_at')::timestamptz then raise exception 'Item changed; review again' using errcode='40001'; end if;
  if wanted is null or not (old_value->'capabilities'->'statuses' ? wanted) then raise exception 'Invalid moderation transition' using errcode='22023'; end if;
  if k='comments' then update public.debate_comments set status=wanted,hidden_from_status=case when wanted='hidden' then status else hidden_from_status end,pinned_at=case when wanted='approved' then pinned_at end,updated_at=clock_timestamp() where id=p_id;
  elsif k='questions' then update public.debate_questions set status=wanted,hidden_from_status=case when wanted='hidden' then status else hidden_from_status end,updated_at=clock_timestamp() where id=p_id;
  else update public.debate_reports set status=wanted,updated_at=clock_timestamp() where id=p_id; end if;
  new_value:=public.inline_item(k,p_id);
  insert into public.debate_moderation_actions(actor_id,action,target_id,target_kind,reason,before_value,after_value) values(auth.uid(),'moderate',p_id,k,reason,old_value-array['body','display_name','comment_body','capabilities'],new_value-array['body','display_name','comment_body','capabilities']) returning id into audit_id;
  return jsonb_build_object('id',p_id,'item',new_value,'undo_id',case when wanted='hidden' then audit_id end);
 end if;
 if p_action in ('save','results_visibility','results_publish','delete','media','tasks') and p_id is not null then select to_jsonb(d)-array['results','created_by'] into old_value from public.debates d where id=p_id; k:='debates';
 elsif p_action='suspend' then select jsonb_build_object('suspended',p.suspended,'updated_at',p.updated_at) into old_value from public.public_profiles p where user_id=p_id; k:='account'; end if;
 result:=public.debate_admin_mutate_base(p_action,p_id,p_revision,p_data); saved:=(result->>'id')::uuid;
 if k='debates' then select to_jsonb(d)-array['results','created_by'] into new_value from public.debates d where id=saved;
 elsif k='account' then select jsonb_build_object('suspended',p.suspended,'updated_at',p.updated_at) into new_value from public.public_profiles p where user_id=saved; end if;
 -- Enrich the existing log entry instead of creating a duplicate history.
 update public.debate_moderation_actions set target_kind=coalesce(k,case when p_action='speaker' then 'speakers' when p_action='convert' then 'suggestions' else 'debates' end),before_value=old_value,after_value=new_value where id=(select id from public.debate_moderation_actions where actor_id=auth.uid() and target_id=saved and action=p_action and created_at>=started order by created_at desc limit 1);
 return result;
end $function$;

REVOKE ALL ON FUNCTION "public"."editorial_debate_mutate_legacy"(text, uuid, bigint, jsonb) FROM PUBLIC, "anon", "authenticated", "service_role";

CREATE OR REPLACE FUNCTION public.editorial_emit (
  p_type    text,
  p_section text,
  p_id      text,
  p_before  jsonb,
  p_after   jsonb,
  p_path    text,
  p_fields  text[] DEFAULT NULL::text[]
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare a uuid; r text; n text; oldv jsonb:=coalesce(p_before,'{}'); newv jsonb:=coalesce(p_after,'{}'); item jsonb:=coalesce(p_after,p_before); fields text[]; act text; oldpub boolean; pub boolean; origin text;
begin
 if p_id is null then return; end if;
 oldv:=oldv-array['updated_at','created_at','updatedAt','revision','first_published_at']; newv:=newv-array['updated_at','created_at','updatedAt','revision','first_published_at'];
 if p_before is not null and p_after is not null and oldv=newv and coalesce(cardinality(p_fields),0)=0 then return; end if;
 select array_agg(k order by k) into fields from (select key k from jsonb_object_keys(oldv||newv) key where oldv->key is distinct from newv->key) s;
 fields:=array(select distinct f from unnest(coalesce(fields,'{}')||coalesce(p_fields,'{}')) f order by f);
 a:=auth.uid();
 if a is null then a:=nullif(current_setting('app967.editorial_actor',true),'')::uuid; end if;
 select e.role,coalesce(nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'display_name',''),'عضو فريق') into r,n from public.editors e join auth.users u on u.id=e.user_id where e.user_id=a and e.role in ('admin','management');
 if r is null then a:=null; n:='النظام — دون إسناد لمحرر'; end if;
 origin:=coalesce(nullif(current_setting('app967.editorial_origin',true),''),case when a is null then 'database:system' else 'database:authenticated' end);
 oldpub:=case when oldv ? 'publication_status' then oldv->>'publication_status' in ('published','archived') else coalesce((oldv->>'is_published')::boolean,(oldv->>'isPublished')::boolean) end;
 pub:=case when newv ? 'publication_status' then newv->>'publication_status' in ('published','archived') else coalesce((newv->>'is_published')::boolean,(newv->>'isPublished')::boolean) end;
 act:=case when p_before is null then 'create' when p_after is null then 'delete' when oldpub is false and pub is true then 'publish' when oldpub is true and pub is false then 'unpublish' when current_setting('app967.editorial_intent',true)='correction' then 'correction' else 'update' end;
 insert into public.editorial_contributions(actor_id,actor_name,actor_role,action,content_type,section,content_id,title,slug,path,is_published,changed_fields,origin)
 values(a,n,r,act,p_type,p_section,p_id,left(coalesce(nullif(item->>'title',''),nullif(item->>'full_name',''),nullif(item->>'name',''),nullif(item->>'name_ar',''),p_id),300),item->>'slug',p_path,case when p_after is null then null else pub end,fields,origin)
 on conflict(transaction_id,content_type,content_id) do update set
 actor_id=coalesce(excluded.actor_id,editorial_contributions.actor_id),actor_name=case when excluded.actor_id is null then editorial_contributions.actor_name else excluded.actor_name end,actor_role=coalesce(excluded.actor_role,editorial_contributions.actor_role),
 action=case when excluded.action='delete' then 'delete' when editorial_contributions.action='create' then 'create' when excluded.action in ('publish','unpublish') then excluded.action else editorial_contributions.action end,
 title=excluded.title,slug=excluded.slug,path=excluded.path,is_published=excluded.is_published,
 changed_fields=array(select distinct f from unnest(editorial_contributions.changed_fields||excluded.changed_fields) f order by f);
end;
$function$;

REVOKE ALL ON FUNCTION "public"."editorial_emit"(text, text, text, jsonb, jsonb, text, text[]) FROM PUBLIC, "anon", "authenticated", "service_role";

CREATE OR REPLACE FUNCTION public.editorial_inline_bridge()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 update public.editorial_contributions c set actor_id=new.actor_id,actor_name=coalesce(nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'display_name',''),'عضو فريق'),actor_role=e.role,
 origin=case when new.kind in ('figure','page') then 'service:inline_content' else coalesce(nullif(current_setting('app967.editorial_origin',true),''),c.origin) end,
 action=case when new.action='undo' then 'restore' else c.action end
 from public.editors e join auth.users u on u.id=e.user_id where c.transaction_id=txid_current() and c.content_type=new.kind and c.content_id=new.target_id and e.user_id=new.actor_id;
 return new;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."editorial_inline_bridge"() FROM PUBLIC, "anon", "authenticated", "service_role";

CREATE OR REPLACE FUNCTION public.editorial_inline_correction (
  p_kind     text,
  p_id       text,
  p_revision bigint,
  p_data     jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare saved jsonb;
begin
 if not public.editorial_can_read() then raise exception 'Editor required' using errcode='42501';end if;
 perform set_config('app967.editorial_intent','correction',true);perform set_config('app967.editorial_origin','rpc:inline_correction',true);
 saved:=public.inline_content_save(p_kind,p_id,p_revision,p_data);
 perform set_config('app967.editorial_intent','',true);perform set_config('app967.editorial_origin','',true);return saved;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."editorial_inline_correction"(text, text, bigint, jsonb) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.editorial_publication (
  p_type  text,
  p_id    text,
  p_known boolean
)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SET search_path TO ''
  AS $function$
begin
 if not public.editorial_can_read() then raise exception 'Editor required' using errcode='42501';end if;
 if p_type='statistic_value' then return exists(select 1 from public.stat_values v join public.stat_indicators i on i.id=v.indicator_id join public.stat_domains d on d.id=i.domain_id join public.stat_sections s on s.id=d.section_id join public.stat_sources source on source.id=v.source_id where v.id=p_id::uuid and v.is_published and v.national_scope and i.is_published and d.is_published and s.is_published and source.is_active and(not i.hide_when_incomplete or i.data_status='complete'));
 elsif p_type='statistic' then return exists(select 1 from public.stat_indicators i join public.stat_domains d on d.id=i.domain_id join public.stat_sections s on s.id=d.section_id where i.id=p_id::uuid and i.is_published and d.is_published and s.is_published and(not i.hide_when_incomplete or i.data_status='complete'));
 elsif p_type='statistic_domain' then return exists(select 1 from public.stat_domains d join public.stat_sections s on s.id=d.section_id where d.id=p_id::uuid and d.is_published and s.is_published);
 end if;return p_known;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."editorial_publication"(text, text, boolean) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.editorial_report (
  p_filters jsonb DEFAULT '{}'::jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare result jsonb; start_at timestamptz; end_at timestamptz; member uuid; section_filter text; action_filter text; query text; page_no int; content_page int; sort_by text;
begin
 if not public.editorial_can_read() then raise exception 'Editorial statistics are restricted to editors' using errcode='42501';end if;
 start_at:=nullif(p_filters->>'from','')::timestamptz;end_at:=nullif(p_filters->>'to','')::timestamptz;
 member:=nullif(p_filters->>'member','')::uuid;section_filter:=nullif(p_filters->>'section','');action_filter:=nullif(p_filters->>'action','');query:=left(coalesce(p_filters->>'q',''),200);
 page_no:=greatest(1,least(100000,coalesce((p_filters->>'page')::int,1)));sort_by:=coalesce(p_filters->>'sort','newest');
 content_page:=greatest(1,least(100000,coalesce((p_filters->>'contentPage')::int,1)));
 if start_at>end_at then raise exception 'Invalid date interval' using errcode='22023';end if;
 with filtered as materialized (
 select c.* from public.editorial_contributions c where c.actor_id is not null and (start_at is null or c.created_at>=start_at) and (end_at is null or c.created_at<end_at) and (member is null or c.actor_id=member) and (section_filter is null or c.section=section_filter) and (action_filter is null or c.action=action_filter) and (query='' or strpos(lower(c.title||' '||c.actor_name||' '||c.content_id),lower(query))>0)
 ), activity as (
 select f.*,public.editorial_current_path(f.content_type,f.content_id,latest.path) current_path,latest.action='delete' deleted,public.editorial_publication(f.content_type,f.content_id,latest.is_published) current_published from filtered f
 cross join lateral (select c.path,c.action,c.is_published from public.editorial_contributions c where c.content_type=f.content_type and c.content_id=f.content_id order by c.created_at desc,c.id desc limit 1) latest
 order by case when sort_by='oldest' then f.created_at end asc,case when sort_by='title' then f.title end asc,case when sort_by='member' then f.actor_name end asc,f.created_at desc,f.id desc limit 40 offset (page_no-1)*40
 ), sections as (select section,count(*) operations,count(distinct(content_type,content_id)) unique_content from filtered group by section),
 daily as (select (created_at at time zone 'Asia/Aden')::date as "day",count(*) operations from filtered group by 1),
 members as (select actor_id id,max(actor_name) name,count(*) operations,count(distinct(content_type,content_id)) unique_content,count(*) filter(where action='create') creates,count(*) filter(where action in ('update','correction')) updates,count(*) filter(where action='publish') publishes,max(created_at) last_activity from filtered group by actor_id),
 content as (select distinct on(content_type,content_id) content_type,content_id,title,path,is_published,action,created_at from filtered order by content_type,content_id,created_at desc,id desc)
 select jsonb_build_object(
 'activatedAt',(select activated_at from public.editorial_audit_activation),
 'summary',(select jsonb_build_object('operations',count(*),'uniqueContent',count(distinct(content_type,content_id)),'members',count(distinct actor_id),'creates',count(*) filter(where action='create'),'publishedCreates',count(*) filter(where action='create' and is_published is true),'updates',count(*) filter(where action in ('update','correction')),'publishes',count(*) filter(where action='publish'),'unpublishes',count(*) filter(where action='unpublish'),'deletes',count(*) filter(where action='delete'),'restores',count(*) filter(where action='restore')) from filtered),
 'sections',coalesce((select jsonb_agg(s order by section) from sections s),'[]'),
 'daily',coalesce((select jsonb_agg(d order by "day") from daily d),'[]'),
 'members',coalesce((select jsonb_agg(m order by name,id) from members m),'[]'),
 'memberOptions',coalesce((select jsonb_agg(m order by name,id) from (select user_id id,display_name name from public.task_team() union all select distinct on(actor_id) actor_id id,actor_name name from public.editorial_contributions where actor_id is not null and actor_id not in(select user_id from public.task_team()) order by id)m),'[]'),
 'activity',coalesce((select jsonb_agg(a) from activity a),'[]'),
 'content',coalesce((select jsonb_agg(c) from (select f.*,public.editorial_current_path(f.content_type,f.content_id,latest.path) current_path,latest.action='delete' deleted,public.editorial_publication(f.content_type,f.content_id,latest.is_published) current_published from content f cross join lateral(select c.path,c.action,c.is_published from public.editorial_contributions c where c.content_type=f.content_type and c.content_id=f.content_id order by created_at desc,id desc limit 1) latest order by f.created_at desc,f.content_id limit 40 offset (content_page-1)*40)c),'[]'),
 'contentPage',content_page,'page',page_no,'pageSize',40) into result;
 return result;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."editorial_report"(jsonb) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.editorial_service_save (
  p_kind            text,
  p_id              text,
  p_revision        timestamp with time zone,
  p_data            jsonb,
  p_actor           uuid,
  p_action          text                     DEFAULT 'update'::text,
  p_profile_changed boolean                  DEFAULT false,
  p_page_baseline   jsonb                    DEFAULT NULL::jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare saved jsonb; oldrow jsonb; stamp timestamptz;
begin
 if not exists(select 1 from public.editors e join auth.users u on u.id=e.user_id where e.user_id=p_actor and e.role in ('admin','management') and u.email_confirmed_at is not null and (nullif(to_jsonb(u)->>'banned_until','') is null or (to_jsonb(u)->>'banned_until')::timestamptz<=now())) then raise exception 'Verified editor required' using errcode='42501';end if;
 perform set_config('app967.editorial_actor',p_actor::text,true); perform set_config('app967.editorial_origin','service:'||p_kind,true);
 if p_kind in ('figure','page') then
  perform set_config('app967.editorial_profile_changed',p_profile_changed::text,true);
  if p_kind='page' then
   if p_page_baseline is not null and (jsonb_typeof(p_page_baseline)<>'array' or octet_length(p_page_baseline::text)>700000) then raise exception 'Invalid public page baseline' using errcode='22023';end if;
   perform set_config('app967.editorial_page_baseline',coalesce(p_page_baseline::text,''),true);
  end if;
  saved:=public.inline_service_save(p_kind,p_id,p_revision,p_data,p_actor,p_action);
 elsif p_kind='setting' then
  if not(p_id in ('public_page_visibility_v1') or p_id ~ '^public_district_profile_v1_YE[0-9]{4}$') or p_action<>'update' or jsonb_typeof(p_data)<>'object' then raise exception 'Invalid content setting' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id,0));
  select to_jsonb(s) into oldrow from public.site_settings s where key=p_id for update;
  if (oldrow->>'updated_at')::timestamptz is distinct from p_revision then raise exception 'Stale setting revision' using errcode='40001';end if;
  stamp:=greatest(clock_timestamp(),coalesce(p_revision,'epoch')+interval '1 millisecond');
  insert into public.site_settings(key,value,updated_at) values(p_id,p_data,stamp) on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at returning to_jsonb(site_settings) into saved;
  saved:=jsonb_build_object('record',saved);
 elsif p_kind='ranking' then
  if p_id is not null then
   select to_jsonb(i) into oldrow from public.ranking_indicators i where id=p_id::uuid for update;
   if oldrow is null or p_revision is null or (oldrow->>'updated_at')::timestamptz is distinct from p_revision then raise exception 'Stale ranking revision' using errcode='40001';end if;
  elsif p_revision is not null then raise exception 'Invalid new ranking revision' using errcode='22023';end if;
  if p_action='snapshot' then
   if oldrow is null or p_data->'payload'->>'indicatorCode' is distinct from oldrow->>'code' then raise exception 'Ranking code changed' using errcode='40001';end if;
   insert into public.ranking_snapshots(indicator_id,payload,summary) values(p_id::uuid,p_data->'payload',p_data->'summary') on conflict(indicator_id) do update set payload=excluded.payload,summary=excluded.summary returning to_jsonb(ranking_snapshots) into saved;
  elsif p_action='update' then
   if exists(select 1 from jsonb_object_keys(p_data) k where k<>all(array['slug','name','category','unit','code','direction','better','description','display_order','is_published'])) then raise exception 'Protected ranking field' using errcode='42501';end if;
   if p_id is null then
    insert into public.ranking_indicators(slug,name,category,unit,code,direction,better,description,display_order,is_published) select x.slug,x.name,x.category,x.unit,x.code,x.direction,x.better,x.description,x.display_order,x.is_published from jsonb_populate_record(null::public.ranking_indicators,p_data) x returning to_jsonb(ranking_indicators) into saved;
   else update public.ranking_indicators set slug=p_data->>'slug',name=p_data->>'name',category=p_data->>'category',unit=p_data->>'unit',code=p_data->>'code',direction=p_data->>'direction',better=p_data->>'better',description=p_data->>'description',display_order=(p_data->>'display_order')::int,is_published=(p_data->>'is_published')::boolean where id=p_id::uuid returning to_jsonb(ranking_indicators) into saved;end if;
  else raise exception 'Invalid ranking action' using errcode='22023';end if;
  saved:=jsonb_build_object('record',saved);
 else raise exception 'Invalid editorial service kind' using errcode='22023';end if;
 perform set_config('app967.editorial_actor','',true);perform set_config('app967.editorial_origin','',true);perform set_config('app967.editorial_profile_changed','false',true);perform set_config('app967.editorial_page_baseline','',true);
 return saved;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."editorial_service_save"(text, text, timestamp WITH time zone, jsonb, uuid, text, boolean, jsonb) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.editorial_statistic_save (
  p_id         uuid,
  p_revision   timestamp with time zone,
  p_data       jsonb,
  p_source_ids uuid[]
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare original public.stat_indicators; item public.stat_indicators; saved public.stat_indicators;
begin
 if not public.editorial_can_read() then raise exception 'Editor required' using errcode='42501';end if;
 if exists(select 1 from jsonb_object_keys(p_data) k where k<>all(array['domain_id','name','slug','short_description','definition','unit','improvement_direction','measurement_method','data_status','chart_type','adopted_source_id','is_published','hide_when_incomplete'])) then raise exception 'Protected statistic field' using errcode='42501';end if;
 if p_id is not null then select * into original from public.stat_indicators where id=p_id for update;if not found or p_revision is null or original.updated_at is distinct from p_revision then raise exception 'Stale statistic revision' using errcode='40001';end if;end if;
 item:=jsonb_populate_record(null::public.stat_indicators,p_data);
 if p_id is null then
  insert into public.stat_indicators(domain_id,name,slug,short_description,definition,unit,improvement_direction,measurement_method,data_status,chart_type,adopted_source_id,is_published,hide_when_incomplete) values(item.domain_id,item.name,item.slug,item.short_description,item.definition,item.unit,item.improvement_direction,item.measurement_method,item.data_status,item.chart_type,item.adopted_source_id,item.is_published,item.hide_when_incomplete) returning * into saved;
 else update public.stat_indicators set domain_id=item.domain_id,name=item.name,slug=item.slug,short_description=item.short_description,definition=item.definition,unit=item.unit,improvement_direction=item.improvement_direction,measurement_method=item.measurement_method,data_status=item.data_status,chart_type=item.chart_type,adopted_source_id=item.adopted_source_id,is_published=item.is_published,hide_when_incomplete=item.hide_when_incomplete where id=p_id returning * into saved;end if;
 if cardinality(p_source_ids)>100 or (item.adopted_source_id is not null and not item.adopted_source_id=any(coalesce(p_source_ids,'{}'))) then raise exception 'Invalid source selection' using errcode='22023';end if;
 -- Preserve methodology and series labels on unchanged links.
 delete from public.stat_indicator_sources where indicator_id=saved.id and not(source_id=any(coalesce(p_source_ids,'{}')));
 update public.stat_indicator_sources set is_adopted=false where indicator_id=saved.id and is_adopted and source_id is distinct from item.adopted_source_id;
 insert into public.stat_indicator_sources(indicator_id,source_id,is_adopted) select saved.id,s,coalesce(s=item.adopted_source_id,false) from (select distinct unnest(p_source_ids) s) u on conflict(indicator_id,source_id) do update set is_adopted=excluded.is_adopted where stat_indicator_sources.is_adopted is distinct from excluded.is_adopted;
 return jsonb_build_object('record',to_jsonb(saved));
end;
$function$;

REVOKE ALL ON FUNCTION "public"."editorial_statistic_save"(uuid, timestamp WITH time zone, jsonb, uuid[]) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.inline_comment_pin_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin if new.status<>'approved' then new.pinned_at:=null; end if;return new;end $function$;

REVOKE ALL ON FUNCTION "public"."inline_comment_pin_guard"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.inline_content_audit_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare old_safe jsonb; new_safe jsonb; row_id text;
begin
 if auth.uid() is null then return coalesce(new,old); end if;
 if tg_op<>'INSERT' then select jsonb_object_agg(key,value) into old_safe from jsonb_each(to_jsonb(old)) where key=any(public.inline_content_fields(tg_argv[0])||array['revision','updated_at']);row_id:=old.id::text; end if;
 if tg_op<>'DELETE' then select jsonb_object_agg(key,value) into new_safe from jsonb_each(to_jsonb(new)) where key=any(public.inline_content_fields(tg_argv[0])||array['revision','updated_at']);row_id:=new.id::text; end if;
 insert into public.inline_content_audit(actor_id,kind,target_id,action,before_value,after_value) values(auth.uid(),tg_argv[0],row_id,lower(tg_op),old_safe,new_safe);
 return coalesce(new,old);
end $function$;

REVOKE ALL ON FUNCTION "public"."inline_content_audit_change"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.inline_content_fields (
  p_kind text
)
  RETURNS text[]
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
 select case p_kind
 when 'issue' then array['title','slug','number','summary','issue_date','is_published','cover_url','pdf_url']
 when 'work' then array['title','slug','summary','category','platform','external_url','thumbnail_url','published_at','is_published']
 when 'company' then array['name','slug','legal_name','category','location','scale','entity_type','ownership','owner_name','ceo_name','founded','team_size','address','google_maps_url','website','email','phone','summary','story','impact','strengths','markets','products','image_url','image_position','is_published']
 when 'professional' then array['full_name','slug','profession_title','category','location','service_areas','service_mode','years_experience','availability','bio','services','skills','languages','phone','whatsapp','email','website','instagram','profile_image_url','image_position','is_verified','is_published']
 when 'governorate' then array['description','history','geography','economy','landmarks','capital','image_url']
 when 'district' then array['description','landmarks','capital','image_url'] end
$function$;

REVOKE ALL ON FUNCTION "public"."inline_content_fields"(text) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.inline_content_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare kind text:=tg_argv[0];
begin
 if auth.uid() is not null and public.debate_role() is null then raise exception 'Editor required' using errcode='42501'; end if;
 if tg_op='UPDATE' then
  if new.id::text<>old.id::text then raise exception 'Immutable content identity' using errcode='42501'; end if;
  new.revision:=old.revision+1;
 else new.revision:=1; end if;
 new.updated_at:=clock_timestamp();
 return new;
end $function$;

REVOKE ALL ON FUNCTION "public"."inline_content_guard"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.inline_content_read (
  p_kind    text,
  p_id      text,
  p_history boolean DEFAULT false
)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare tab text:=public.inline_content_table(p_kind); item jsonb; result jsonb;
begin
 if public.debate_role() is null then raise exception 'Editor required' using errcode='42501'; end if;
 if p_history then
  if tab is null and p_kind not in ('figure','page') then raise exception 'Invalid history kind' using errcode='22023'; end if;
  select coalesce(jsonb_agg(a.row order by a.created_at desc),'[]') into result from (select jsonb_build_object('id',h.id,'action',h.action,'reason',h.reason,'created_at',h.created_at,'actor_name',coalesce(u.raw_user_meta_data->>'full_name','محرر'),'before_value',h.before_value,'after_value',h.after_value) row,h.created_at from public.inline_content_audit h left join auth.users u on u.id=h.actor_id where h.kind=p_kind and h.target_id=p_id order by h.created_at desc limit 100) a;
  return jsonb_build_object('items',result);
 end if;
 if tab is null or to_regclass('public.'||tab) is null then raise exception 'Content unavailable' using errcode='P0002'; end if;
 execute format('select to_jsonb(t) from public.%I t where id::text=$1',tab) into item using p_id;
 if item is null then raise exception 'Content not found' using errcode='P0002'; end if;
 return jsonb_build_object('item',item,'revision',item->'revision');
end $function$;

REVOKE ALL ON FUNCTION "public"."inline_content_read"(text, text, boolean) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.inline_content_save (
  p_kind     text,
  p_id       text,
  p_revision bigint,
  p_data     jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare tab text:=public.inline_content_table(p_kind); current_row jsonb; combined jsonb; item jsonb; k text; product jsonb; source jsonb; numeric_key text; setters text; audit_id uuid; started timestamptz:=clock_timestamp();
begin
 if public.debate_role() is null then raise exception 'Editor required' using errcode='42501'; end if;
 if tab is null or to_regclass('public.'||tab) is null then raise exception 'Content unavailable' using errcode='P0002'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' or p_data='{}' or octet_length(p_data::text)>180000 then raise exception 'Invalid patch' using errcode='22023'; end if;
 for k in select jsonb_object_keys(p_data) loop
  if not (k=any(public.inline_content_fields(p_kind))) then raise exception 'Protected content field' using errcode='42501'; end if;
  if k in ('is_verified','is_published') and jsonb_typeof(p_data->k) is distinct from 'boolean' then raise exception 'Boolean required' using errcode='22023'; end if;
  if k in ('website','google_maps_url','external_url','cover_url','pdf_url','thumbnail_url','image_url','profile_image_url','instagram') and nullif(p_data->>k,'') is not null and (length(p_data->>k)>2000 or p_data->>k !~* '^https?://[^/@[:space:]]+([/?#][^[:space:]]*)?$') then raise exception 'Invalid content URL' using errcode='22023'; end if;
 end loop;
 execute format('select to_jsonb(t) from public.%I t where id::text=$1 for update',tab) into current_row using p_id;
 if current_row is null then raise exception 'Content not found' using errcode='P0002'; end if;
 if p_revision is distinct from (current_row->>'revision')::bigint then raise exception 'Revision conflict' using errcode='40001'; end if;
 if p_kind='work' and current_row->>'debate_id' is not null then raise exception 'Edit linked work through its debate' using errcode='42501'; end if;
 combined:=current_row||p_data;
 if p_kind='company' then
  if length(btrim(coalesce(combined->>'name',''))) not between 2 and 180 or length(btrim(coalesce(combined->>'category','')))<1 or length(btrim(coalesce(combined->>'location','')))<1 then raise exception 'Complete company details' using errcode='22023'; end if;
  if p_data ? 'products' then
   if jsonb_typeof(p_data->'products') is distinct from 'array' or jsonb_array_length(p_data->'products') not between 1 and 200 then raise exception 'Invalid product list' using errcode='22023'; end if;
   for product in select value from jsonb_array_elements(p_data->'products') loop
    if jsonb_typeof(product)<>'object' or jsonb_typeof(product->'name') is distinct from 'string' or length(btrim(product->>'name')) not between 1 and 250 then raise exception 'Product name required' using errcode='22023'; end if;
    if nullif(product->>'image_url','') is not null and (length(product->>'image_url')>2000 or product->>'image_url' !~* '^https?://[^/@[:space:]]+([/?#][^[:space:]]*)?$') then raise exception 'Invalid product image' using errcode='22023'; end if;
    if product ? 'currency' and product->>'currency' not in ('YER','SAR','USD') then raise exception 'Invalid product currency' using errcode='22023'; end if;
    foreach numeric_key in array array['quantity','wholesale_price','retail_price'] loop
     if product->numeric_key is not null and product->numeric_key<>'null'::jsonb and (jsonb_typeof(product->numeric_key)<>'number' or (product->>numeric_key)::numeric<0) then raise exception 'Invalid product amount' using errcode='22023'; end if;
    end loop;
    if product ? 'sources' then
     if jsonb_typeof(product->'sources')<>'array' or jsonb_array_length(product->'sources')>12 then raise exception 'Invalid product sources' using errcode='22023'; end if;
     for source in select value from jsonb_array_elements(product->'sources') loop
      if jsonb_typeof(source)<>'object' or length(btrim(coalesce(source->>'title',''))) not between 1 and 180 or coalesce(source->>'url','') !~* '^https?://[^/@[:space:]]+([/?#][^[:space:]]*)?$' then raise exception 'Invalid product source' using errcode='22023'; end if;
      if nullif(source->>'reviewedAt','') is not null and ((source->>'reviewedAt') !~ '^\d{4}-\d{2}-\d{2}$' or ((source->>'reviewedAt')::date)::text<>source->>'reviewedAt') then raise exception 'Invalid source review date' using errcode='22023'; end if;
     end loop;
    end if;
   end loop;
  end if;
 end if;
 if p_kind='professional' then
  if length(btrim(coalesce(combined->>'full_name',''))) not between 2 and 160 or length(btrim(coalesce(combined->>'profession_title','')))<2 or length(btrim(coalesce(combined->>'location','')))<2 or jsonb_typeof(combined->'services')<>'array' or jsonb_array_length(combined->'services')<1 then raise exception 'Complete professional profile' using errcode='22023'; end if;
  if (combined->>'is_verified')::boolean and coalesce(combined->>'email','') ~* '@(example\.(com|org|net)|test\.(com|invalid))$' then raise exception 'Example contact cannot be verified' using errcode='22023'; end if;
 end if;
 select string_agg(format('%I = v.%I',key,key),',') into setters from jsonb_object_keys(p_data) key;
 execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I,$1) v where t.id::text=$2 returning to_jsonb(t)',tab,setters,tab) into item using combined,p_id;
 if current_row->>'is_published'='true' and item->>'is_published'='false' then select id into audit_id from public.inline_content_audit where kind=p_kind and target_id=p_id and actor_id=auth.uid() and created_at>=started order by created_at desc limit 1; end if;
 return jsonb_build_object('item',item,'revision',item->'revision','undo_id',audit_id);
end $function$;

REVOKE ALL ON FUNCTION "public"."inline_content_save"(text, text, bigint, jsonb) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.inline_content_table (
  p_kind text
)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
 select case p_kind when 'issue' then 'issues' when 'work' then 'works' when 'company' then 'yemeni_companies' when 'professional' then 'professionals' when 'governorate' then 'governorates' when 'district' then 'districts' end
$function$;

REVOKE ALL ON FUNCTION "public"."inline_content_table"(text) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.inline_content_undo (
  p_id uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare h public.inline_content_audit; current_row jsonb; result jsonb; started timestamptz:=clock_timestamp();
begin
 if public.debate_role() is null then raise exception 'Editor required' using errcode='42501'; end if;
 select * into h from public.inline_content_audit where id=p_id for update;
 if not found or h.after_value->>'is_published'<>'false' or h.before_value->>'is_published'<>'true' or exists(select 1 from public.inline_content_audit where undo_of=p_id) then raise exception 'Undo unavailable' using errcode='40001'; end if;
 current_row:=public.inline_content_read(h.kind,h.target_id)->'item';
 if (current_row->>'revision')::bigint is distinct from (h.after_value->>'revision')::bigint then raise exception 'Content changed' using errcode='40001'; end if;
 result:=public.inline_content_save(h.kind,h.target_id,(current_row->>'revision')::bigint,jsonb_build_object('is_published',true));
 update public.inline_content_audit set action='undo',undo_of=h.id,reason='تراجع عن إلغاء النشر' where id=(select id from public.inline_content_audit where kind=h.kind and target_id=h.target_id and actor_id=auth.uid() and created_at>=started order by created_at desc limit 1);
 return result;
end $function$;

REVOKE ALL ON FUNCTION "public"."inline_content_undo"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.inline_editor_mutate (
  p_action text,
  p_kind   text  DEFAULT NULL::text,
  p_id     uuid  DEFAULT NULL::uuid,
  p_data   jsonb DEFAULT '{}'::jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare r text:=public.debate_role(); old_value jsonb; new_value jsonb; audit_id uuid; h public.debate_moderation_actions; owner uuid; anon_question boolean; item jsonb; reason text:=p_data->>'reason'; task_result jsonb; result jsonb; n integer;
begin
 if r is null then raise exception 'Editor required' using errcode='42501'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>180000 then raise exception 'Invalid data' using errcode='22023'; end if;
 if p_action='moderate' then return public.debate_admin_mutate('moderate',p_id,null,p_data||jsonb_build_object('kind',p_kind)); end if;
 if p_action='task' then
  if coalesce(p_data->>'source_type','') not in ('debate','issue','work','company','professional','figure','page','statistic','ranking','governorate','district','map') or not (p_data->>'source_url'='/' or coalesce(p_data->>'source_url','') ~ '^/[^/]') or length(p_data->>'source_url')>2000 or length(coalesce(p_data->>'source_id',''))>150 then raise exception 'Invalid task source' using errcode='22023'; end if;
  task_result:=public.task_mutate('create',null,null,jsonb_build_object('title',p_data->>'title','description',coalesce(p_data->>'description',''),'assigned_to',coalesce(p_data->>'assigned_to',auth.uid()::text),'tags',jsonb_build_array('التحرير المباشر')));
  update public.tasks set source_type=p_data->>'source_type',source_id=nullif(p_data->>'source_id',''),source_url=p_data->>'source_url' where id=(task_result->>'id')::uuid;
  if p_data->>'source_type'='debate' and exists(select 1 from public.debates where id=(p_data->>'source_id')::uuid) then insert into public.debate_task_links values((p_data->>'source_id')::uuid,(task_result->>'id')::uuid); end if;
  return task_result;
 elsif p_action='undo' then
  select * into h from public.debate_moderation_actions where id=p_id for update;
  if not found or h.action<>'moderate' or h.after_value->>'status'<>'hidden' or h.target_kind not in ('comments','questions') then raise exception 'Undo unavailable' using errcode='22023'; end if;
  if exists(select 1 from public.debate_moderation_actions where undo_of=h.id) then raise exception 'Already undone' using errcode='40001'; end if;
  if h.target_kind='comments' then perform 1 from public.debate_comments where id=h.target_id for update; else perform 1 from public.debate_questions where id=h.target_id for update; end if;
  item:=public.inline_item(h.target_kind,h.target_id);
  if (item->>'updated_at')::timestamptz is distinct from (h.after_value->>'updated_at')::timestamptz then raise exception 'Item changed' using errcode='40001'; end if;
  result:=public.debate_admin_mutate('moderate',h.target_id,null,jsonb_build_object('kind',h.target_kind,'status',h.before_value->>'status','updated_at',item->>'updated_at','reason','تراجع عن الإخفاء'));
  update public.debate_moderation_actions set undo_of=h.id,action='undo' where id=(select id from public.debate_moderation_actions where actor_id=auth.uid() and target_id=h.target_id order by created_at desc limit 1);
  return result-'undo_id';
 end if;
 if length(btrim(coalesce(reason,''))) not between 3 and 1000 then raise exception 'Reason required' using errcode='22023'; end if;
 if p_action in ('pin','delete') then
  if p_kind='comments' then perform 1 from public.debate_comments where id=p_id for update;
  elsif p_kind='questions' and p_action='delete' then perform 1 from public.debate_questions where id=p_id for update;
  else raise exception 'Invalid kind' using errcode='22023'; end if;
  old_value:=public.inline_item(p_kind,p_id);
  if (p_data->>'updated_at')::timestamptz is distinct from (old_value->>'updated_at')::timestamptz then raise exception 'Item changed' using errcode='40001'; end if;
  if p_action='pin' then
   if old_value->>'status'<>'approved' or not (p_data ? 'pinned') then raise exception 'Only approved comments can be pinned' using errcode='22023'; end if;
   -- Serializes the cap even when different comments are pinned concurrently.
   perform 1 from public.debates where id=(old_value->>'debate_id')::uuid for update;
   if (p_data->>'pinned')::boolean and old_value->>'pinned'='false' and (select count(*) from public.debate_comments where debate_id=(old_value->>'debate_id')::uuid and pinned_at is not null and status='approved')>=3 then raise exception 'At most three pinned comments' using errcode='22023'; end if;
   update public.debate_comments set pinned_at=case when (p_data->>'pinned')::boolean then coalesce(pinned_at,clock_timestamp()) end,updated_at=clock_timestamp() where id=p_id;
  else
   if r<>'management' or coalesce((p_data->>'confirmed')::boolean,false)=false then raise exception 'Management confirmation required' using errcode='42501'; end if;
   if old_value->>'status'='deleted' then raise exception 'Already deleted' using errcode='22023'; end if;
   if p_kind='comments' then update public.debate_comments set status='deleted',body='حُذف التعليق',pinned_at=null,updated_at=clock_timestamp() where id=p_id;
   else update public.debate_questions set status='deleted',body='حُذف السؤال',updated_at=clock_timestamp() where id=p_id; end if;
  end if;
  new_value:=public.inline_item(p_kind,p_id);
 elsif p_action='restrict' then
  if r<>'management' then raise exception 'Management required' using errcode='42501'; end if;
  if p_kind='comments' then select user_id,false into owner,anon_question from public.debate_comments where id=p_id;
  elsif p_kind='questions' then select user_id,anonymous into owner,anon_question from public.debate_questions where id=p_id; else raise exception 'Invalid kind' using errcode='22023'; end if;
  if owner is null or anon_question or exists(select 1 from public.editors where user_id=owner) then raise exception 'Account action unavailable' using errcode='42501'; end if;
  select jsonb_build_object('comments_restricted',p.comments_restricted,'questions_restricted',p.questions_restricted,'updated_at',p.updated_at) into old_value from public.public_profiles p where user_id=owner for update;
  if old_value is null then raise exception 'Profile not found' using errcode='P0002'; end if;
  if (p_data->>'updated_at')::timestamptz is distinct from (old_value->>'updated_at')::timestamptz then raise exception 'Account changed' using errcode='40001'; end if;
  if not (p_data ? 'comments_restricted' or p_data ? 'questions_restricted') then raise exception 'Missing restriction' using errcode='22023'; end if;
  update public.public_profiles set comments_restricted=coalesce((p_data->>'comments_restricted')::boolean,comments_restricted),questions_restricted=coalesce((p_data->>'questions_restricted')::boolean,questions_restricted),suspension_reason=reason,updated_at=clock_timestamp() where user_id=owner;
  select jsonb_build_object('comments_restricted',p.comments_restricted,'questions_restricted',p.questions_restricted,'updated_at',p.updated_at) into new_value from public.public_profiles p where user_id=owner;
  insert into public.debate_moderation_actions(actor_id,action,target_id,target_kind,reason,before_value,after_value) values(auth.uid(),'restrict',owner,'account',reason,old_value,new_value);
  return public.inline_editor_read('account',null,p_kind,p_id);
 else raise exception 'Invalid action' using errcode='22023'; end if;
 insert into public.debate_moderation_actions(actor_id,action,target_id,target_kind,reason,before_value,after_value) values(auth.uid(),p_action,p_id,p_kind,reason,old_value-array['body','display_name','capabilities'],new_value-array['body','display_name','capabilities']) returning id into audit_id;
 return jsonb_build_object('id',p_id,'item',new_value);
end $function$;

REVOKE ALL ON FUNCTION "public"."inline_editor_mutate"(text, text, uuid, jsonb) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.inline_editor_read (
  p_view    text,
  p_debate  uuid    DEFAULT NULL::uuid,
  p_kind    text    DEFAULT NULL::text,
  p_id      uuid    DEFAULT NULL::uuid,
  p_status  text    DEFAULT 'pending'::text,
  p_page    integer DEFAULT 1,
  p_comment uuid    DEFAULT NULL::uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare r text:=public.debate_role(); result jsonb; c integer; q integer; z integer; total_n integer; owner uuid; is_anon boolean; d jsonb; has_votes boolean; saved_results jsonb;
begin
 if r is null then raise exception 'Editor required' using errcode='42501'; end if;
 if p_debate is not null and not exists(select 1 from public.debates where id=p_debate) then raise exception 'Debate not found' using errcode='P0002'; end if;
 if p_view='session' then return jsonb_build_object('actor',jsonb_build_object('id',auth.uid(),'role',r)); end if;
 if p_view='counts' then
  select count(*) into c from public.debate_comments where status='pending' and (p_debate is null or debate_id=p_debate);
  select count(*) into q from public.debate_questions where status='new' and (p_debate is null or debate_id=p_debate);
  select count(*) into z from public.debate_reports a join public.debate_comments b on b.id=a.comment_id where a.status='open' and (p_debate is null or b.debate_id=p_debate);
  return jsonb_build_object('comments',c,'questions',q,'reports',z,'total',c+q+z);
 elsif p_view='capabilities' then
  select jsonb_build_object(
   'comments',coalesce((select jsonb_object_agg(a.id::text,public.inline_item('comments',a.id)->'capabilities') from public.debate_comments a where p_debate is null or a.debate_id=p_debate),'{}'),
   'questions',coalesce((select jsonb_object_agg(a.id::text,public.inline_item('questions',a.id)->'capabilities') from public.debate_questions a where p_debate is null or a.debate_id=p_debate),'{}'),
   'reports',coalesce((select jsonb_object_agg(a.id::text,public.inline_item('reports',a.id)->'capabilities') from public.debate_reports a join public.debate_comments b on b.id=a.comment_id where p_debate is null or b.debate_id=p_debate),'{}')
  ) into result;
  return jsonb_build_object('capabilities',result);
 elsif p_view='item' then return jsonb_build_object('item',public.inline_item(p_kind,p_id));
 elsif p_view='history' then
  perform public.inline_item(p_kind,p_id);
  select coalesce(jsonb_agg(a.row order by a.created_at desc),'[]') into result from (select jsonb_build_object('id',h.id,'action',h.action,'reason',h.reason,'created_at',h.created_at,'actor_name',coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'display_name','محرر'),'before_value',h.before_value,'after_value',h.after_value,'undo_of',h.undo_of) row,h.created_at from public.debate_moderation_actions h left join auth.users u on u.id=h.actor_id where h.target_id=p_id and (h.target_kind=p_kind or h.target_kind is null) order by h.created_at desc limit 100) a;
  return jsonb_build_object('items',result);
 elsif p_view='account' then
  if p_kind='comments' then select user_id,false into owner,is_anon from public.debate_comments where id=p_id;
  elsif p_kind='questions' then select user_id,anonymous into owner,is_anon from public.debate_questions where id=p_id; else raise exception 'Invalid kind' using errcode='22023'; end if;
  if owner is null or is_anon then raise exception 'Account unavailable' using errcode='42501'; end if;
  select jsonb_build_object('suspended',p.suspended,'comments_restricted',p.comments_restricted,'questions_restricted',p.questions_restricted,'updated_at',p.updated_at,'reason',p.suspension_reason,'can_restrict',r='management','actions_count',(select count(*) from public.debate_moderation_actions h where h.target_id=owner and h.target_kind='account')) into result from public.public_profiles p where user_id=owner;
  select coalesce(jsonb_agg(a.row order by a.created_at desc),'[]') into d from (select jsonb_build_object('id',h.id,'action',h.action,'created_at',h.created_at,'reason',h.reason,'before_value',h.before_value,'after_value',h.after_value) row,h.created_at from public.debate_moderation_actions h where h.target_id=owner and h.target_kind='account' order by h.created_at desc limit 50) a;
  result:=result||jsonb_build_object('actions',d);
  return result||jsonb_build_object('account',result);
 elsif p_view='debate' then
  select to_jsonb(b)-'results' into d from public.debates b where b.id=coalesce(p_id,p_debate);
  if d is null then raise exception 'Debate not found' using errcode='P0002'; end if;
  select d||jsonb_build_object('participants',coalesce((select jsonb_agg(to_jsonb(a) order by position) from public.debate_participants a where debate_id=(d->>'id')::uuid),'[]'),'options',coalesce((select jsonb_agg(to_jsonb(a) order by position) from public.debate_poll_options a where debate_id=(d->>'id')::uuid),'[]'),'polls',coalesce((select jsonb_agg(to_jsonb(a)) from public.debate_polls a where debate_id=(d->>'id')::uuid),'[]'),'chapters',coalesce((select jsonb_agg(to_jsonb(a) order by start_seconds) from public.debate_video_chapters a where debate_id=(d->>'id')::uuid),'[]')) into result;
  select exists(select 1 from public.debate_votes where debate_id=b.id),b.results into has_votes,saved_results from public.debates b where b.id=(d->>'id')::uuid;
  select result||jsonb_build_object('poll_capabilities',coalesce((select jsonb_object_agg(a.id::text,jsonb_build_object('can_reopen',a.enabled and not (saved_results ? a.phase) and (r='management' or not (has_votes or saved_results<>'{}'::jsonb)))) from public.debate_polls a where a.debate_id=(d->>'id')::uuid),'{}')) into result;
  return jsonb_build_object('debate',result);
 elsif p_view='queue' then
  if p_kind not in ('all','comments','questions','reports') or p_status not in ('pending','all') or p_page not between 1 and 10000 then raise exception 'Invalid queue filter' using errcode='22023'; end if;
  with records as (
   select 'comments' kind,id,debate_id,created_at from public.debate_comments where (p_kind in ('all','comments')) and (p_status='all' or status='pending') and (p_comment is null or id=p_comment)
   union all select 'questions',id,debate_id,created_at from public.debate_questions where (p_kind in ('all','questions')) and (p_status='all' or status='new') and p_comment is null
   union all select 'reports',a.id,b.debate_id,a.created_at from public.debate_reports a join public.debate_comments b on b.id=a.comment_id where (p_kind in ('all','reports')) and (p_status='all' or a.status='open') and (p_comment is null or a.comment_id=p_comment)
  ) select count(*) into total_n from records where p_debate is null or debate_id=p_debate;
  with records as (
   select 'comments' kind,id,debate_id,created_at from public.debate_comments where p_kind in ('all','comments') and (p_status='all' or status='pending') and (p_comment is null or id=p_comment)
   union all select 'questions',id,debate_id,created_at from public.debate_questions where p_kind in ('all','questions') and (p_status='all' or status='new') and p_comment is null
   union all select 'reports',a.id,b.debate_id,a.created_at from public.debate_reports a join public.debate_comments b on b.id=a.comment_id where p_kind in ('all','reports') and (p_status='all' or a.status='open') and (p_comment is null or a.comment_id=p_comment)
  ) select coalesce(jsonb_agg(public.inline_item(kind,id) order by created_at,id),'[]') into result from (select * from records where p_debate is null or debate_id=p_debate order by created_at,id limit 20 offset (p_page-1)*20) a;
  return jsonb_build_object('items',result,'total',total_n,'page',p_page,'pages',ceil(total_n/20.0));
 end if;
 raise exception 'Invalid view' using errcode='22023';
end $function$;

REVOKE ALL ON FUNCTION "public"."inline_editor_read"(text, uuid, text, uuid, text, integer, uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.inline_item (
  p_kind text,
  p_id   uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare x jsonb; s text; allowed text[]; r text:=public.debate_role();
begin
 if r is null then raise exception 'Editor required' using errcode='42501'; end if;
 if p_kind='comments' then
 select jsonb_build_object('kind','comments','id',c.id,'debate_id',c.debate_id,'body',c.body,'status',c.status,'created_at',c.created_at,'updated_at',c.updated_at,'display_name',coalesce(p.display_name,'حساب محذوف'),'pinned',c.pinned_at is not null,'pinned_at',c.pinned_at,'parent_id',c.parent_id,'hidden_from_status',c.hidden_from_status,'report_count',(select count(*) from public.debate_reports where comment_id=c.id and status='open')) into x from public.debate_comments c left join public.public_profiles p on p.user_id=c.user_id where c.id=p_id;
 elsif p_kind='questions' then
 select jsonb_build_object('kind','questions','id',q.id,'debate_id',q.debate_id,'body',q.body,'status',q.status,'created_at',q.created_at,'updated_at',q.updated_at,'display_name',case when q.anonymous then 'مشارك' else coalesce(p.display_name,'حساب محذوف') end,'anonymous',q.anonymous,'participant_id',q.participant_id,'axis',q.axis,'hidden_from_status',q.hidden_from_status) into x from public.debate_questions q left join public.public_profiles p on p.user_id=q.user_id where q.id=p_id;
 elsif p_kind='reports' then
 select jsonb_build_object('kind','reports','id',z.id,'debate_id',c.debate_id,'comment_id',z.comment_id,'body',z.reason,'comment_body',c.body,'status',z.status,'created_at',z.created_at,'updated_at',z.updated_at,'display_name','بلاغ') into x from public.debate_reports z join public.debate_comments c on c.id=z.comment_id where z.id=p_id;
 else raise exception 'Invalid item kind' using errcode='22023'; end if;
 if x is null then raise exception 'Record not found' using errcode='P0002'; end if;
 select x||jsonb_build_object('debate_title',d.title,'debate_slug',d.slug) into x from public.debates d where d.id=(x->>'debate_id')::uuid;
 s:=x->>'status';
 allowed:=case when p_kind='comments' then case s when 'pending' then array['approved','rejected','hidden'] when 'approved' then array['hidden'] when 'hidden' then array[coalesce(x->>'hidden_from_status','approved')] when 'rejected' then array['pending','approved'] else '{}'::text[] end
 when p_kind='questions' then case s when 'new' then array['approved','rejected','hidden'] when 'approved' then array['selected','rejected','hidden'] when 'selected' then array['approved','answered','hidden'] when 'answered' then array['selected','approved','hidden'] when 'hidden' then array[coalesce(x->>'hidden_from_status','new')] when 'rejected' then array['new','approved'] else '{}'::text[] end
 else case s when 'open' then array['resolved','dismissed'] else array['open'] end end;
 return x||jsonb_build_object('capabilities',jsonb_build_object('statuses',to_jsonb(allowed),'pin',p_kind='comments' and s='approved','delete',r='management' and p_kind in ('comments','questions') and s<>'deleted','account',p_kind='comments' or (p_kind='questions' and not coalesce((x->>'anonymous')::boolean,false)),'restrict',r='management' and (p_kind='comments' or (p_kind='questions' and not coalesce((x->>'anonymous')::boolean,false))),'history',true));
end $function$;

REVOKE ALL ON FUNCTION "public"."inline_item"(text, uuid) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.inline_service_save (
  p_kind     text,
  p_id       text,
  p_revision timestamp with time zone,
  p_data     jsonb,
  p_actor    uuid,
  p_action   text                     DEFAULT 'update'::text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare r text; old_row jsonb; saved jsonb; payload jsonb; old_page jsonb; new_page jsonb; page_id text; k text; cols text; setters text; allowed text[]; safe_fields text[];
begin
 select role into r from public.editors where user_id=p_actor and role in ('admin','management');
 if r is null then raise exception 'Editor required' using errcode='42501'; end if;
 if p_action not in ('create','update','delete') or p_kind not in ('figure','page') or length(coalesce(p_id,'')) not between 1 and 150 or jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>700000 then raise exception 'Invalid service content mutation' using errcode='22023'; end if;
 if p_action='delete' and r<>'management' then raise exception 'Management required' using errcode='42501'; end if;
 if p_kind='figure' then
  if to_regclass('public.yemeni_figures') is null then raise exception 'Figure schema unavailable' using errcode='P0002'; end if;
  select to_jsonb(t) into old_row from public.yemeni_figures t where id=p_id::uuid for update;
  if (old_row is null and p_revision is not null) or (old_row is not null and (old_row->>'updated_at')::timestamptz is distinct from p_revision) then raise exception 'Revision conflict' using errcode='40001'; end if;
  if p_action='create' and old_row is not null or p_action in ('update','delete') and old_row is null then raise exception 'Revision conflict' using errcode='40001'; end if;
  safe_fields:=array['id','slug','full_name','known_for','field','governorate_id','governorate_name','era','birth_year','death_year','is_published','image_url','updated_at'];
  if p_action='delete' then delete from public.yemeni_figures where id=p_id::uuid; saved:=jsonb_build_object('id',p_id);
  else
   allowed:=array['id','slug','full_name','known_for','field','governorate_id','governorate_name','era','birth_year','death_year','short_bio','image_url','website','facebook_url','instagram_url','x_url','youtube_url','display_order','is_published','image_credit','image_source_url','updated_at'];
   for k in select jsonb_object_keys(p_data) loop if not k=any(allowed) then raise exception 'Protected figure field' using errcode='42501'; end if; end loop;
   if p_data->>'id' is distinct from p_id or p_data->>'updated_at' is null or (old_row is not null and (p_data->>'updated_at')::timestamptz<=(old_row->>'updated_at')::timestamptz) then raise exception 'Invalid figure revision' using errcode='22023'; end if;
   payload:=coalesce(old_row,'{}')||p_data;
   if p_action='create' then
    select string_agg(format('%I',key),','),string_agg(format('v.%I',key),',') into cols,setters from jsonb_object_keys(p_data) key;
    execute format('insert into public.yemeni_figures(%s) select %s from jsonb_populate_record(null::public.yemeni_figures,$1) v returning to_jsonb(yemeni_figures)',cols,setters) into saved using payload;
   else
    select string_agg(format('%I = v.%I',key,key),',') into setters from jsonb_object_keys(p_data) key where key<>'id';
    execute format('update public.yemeni_figures t set %s from jsonb_populate_record(null::public.yemeni_figures,$1) v where t.id=$2 returning to_jsonb(t)',setters) into saved using payload,p_id::uuid;
   end if;
  end if;
  select jsonb_object_agg(key,value) into old_page from jsonb_each(old_row) where key=any(safe_fields);
  select jsonb_object_agg(key,value) into new_page from jsonb_each(saved) where key=any(safe_fields);
  insert into public.inline_content_audit(actor_id,kind,target_id,action,before_value,after_value) values(p_actor,'figure',p_id,p_action,old_page,new_page);
 else
  if to_regclass('public.site_settings') is null then raise exception 'CMS schema unavailable' using errcode='P0002'; end if;
  if p_id<>'public_content_pages_v1' or p_data->>'key' is distinct from p_id or jsonb_typeof(p_data->'value'->'pages') is distinct from 'array' or p_data->>'updated_at' is null then raise exception 'Invalid catalog payload' using errcode='22023'; end if;
  select to_jsonb(t) into old_row from public.site_settings t where key=p_id for update;
  if (old_row is null and p_revision is not null) or (old_row is not null and (old_row->>'updated_at')::timestamptz is distinct from p_revision) then raise exception 'Revision conflict' using errcode='40001'; end if;
  if old_row is not null and (p_data->>'updated_at')::timestamptz<=(old_row->>'updated_at')::timestamptz then raise exception 'Invalid catalog revision' using errcode='22023'; end if;
  -- Infer deletions from the data, rather than trusting the action label supplied
  -- by a server that may have authorized an editor just before a role change.
  if r<>'management' and exists(select 1 from jsonb_array_elements(coalesce(old_row->'value'->'pages','[]')) op where not exists(select 1 from jsonb_array_elements(p_data->'value'->'pages') np where np->>'id'=op->>'id')) then raise exception 'Management required to remove pages' using errcode='42501'; end if;
  if exists(select 1 from jsonb_array_elements(coalesce(old_row->'value'->'pages','[]')) op join lateral jsonb_array_elements(p_data->'value'->'pages') np on np->>'id'=op->>'id' where op->>'slug' in ('about','help','privacy','terms','privacy-requests') and np->>'slug' is distinct from op->>'slug') then raise exception 'Built-in page route is immutable' using errcode='22023'; end if;
  if old_row is null then insert into public.site_settings(key,value,updated_at) values(p_id,p_data->'value',(p_data->>'updated_at')::timestamptz) returning to_jsonb(site_settings) into saved;
  else update public.site_settings set value=p_data->'value',updated_at=(p_data->>'updated_at')::timestamptz where key=p_id returning to_jsonb(site_settings) into saved; end if;
  for page_id in select distinct x->>'id' from (select value x from jsonb_array_elements(coalesce(old_row->'value'->'pages','[]')) union all select value from jsonb_array_elements(saved->'value'->'pages')) a loop
   select value into old_page from jsonb_array_elements(coalesce(old_row->'value'->'pages','[]')) where value->>'id'=page_id;
   select value into new_page from jsonb_array_elements(saved->'value'->'pages') where value->>'id'=page_id;
   if old_page is distinct from new_page then
    -- Store only descriptive metadata, not entire legal text or internal drafts.
    select jsonb_object_agg(key,value) into old_page from jsonb_each(old_page) where key in ('id','slug','title','description','is_published','updatedAt');
    select jsonb_object_agg(key,value) into new_page from jsonb_each(new_page) where key in ('id','slug','title','description','is_published','updatedAt');
    insert into public.inline_content_audit(actor_id,kind,target_id,action,before_value,after_value) values(p_actor,'page',page_id,p_action,old_page,new_page);
   end if;
  end loop;
 end if;
 return jsonb_build_object('record',saved,'revision',saved->'updated_at');
end $function$;

REVOKE ALL ON FUNCTION "public"."inline_service_save"(text, text, timestamp WITH time zone, jsonb, uuid, text) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.is_967_editor()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  select exists (
    select 1 from public.editors where user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_editor()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1 from public.editors where user_id = (select auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_management()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1 from public.editors
    where user_id = (select auth.uid()) and role = 'management'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_ranking_editor()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists(select 1 from public.editors where user_id = (select auth.uid()) and role in ('admin', 'management'));
$function$;

CREATE OR REPLACE FUNCTION public.task_archive_completed()
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare item record; n integer:=0; audit_watermark bigint;
 previous_sub text:=current_setting('request.jwt.claim.sub',true);
 previous_claims text:=current_setting('request.jwt.claims',true);
 actor uuid; manager uuid;
begin
 if auth.uid() is null then
  if current_setting('role',true) in ('authenticated','anon') then raise exception 'Editor required' using errcode='42501'; end if;
 elsif public.task_role() is null then raise exception 'Editor required' using errcode='42501'; end if;
 select user_id into manager from public.editors where role='management' order by user_id limit 1;
 for item in select t.id,t.assigned_to from public.tasks t
  where t.status='completed' and t.archived_at is null and t.deleted_at is null
  and coalesce(t.auto_archive_at,t.completed_at+interval '24 hours')<=clock_timestamp()
  order by coalesce(t.auto_archive_at,t.completed_at+interval '24 hours'),t.id
  for update skip locked limit 500
 loop
  select user_id into actor from public.editors where user_id=item.assigned_to and role in ('admin','management');
  actor:=coalesce(manager,actor);if actor is null then continue; end if;
  -- The only allowed system mutation is archiving an already completed,
  -- due, locked row. Existing task guards, revisions and audit stay enabled.
  perform set_config('request.jwt.claim.sub',actor::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  select coalesce(max(id),0) into audit_watermark from public.task_activity where task_id=item.id;
  update public.tasks set archived_at=clock_timestamp(),auto_archived=true where id=item.id;
  update public.task_activity set actor_id=null,action=case when field='archived_at' then 'auto_archived' else action end
   where task_id=item.id and id>audit_watermark and actor_id=actor;
  n:=n+1;
 end loop;
 perform set_config('request.jwt.claim.sub',coalesce(previous_sub,''),true);
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);
 return n;
end $function$;

REVOKE ALL ON FUNCTION "public"."task_archive_completed"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.task_audit()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare k text; a text; recipient uuid; next_id uuid; step interval;
begin
 if tg_op='INSERT' then
  insert into public.task_activity(task_id,actor_id,action,new_value) values(new.id,auth.uid(),'created',jsonb_build_object('title',new.title));
 else
  for k in select key from jsonb_each(to_jsonb(new)-array['updated_at','revision']) loop
   if to_jsonb(old)->k is distinct from to_jsonb(new)->k then
    a:=case when k='status' and new.status='completed' then 'completed' when k='status' and old.status='completed' then 'reopened' when k='archived_at' and new.archived_at is not null then 'archived' when k='archived_at' then 'restored' when k='deleted_at' then 'deleted' else 'updated' end;
    insert into public.task_activity(task_id,actor_id,action,field,old_value,new_value) values(new.id,auth.uid(),a,k,to_jsonb(old)->k,to_jsonb(new)->k);
   end if;
  end loop;
 end if;
 if tg_op='INSERT' or new.assigned_to is distinct from old.assigned_to then
  insert into public.task_notifications(user_id,task_id,kind,dedupe_key) values(new.assigned_to,new.id,'assignment',new.id||':assignment:'||new.revision) on conflict do nothing;
 end if;
 if tg_op='UPDATE' and old.status='completed' and new.status<>'completed' then
  insert into public.task_notifications(user_id,task_id,kind,dedupe_key) values(new.assigned_to,new.id,'reopened',new.id||':reopened:'||new.revision) on conflict do nothing;
 end if;
 if new.status='in_review' and (tg_op='INSERT' or old.status<>'in_review') then
  insert into public.task_notifications(user_id,task_id,kind,dedupe_key)
   select user_id,new.id,'review',new.id||':review:'||new.revision from public.editors where role='management' on conflict do nothing;
 end if;
 -- Row update lock + UNIQUE(recurrence_of) make completion/retries/reopening idempotent.
 if new.status='completed' and new.recurrence<>'none' and (tg_op='INSERT' or old.status<>'completed') then
  step:=case new.recurrence when 'daily' then interval '1 day' when 'weekly' then interval '7 days' else interval '1 month' end;
  insert into public.tasks(title,description,notes,project_id,created_by,assigned_to,priority,start_at,due_at,due_date,due_timezone,estimated_minutes,tags,links,requires_review,recurrence,recurrence_of)
   values(new.title,new.description,new.notes,new.project_id,auth.uid(),new.assigned_to,new.priority,
    case when new.start_at is null then null else ((new.start_at at time zone new.due_timezone)+step) at time zone new.due_timezone end,
    case when new.due_at is null then null else ((new.due_at at time zone new.due_timezone)+step) at time zone new.due_timezone end,
    (new.due_date+step)::date,new.due_timezone,new.estimated_minutes,new.tags,new.links,new.requires_review,new.recurrence,new.id)
   on conflict(recurrence_of) do nothing returning id into next_id;
  if next_id is not null then
   insert into public.task_subtasks(task_id,title,position) select next_id,title,position from public.task_subtasks where task_id=new.id;
  end if;
 end if;
 return new;
end $function$;

REVOKE ALL ON FUNCTION "public"."task_audit"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.task_can_complete_step (
  p_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
 select public.task_can_edit(p_id) or (public.task_is_member(p_id) and exists(select 1 from public.tasks t
 where t.id=p_id and t.archived_at is null and t.deleted_at is null and t.status not in ('completed','cancelled')))
$function$;

REVOKE ALL ON FUNCTION "public"."task_can_complete_step"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.task_can_edit (
  p_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$ select exists(select 1 from public.tasks t where t.id=p_id and t.deleted_at is null and
 (public.task_role()='management' or (public.task_role()='admin' and t.assigned_to=(select auth.uid())))) $function$;

REVOKE ALL ON FUNCTION "public"."task_can_edit"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.task_child_audit()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare tid uuid:=case when tg_op='DELETE' then old.task_id else new.task_id end;
 kind text:=case when tg_table_name='task_comments' then 'comment' else 'subtask' end;parent_author uuid;uid uuid;action text;
begin
 action:=kind||'_'||lower(tg_op);
 if tg_table_name='task_comments' then
  if tg_op='UPDATE' and new.deleted_at is not null then action:='comment_delete';end if;
 end if;
 insert into public.task_activity(task_id,actor_id,action,old_value,new_value) values(tid,auth.uid(),action,
  case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end);
 if tg_table_name='task_comments' then
 if new.deleted_at is null then
  if new.parent_id is not null then select author_id into parent_author from public.task_comments where id=new.parent_id;end if;
  if tg_op='INSERT' and parent_author is not null and parent_author<>auth.uid() then
   insert into public.task_notifications(user_id,task_id,comment_id,kind,dedupe_key)
   values(parent_author,tid,new.id,'reply','reply:'||new.id) on conflict do nothing;
  end if;
  foreach uid in array new.mention_ids loop
   if uid<>auth.uid() and uid is distinct from parent_author and (tg_op='INSERT' or not(uid=any(old.mention_ids))) then
    insert into public.task_notifications(user_id,task_id,comment_id,kind,dedupe_key)
    values(uid,tid,new.id,'mention','mention:'||new.id||':'||uid) on conflict do nothing;
   end if;
  end loop;
  if tg_op='INSERT' then
   -- One rolling notification per recipient/task/day, not one per message.
   insert into public.task_notifications(user_id,task_id,comment_id,kind,dedupe_key)
   select distinct recipient,tid,new.id,'comment',tid||':discussion:'||(clock_timestamp() at time zone 'UTC')::date
   from public.tasks t cross join lateral unnest(array[t.assigned_to,t.created_by]||array(select user_id from public.task_members where task_id=tid)) recipient
   join public.editors e on e.user_id=recipient and e.role in ('admin','management')
   where t.id=tid and recipient<>auth.uid() and recipient is distinct from parent_author and not(recipient=any(new.mention_ids))
   on conflict(user_id,dedupe_key) do update set created_at=excluded.created_at,comment_id=excluded.comment_id,read_at=null;
  end if;
 end if;
 end if;
 return case when tg_op='DELETE' then old else new end;
end $function$;

REVOKE ALL ON FUNCTION "public"."task_child_audit"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.task_child_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare tid uuid;r text:=public.task_role();uid uuid;
begin
 tid:=case when tg_op='DELETE' then old.task_id else new.task_id end;
 perform 1 from public.tasks where id=tid for update;
 if r is null or not public.task_visible(tid) then raise exception 'Editor required' using errcode='42501';end if;
 if tg_op='UPDATE' and (new.task_id<>old.task_id or new.id<>old.id or new.created_at<>old.created_at) then raise exception 'Immutable child field' using errcode='42501';end if;
 if tg_table_name='task_subtasks' then
  if not public.task_can_edit(tid) then
   if tg_op<>'UPDATE' or not public.task_can_complete_step(tid) then raise exception 'Task edit denied' using errcode='42501';end if;
   if (to_jsonb(new)-array['is_completed','completed_at'])<>(to_jsonb(old)-array['is_completed','completed_at']) then raise exception 'Only step completion allowed' using errcode='42501';end if;
  end if;
  if tg_op<>'DELETE' then
   if new.is_completed then if tg_op='INSERT' or not old.is_completed then new.completed_at:=clock_timestamp();else new.completed_at:=old.completed_at;end if;
   else new.completed_at:=null;end if;
  end if;
 else
  if tg_op='DELETE' then raise exception 'Use comment tombstone' using errcode='42501';end if;
  if tg_op='INSERT' then
   if new.author_id<>auth.uid() or new.deleted_at is not null then raise exception 'Invalid author' using errcode='42501';end if;
   if new.parent_id is not null and not exists(select 1 from public.task_comments where id=new.parent_id and task_id=tid and deleted_at is null) then raise exception 'Reply parent unavailable' using errcode='23514';end if;
   new.created_at:=clock_timestamp();new.updated_at:=new.created_at;new.edited_at:=null;new.revision:=1;
  else
   if old.author_id<>auth.uid() and r<>'management' or old.deleted_at is not null then raise exception 'Comment edit denied' using errcode='42501';end if;
   if current_setting('app967.task_comment_revision',true) is distinct from old.id::text||':'||old.revision then raise exception 'Comment changed; reload' using errcode='40001';end if;
   perform set_config('app967.task_comment_revision','',true);
   if new.author_id<>old.author_id or new.parent_id is distinct from old.parent_id then raise exception 'Immutable comment ancestry' using errcode='42501';end if;
   new.updated_at:=clock_timestamp();new.edited_at:=new.updated_at;new.revision:=old.revision+1;
   if new.deleted_at is not null then new.deleted_at:=clock_timestamp();new.body:='تم حذف هذا التعليق';new.mention_ids:='{}';end if;
  end if;
  if cardinality(new.mention_ids)<>(select count(distinct x) from unnest(new.mention_ids)x) then raise exception 'Duplicate mention' using errcode='23514';end if;
  foreach uid in array new.mention_ids loop
   if uid is null or not exists(select 1 from public.editors where user_id=uid and role in ('admin','management')) then raise exception 'Invalid mention' using errcode='23514';end if;
  end loop;
 end if;
 return case when tg_op='DELETE' then old else new end;
end $function$;

REVOKE ALL ON FUNCTION "public"."task_child_guard"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.task_collaboration_copy()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 if new.recurrence_of is not null then
  insert into public.task_members(task_id,user_id) select new.id,m.user_id from public.task_members m
  join public.editors e on e.user_id=m.user_id and e.role in ('admin','management')
  where m.task_id=new.recurrence_of and m.user_id<>new.assigned_to on conflict do nothing;
 end if;return new;
end $function$;

REVOKE ALL ON FUNCTION "public"."task_collaboration_copy"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.task_collaboration_primary()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 if new.assigned_to is distinct from old.assigned_to then delete from public.task_members where task_id=new.id and user_id=new.assigned_to;end if;
 return new;
end $function$;

REVOKE ALL ON FUNCTION "public"."task_collaboration_primary"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.task_collaboration_status()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 delete from public.task_notifications where task_id=new.id and user_id=auth.uid() and
  dedupe_key in(new.id||':assignment:'||new.revision,new.id||':reopened:'||new.revision,new.id||':review:'||new.revision);
 if tg_op='UPDATE' and new.status is distinct from old.status then
  insert into public.task_notifications(user_id,task_id,kind,dedupe_key)
  select distinct recipient,new.id,'status',new.id||':status:'||new.revision
  from unnest(array[new.assigned_to,new.created_by]||array(select user_id from public.task_members where task_id=new.id)) recipient
  join public.editors e on e.user_id=recipient and e.role in ('admin','management')
  where recipient<>auth.uid() and not(new.status='in_review' and e.role='management')
  and not(old.status='completed' and recipient=new.assigned_to)
  on conflict do nothing;
 end if;return new;
end $function$;

REVOKE ALL ON FUNCTION "public"."task_collaboration_status"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.task_complete_step (
  p_task      uuid,
  p_revision  bigint,
  p_step      uuid,
  p_completed boolean
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 perform public.task_lock(p_task,p_revision);
 if not public.task_can_complete_step(p_task) then raise exception 'Task edit denied' using errcode='42501';end if;
 if p_completed is null then raise exception 'Completion required' using errcode='22023';end if;
 update public.task_subtasks set is_completed=p_completed where id=p_step and task_id=p_task;
 if not found then raise exception 'Subtask not found' using errcode='P0002';end if;
 update public.tasks set title=title where id=p_task;
end $function$;

REVOKE ALL ON FUNCTION "public"."task_complete_step"(uuid, bigint, uuid, boolean) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.task_deadline (
  p_due_at   timestamp with time zone,
  p_due_date date,
  p_zone     text
)
  RETURNS timestamp WITH time zone
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$ select coalesce(p_due_at,((p_due_date+1)::timestamp at time zone p_zone)) $function$;

REVOKE ALL ON FUNCTION "public"."task_deadline"(timestamp WITH time zone, date, text) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.task_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare r text:=public.task_role();v text;touch_only boolean:=false;
begin
 if r is null then raise exception 'Editor required' using errcode='42501'; end if;
 if tg_op='UPDATE' then touch_only:=public.task_is_member(old.id) and
  (to_jsonb(new)-array['revision','updated_at'])=(to_jsonb(old)-array['revision','updated_at']); end if;
 if tg_op='INSERT' then
  if new.created_by is distinct from auth.uid() or (r<>'management' and new.assigned_to is distinct from auth.uid())
   or new.archived_at is not null or new.deleted_at is not null or (new.recurrence_of is not null and pg_trigger_depth()<2)
  then raise exception 'Invalid task ownership' using errcode='42501';end if;
  new.created_at:=clock_timestamp();new.revision:=1;
 else
  if old.deleted_at is not null or (r<>'management' and old.assigned_to is distinct from auth.uid() and not touch_only) then raise exception 'Task edit denied' using errcode='42501';end if;
  if new.id<>old.id or new.created_by<>old.created_by or new.created_at<>old.created_at or new.recurrence_of is distinct from old.recurrence_of then raise exception 'Immutable task field' using errcode='42501';end if;
  if r<>'management' and (new.assigned_to<>old.assigned_to or new.requires_review<>old.requires_review or new.deleted_at is distinct from old.deleted_at) then raise exception 'Management required' using errcode='42501';end if;
  if new.deleted_at is distinct from old.deleted_at then new.deleted_at:=clock_timestamp();end if;new.revision:=old.revision+1;
 end if;
 if tg_op='INSERT' or new.assigned_to is distinct from old.assigned_to then
  if not exists(select 1 from public.editors where user_id=new.assigned_to and role in ('admin','management')) then raise exception 'Assignee is not an editor' using errcode='23514';end if;
 end if;
 if new.project_id is not null and (tg_op='INSERT' or new.project_id is distinct from old.project_id) and not exists(select 1 from public.task_projects where id=new.project_id and is_active)
  and not(tg_op='INSERT' and pg_trigger_depth()>1 and new.recurrence_of is not null and exists(select 1 from public.tasks where id=new.recurrence_of and project_id=new.project_id)) then raise exception 'Inactive project' using errcode='23514';end if;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.due_timezone) then raise exception 'Invalid timezone' using errcode='23514';end if;
 if new.start_at>=public.task_deadline(new.due_at,new.due_date,new.due_timezone) then raise exception 'Start follows deadline' using errcode='23514';end if;
 foreach v in array new.tags loop if v is null or length(btrim(v)) not between 1 and 60 then raise exception 'Invalid tag' using errcode='23514';end if;end loop;
 foreach v in array new.links loop if v is null or length(v)>2048 or v !~* '^https?://[^/@[:space:]]+([/?#][^[:space:]]*)?$' then raise exception 'Invalid link' using errcode='23514';end if;end loop;
 if new.status='completed' then
  if tg_op='INSERT' or old.status<>'completed' then
   if new.requires_review and r<>'management' then raise exception 'Review approval required' using errcode='42501';end if;
   new.completed_at:=clock_timestamp();new.completed_by:=auth.uid();
  else new.completed_at:=old.completed_at;new.completed_by:=old.completed_by;end if;
 else new.completed_at:=null;new.completed_by:=null;end if;
 if new.archived_at is not null then
  if new.status<>'completed' then raise exception 'Only completed tasks can be archived' using errcode='23514';end if;
  if tg_op='INSERT' or old.archived_at is null then new.archived_at:=clock_timestamp();else new.archived_at:=old.archived_at;end if;
 end if;
 new.updated_at:=clock_timestamp();return new;
end $function$;

REVOKE ALL ON FUNCTION "public"."task_guard"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.task_is_member (
  p_id   uuid,
  p_user uuid DEFAULT auth.uid()
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
 select public.task_role() is not null and exists(select 1 from public.tasks t where t.id=p_id and t.deleted_at is null
 and (t.assigned_to=p_user or exists(select 1 from public.task_members m where m.task_id=t.id and m.user_id=p_user)))
$function$;

REVOKE ALL ON FUNCTION "public"."task_is_member"(uuid, uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.task_lock (
  p_id       uuid,
  p_revision bigint
)
  RETURNS public.tasks
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare t public.tasks;
begin
 if public.task_role() is null then raise exception 'Editor required' using errcode='42501'; end if;
 select * into t from public.tasks where id=p_id and deleted_at is null for update;
 if not found then raise exception 'Task not found' using errcode='P0002'; end if;
 if p_revision is distinct from t.revision then raise exception 'Task changed; reload' using errcode='40001'; end if;
 return t;
end $function$;

REVOKE ALL ON FUNCTION "public"."task_lock"(uuid, bigint) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.task_member_audit()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare tid uuid:=case when tg_op='DELETE' then old.task_id else new.task_id end;
 uid uuid:=case when tg_op='DELETE' then old.user_id else new.user_id end; t public.tasks;
begin
 -- The task guard still runs; recurrence inserts may be made by the primary.
 update public.tasks set title=title where id=tid returning * into t;
 insert into public.task_activity(task_id,actor_id,action,field,old_value,new_value)
 values(tid,auth.uid(),case when tg_op='INSERT' then 'member_added' else 'member_removed' end,'participant',
  case when tg_op='DELETE' then to_jsonb(uid) end,case when tg_op='INSERT' then to_jsonb(uid) end);
 if uid<>auth.uid() and (tg_op='INSERT' or uid<>t.assigned_to) then
  insert into public.task_notifications(user_id,task_id,kind,dedupe_key)
  values(uid,tid,case when tg_op='INSERT' then 'assignment' else 'unassigned' end,tid||':membership:'||t.revision||':'||lower(tg_op)) on conflict do nothing;
 end if;
 return case when tg_op='DELETE' then old else new end;
end $function$;

REVOKE ALL ON FUNCTION "public"."task_member_audit"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.task_member_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare t public.tasks; copied boolean:=false;
begin
 select * into t from public.tasks where id=case when tg_op='DELETE' then old.task_id else new.task_id end for update;
 if tg_op='INSERT' and pg_trigger_depth()>1 and t.recurrence_of is not null then
  copied:=exists(select 1 from public.task_members m where m.task_id=t.recurrence_of and m.user_id=new.user_id);
 end if;
 if not copied and (public.task_role() is distinct from 'management' or t.deleted_at is not null) then
  raise exception 'Management required' using errcode='42501';
 end if;
 if tg_op='INSERT' then
  if new.user_id=t.assigned_to or not exists(select 1 from public.editors e where e.user_id=new.user_id and e.role in ('admin','management')) then
   raise exception 'Invalid task participant' using errcode='23514'; end if;
  new.added_by:=auth.uid();new.created_at:=clock_timestamp();
 end if;
 return case when tg_op='DELETE' then old else new end;
end $function$;

REVOKE ALL ON FUNCTION "public"."task_member_guard"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.task_mutate (
  p_action   text,
  p_id       uuid   DEFAULT NULL::uuid,
  p_revision bigint DEFAULT NULL::bigint,
  p_data     jsonb  DEFAULT '{}'::jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare t public.tasks;result jsonb;cid uuid;members uuid[];uid uuid;target_status text;had_members boolean:=p_data?'participant_ids';
begin
 if public.task_role() is null then raise exception 'Editor required' using errcode='42501';end if;
 if jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Invalid data' using errcode='22023';end if;
 if had_members then
  if public.task_role()<>'management' then raise exception 'Management required' using errcode='42501';end if;
  if jsonb_typeof(p_data->'participant_ids') is distinct from 'array' or jsonb_array_length(p_data->'participant_ids')>50 then raise exception 'Invalid participants' using errcode='22023';end if;
  members:=array(select jsonb_array_elements_text(p_data->'participant_ids')::uuid);
  if cardinality(members)<>(select count(distinct x) from unnest(members)x) then raise exception 'Duplicate participants' using errcode='23514';end if;
 end if;
 if p_action in ('comment_save','comment_delete') then
  t:=public.task_lock(p_id,p_revision);cid:=(p_data->>'id')::uuid;
  if cid is null then
   if p_action='comment_delete' then raise exception 'Comment not found' using errcode='P0002';end if;
   insert into public.task_comments(task_id,body,parent_id,mention_ids) values(p_id,p_data->>'body',(p_data->>'parent_id')::uuid,
    coalesce(array(select jsonb_array_elements_text(p_data->'mention_ids')::uuid),'{}')) returning id into cid;
  else
   if p_data->>'comment_revision' is null or not exists(select 1 from public.task_comments where id=cid and task_id=p_id and revision=(p_data->>'comment_revision')::bigint) then raise exception 'Comment changed; reload' using errcode='40001';end if;
   perform set_config('app967.task_comment_revision',cid::text||':'||(p_data->>'comment_revision'),true);
   if p_action='comment_delete' then update public.task_comments set deleted_at=clock_timestamp() where id=cid and task_id=p_id;
   else update public.task_comments set body=p_data->>'body',mention_ids=coalesce(array(select jsonb_array_elements_text(p_data->'mention_ids')::uuid),'{}') where id=cid and task_id=p_id;end if;
   if not found then raise exception 'Comment edit denied' using errcode='42501';end if;
  end if;
  return jsonb_build_object('id',p_id,'comment_id',cid);
 end if;
 if p_action='subtask_complete' then perform public.task_complete_step(p_id,p_revision,(p_data->>'id')::uuid,(p_data->>'is_completed')::boolean);return jsonb_build_object('id',p_id);end if;
 if p_action='members' then
  if not had_members then raise exception 'Participants required' using errcode='22023';end if;
  t:=public.task_lock(p_id,p_revision);result:=jsonb_build_object('id',p_id);
 elsif p_action in ('create','update') and had_members then
  -- Apply completion last, so recurrence copies this transaction's membership.
  target_status:=p_data->>'status';
  if p_action='update' then t:=public.task_lock(p_id,p_revision);end if;
  result:=public.task_mutate_legacy(p_action,p_id,p_revision,(p_data-'participant_ids'-'status')||case when p_action='create' then jsonb_build_object('status','not_started') else '{}'::jsonb end);
  select * into t from public.tasks where id=(result->>'id')::uuid;
 else return public.task_mutate_legacy(p_action,p_id,p_revision,p_data);end if;
 foreach uid in array members loop
  if uid is null or uid=t.assigned_to or not exists(select 1 from public.task_team() e where e.user_id=uid) then raise exception 'Invalid participant' using errcode='23514';end if;
 end loop;
 delete from public.task_members where task_id=t.id and not(user_id=any(members));
 insert into public.task_members(task_id,user_id) select t.id,x from unnest(members)x on conflict do nothing;
 if target_status is not null then
  select * into t from public.tasks where id=t.id;
  perform public.task_mutate_legacy('status',t.id,t.revision,jsonb_build_object('status',target_status));
 end if;return result;
end $function$;

REVOKE ALL ON FUNCTION "public"."task_mutate"(text, uuid, bigint, jsonb) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.task_mutate_legacy (
  p_action   text,
  p_id       uuid   DEFAULT NULL::uuid,
  p_revision bigint DEFAULT NULL::bigint,
  p_data     jsonb  DEFAULT '{}'::jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare t public.tasks; saved_id uuid; k text; child_id uuid; current_project public.task_projects;
begin
 if public.task_role() is null then raise exception 'Editor required' using errcode='42501'; end if;
 if p_action='project_save' then
  if public.task_role()<>'management' then raise exception 'Management required' using errcode='42501'; end if;
  if p_id is null then insert into public.task_projects(name) values(p_data->>'name') returning id into saved_id;
  else
   select * into current_project from public.task_projects where id=p_id for update;
   if not found then raise exception 'Project not found' using errcode='P0002'; end if;
   if (p_data->>'updated_at')::timestamptz is distinct from current_project.updated_at then raise exception 'Project changed' using errcode='40001'; end if;
   update public.task_projects set name=coalesce(p_data->>'name',name),is_active=coalesce((p_data->>'is_active')::boolean,is_active),updated_at=clock_timestamp() where id=p_id returning id into saved_id;
  end if;
  return jsonb_build_object('id',saved_id);
 end if;
 if p_action='create' then
  for k in select jsonb_object_keys(p_data) loop
   if k<>all(array['title','description','notes','project_id','assigned_to','status','priority','start_at','due_at','due_date','due_timezone','estimated_minutes','tags','links','requires_review','recurrence']) then raise exception 'Invalid task field' using errcode='22023'; end if;
  end loop;
  insert into public.tasks(title,description,notes,project_id,assigned_to,status,priority,start_at,due_at,due_date,due_timezone,estimated_minutes,tags,links,requires_review,recurrence)
  values(p_data->>'title',coalesce(p_data->>'description',''),coalesce(p_data->>'notes',''),(p_data->>'project_id')::uuid,coalesce((p_data->>'assigned_to')::uuid,auth.uid()),coalesce(p_data->>'status','not_started'),coalesce(p_data->>'priority','normal'),(p_data->>'start_at')::timestamptz,(p_data->>'due_at')::timestamptz,(p_data->>'due_date')::date,coalesce(p_data->>'due_timezone','UTC'),(p_data->>'estimated_minutes')::integer,coalesce(array(select jsonb_array_elements_text(p_data->'tags')),'{}'),coalesce(array(select jsonb_array_elements_text(p_data->'links')),'{}'),coalesce((p_data->>'requires_review')::boolean,false),coalesce(p_data->>'recurrence','none')) returning id into saved_id;
  return jsonb_build_object('id',saved_id);
 end if;
 t:=public.task_lock(p_id,p_revision);
 if p_action in ('comment_save','comment_delete') then
  child_id:=(p_data->>'id')::uuid;
  if p_action='comment_delete' then delete from public.task_comments where id=child_id and task_id=p_id;
  elsif child_id is null then insert into public.task_comments(task_id,body) values(p_id,p_data->>'body');
  else update public.task_comments set body=p_data->>'body' where id=child_id and task_id=p_id;
  end if;
  if not found then raise exception 'Comment edit denied or comment missing' using errcode='42501'; end if;
  return jsonb_build_object('id',p_id);
 end if;
 if not public.task_can_edit(p_id) then raise exception 'Task edit denied' using errcode='42501'; end if;
 case p_action
 when 'update' then
  for k in select jsonb_object_keys(p_data) loop
   if k<>all(array['title','description','notes','project_id','assigned_to','status','priority','start_at','due_at','due_date','due_timezone','estimated_minutes','tags','links','requires_review','recurrence']) then raise exception 'Invalid task field' using errcode='22023'; end if;
  end loop;
  -- Populate only explicitly allowed fields; trigger owns timestamps/identity/revision.
  t:=jsonb_populate_record(t,p_data);
  update public.tasks set title=t.title,description=t.description,notes=t.notes,project_id=t.project_id,assigned_to=t.assigned_to,status=t.status,priority=t.priority,start_at=t.start_at,due_at=t.due_at,due_date=t.due_date,due_timezone=t.due_timezone,estimated_minutes=t.estimated_minutes,tags=t.tags,links=t.links,requires_review=t.requires_review,recurrence=t.recurrence where id=p_id;
 when 'status' then update public.tasks set status=p_data->>'status',archived_at=case when p_data->>'status'<>'completed' then null else archived_at end where id=p_id;
 when 'archive' then update public.tasks set archived_at=clock_timestamp() where id=p_id;
 when 'restore' then update public.tasks set archived_at=null where id=p_id;
 when 'delete' then
  if public.task_role()<>'management' then raise exception 'Management required' using errcode='42501'; end if;
  perform public.task_soft_delete(p_id,p_revision);
 when 'subtask_save' then
  child_id:=(p_data->>'id')::uuid;
  if child_id is null then insert into public.task_subtasks(task_id,title,position) values(p_id,p_data->>'title',coalesce((p_data->>'position')::integer,0));
  else update public.task_subtasks set title=coalesce(p_data->>'title',title),position=coalesce((p_data->>'position')::integer,position),is_completed=coalesce((p_data->>'is_completed')::boolean,is_completed) where id=child_id and task_id=p_id;
  end if;
  if not found then raise exception 'Subtask not found' using errcode='P0002'; end if;
  update public.tasks set title=title where id=p_id;
 when 'subtask_delete' then
  delete from public.task_subtasks where id=(p_data->>'id')::uuid and task_id=p_id;
  if not found then raise exception 'Subtask not found' using errcode='P0002'; end if;
  update public.tasks set title=title where id=p_id;
 else raise exception 'Unknown action' using errcode='22023';
 end case;
 return jsonb_build_object('id',p_id);
end $function$;

REVOKE ALL ON FUNCTION "public"."task_mutate_legacy"(text, uuid, bigint, jsonb) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.task_refresh_reminders()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 if public.task_role() is null then raise exception 'Editor required' using errcode='42501';end if;
 insert into public.task_notifications(user_id,task_id,kind,dedupe_key)
 select auth.uid(),t.id,case when public.task_deadline(due_at,due_date,due_timezone)<=now() then 'overdue' else 'due_soon' end,
 t.id||':'||case when public.task_deadline(due_at,due_date,due_timezone)<=now() then 'overdue' else 'due_soon' end||':'||coalesce(due_at::text,due_date::text)||':'||due_timezone
 from public.tasks t where public.task_is_member(t.id) and archived_at is null and deleted_at is null and status not in ('completed','cancelled')
 and public.task_deadline(due_at,due_date,due_timezone)<=now()+interval '24 hours' on conflict do nothing;
end $function$;

REVOKE ALL ON FUNCTION "public"."task_refresh_reminders"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.task_role()
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$ select role from public.editors where user_id=(select auth.uid()) and role in ('admin','management') $function$;

REVOKE ALL ON FUNCTION "public"."task_role"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.task_schedule_auto_archive()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
 if new.status<>'completed' then new.auto_archive_at:=null;new.auto_archived:=false;
 elsif tg_op='INSERT' or old.status<>'completed' then new.auto_archive_at:=new.completed_at+interval '24 hours';new.auto_archived:=false;
 elsif old.archived_at is not null and new.archived_at is null then new.auto_archive_at:=clock_timestamp()+interval '24 hours';new.auto_archived:=false;
 else new.auto_archive_at:=old.auto_archive_at; end if;
 return new;
end $function$;

REVOKE ALL ON FUNCTION "public"."task_schedule_auto_archive"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.task_soft_delete (
  p_id       uuid,
  p_revision bigint
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 if public.task_role()<>'management' or public.task_role() is null then raise exception 'Management required' using errcode='42501'; end if;
 perform public.task_lock(p_id,p_revision);
 update public.tasks set deleted_at=clock_timestamp() where id=p_id;
end $function$;

REVOKE ALL ON FUNCTION "public"."task_soft_delete"(uuid, bigint) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.task_team()
  RETURNS TABLE (
    user_id      uuid,
    role         text,
    display_name text
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
 select e.user_id,e.role,coalesce(nullif(left(u.raw_user_meta_data->>'full_name',120),''),nullif(left(u.raw_user_meta_data->>'display_name',120),''),'عضو الفريق')
 from public.editors e join auth.users u on u.id=e.user_id where public.task_role() is not null and e.role in ('admin','management') order by e.added_at,e.user_id
$function$;

REVOKE ALL ON FUNCTION "public"."task_team"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.task_visible (
  p_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$ select public.task_role() is not null and exists(select 1 from public.tasks where id=p_id and deleted_at is null) $function$;

REVOKE ALL ON FUNCTION "public"."task_visible"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.touch_ranking_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin new.updated_at = clock_timestamp(); return new; end;
$function$;

CREATE OR REPLACE FUNCTION public.touch_stats_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

ALTER TABLE "public"."debate_comments"
  ADD CONSTRAINT "debate_comments_parent_id_debate_id_fkey" FOREIGN KEY (parent_id, debate_id) REFERENCES public.debate_comments(id, debate_id) ON DELETE RESTRICT;

ALTER TABLE "public"."debate_comments"
  ADD CONSTRAINT "debate_comments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."debate_moderation_actions"
  ADD CONSTRAINT "debate_moderation_actions_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."debate_moderation_actions"
  ADD CONSTRAINT "debate_moderation_actions_undo_of_fkey" FOREIGN KEY (undo_of) REFERENCES public.debate_moderation_actions(id);

ALTER TABLE "public"."debate_questions"
  ADD CONSTRAINT "debate_questions_participant_id_debate_id_fkey" FOREIGN KEY (participant_id, debate_id) REFERENCES public.debate_participants(id, debate_id) ON DELETE RESTRICT;

ALTER TABLE "public"."debate_questions"
  ADD CONSTRAINT "debate_questions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."debate_rate_limits"
  ADD CONSTRAINT "debate_rate_limits_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."debate_reports"
  ADD CONSTRAINT "debate_reports_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES public.debate_comments(id) ON DELETE CASCADE;

ALTER TABLE "public"."debate_reports"
  ADD CONSTRAINT "debate_reports_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."debate_participants"
  ADD CONSTRAINT "debate_participants_speaker_id_fkey" FOREIGN KEY (speaker_id) REFERENCES public.debate_speakers(id) ON DELETE RESTRICT;

ALTER TABLE "public"."debate_suggestions"
  ADD CONSTRAINT "debate_suggestions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."debate_votes"
  ADD CONSTRAINT "debate_votes_option_id_debate_id_fkey" FOREIGN KEY (option_id, debate_id) REFERENCES public.debate_poll_options(id, debate_id) ON DELETE RESTRICT;

ALTER TABLE "public"."debate_votes"
  ADD CONSTRAINT "debate_votes_poll_id_debate_id_fkey" FOREIGN KEY (poll_id, debate_id) REFERENCES public.debate_polls(id, debate_id) ON DELETE CASCADE;

ALTER TABLE "public"."debate_votes"
  ADD CONSTRAINT "debate_votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."debates"
  ADD CONSTRAINT "debates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."debate_comments"
  ADD CONSTRAINT "debate_comments_debate_id_fkey" FOREIGN KEY (debate_id) REFERENCES public.debates(id) ON DELETE CASCADE;

ALTER TABLE "public"."debate_participants"
  ADD CONSTRAINT "debate_participants_debate_id_fkey" FOREIGN KEY (debate_id) REFERENCES public.debates(id) ON DELETE CASCADE;

ALTER TABLE "public"."debate_poll_options"
  ADD CONSTRAINT "debate_poll_options_debate_id_fkey" FOREIGN KEY (debate_id) REFERENCES public.debates(id) ON DELETE CASCADE;

ALTER TABLE "public"."debate_polls"
  ADD CONSTRAINT "debate_polls_debate_id_fkey" FOREIGN KEY (debate_id) REFERENCES public.debates(id) ON DELETE CASCADE;

ALTER TABLE "public"."debate_questions"
  ADD CONSTRAINT "debate_questions_debate_id_fkey" FOREIGN KEY (debate_id) REFERENCES public.debates(id) ON DELETE CASCADE;

ALTER TABLE "public"."debate_result_updates"
  ADD CONSTRAINT "debate_result_updates_debate_id_fkey" FOREIGN KEY (debate_id) REFERENCES public.debates(id) ON DELETE CASCADE;

ALTER TABLE "public"."debate_suggestions"
  ADD CONSTRAINT "debate_suggestions_converted_debate_id_fkey" FOREIGN KEY (converted_debate_id) REFERENCES public.debates(id) ON DELETE SET NULL;

ALTER TABLE "public"."debate_task_links"
  ADD CONSTRAINT "debate_task_links_debate_id_fkey" FOREIGN KEY (debate_id) REFERENCES public.debates(id) ON DELETE CASCADE;

ALTER TABLE "public"."debate_video_chapters"
  ADD CONSTRAINT "debate_video_chapters_debate_id_fkey" FOREIGN KEY (debate_id) REFERENCES public.debates(id) ON DELETE CASCADE;

ALTER TABLE "public"."debate_votes"
  ADD CONSTRAINT "debate_votes_debate_id_fkey" FOREIGN KEY (debate_id) REFERENCES public.debates(id) ON DELETE CASCADE;

ALTER TABLE "public"."editor_drafts"
  ADD CONSTRAINT "editor_drafts_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."editors"
  ADD CONSTRAINT "editors_added_by_fkey" FOREIGN KEY (added_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."editors"
  ADD CONSTRAINT "editors_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."districts"
  ADD CONSTRAINT "districts_governorate_id_fkey" FOREIGN KEY (governorate_id) REFERENCES public.governorates(id) ON DELETE SET NULL;

ALTER TABLE "public"."inline_content_audit"
  ADD CONSTRAINT "inline_content_audit_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."inline_content_audit"
  ADD CONSTRAINT "inline_content_audit_undo_of_fkey" FOREIGN KEY (undo_of) REFERENCES public.inline_content_audit(id);

ALTER TABLE "public"."medical_center_branches"
  ADD CONSTRAINT "medical_center_branches_medical_center_id_fkey" FOREIGN KEY (medical_center_id) REFERENCES public.medical_centers(id) ON DELETE CASCADE;

ALTER TABLE "public"."medical_center_hours"
  ADD CONSTRAINT "medical_center_hours_medical_center_id_fkey" FOREIGN KEY (medical_center_id) REFERENCES public.medical_centers(id) ON DELETE CASCADE;

ALTER TABLE "public"."medical_center_services"
  ADD CONSTRAINT "medical_center_services_medical_center_id_fkey" FOREIGN KEY (medical_center_id) REFERENCES public.medical_centers(id) ON DELETE CASCADE;

ALTER TABLE "public"."medical_center_sources"
  ADD CONSTRAINT "medical_center_sources_medical_center_id_fkey" FOREIGN KEY (medical_center_id) REFERENCES public.medical_centers(id) ON DELETE CASCADE;

ALTER TABLE "public"."medical_center_specialties"
  ADD CONSTRAINT "medical_center_specialties_medical_center_id_fkey" FOREIGN KEY (medical_center_id) REFERENCES public.medical_centers(id) ON DELETE CASCADE;

ALTER TABLE "public"."message_followups"
  ADD CONSTRAINT "message_followups_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."message_followups"
  ADD CONSTRAINT "message_followups_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."message_followups"
  ADD CONSTRAINT "message_followups_message_id_fkey" FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;

ALTER TABLE "public"."messages"
  ADD CONSTRAINT "messages_status_updated_by_fkey" FOREIGN KEY (status_updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."public_profiles"
  ADD CONSTRAINT "public_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."ranking_snapshots"
  ADD CONSTRAINT "ranking_snapshots_indicator_id_fkey" FOREIGN KEY (indicator_id) REFERENCES public.ranking_indicators(id) ON DELETE CASCADE;

ALTER TABLE "public"."stat_indicators"
  ADD CONSTRAINT "stat_indicators_domain_id_fkey" FOREIGN KEY (domain_id) REFERENCES public.stat_domains(id) ON DELETE RESTRICT;

ALTER TABLE "public"."stat_indicator_sources"
  ADD CONSTRAINT "stat_indicator_sources_indicator_id_fkey" FOREIGN KEY (indicator_id) REFERENCES public.stat_indicators(id) ON DELETE CASCADE;

ALTER TABLE "public"."stat_domains"
  ADD CONSTRAINT "stat_domains_section_id_fkey" FOREIGN KEY (section_id) REFERENCES public.stat_sections(id) ON DELETE CASCADE;

ALTER TABLE "public"."stat_indicator_sources"
  ADD CONSTRAINT "stat_indicator_sources_source_id_fkey" FOREIGN KEY (source_id) REFERENCES public.stat_sources(id) ON DELETE RESTRICT;

ALTER TABLE "public"."stat_indicators"
  ADD CONSTRAINT "stat_indicators_adopted_source_id_fkey" FOREIGN KEY (adopted_source_id) REFERENCES public.stat_sources(id) ON DELETE SET NULL;

ALTER TABLE "public"."stat_values"
  ADD CONSTRAINT "stat_values_indicator_id_fkey" FOREIGN KEY (indicator_id) REFERENCES public.stat_indicators(id) ON DELETE CASCADE;

ALTER TABLE "public"."stat_values"
  ADD CONSTRAINT "stat_values_source_id_fkey" FOREIGN KEY (source_id) REFERENCES public.stat_sources(id) ON DELETE RESTRICT;

ALTER TABLE "public"."task_activity"
  ADD CONSTRAINT "task_activity_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE "public"."task_comments"
  ADD CONSTRAINT "task_comments_same_task_parent" FOREIGN KEY (task_id, parent_id) REFERENCES public.task_comments(task_id, id) ON DELETE RESTRICT;

ALTER TABLE "public"."task_members"
  ADD CONSTRAINT "task_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE "public"."task_notifications"
  ADD CONSTRAINT "task_notifications_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES public.task_comments(id) ON DELETE RESTRICT;

ALTER TABLE "public"."task_notifications"
  ADD CONSTRAINT "task_notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."tasks"
  ADD CONSTRAINT "tasks_completed_by_fkey" FOREIGN KEY (completed_by) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE "public"."debate_task_links"
  ADD CONSTRAINT "debate_task_links_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE RESTRICT;

ALTER TABLE "public"."message_followups"
  ADD CONSTRAINT "message_followups_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;

ALTER TABLE "public"."task_activity"
  ADD CONSTRAINT "task_activity_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE RESTRICT;

ALTER TABLE "public"."task_comments"
  ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE RESTRICT;

ALTER TABLE "public"."task_members"
  ADD CONSTRAINT "task_members_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE RESTRICT;

ALTER TABLE "public"."task_notifications"
  ADD CONSTRAINT "task_notifications_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE RESTRICT;

ALTER TABLE "public"."task_subtasks"
  ADD CONSTRAINT "task_subtasks_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE RESTRICT;

ALTER TABLE "public"."tasks"
  ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.task_projects(id) ON DELETE RESTRICT;

ALTER TABLE "public"."tasks"
  ADD CONSTRAINT "tasks_recurrence_of_fkey" FOREIGN KEY (recurrence_of) REFERENCES public.tasks(id) ON DELETE RESTRICT;

ALTER TABLE "public"."university_branches"
  ADD CONSTRAINT "university_branches_university_id_fkey" FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;

ALTER TABLE "public"."university_programs"
  ADD CONSTRAINT "university_programs_university_id_fkey" FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;

ALTER TABLE "public"."university_sources"
  ADD CONSTRAINT "university_sources_university_id_fkey" FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;

ALTER TABLE "public"."works"
  ADD CONSTRAINT "works_debate_id_fkey" FOREIGN KEY (debate_id) REFERENCES public.debates(id) ON DELETE CASCADE;

CREATE INDEX contact_rate_limits_expiry_idx ON public.contact_rate_limits USING btree (expires_at);

CREATE INDEX debate_comment_owner_idx ON public.debate_comments USING btree (user_id, created_at);

CREATE INDEX debate_comment_queue_idx ON public.debate_comments USING btree (debate_id, status, created_at, id);

CREATE INDEX debate_history_target_idx ON public.debate_moderation_actions USING btree (target_id, created_at DESC);

CREATE UNIQUE INDEX debate_one_undo_idx ON public.debate_moderation_actions USING btree (undo_of)
  WHERE (undo_of IS NOT NULL);

CREATE INDEX debate_participant_speaker_idx ON public.debate_participants USING btree (speaker_id);

CREATE INDEX debate_pinned_idx ON public.debate_comments USING btree (debate_id, pinned_at)
  WHERE ((pinned_at IS NOT NULL) AND (status = 'approved'::text));

CREATE INDEX debate_question_owner_idx ON public.debate_questions USING btree (user_id, created_at);

CREATE INDEX debate_question_queue_idx ON public.debate_questions USING btree (debate_id, status, created_at);

CREATE INDEX debate_report_queue_idx ON public.debate_reports USING btree (status, created_at);

CREATE INDEX debate_suggestion_owner_idx ON public.debate_suggestions USING btree (user_id, created_at);

CREATE INDEX debate_vote_distribution_idx ON public.debate_votes USING btree (poll_id, option_id);

CREATE INDEX debate_vote_pair_idx ON public.debate_votes USING btree (debate_id, user_id);

CREATE INDEX debate_vote_poll_idx ON public.debate_votes USING btree (poll_id, option_id);

CREATE INDEX debates_public_idx ON public.debates USING btree (publication_status, scheduled_at, created_at);

CREATE INDEX districts_governorate_idx ON public.districts USING btree (governorate_id);

CREATE INDEX editorial_contributions_member ON public.editorial_contributions USING btree (actor_id, created_at DESC);

CREATE INDEX editorial_contributions_time ON public.editorial_contributions USING btree (created_at DESC, id);

CREATE INDEX inline_content_history_idx ON public.inline_content_audit USING btree (kind, target_id, created_at DESC);

CREATE UNIQUE INDEX inline_content_one_undo_idx ON public.inline_content_audit USING btree (undo_of)
  WHERE (undo_of IS NOT NULL);

CREATE INDEX issues_public_idx ON public.issues USING btree (is_published, issue_date DESC);

CREATE UNIQUE INDEX medical_branches_identity ON public.medical_center_branches USING btree (medical_center_id, name, COALESCE(city, ''::text));

CREATE INDEX medical_branches_parent ON public.medical_center_branches USING btree (medical_center_id, display_order);

CREATE INDEX medical_centers_public_list ON public.medical_centers USING btree (is_published, deleted_at, governorate, name_ar);

CREATE INDEX medical_hours_parent ON public.medical_center_hours USING btree (medical_center_id, display_order);

CREATE INDEX medical_services_parent ON public.medical_center_services USING btree (medical_center_id, display_order);

CREATE INDEX medical_sources_parent ON public.medical_center_sources USING btree (medical_center_id, checked_at DESC);

CREATE INDEX medical_specialties_parent ON public.medical_center_specialties USING btree (medical_center_id, display_order);

CREATE INDEX messages_created_idx ON public.messages USING btree (created_at DESC);

CREATE INDEX professionals_public_idx ON public.professionals USING btree (is_published, created_at DESC);

CREATE INDEX professionals_search_idx ON public.professionals USING btree (category, location);

CREATE INDEX ranking_indicators_public_order_idx ON public.ranking_indicators USING btree (is_published, display_order, id);

CREATE INDEX stat_domains_section_order_idx ON public.stat_domains USING btree (section_id, display_order);

CREATE UNIQUE INDEX stat_indicator_one_adopted_source ON public.stat_indicator_sources USING btree (indicator_id)
  WHERE is_adopted;

CREATE INDEX stat_indicators_domain_idx ON public.stat_indicators USING btree (domain_id, is_published);

CREATE INDEX stat_values_indicator_year_idx ON public.stat_values USING btree (indicator_id, year);

CREATE INDEX stat_values_published_idx ON public.stat_values USING btree (is_published, national_scope);

CREATE INDEX task_activity_parent_idx ON public.task_activity USING btree (task_id, created_at DESC, id);

CREATE INDEX task_comments_parent_idx ON public.task_comments USING btree (task_id, created_at, id);

CREATE INDEX task_comments_thread_idx ON public.task_comments USING btree (task_id, parent_id, created_at, id);

CREATE INDEX task_members_user_idx ON public.task_members USING btree (user_id, task_id);

CREATE INDEX task_notifications_user_idx ON public.task_notifications USING btree (user_id, created_at DESC);

CREATE INDEX task_subtasks_parent_idx ON public.task_subtasks USING btree (task_id, "position", id);

CREATE INDEX tasks_auto_archive_due ON public.tasks USING btree (auto_archive_at, completed_at)
  WHERE ((status = 'completed'::text) AND (archived_at IS NULL) AND (deleted_at IS NULL));

CREATE INDEX tasks_due_idx ON public.tasks USING btree (due_at, due_date)
  WHERE ((archived_at IS NULL) AND (deleted_at IS NULL));

CREATE INDEX tasks_project_idx ON public.tasks USING btree (project_id);

CREATE INDEX tasks_updated_idx ON public.tasks USING btree (updated_at DESC, id);

CREATE INDEX universities_public_list ON public.universities USING btree (is_published, deleted_at, governorate, name_ar);

CREATE UNIQUE INDEX university_branches_identity ON public.university_branches USING btree (university_id, name, COALESCE(city, ''::text));

CREATE INDEX university_branches_parent ON public.university_branches USING btree (university_id, display_order);

CREATE INDEX university_programs_parent ON public.university_programs USING btree (university_id, display_order);

CREATE INDEX university_sources_parent ON public.university_sources USING btree (university_id, checked_at DESC);

CREATE INDEX works_public_idx ON public.works USING btree (is_published, published_at DESC);

CREATE INDEX yemeni_companies_public_idx ON public.yemeni_companies USING btree (is_published, created_at DESC);

CREATE INDEX yemeni_figures_filters_idx ON public.yemeni_figures USING btree (governorate_id, field, era);

CREATE INDEX yemeni_figures_public_idx ON public.yemeni_figures USING btree (is_published, display_order, full_name);

CREATE TRIGGER debate_profile_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.debate_profile_signup();

CREATE TRIGGER inline_comment_pin_guard
  BEFORE INSERT OR UPDATE ON public.debate_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.inline_comment_pin_guard();

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.debate_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE TRIGGER debate_result_change
  AFTER INSERT OR DELETE OR UPDATE ON public.debate_poll_options
  FOR EACH ROW
  EXECUTE FUNCTION public.debate_result_change();

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.debate_poll_options
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE TRIGGER debate_result_change
  AFTER INSERT OR DELETE OR UPDATE ON public.debate_polls
  FOR EACH ROW
  EXECUTE FUNCTION public.debate_result_change();

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.debate_polls
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.debate_speakers
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.debate_video_chapters
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE TRIGGER debate_result_change
  AFTER INSERT OR DELETE OR UPDATE ON public.debate_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.debate_result_change();

CREATE TRIGGER debate_recording_lifecycle
  BEFORE INSERT OR UPDATE ON public.debates
  FOR EACH ROW
  EXECUTE FUNCTION public.debate_recording_lifecycle_guard();

CREATE TRIGGER debate_result_debate_change
  AFTER INSERT OR UPDATE OF publication_status, live_results_enabled, results_published, recording_published, stage, questions_open, comments_open, axes, question ON public.debates
  FOR EACH ROW
  EXECUTE FUNCTION public.debate_result_debate_change();

CREATE TRIGGER debate_slug_route_guard
  BEFORE INSERT OR UPDATE OF slug ON public.debates
  FOR EACH ROW
  EXECUTE FUNCTION public.debate_slug_route_guard();

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.debates
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.districts
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE TRIGGER inline_content_audit
  AFTER INSERT OR DELETE OR UPDATE ON public.districts
  FOR EACH ROW
  EXECUTE FUNCTION public.inline_content_audit_change('district');

CREATE TRIGGER inline_content_guard
  BEFORE INSERT OR UPDATE ON public.districts
  FOR EACH ROW
  EXECUTE FUNCTION public.inline_content_guard('district');

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.governorates
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE TRIGGER inline_content_audit
  AFTER INSERT OR DELETE OR UPDATE ON public.governorates
  FOR EACH ROW
  EXECUTE FUNCTION public.inline_content_audit_change('governorate');

CREATE TRIGGER inline_content_guard
  BEFORE INSERT OR UPDATE ON public.governorates
  FOR EACH ROW
  EXECUTE FUNCTION public.inline_content_guard('governorate');

CREATE TRIGGER editorial_inline_identity
  AFTER INSERT OR UPDATE ON public.inline_content_audit
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_inline_bridge();

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE TRIGGER inline_content_audit
  AFTER INSERT OR DELETE OR UPDATE ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.inline_content_audit_change('issue');

CREATE TRIGGER inline_content_guard
  BEFORE INSERT OR UPDATE ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.inline_content_guard('issue');

CREATE TRIGGER directory_editorial_change
  AFTER INSERT OR DELETE OR UPDATE ON public.medical_center_branches
  FOR EACH ROW
  EXECUTE FUNCTION public.directory_editorial_trigger();

CREATE TRIGGER directory_editorial_change
  AFTER INSERT OR DELETE OR UPDATE ON public.medical_center_hours
  FOR EACH ROW
  EXECUTE FUNCTION public.directory_editorial_trigger();

CREATE TRIGGER directory_editorial_change
  AFTER INSERT OR DELETE OR UPDATE ON public.medical_center_services
  FOR EACH ROW
  EXECUTE FUNCTION public.directory_editorial_trigger();

CREATE TRIGGER directory_editorial_change
  AFTER INSERT OR DELETE OR UPDATE ON public.medical_center_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.directory_editorial_trigger();

CREATE TRIGGER directory_editorial_change
  AFTER INSERT OR DELETE OR UPDATE ON public.medical_center_specialties
  FOR EACH ROW
  EXECUTE FUNCTION public.directory_editorial_trigger();

CREATE TRIGGER directory_editorial_change
  AFTER INSERT OR DELETE OR UPDATE ON public.medical_centers
  FOR EACH ROW
  EXECUTE FUNCTION public.directory_editorial_trigger();

CREATE TRIGGER medical_centers_revision
  BEFORE UPDATE ON public.medical_centers
  FOR EACH ROW
  EXECUTE FUNCTION public.directory_touch_revision();

CREATE TRIGGER contact_message_status_audit
  BEFORE UPDATE OF status ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.contact_message_status_audit();

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.professionals
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE TRIGGER inline_content_audit
  AFTER INSERT OR DELETE OR UPDATE ON public.professionals
  FOR EACH ROW
  EXECUTE FUNCTION public.inline_content_audit_change('professional');

CREATE TRIGGER inline_content_guard
  BEFORE INSERT OR UPDATE ON public.professionals
  FOR EACH ROW
  EXECUTE FUNCTION public.inline_content_guard('professional');

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.ranking_indicators
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE TRIGGER ranking_indicator_updated_at
  BEFORE UPDATE ON public.ranking_indicators
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_ranking_updated_at();

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.ranking_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE TRIGGER ranking_snapshot_updated_at
  BEFORE UPDATE ON public.ranking_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_ranking_updated_at();

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.stat_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE TRIGGER stat_domains_touch_updated_at
  BEFORE UPDATE ON public.stat_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_stats_updated_at();

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.stat_indicator_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.stat_indicators
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE TRIGGER stat_indicators_touch_updated_at
  BEFORE UPDATE ON public.stat_indicators
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_stats_updated_at();

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.stat_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE TRIGGER stat_sections_touch_updated_at
  BEFORE UPDATE ON public.stat_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_stats_updated_at();

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.stat_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE TRIGGER stat_sources_touch_updated_at
  BEFORE UPDATE ON public.stat_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_stats_updated_at();

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.stat_values
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE TRIGGER stat_values_touch_updated_at
  BEFORE UPDATE ON public.stat_values
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_stats_updated_at();

CREATE TRIGGER task_comment_audit
  AFTER INSERT OR DELETE OR UPDATE ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.task_child_audit();

CREATE TRIGGER task_comment_guard
  BEFORE INSERT OR DELETE OR UPDATE ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.task_child_guard();

CREATE TRIGGER task_member_audit
  AFTER INSERT OR DELETE ON public.task_members
  FOR EACH ROW
  EXECUTE FUNCTION public.task_member_audit();

CREATE TRIGGER task_member_guard
  BEFORE INSERT OR DELETE ON public.task_members
  FOR EACH ROW
  EXECUTE FUNCTION public.task_member_guard();

CREATE TRIGGER task_subtask_audit
  AFTER INSERT OR DELETE OR UPDATE ON public.task_subtasks
  FOR EACH ROW
  EXECUTE FUNCTION public.task_child_audit();

CREATE TRIGGER task_subtask_guard
  BEFORE INSERT OR DELETE OR UPDATE ON public.task_subtasks
  FOR EACH ROW
  EXECUTE FUNCTION public.task_child_guard();

CREATE TRIGGER task_audit
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.task_audit();

CREATE TRIGGER task_collaboration_copy
  AFTER INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.task_collaboration_copy();

CREATE TRIGGER task_collaboration_primary
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.task_collaboration_primary();

CREATE TRIGGER task_collaboration_status
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.task_collaboration_status();

CREATE TRIGGER task_guard
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.task_guard();

CREATE TRIGGER task_schedule_auto_archive
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.task_schedule_auto_archive();

CREATE TRIGGER directory_editorial_change
  AFTER INSERT OR DELETE OR UPDATE ON public.universities
  FOR EACH ROW
  EXECUTE FUNCTION public.directory_editorial_trigger();

CREATE TRIGGER universities_revision
  BEFORE UPDATE ON public.universities
  FOR EACH ROW
  EXECUTE FUNCTION public.directory_touch_revision();

CREATE TRIGGER directory_editorial_change
  AFTER INSERT OR DELETE OR UPDATE ON public.university_branches
  FOR EACH ROW
  EXECUTE FUNCTION public.directory_editorial_trigger();

CREATE TRIGGER directory_editorial_change
  AFTER INSERT OR DELETE OR UPDATE ON public.university_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.directory_editorial_trigger();

CREATE TRIGGER directory_editorial_change
  AFTER INSERT OR DELETE OR UPDATE ON public.university_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.directory_editorial_trigger();

CREATE TRIGGER debate_work_guard
  BEFORE INSERT OR UPDATE ON public.works
  FOR EACH ROW
  EXECUTE FUNCTION public.debate_work_guard();

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.works
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE TRIGGER inline_content_audit
  AFTER INSERT OR DELETE OR UPDATE ON public.works
  FOR EACH ROW
  EXECUTE FUNCTION public.inline_content_audit_change('work');

CREATE TRIGGER inline_content_guard
  BEFORE INSERT OR UPDATE ON public.works
  FOR EACH ROW
  EXECUTE FUNCTION public.inline_content_guard('work');

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.yemeni_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE TRIGGER inline_content_audit
  AFTER INSERT OR DELETE OR UPDATE ON public.yemeni_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.inline_content_audit_change('company');

CREATE TRIGGER inline_content_guard
  BEFORE INSERT OR UPDATE ON public.yemeni_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.inline_content_guard('company');

CREATE TRIGGER editorial_committed_change
  AFTER INSERT OR DELETE OR UPDATE ON public.yemeni_figures
  FOR EACH ROW
  EXECUTE FUNCTION public.editorial_content_trigger();

CREATE POLICY "comments_own_editor" ON "public"."debate_comments"
  FOR SELECT
  TO "authenticated"
  USING (((user_id = auth.uid()) OR (public.debate_role() IS NOT NULL)));

CREATE POLICY "moderation_management" ON "public"."debate_moderation_actions"
  FOR SELECT
  TO "authenticated"
  USING ((public.debate_role() = 'management'::text));

CREATE POLICY "editor_read" ON "public"."debate_participants"
  FOR SELECT
  TO "authenticated"
  USING ((public.debate_role() IS NOT NULL));

CREATE POLICY "editor_read" ON "public"."debate_poll_options"
  FOR SELECT
  TO "authenticated"
  USING ((public.debate_role() IS NOT NULL));

CREATE POLICY "editor_read" ON "public"."debate_polls"
  FOR SELECT
  TO "authenticated"
  USING ((public.debate_role() IS NOT NULL));

CREATE POLICY "questions_own_editor" ON "public"."debate_questions"
  FOR SELECT
  TO "authenticated"
  USING (((user_id = auth.uid()) OR (public.debate_role() IS NOT NULL)));

CREATE POLICY "reports_read" ON "public"."debate_reports"
  FOR SELECT
  TO "authenticated"
  USING (((user_id = auth.uid()) OR (public.debate_role() IS NOT NULL)));

CREATE POLICY "result_updates_public" ON "public"."debate_result_updates"
  FOR SELECT
  TO "anon", "authenticated"
  USING (public.debate_result_updates_visible(debate_id));

CREATE POLICY "editor_read" ON "public"."debate_speakers"
  FOR SELECT
  TO "authenticated"
  USING ((public.debate_role() IS NOT NULL));

CREATE POLICY "suggestions_own_editor" ON "public"."debate_suggestions"
  FOR SELECT
  TO "authenticated"
  USING (((user_id = auth.uid()) OR (public.debate_role() IS NOT NULL)));

CREATE POLICY "editor_read" ON "public"."debate_task_links"
  FOR SELECT
  TO "authenticated"
  USING ((public.debate_role() IS NOT NULL));

CREATE POLICY "editor_read" ON "public"."debate_video_chapters"
  FOR SELECT
  TO "authenticated"
  USING ((public.debate_role() IS NOT NULL));

CREATE POLICY "votes_own_only" ON "public"."debate_votes"
  FOR SELECT
  TO "authenticated"
  USING ((user_id = auth.uid()));

CREATE POLICY "editor_read" ON "public"."debates"
  FOR SELECT
  TO "authenticated"
  USING ((public.debate_role() IS NOT NULL));

CREATE POLICY "Editors insert districts" ON "public"."districts"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Editors update districts" ON "public"."districts"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Management delete districts" ON "public"."districts"
  FOR DELETE
  TO "authenticated"
  USING (public.is_management());

CREATE POLICY "Public read districts" ON "public"."districts"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "editor_own_drafts" ON "public"."editor_drafts"
  FOR SELECT
  TO "authenticated"
  USING (((owner_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.editors
  WHERE ((editors.user_id = auth.uid()) AND (editors.role = ANY (ARRAY['admin'::text, 'management'::text])))))));

CREATE POLICY "editorial_activation_read" ON "public"."editorial_audit_activation"
  FOR SELECT
  TO "authenticated"
  USING (public.editorial_can_read());

CREATE POLICY "editorial_team_read" ON "public"."editorial_contributions"
  FOR SELECT
  TO "authenticated"
  USING (public.editorial_can_read());

CREATE POLICY "Editors can see permitted accounts" ON "public"."editors"
  FOR SELECT
  TO "authenticated"
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_management()));

CREATE POLICY "Editors insert governorates" ON "public"."governorates"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Editors update governorates" ON "public"."governorates"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Management delete governorates" ON "public"."governorates"
  FOR DELETE
  TO "authenticated"
  USING (public.is_management());

CREATE POLICY "Public read governorates" ON "public"."governorates"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "inline_content_audit_editor" ON "public"."inline_content_audit"
  FOR SELECT
  TO "authenticated"
  USING ((public.debate_role() IS NOT NULL));

CREATE POLICY "Editors insert issues" ON "public"."issues"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Editors read all issues" ON "public"."issues"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Editors update issues" ON "public"."issues"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Management delete issues" ON "public"."issues"
  FOR DELETE
  TO "authenticated"
  USING (public.is_management());

CREATE POLICY "Public reads published issues" ON "public"."issues"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((is_published = true));

CREATE POLICY "medical_branches_public_read" ON "public"."medical_center_branches"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.medical_centers p
  WHERE ((p.id = medical_center_branches.medical_center_id) AND ((p.is_published AND (p.deleted_at IS NULL)) OR public.is_editor())))));

CREATE POLICY "medical_hours_public_read" ON "public"."medical_center_hours"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.medical_centers p
  WHERE ((p.id = medical_center_hours.medical_center_id) AND ((p.is_published AND (p.deleted_at IS NULL)) OR public.is_editor())))));

CREATE POLICY "medical_services_public_read" ON "public"."medical_center_services"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.medical_centers p
  WHERE ((p.id = medical_center_services.medical_center_id) AND ((p.is_published AND (p.deleted_at IS NULL)) OR public.is_editor())))));

CREATE POLICY "medical_sources_public_read" ON "public"."medical_center_sources"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.medical_centers p
  WHERE ((p.id = medical_center_sources.medical_center_id) AND ((p.is_published AND (p.deleted_at IS NULL)) OR public.is_editor())))));

CREATE POLICY "medical_specialties_public_read" ON "public"."medical_center_specialties"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.medical_centers p
  WHERE ((p.id = medical_center_specialties.medical_center_id) AND ((p.is_published AND (p.deleted_at IS NULL)) OR public.is_editor())))));

CREATE POLICY "medical_centers_public_read" ON "public"."medical_centers"
  FOR SELECT
  TO PUBLIC
  USING (((is_published AND (deleted_at IS NULL)) OR public.is_editor()));

CREATE POLICY "editor_message_followups" ON "public"."message_followups"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE ((editors.user_id = auth.uid()) AND (editors.role = ANY (ARRAY['admin'::text, 'management'::text]))))));

CREATE POLICY "Editors follow up messages" ON "public"."messages"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_editor())
  WITH CHECK (public.is_editor());

CREATE POLICY "Editors read messages" ON "public"."messages"
  FOR SELECT
  TO "authenticated"
  USING (public.is_editor());

CREATE POLICY "Editors insert professionals" ON "public"."professionals"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Editors read all professionals" ON "public"."professionals"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Editors update professionals" ON "public"."professionals"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Management delete professionals" ON "public"."professionals"
  FOR DELETE
  TO "authenticated"
  USING (public.is_management());

CREATE POLICY "Public reads published professionals" ON "public"."professionals"
  FOR SELECT
  TO "anon", "authenticated"
  USING (is_published);

CREATE POLICY "profile_read" ON "public"."public_profiles"
  FOR SELECT
  TO "authenticated"
  USING (((user_id = auth.uid()) OR (public.debate_role() = 'management'::text)));

CREATE POLICY "ranking_indicators_editor_read" ON "public"."ranking_indicators"
  FOR SELECT
  TO "authenticated"
  USING (public.is_ranking_editor());

CREATE POLICY "ranking_indicators_public_read" ON "public"."ranking_indicators"
  FOR SELECT
  TO "anon", "authenticated"
  USING (is_published);

CREATE POLICY "ranking_snapshots_editor_read" ON "public"."ranking_snapshots"
  FOR SELECT
  TO "authenticated"
  USING (public.is_ranking_editor());

CREATE POLICY "ranking_snapshots_public_read" ON "public"."ranking_snapshots"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.ranking_indicators i
  WHERE ((i.id = ranking_snapshots.indicator_id) AND i.is_published))));

CREATE POLICY "Editors insert site settings" ON "public"."site_settings"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Editors update site settings" ON "public"."site_settings"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Management delete site_settings" ON "public"."site_settings"
  FOR DELETE
  TO "authenticated"
  USING (public.is_management());

CREATE POLICY "Public read site settings" ON "public"."site_settings"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "stat_domains_editor_insert" ON "public"."stat_domains"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_editor());

CREATE POLICY "stat_domains_editor_read" ON "public"."stat_domains"
  FOR SELECT
  TO "authenticated"
  USING (public.is_editor());

CREATE POLICY "stat_domains_editor_update" ON "public"."stat_domains"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_editor())
  WITH CHECK (public.is_editor());

CREATE POLICY "stat_domains_management_delete" ON "public"."stat_domains"
  FOR DELETE
  TO "authenticated"
  USING (public.is_management());

CREATE POLICY "stat_domains_public_read" ON "public"."stat_domains"
  FOR SELECT
  TO "anon", "authenticated"
  USING (is_published);

CREATE POLICY "stat_indicator_sources_editor_delete" ON "public"."stat_indicator_sources"
  FOR DELETE
  TO "authenticated"
  USING (public.is_editor());

CREATE POLICY "stat_indicator_sources_editor_insert" ON "public"."stat_indicator_sources"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_editor());

CREATE POLICY "stat_indicator_sources_editor_read" ON "public"."stat_indicator_sources"
  FOR SELECT
  TO "authenticated"
  USING (public.is_editor());

CREATE POLICY "stat_indicator_sources_editor_update" ON "public"."stat_indicator_sources"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_editor())
  WITH CHECK (public.is_editor());

CREATE POLICY "stat_indicator_sources_public_read" ON "public"."stat_indicator_sources"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.stat_indicators i
  WHERE ((i.id = stat_indicator_sources.indicator_id) AND i.is_published))));

CREATE POLICY "stat_indicators_editor_insert" ON "public"."stat_indicators"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_editor());

CREATE POLICY "stat_indicators_editor_read" ON "public"."stat_indicators"
  FOR SELECT
  TO "authenticated"
  USING (public.is_editor());

CREATE POLICY "stat_indicators_editor_update" ON "public"."stat_indicators"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_editor())
  WITH CHECK (public.is_editor());

CREATE POLICY "stat_indicators_management_delete" ON "public"."stat_indicators"
  FOR DELETE
  TO "authenticated"
  USING (public.is_management());

CREATE POLICY "stat_indicators_public_read" ON "public"."stat_indicators"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((is_published AND ((NOT hide_when_incomplete) OR (data_status = 'complete'::text))));

CREATE POLICY "stat_sections_editor_insert" ON "public"."stat_sections"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_editor());

CREATE POLICY "stat_sections_editor_read" ON "public"."stat_sections"
  FOR SELECT
  TO "authenticated"
  USING (public.is_editor());

CREATE POLICY "stat_sections_editor_update" ON "public"."stat_sections"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_editor())
  WITH CHECK (public.is_editor());

CREATE POLICY "stat_sections_management_delete" ON "public"."stat_sections"
  FOR DELETE
  TO "authenticated"
  USING (public.is_management());

CREATE POLICY "stat_sections_public_read" ON "public"."stat_sections"
  FOR SELECT
  TO "anon", "authenticated"
  USING (is_published);

CREATE POLICY "stat_sources_editor_insert" ON "public"."stat_sources"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_editor());

CREATE POLICY "stat_sources_editor_read" ON "public"."stat_sources"
  FOR SELECT
  TO "authenticated"
  USING (public.is_editor());

CREATE POLICY "stat_sources_editor_update" ON "public"."stat_sources"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_editor())
  WITH CHECK (public.is_editor());

CREATE POLICY "stat_sources_management_delete" ON "public"."stat_sources"
  FOR DELETE
  TO "authenticated"
  USING (public.is_management());

CREATE POLICY "stat_sources_public_read" ON "public"."stat_sources"
  FOR SELECT
  TO "anon", "authenticated"
  USING (is_active);

CREATE POLICY "stat_values_editor_insert" ON "public"."stat_values"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_editor());

CREATE POLICY "stat_values_editor_read" ON "public"."stat_values"
  FOR SELECT
  TO "authenticated"
  USING (public.is_editor());

CREATE POLICY "stat_values_editor_update" ON "public"."stat_values"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_editor())
  WITH CHECK (public.is_editor());

CREATE POLICY "stat_values_management_delete" ON "public"."stat_values"
  FOR DELETE
  TO "authenticated"
  USING (public.is_management());

CREATE POLICY "stat_values_public_read" ON "public"."stat_values"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((is_published AND national_scope AND (EXISTS ( SELECT 1
   FROM public.stat_indicators i
  WHERE ((i.id = stat_values.indicator_id) AND i.is_published AND ((NOT i.hide_when_incomplete) OR (i.data_status = 'complete'::text)))))));

CREATE POLICY "task_activity_read" ON "public"."task_activity"
  FOR SELECT
  TO "authenticated"
  USING ((public.task_role() IS NOT NULL));

CREATE POLICY "task_comments_read" ON "public"."task_comments"
  FOR SELECT
  TO "authenticated"
  USING (public.task_visible(task_id));

CREATE POLICY "task_members_delete" ON "public"."task_members"
  FOR DELETE
  TO "authenticated"
  USING (((public.task_role() = 'management'::text) AND public.task_visible(task_id)));

CREATE POLICY "task_members_insert" ON "public"."task_members"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((public.task_role() = 'management'::text) AND public.task_visible(task_id)));

CREATE POLICY "task_members_read" ON "public"."task_members"
  FOR SELECT
  TO "authenticated"
  USING (public.task_visible(task_id));

CREATE POLICY "task_notifications_read" ON "public"."task_notifications"
  FOR SELECT
  TO "authenticated"
  USING (((public.task_role() IS NOT NULL) AND (user_id = ( SELECT auth.uid() AS uid))));

CREATE POLICY "task_notifications_update" ON "public"."task_notifications"
  FOR UPDATE
  TO "authenticated"
  USING (((public.task_role() IS NOT NULL) AND (user_id = ( SELECT auth.uid() AS uid))))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "task_projects_create" ON "public"."task_projects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((public.task_role() = 'management'::text));

CREATE POLICY "task_projects_read" ON "public"."task_projects"
  FOR SELECT
  TO "authenticated"
  USING ((public.task_role() IS NOT NULL));

CREATE POLICY "task_projects_update" ON "public"."task_projects"
  FOR UPDATE
  TO "authenticated"
  USING ((public.task_role() = 'management'::text))
  WITH CHECK ((public.task_role() = 'management'::text));

CREATE POLICY "task_subtasks_create" ON "public"."task_subtasks"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.task_can_edit(task_id));

CREATE POLICY "task_subtasks_delete" ON "public"."task_subtasks"
  FOR DELETE
  TO "authenticated"
  USING (public.task_can_edit(task_id));

CREATE POLICY "task_subtasks_read" ON "public"."task_subtasks"
  FOR SELECT
  TO "authenticated"
  USING (public.task_visible(task_id));

CREATE POLICY "task_subtasks_update" ON "public"."task_subtasks"
  FOR UPDATE
  TO "authenticated"
  USING (public.task_can_complete_step(task_id))
  WITH CHECK (public.task_can_complete_step(task_id));

CREATE POLICY "tasks_read" ON "public"."tasks"
  FOR SELECT
  TO "authenticated"
  USING (((public.task_role() IS NOT NULL) AND (deleted_at IS NULL)));

CREATE POLICY "universities_public_read" ON "public"."universities"
  FOR SELECT
  TO PUBLIC
  USING (((is_published AND (deleted_at IS NULL)) OR public.is_editor()));

CREATE POLICY "university_branches_public_read" ON "public"."university_branches"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.universities p
  WHERE ((p.id = university_branches.university_id) AND ((p.is_published AND (p.deleted_at IS NULL)) OR public.is_editor())))));

CREATE POLICY "university_programs_public_read" ON "public"."university_programs"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.universities p
  WHERE ((p.id = university_programs.university_id) AND ((p.is_published AND (p.deleted_at IS NULL)) OR public.is_editor())))));

CREATE POLICY "university_sources_public_read" ON "public"."university_sources"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.universities p
  WHERE ((p.id = university_sources.university_id) AND ((p.is_published AND (p.deleted_at IS NULL)) OR public.is_editor())))));

CREATE POLICY "Editors insert works" ON "public"."works"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Editors read all works" ON "public"."works"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Editors update works" ON "public"."works"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Management delete works" ON "public"."works"
  FOR DELETE
  TO "authenticated"
  USING (public.is_management());

CREATE POLICY "Public reads published works" ON "public"."works"
  FOR SELECT
  TO "anon"
  USING ((is_published = true));

CREATE POLICY "Users read published works" ON "public"."works"
  FOR SELECT
  TO "authenticated"
  USING ((is_published = true));

CREATE POLICY "Editors insert companies" ON "public"."yemeni_companies"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Editors update companies" ON "public"."yemeni_companies"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Management delete yemeni_companies" ON "public"."yemeni_companies"
  FOR DELETE
  TO "authenticated"
  USING (public.is_management());

CREATE POLICY "Read published companies and editor drafts" ON "public"."yemeni_companies"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((is_published OR (EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Editors insert Yemeni figures" ON "public"."yemeni_figures"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Editors read all Yemeni figures" ON "public"."yemeni_figures"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Editors update Yemeni figures" ON "public"."yemeni_figures"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Management delete yemeni_figures" ON "public"."yemeni_figures"
  FOR DELETE
  TO "authenticated"
  USING (public.is_management());

CREATE POLICY "Public reads published Yemeni figures" ON "public"."yemeni_figures"
  FOR SELECT
  TO "anon", "authenticated"
  USING (is_published);

CREATE POLICY "Editors update media" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'media'::text) AND (EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Editors upload media" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'media'::text) AND (EXISTS ( SELECT 1
   FROM public.editors
  WHERE (editors.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Management delete media" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'media'::text) AND public.is_management()));

CREATE POLICY "Media is public" ON "storage"."objects"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((bucket_id = 'media'::text));

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."debate_result_updates";

COMMENT ON COLUMN "public"."editors"."role" IS 'admin: add/update content only; management: full content and editor management access';

COMMENT ON COLUMN "public"."task_comments"."parent_id" IS 'Immutable same-task parent. Replies retain their place beneath deleted-comment tombstones.';

COMMENT ON COLUMN "public"."tasks"."due_date" IS 'All-day date; deadline is exclusive next midnight in due_timezone. Mutually exclusive with due_at.';

COMMENT ON COLUMN "public"."tasks"."recurrence_of" IS 'One successor per completed occurrence, generated atomically. Reopen/recomplete never generates another.';

COMMENT ON COLUMN "public"."works"."debate_id" IS 'Optional canonical debate; navigate to /debates/[slug].';

COMMENT ON COLUMN "public"."yemeni_companies"."google_maps_url" IS 'Optional Google Maps place, pin, or directions URL for the company location.';

COMMENT ON EXTENSION "pg_cron" IS 'Job scheduler for PostgreSQL';

COMMENT ON TABLE "public"."debate_result_updates" IS 'Public debate invalidation only: no ballots, user IDs or choices.';

COMMENT ON TABLE "public"."debate_votes" IS 'Individual ballots: owner SELECT only. Public results use checked aggregate RPCs.';

COMMENT ON TABLE "public"."inline_content_audit" IS 'Internal content audit only; no tokens, ballots, or anonymous question owner identities.';

COMMENT ON TABLE "public"."task_members" IS 'Additional collaborators only; tasks.assigned_to remains the one primary. Existing rows require no backfill.';

COMMENT ON TABLE "public"."tasks" IS 'Internal 967 team tasks; both editor roles see the whole team; deleted_at retains audit tombstones.';

REVOKE ALL ON FUNCTION "public"."contact_message_status_audit"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."contact_message_status_audit"() TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."contact_message_status_audit"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."contact_message_status_audit"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."contact_message_status_audit"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."contact_rate_limit"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."contact_rate_limit"(text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."contact_rate_limit"(text) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."debate_admin_mutate"(text, uuid, bigint, jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."debate_admin_mutate"(text, uuid, bigint, jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_admin_mutate"(text, uuid, bigint, jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_admin_mutate"(text, uuid, bigint, jsonb) TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_admin_mutate_base"(text, uuid, bigint, jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_admin_mutate_base"(text, uuid, bigint, jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_admin_mutate_base"(text, uuid, bigint, jsonb) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."debate_audience_mutate"(text, uuid, jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."debate_audience_mutate"(text, uuid, jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_audience_mutate"(text, uuid, jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_audience_mutate"(text, uuid, jsonb) TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_audience_mutate_pre_lifecycle"(text, uuid, jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_audience_mutate_pre_lifecycle"(text, uuid, jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_audience_mutate_pre_lifecycle"(text, uuid, jsonb) TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_catalog"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."debate_catalog"() TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."debate_catalog"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_catalog"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_catalog"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_delete_rate"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_delete_rate"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_delete_rate"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_detail"(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."debate_detail"(text) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."debate_detail"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_detail"(text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_detail"(text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_detail_pre_lifecycle"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_detail_pre_lifecycle"(text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_detail_pre_lifecycle"(text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_discussion"(uuid, text, integer, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."debate_discussion"(uuid, text, integer, text) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."debate_discussion"(uuid, text, integer, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_discussion"(uuid, text, integer, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_discussion"(uuid, text, integer, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_discussion_target"(uuid, text, uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."debate_discussion_target"(uuid, text, uuid, text) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."debate_discussion_target"(uuid, text, uuid, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_discussion_target"(uuid, text, uuid, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_discussion_target"(uuid, text, uuid, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_live_results"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."debate_live_results"(uuid) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."debate_live_results"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_live_results"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_live_results"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_live_results_pre_lifecycle"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_live_results_pre_lifecycle"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_live_results_pre_lifecycle"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_live_results_visible"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."debate_live_results_visible"(uuid) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."debate_live_results_visible"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_live_results_visible"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_live_results_visible"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_participation_state"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."debate_participation_state"(uuid) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."debate_participation_state"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_participation_state"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_participation_state"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_profile_signup"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_profile_signup"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_profile_signup"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_public_record"(public.debates) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_public_record"(public.debates) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_public_record"(public.debates) TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_recording_lifecycle_guard"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_recording_lifecycle_guard"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_recording_lifecycle_guard"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_require_user"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_require_user"(text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_require_user"(text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_require_user_base"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_require_user_base"(text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_require_user_base"(text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_result_change"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_result_change"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_result_change"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_result_debate_change"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_result_debate_change"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_result_debate_change"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_result_snapshot"(uuid, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_result_snapshot"(uuid, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_result_snapshot"(uuid, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_result_updates_visible"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."debate_result_updates_visible"(uuid) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."debate_result_updates_visible"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_result_updates_visible"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_result_updates_visible"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."debate_role"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."debate_role"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_role"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_role"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_slug_route_guard"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_slug_route_guard"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_slug_route_guard"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_speaker_public"(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."debate_speaker_public"(text) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."debate_speaker_public"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_speaker_public"(text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_speaker_public"(text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_touch_results"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_touch_results"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_touch_results"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."debate_visible"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."debate_visible"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_visible"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_visible"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."debate_work_guard"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_work_guard"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."debate_work_guard"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."directory_assert_writer"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."directory_assert_writer"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."directory_editorial_trigger"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."directory_editorial_trigger"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."directory_jsonb_array_equal"(jsonb, jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."directory_jsonb_array_equal"(jsonb, jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."directory_save_medical_center"(uuid, bigint, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."directory_save_medical_center"(uuid, bigint, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."directory_save_medical_center"(uuid, bigint, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."directory_save_medical_center"(uuid, bigint, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."directory_save_university"(uuid, bigint, jsonb, jsonb, jsonb, jsonb, text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."directory_save_university"(uuid, bigint, jsonb, jsonb, jsonb, jsonb, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."directory_save_university"(uuid, bigint, jsonb, jsonb, jsonb, jsonb, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."directory_save_university"(uuid, bigint, jsonb, jsonb, jsonb, jsonb, text) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."directory_set_deleted"(text, uuid, bigint, boolean) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."directory_set_deleted"(text, uuid, bigint, boolean) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."directory_set_deleted"(text, uuid, bigint, boolean) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."directory_set_deleted"(text, uuid, bigint, boolean) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."directory_touch_revision"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."directory_touch_revision"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."directory_touch_revision"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."directory_touch_revision"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."editor_delete_draft"(text, bigint) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."editor_delete_draft"(text, bigint) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."editor_delete_draft"(text, bigint) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."editor_delete_draft"(text, bigint) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."editor_message_update"(uuid, bigint, jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."editor_message_update"(uuid, bigint, jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."editor_message_update"(uuid, bigint, jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."editor_message_update"(uuid, bigint, jsonb) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."editor_messages"(jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."editor_messages"(jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."editor_messages"(jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."editor_messages"(jsonb) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."editor_save_draft"(text, text, jsonb, bigint) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."editor_save_draft"(text, text, jsonb, bigint) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."editor_save_draft"(text, text, jsonb, bigint) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."editor_save_draft"(text, text, jsonb, bigint) TO "service_role";

REVOKE ALL ON FUNCTION "public"."editorial_can_read"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."editorial_can_read"() TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."editorial_can_read"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."editorial_can_read"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."editorial_can_read"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."editorial_content_trigger"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."editorial_content_trigger"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."editorial_current_path"(text, text, text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."editorial_current_path"(text, text, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."editorial_current_path"(text, text, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."editorial_current_path"(text, text, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."editorial_debate_children"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."editorial_debate_children"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "public"."editorial_debate_mutate_legacy"(text, uuid, bigint, jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."editorial_debate_mutate_legacy"(text, uuid, bigint, jsonb) TO "postgres";

REVOKE ALL ON FUNCTION "public"."editorial_emit"(text, text, text, jsonb, jsonb, text, text[]) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."editorial_emit"(text, text, text, jsonb, jsonb, text, text[]) TO "postgres";

REVOKE ALL ON FUNCTION "public"."editorial_inline_bridge"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."editorial_inline_bridge"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."editorial_inline_correction"(text, text, bigint, jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."editorial_inline_correction"(text, text, bigint, jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."editorial_inline_correction"(text, text, bigint, jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."editorial_inline_correction"(text, text, bigint, jsonb) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."editorial_publication"(text, text, boolean) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."editorial_publication"(text, text, boolean) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."editorial_publication"(text, text, boolean) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."editorial_publication"(text, text, boolean) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."editorial_report"(jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."editorial_report"(jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."editorial_report"(jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."editorial_report"(jsonb) TO "service_role";

REVOKE ALL ON FUNCTION "public"."editorial_service_save"(text, text, timestamp WITH time zone, jsonb, uuid, text, boolean, jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."editorial_service_save"(text, text, timestamp WITH time zone, jsonb, uuid, text, boolean, jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."editorial_service_save"(text, text, timestamp WITH time zone, jsonb, uuid, text, boolean, jsonb) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."editorial_statistic_save"(uuid, timestamp WITH time zone, jsonb, uuid[]) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."editorial_statistic_save"(uuid, timestamp WITH time zone, jsonb, uuid[]) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."editorial_statistic_save"(uuid, timestamp WITH time zone, jsonb, uuid[]) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."editorial_statistic_save"(uuid, timestamp WITH time zone, jsonb, uuid[]) TO "service_role";

REVOKE ALL ON FUNCTION "public"."inline_comment_pin_guard"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_comment_pin_guard"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_comment_pin_guard"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."inline_content_audit_change"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_content_audit_change"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_content_audit_change"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."inline_content_fields"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_content_fields"(text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_content_fields"(text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."inline_content_guard"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_content_guard"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_content_guard"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."inline_content_read"(text, text, boolean) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."inline_content_read"(text, text, boolean) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_content_read"(text, text, boolean) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_content_read"(text, text, boolean) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."inline_content_save"(text, text, bigint, jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."inline_content_save"(text, text, bigint, jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_content_save"(text, text, bigint, jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_content_save"(text, text, bigint, jsonb) TO "service_role";

REVOKE ALL ON FUNCTION "public"."inline_content_table"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_content_table"(text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_content_table"(text) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."inline_content_undo"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."inline_content_undo"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_content_undo"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_content_undo"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."inline_editor_mutate"(text, text, uuid, jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."inline_editor_mutate"(text, text, uuid, jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_editor_mutate"(text, text, uuid, jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_editor_mutate"(text, text, uuid, jsonb) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."inline_editor_read"(text, uuid, text, uuid, text, integer, uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."inline_editor_read"(text, uuid, text, uuid, text, integer, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_editor_read"(text, uuid, text, uuid, text, integer, uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_editor_read"(text, uuid, text, uuid, text, integer, uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."inline_item"(text, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_item"(text, uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_item"(text, uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."inline_service_save"(text, text, timestamp WITH time zone, jsonb, uuid, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_service_save"(text, text, timestamp WITH time zone, jsonb, uuid, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."inline_service_save"(text, text, timestamp WITH time zone, jsonb, uuid, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."is_967_editor"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."is_967_editor"() TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."is_967_editor"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_967_editor"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_967_editor"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."is_editor"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."is_editor"() TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."is_editor"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_editor"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_editor"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."is_management"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."is_management"() TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."is_management"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_management"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_management"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."is_ranking_editor"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."is_ranking_editor"() TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."is_ranking_editor"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_ranking_editor"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_ranking_editor"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."task_archive_completed"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."task_archive_completed"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_archive_completed"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_archive_completed"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."task_audit"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_audit"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_audit"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."task_can_complete_step"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."task_can_complete_step"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_can_complete_step"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_can_complete_step"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."task_can_edit"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."task_can_edit"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_can_edit"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_can_edit"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."task_child_audit"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_child_audit"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_child_audit"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."task_child_guard"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_child_guard"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_child_guard"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."task_collaboration_copy"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_collaboration_copy"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_collaboration_copy"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."task_collaboration_primary"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_collaboration_primary"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_collaboration_primary"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."task_collaboration_status"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_collaboration_status"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_collaboration_status"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."task_complete_step"(uuid, bigint, uuid, boolean) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."task_complete_step"(uuid, bigint, uuid, boolean) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_complete_step"(uuid, bigint, uuid, boolean) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_complete_step"(uuid, bigint, uuid, boolean) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."task_deadline"(timestamp WITH time zone, date, text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."task_deadline"(timestamp WITH time zone, date, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_deadline"(timestamp WITH time zone, date, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_deadline"(timestamp WITH time zone, date, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."task_guard"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_guard"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_guard"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."task_is_member"(uuid, uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."task_is_member"(uuid, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_is_member"(uuid, uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_is_member"(uuid, uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."task_lock"(uuid, bigint) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."task_lock"(uuid, bigint) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_lock"(uuid, bigint) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_lock"(uuid, bigint) TO "service_role";

REVOKE ALL ON FUNCTION "public"."task_member_audit"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_member_audit"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_member_audit"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."task_member_guard"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_member_guard"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_member_guard"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."task_mutate"(text, uuid, bigint, jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."task_mutate"(text, uuid, bigint, jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_mutate"(text, uuid, bigint, jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_mutate"(text, uuid, bigint, jsonb) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."task_mutate_legacy"(text, uuid, bigint, jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."task_mutate_legacy"(text, uuid, bigint, jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_mutate_legacy"(text, uuid, bigint, jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_mutate_legacy"(text, uuid, bigint, jsonb) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."task_refresh_reminders"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."task_refresh_reminders"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_refresh_reminders"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_refresh_reminders"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."task_role"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."task_role"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_role"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_role"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."task_schedule_auto_archive"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_schedule_auto_archive"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_schedule_auto_archive"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."task_soft_delete"(uuid, bigint) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."task_soft_delete"(uuid, bigint) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_soft_delete"(uuid, bigint) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_soft_delete"(uuid, bigint) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."task_team"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."task_team"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_team"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_team"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."task_visible"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."task_visible"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_visible"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."task_visible"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."touch_ranking_updated_at"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."touch_ranking_updated_at"() TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."touch_ranking_updated_at"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."touch_ranking_updated_at"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."touch_ranking_updated_at"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."touch_stats_updated_at"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."touch_stats_updated_at"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."touch_stats_updated_at"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."touch_stats_updated_at"() TO "service_role";

REVOKE ALL ON SEQUENCE "public"."task_activity_id_seq" FROM "anon";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."task_activity_id_seq" TO "anon";

REVOKE ALL ON SEQUENCE "public"."task_activity_id_seq" FROM "authenticated";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."task_activity_id_seq" TO "authenticated";

REVOKE ALL ON SEQUENCE "public"."task_activity_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."task_activity_id_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."task_activity_id_seq" FROM "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."task_activity_id_seq" TO "service_role";

REVOKE ALL ON SEQUENCE "public"."task_notifications_id_seq" FROM "anon";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."task_notifications_id_seq" TO "anon";

REVOKE ALL ON SEQUENCE "public"."task_notifications_id_seq" FROM "authenticated";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."task_notifications_id_seq" TO "authenticated";

REVOKE ALL ON SEQUENCE "public"."task_notifications_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."task_notifications_id_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."task_notifications_id_seq" FROM "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."task_notifications_id_seq" TO "service_role";

REVOKE ALL ON TABLE "public"."contact_rate_limits" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."contact_rate_limits" TO "postgres";

REVOKE ALL ON TABLE "public"."debate_comments" FROM "authenticated";

GRANT SELECT ON TABLE "public"."debate_comments" TO "authenticated";

REVOKE ALL ON TABLE "public"."debate_comments" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_comments" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_comments" TO "service_role";

REVOKE ALL ON TABLE "public"."debate_moderation_actions" FROM "authenticated";

GRANT SELECT ON TABLE "public"."debate_moderation_actions" TO "authenticated";

REVOKE ALL ON TABLE "public"."debate_moderation_actions" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_moderation_actions" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_moderation_actions" TO "service_role";

REVOKE ALL ON TABLE "public"."debate_participants" FROM "authenticated";

GRANT SELECT ON TABLE "public"."debate_participants" TO "authenticated";

REVOKE ALL ON TABLE "public"."debate_participants" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_participants" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_participants" TO "service_role";

REVOKE ALL ON TABLE "public"."debate_poll_options" FROM "authenticated";

GRANT SELECT ON TABLE "public"."debate_poll_options" TO "authenticated";

REVOKE ALL ON TABLE "public"."debate_poll_options" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_poll_options" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_poll_options" TO "service_role";

REVOKE ALL ON TABLE "public"."debate_polls" FROM "authenticated";

GRANT SELECT ON TABLE "public"."debate_polls" TO "authenticated";

REVOKE ALL ON TABLE "public"."debate_polls" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_polls" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_polls" TO "service_role";

REVOKE ALL ON TABLE "public"."debate_questions" FROM "authenticated";

GRANT SELECT ON TABLE "public"."debate_questions" TO "authenticated";

REVOKE ALL ON TABLE "public"."debate_questions" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_questions" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_questions" TO "service_role";

REVOKE ALL ON TABLE "public"."debate_rate_limits" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_rate_limits" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_rate_limits" TO "service_role";

REVOKE ALL ON TABLE "public"."debate_reports" FROM "authenticated";

GRANT SELECT ON TABLE "public"."debate_reports" TO "authenticated";

REVOKE ALL ON TABLE "public"."debate_reports" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_reports" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_reports" TO "service_role";

REVOKE ALL ON TABLE "public"."debate_result_updates" FROM "anon";

GRANT SELECT ON TABLE "public"."debate_result_updates" TO "anon";

REVOKE ALL ON TABLE "public"."debate_result_updates" FROM "authenticated";

GRANT SELECT ON TABLE "public"."debate_result_updates" TO "authenticated";

REVOKE ALL ON TABLE "public"."debate_result_updates" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_result_updates" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_result_updates" TO "service_role";

REVOKE ALL ON TABLE "public"."debate_speakers" FROM "authenticated";

GRANT SELECT ON TABLE "public"."debate_speakers" TO "authenticated";

REVOKE ALL ON TABLE "public"."debate_speakers" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_speakers" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_speakers" TO "service_role";

REVOKE ALL ON TABLE "public"."debate_suggestions" FROM "authenticated";

GRANT SELECT ON TABLE "public"."debate_suggestions" TO "authenticated";

REVOKE ALL ON TABLE "public"."debate_suggestions" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_suggestions" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_suggestions" TO "service_role";

REVOKE ALL ON TABLE "public"."debate_task_links" FROM "authenticated";

GRANT SELECT ON TABLE "public"."debate_task_links" TO "authenticated";

REVOKE ALL ON TABLE "public"."debate_task_links" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_task_links" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_task_links" TO "service_role";

REVOKE ALL ON TABLE "public"."debate_video_chapters" FROM "authenticated";

GRANT SELECT ON TABLE "public"."debate_video_chapters" TO "authenticated";

REVOKE ALL ON TABLE "public"."debate_video_chapters" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_video_chapters" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_video_chapters" TO "service_role";

REVOKE ALL ON TABLE "public"."debate_votes" FROM "authenticated";

GRANT SELECT ON TABLE "public"."debate_votes" TO "authenticated";

REVOKE ALL ON TABLE "public"."debate_votes" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_votes" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debate_votes" TO "service_role";

REVOKE ALL ON TABLE "public"."debates" FROM "authenticated";

GRANT SELECT ON TABLE "public"."debates" TO "authenticated";

REVOKE ALL ON TABLE "public"."debates" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debates" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debates" TO "service_role";

REVOKE ALL ON TABLE "public"."districts" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."districts" TO "anon";

REVOKE ALL ON TABLE "public"."districts" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."districts" TO "authenticated";

REVOKE ALL ON TABLE "public"."districts" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."districts" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."districts" TO "service_role";

REVOKE ALL ON TABLE "public"."editor_drafts" FROM "authenticated";

GRANT SELECT ON TABLE "public"."editor_drafts" TO "authenticated";

REVOKE ALL ON TABLE "public"."editor_drafts" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."editor_drafts" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."editor_drafts" TO "service_role";

REVOKE ALL ON TABLE "public"."editorial_audit_activation" FROM "authenticated";

GRANT SELECT ON TABLE "public"."editorial_audit_activation" TO "authenticated";

REVOKE ALL ON TABLE "public"."editorial_audit_activation" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."editorial_audit_activation" TO "postgres";

REVOKE ALL ON TABLE "public"."editorial_contributions" FROM "authenticated";

GRANT SELECT ON TABLE "public"."editorial_contributions" TO "authenticated";

REVOKE ALL ON TABLE "public"."editorial_contributions" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."editorial_contributions" TO "postgres";

REVOKE ALL ON TABLE "public"."editors" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."editors" TO "authenticated";

REVOKE ALL ON TABLE "public"."editors" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."editors" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."editors" TO "service_role";

REVOKE ALL ON TABLE "public"."governorates" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."governorates" TO "anon";

REVOKE ALL ON TABLE "public"."governorates" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."governorates" TO "authenticated";

REVOKE ALL ON TABLE "public"."governorates" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."governorates" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."governorates" TO "service_role";

REVOKE ALL ON TABLE "public"."inline_content_audit" FROM "authenticated";

GRANT SELECT ON TABLE "public"."inline_content_audit" TO "authenticated";

REVOKE ALL ON TABLE "public"."inline_content_audit" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."inline_content_audit" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."inline_content_audit" TO "service_role";

REVOKE ALL ON TABLE "public"."issues" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."issues" TO "anon";

REVOKE ALL ON TABLE "public"."issues" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."issues" TO "authenticated";

REVOKE ALL ON TABLE "public"."issues" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."issues" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."issues" TO "service_role";

REVOKE ALL ON TABLE "public"."medical_center_branches" FROM "anon";

GRANT SELECT ON TABLE "public"."medical_center_branches" TO "anon";

REVOKE ALL ON TABLE "public"."medical_center_branches" FROM "authenticated";

GRANT SELECT ON TABLE "public"."medical_center_branches" TO "authenticated";

REVOKE ALL ON TABLE "public"."medical_center_branches" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."medical_center_branches" TO "postgres";

REVOKE ALL ON TABLE "public"."medical_center_branches" FROM "service_role";

GRANT SELECT ON TABLE "public"."medical_center_branches" TO "service_role";

REVOKE ALL ON TABLE "public"."medical_center_hours" FROM "anon";

GRANT SELECT ON TABLE "public"."medical_center_hours" TO "anon";

REVOKE ALL ON TABLE "public"."medical_center_hours" FROM "authenticated";

GRANT SELECT ON TABLE "public"."medical_center_hours" TO "authenticated";

REVOKE ALL ON TABLE "public"."medical_center_hours" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."medical_center_hours" TO "postgres";

REVOKE ALL ON TABLE "public"."medical_center_hours" FROM "service_role";

GRANT SELECT ON TABLE "public"."medical_center_hours" TO "service_role";

REVOKE ALL ON TABLE "public"."medical_center_services" FROM "anon";

GRANT SELECT ON TABLE "public"."medical_center_services" TO "anon";

REVOKE ALL ON TABLE "public"."medical_center_services" FROM "authenticated";

GRANT SELECT ON TABLE "public"."medical_center_services" TO "authenticated";

REVOKE ALL ON TABLE "public"."medical_center_services" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."medical_center_services" TO "postgres";

REVOKE ALL ON TABLE "public"."medical_center_services" FROM "service_role";

GRANT SELECT ON TABLE "public"."medical_center_services" TO "service_role";

REVOKE ALL ON TABLE "public"."medical_center_sources" FROM "anon";

GRANT SELECT ON TABLE "public"."medical_center_sources" TO "anon";

REVOKE ALL ON TABLE "public"."medical_center_sources" FROM "authenticated";

GRANT SELECT ON TABLE "public"."medical_center_sources" TO "authenticated";

REVOKE ALL ON TABLE "public"."medical_center_sources" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."medical_center_sources" TO "postgres";

REVOKE ALL ON TABLE "public"."medical_center_sources" FROM "service_role";

GRANT SELECT ON TABLE "public"."medical_center_sources" TO "service_role";

REVOKE ALL ON TABLE "public"."medical_center_specialties" FROM "anon";

GRANT SELECT ON TABLE "public"."medical_center_specialties" TO "anon";

REVOKE ALL ON TABLE "public"."medical_center_specialties" FROM "authenticated";

GRANT SELECT ON TABLE "public"."medical_center_specialties" TO "authenticated";

REVOKE ALL ON TABLE "public"."medical_center_specialties" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."medical_center_specialties" TO "postgres";

REVOKE ALL ON TABLE "public"."medical_center_specialties" FROM "service_role";

GRANT SELECT ON TABLE "public"."medical_center_specialties" TO "service_role";

REVOKE ALL ON TABLE "public"."medical_centers" FROM "anon";

GRANT SELECT ON TABLE "public"."medical_centers" TO "anon";

REVOKE ALL ON TABLE "public"."medical_centers" FROM "authenticated";

GRANT SELECT ON TABLE "public"."medical_centers" TO "authenticated";

REVOKE ALL ON TABLE "public"."medical_centers" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."medical_centers" TO "postgres";

REVOKE ALL ON TABLE "public"."medical_centers" FROM "service_role";

GRANT SELECT ON TABLE "public"."medical_centers" TO "service_role";

REVOKE ALL ON TABLE "public"."message_followups" FROM "authenticated";

GRANT SELECT ON TABLE "public"."message_followups" TO "authenticated";

REVOKE ALL ON TABLE "public"."message_followups" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."message_followups" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."message_followups" TO "service_role";

REVOKE ALL ON TABLE "public"."messages" FROM "authenticated";

REVOKE ALL ("status") ON TABLE "public"."messages" FROM "authenticated";

GRANT UPDATE ("status") ON TABLE "public"."messages" TO "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT ON TABLE "public"."messages" TO "authenticated";

REVOKE ALL ON TABLE "public"."messages" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."messages" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."messages" TO "service_role";

REVOKE ALL ON TABLE "public"."professionals" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."professionals" TO "anon";

REVOKE ALL ON TABLE "public"."professionals" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."professionals" TO "authenticated";

REVOKE ALL ON TABLE "public"."professionals" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."professionals" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."professionals" TO "service_role";

REVOKE ALL ON TABLE "public"."public_profiles" FROM "authenticated";

GRANT SELECT ON TABLE "public"."public_profiles" TO "authenticated";

REVOKE ALL ON TABLE "public"."public_profiles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."public_profiles" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."public_profiles" TO "service_role";

REVOKE ALL ON TABLE "public"."ranking_indicators" FROM "anon";

GRANT SELECT ON TABLE "public"."ranking_indicators" TO "anon";

REVOKE ALL ON TABLE "public"."ranking_indicators" FROM "authenticated";

GRANT SELECT ON TABLE "public"."ranking_indicators" TO "authenticated";

REVOKE ALL ON TABLE "public"."ranking_indicators" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ranking_indicators" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ranking_indicators" TO "service_role";

REVOKE ALL ON TABLE "public"."ranking_snapshots" FROM "anon";

GRANT SELECT ON TABLE "public"."ranking_snapshots" TO "anon";

REVOKE ALL ON TABLE "public"."ranking_snapshots" FROM "authenticated";

GRANT SELECT ON TABLE "public"."ranking_snapshots" TO "authenticated";

REVOKE ALL ON TABLE "public"."ranking_snapshots" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ranking_snapshots" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ranking_snapshots" TO "service_role";

REVOKE ALL ON TABLE "public"."site_settings" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."site_settings" TO "anon";

REVOKE ALL ON TABLE "public"."site_settings" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."site_settings" TO "authenticated";

REVOKE ALL ON TABLE "public"."site_settings" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."site_settings" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."site_settings" TO "service_role";

REVOKE ALL ON TABLE "public"."stat_domains" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."stat_domains" TO "anon";

REVOKE ALL ON TABLE "public"."stat_domains" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."stat_domains" TO "authenticated";

REVOKE ALL ON TABLE "public"."stat_domains" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."stat_domains" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."stat_domains" TO "service_role";

REVOKE ALL ON TABLE "public"."stat_indicator_sources" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."stat_indicator_sources" TO "anon";

REVOKE ALL ON TABLE "public"."stat_indicator_sources" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."stat_indicator_sources" TO "authenticated";

REVOKE ALL ON TABLE "public"."stat_indicator_sources" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."stat_indicator_sources" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."stat_indicator_sources" TO "service_role";

REVOKE ALL ON TABLE "public"."stat_indicators" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."stat_indicators" TO "anon";

REVOKE ALL ON TABLE "public"."stat_indicators" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."stat_indicators" TO "authenticated";

REVOKE ALL ON TABLE "public"."stat_indicators" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."stat_indicators" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."stat_indicators" TO "service_role";

REVOKE ALL ON TABLE "public"."stat_sections" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."stat_sections" TO "anon";

REVOKE ALL ON TABLE "public"."stat_sections" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."stat_sections" TO "authenticated";

REVOKE ALL ON TABLE "public"."stat_sections" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."stat_sections" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."stat_sections" TO "service_role";

REVOKE ALL ON TABLE "public"."stat_sources" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."stat_sources" TO "anon";

REVOKE ALL ON TABLE "public"."stat_sources" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."stat_sources" TO "authenticated";

REVOKE ALL ON TABLE "public"."stat_sources" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."stat_sources" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."stat_sources" TO "service_role";

REVOKE ALL ON TABLE "public"."stat_values" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."stat_values" TO "anon";

REVOKE ALL ON TABLE "public"."stat_values" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."stat_values" TO "authenticated";

REVOKE ALL ON TABLE "public"."stat_values" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."stat_values" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."stat_values" TO "service_role";

REVOKE ALL ON TABLE "public"."task_activity" FROM "authenticated";

GRANT SELECT ON TABLE "public"."task_activity" TO "authenticated";

REVOKE ALL ON TABLE "public"."task_activity" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_activity" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_activity" TO "service_role";

REVOKE ALL ON TABLE "public"."task_comments" FROM "authenticated";

GRANT INSERT, SELECT, UPDATE ON TABLE "public"."task_comments" TO "authenticated";

REVOKE ALL ON TABLE "public"."task_comments" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_comments" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_comments" TO "service_role";

REVOKE ALL ON TABLE "public"."task_members" FROM "authenticated";

GRANT DELETE, INSERT, SELECT ON TABLE "public"."task_members" TO "authenticated";

REVOKE ALL ON TABLE "public"."task_members" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_members" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_members" TO "service_role";

REVOKE ALL ON TABLE "public"."task_notifications" FROM "authenticated";

REVOKE ALL ("read_at") ON TABLE "public"."task_notifications" FROM "authenticated";

GRANT UPDATE ("read_at") ON TABLE "public"."task_notifications" TO "authenticated";

GRANT SELECT ON TABLE "public"."task_notifications" TO "authenticated";

REVOKE ALL ON TABLE "public"."task_notifications" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_notifications" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_notifications" TO "service_role";

REVOKE ALL ON TABLE "public"."task_projects" FROM "authenticated";

GRANT INSERT, SELECT, UPDATE ON TABLE "public"."task_projects" TO "authenticated";

REVOKE ALL ON TABLE "public"."task_projects" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_projects" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_projects" TO "service_role";

REVOKE ALL ON TABLE "public"."task_subtasks" FROM "authenticated";

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."task_subtasks" TO "authenticated";

REVOKE ALL ON TABLE "public"."task_subtasks" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_subtasks" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_subtasks" TO "service_role";

REVOKE ALL ON TABLE "public"."tasks" FROM "authenticated";

REVOKE ALL ("archived_at") ON TABLE "public"."tasks" FROM "authenticated";

GRANT UPDATE ("archived_at") ON TABLE "public"."tasks" TO "authenticated";

REVOKE ALL ("description") ON TABLE "public"."tasks" FROM "authenticated";

GRANT INSERT ("description"), UPDATE ("description") ON TABLE "public"."tasks" TO "authenticated";

REVOKE ALL ("due_at") ON TABLE "public"."tasks" FROM "authenticated";

GRANT INSERT ("due_at"), UPDATE ("due_at") ON TABLE "public"."tasks" TO "authenticated";

REVOKE ALL ("due_date") ON TABLE "public"."tasks" FROM "authenticated";

GRANT INSERT ("due_date"), UPDATE ("due_date") ON TABLE "public"."tasks" TO "authenticated";

REVOKE ALL ("due_timezone") ON TABLE "public"."tasks" FROM "authenticated";

GRANT INSERT ("due_timezone"), UPDATE ("due_timezone") ON TABLE "public"."tasks" TO "authenticated";

REVOKE ALL ("estimated_minutes") ON TABLE "public"."tasks" FROM "authenticated";

GRANT INSERT ("estimated_minutes"), UPDATE ("estimated_minutes") ON TABLE "public"."tasks" TO "authenticated";

REVOKE ALL ("links") ON TABLE "public"."tasks" FROM "authenticated";

GRANT INSERT ("links"), UPDATE ("links") ON TABLE "public"."tasks" TO "authenticated";

REVOKE ALL ("notes") ON TABLE "public"."tasks" FROM "authenticated";

GRANT INSERT ("notes"), UPDATE ("notes") ON TABLE "public"."tasks" TO "authenticated";

REVOKE ALL ("priority") ON TABLE "public"."tasks" FROM "authenticated";

GRANT INSERT ("priority"), UPDATE ("priority") ON TABLE "public"."tasks" TO "authenticated";

REVOKE ALL ("project_id") ON TABLE "public"."tasks" FROM "authenticated";

GRANT INSERT ("project_id"), UPDATE ("project_id") ON TABLE "public"."tasks" TO "authenticated";

REVOKE ALL ("recurrence") ON TABLE "public"."tasks" FROM "authenticated";

GRANT INSERT ("recurrence"), UPDATE ("recurrence") ON TABLE "public"."tasks" TO "authenticated";

REVOKE ALL ("requires_review") ON TABLE "public"."tasks" FROM "authenticated";

GRANT INSERT ("requires_review"), UPDATE ("requires_review") ON TABLE "public"."tasks" TO "authenticated";

REVOKE ALL ("start_at") ON TABLE "public"."tasks" FROM "authenticated";

GRANT INSERT ("start_at"), UPDATE ("start_at") ON TABLE "public"."tasks" TO "authenticated";

REVOKE ALL ("status") ON TABLE "public"."tasks" FROM "authenticated";

GRANT INSERT ("status"), UPDATE ("status") ON TABLE "public"."tasks" TO "authenticated";

REVOKE ALL ("tags") ON TABLE "public"."tasks" FROM "authenticated";

GRANT INSERT ("tags"), UPDATE ("tags") ON TABLE "public"."tasks" TO "authenticated";

REVOKE ALL ("title") ON TABLE "public"."tasks" FROM "authenticated";

GRANT INSERT ("title"), UPDATE ("title") ON TABLE "public"."tasks" TO "authenticated";

GRANT SELECT ON TABLE "public"."tasks" TO "authenticated";

REVOKE ALL ON TABLE "public"."tasks" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tasks" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tasks" TO "service_role";

REVOKE ALL ON TABLE "public"."universities" FROM "anon";

GRANT SELECT ON TABLE "public"."universities" TO "anon";

REVOKE ALL ON TABLE "public"."universities" FROM "authenticated";

GRANT SELECT ON TABLE "public"."universities" TO "authenticated";

REVOKE ALL ON TABLE "public"."universities" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."universities" TO "postgres";

REVOKE ALL ON TABLE "public"."universities" FROM "service_role";

GRANT SELECT ON TABLE "public"."universities" TO "service_role";

REVOKE ALL ON TABLE "public"."university_branches" FROM "anon";

GRANT SELECT ON TABLE "public"."university_branches" TO "anon";

REVOKE ALL ON TABLE "public"."university_branches" FROM "authenticated";

GRANT SELECT ON TABLE "public"."university_branches" TO "authenticated";

REVOKE ALL ON TABLE "public"."university_branches" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."university_branches" TO "postgres";

REVOKE ALL ON TABLE "public"."university_branches" FROM "service_role";

GRANT SELECT ON TABLE "public"."university_branches" TO "service_role";

REVOKE ALL ON TABLE "public"."university_programs" FROM "anon";

GRANT SELECT ON TABLE "public"."university_programs" TO "anon";

REVOKE ALL ON TABLE "public"."university_programs" FROM "authenticated";

GRANT SELECT ON TABLE "public"."university_programs" TO "authenticated";

REVOKE ALL ON TABLE "public"."university_programs" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."university_programs" TO "postgres";

REVOKE ALL ON TABLE "public"."university_programs" FROM "service_role";

GRANT SELECT ON TABLE "public"."university_programs" TO "service_role";

REVOKE ALL ON TABLE "public"."university_sources" FROM "anon";

GRANT SELECT ON TABLE "public"."university_sources" TO "anon";

REVOKE ALL ON TABLE "public"."university_sources" FROM "authenticated";

GRANT SELECT ON TABLE "public"."university_sources" TO "authenticated";

REVOKE ALL ON TABLE "public"."university_sources" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."university_sources" TO "postgres";

REVOKE ALL ON TABLE "public"."university_sources" FROM "service_role";

GRANT SELECT ON TABLE "public"."university_sources" TO "service_role";

REVOKE ALL ON TABLE "public"."works" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."works" TO "anon";

REVOKE ALL ON TABLE "public"."works" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."works" TO "authenticated";

REVOKE ALL ON TABLE "public"."works" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."works" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."works" TO "service_role";

REVOKE ALL ON TABLE "public"."yemeni_companies" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."yemeni_companies" TO "anon";

REVOKE ALL ON TABLE "public"."yemeni_companies" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."yemeni_companies" TO "authenticated";

REVOKE ALL ON TABLE "public"."yemeni_companies" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."yemeni_companies" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."yemeni_companies" TO "service_role";

REVOKE ALL ON TABLE "public"."yemeni_figures" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."yemeni_figures" TO "anon";

REVOKE ALL ON TABLE "public"."yemeni_figures" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLE "public"."yemeni_figures" TO "authenticated";

REVOKE ALL ON TABLE "public"."yemeni_figures" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."yemeni_figures" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."yemeni_figures" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, UPDATE ON TABLES TO "authenticated";

SELECT cron.schedule_in_database('967-task-auto-archive', '*/5 * * * *', 'select public.task_archive_completed();', 'postgres', NULL, true);

ALTER TABLE "public"."task_comments"
  ADD CONSTRAINT "task_comments_author_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

CREATE POLICY "task_comments_create" ON "public"."task_comments"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((public.task_visible(task_id) AND (author_id = ( SELECT auth.uid() AS uid))));

CREATE POLICY "task_comments_update" ON "public"."task_comments"
  FOR UPDATE
  TO "authenticated"
  USING ((public.task_visible(task_id) AND ((author_id = ( SELECT auth.uid() AS uid)) OR (public.task_role() = 'management'::text))))
  WITH CHECK ((public.task_visible(task_id) AND ((author_id = ( SELECT auth.uid() AS uid)) OR (public.task_role() = 'management'::text))));

ALTER TABLE "public"."task_members"
  ADD CONSTRAINT "task_members_added_by_fkey" FOREIGN KEY (added_by) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE "public"."tasks"
  ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE "public"."tasks"
  ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE RESTRICT;

CREATE INDEX tasks_assignee_idx ON public.tasks USING btree (assigned_to, status)
  WHERE (deleted_at IS NULL);

CREATE POLICY "tasks_create" ON "public"."tasks"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((public.task_role() IS
    NOT NULL) AND (created_by = ( SELECT auth.uid() AS uid)) AND ((public.task_role() = 'management'::text) OR (assigned_to = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "tasks_update" ON "public"."tasks"
  FOR UPDATE
  TO "authenticated"
  USING (public.task_can_edit(id))
  WITH CHECK (((public.task_role() = 'management'::text) OR (assigned_to = ( SELECT auth.uid() AS uid))));

REVOKE ALL ("assigned_to") ON TABLE "public"."tasks" FROM "authenticated";

GRANT INSERT ("assigned_to"), UPDATE ("assigned_to") ON TABLE "public"."tasks" TO "authenticated";

