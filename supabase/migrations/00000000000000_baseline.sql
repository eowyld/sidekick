


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."add_locked_drive_template"("p_path" "text", "p_backfill" boolean DEFAULT true) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  normalized_path text;
begin
  normalized_path := public.normalize_drive_locked_path(p_path);

  if normalized_path = '' then
    raise exception 'Locked template path cannot be empty';
  end if;

  insert into public.drive_locked_storage_templates (path, is_active)
  values (normalized_path, true)
  on conflict (path) do update set is_active = true;

  if p_backfill then
    perform public.backfill_locked_drive_templates();
  end if;
end;
$$;


ALTER FUNCTION "public"."add_locked_drive_template"("p_path" "text", "p_backfill" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."add_locked_drive_template"("p_path" "text", "p_backfill" boolean) IS 'Ajoute/active un template verrouille. Si p_backfill=true, provisionne aussi tous les utilisateurs existants.';



CREATE OR REPLACE FUNCTION "public"."backfill_locked_drive_templates"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  u record;
begin
  for u in select id from auth.users loop
    perform public.provision_locked_drive_storage_for_user(u.id);
  end loop;
end;
$$;


ALTER FUNCTION "public"."backfill_locked_drive_templates"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."backfill_locked_drive_templates"() IS 'Re-applique tous les templates verrouilles actifs a tous les utilisateurs existants.';



CREATE OR REPLACE FUNCTION "public"."create_default_drive_folders_for_user"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_document_folders (user_id, name, is_system)
  SELECT p_user_id, n.name, true
  FROM (VALUES ('Contacts'), ('Live'), ('Phono'), ('Admin'), ('Edition'), ('Marketing'), ('Revenus')) AS n(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_document_folders f
    WHERE f.user_id = p_user_id AND f.name = n.name
  );
END;
$$;


ALTER FUNCTION "public"."create_default_drive_folders_for_user"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_locked_drive_storage"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  perform public.provision_locked_drive_storage_for_user(new.id);
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user_locked_drive_storage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_drive_locked_path"("input_path" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select trim(both '/' from regexp_replace(coalesce(input_path, ''), '/+', '/', 'g'));
$$;


ALTER FUNCTION "public"."normalize_drive_locked_path"("input_path" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."on_auth_user_created_drive_folders"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM public.create_default_drive_folders_for_user(NEW.id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."on_auth_user_created_drive_folders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."provision_locked_drive_storage_for_user"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  tmpl record;
  normalized_path text;
  object_name text;
begin
  for tmpl in
    select path
    from public.drive_locked_storage_templates
    where is_active = true
  loop
    normalized_path := public.normalize_drive_locked_path(tmpl.path);
    if normalized_path = '' then
      continue;
    end if;

    -- Placeholder invisible pour representer le dossier meme vide.
    object_name := p_user_id::text || '/' || normalized_path || '/.emptyfolderplaceholder';

    insert into storage.objects (bucket_id, name)
    values ('drive', object_name)
    on conflict (bucket_id, name) do nothing;
  end loop;
end;
$$;


ALTER FUNCTION "public"."provision_locked_drive_storage_for_user"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."provision_locked_drive_storage_for_user"("p_user_id" "uuid") IS 'Provisionne les dossiers verrouilles Storage (via placeholder invisible) pour un utilisateur.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."alpha_testers_waitlist" (
    "id" bigint NOT NULL,
    "last_name" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "status" "text" NOT NULL,
    "source" "text" DEFAULT 'sidekick-landing'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "alpha_testers_waitlist_status_check" CHECK (("status" = ANY (ARRAY['Artiste indépendant'::"text", 'Professionnel de l''industrie musicale'::"text", 'Proche'::"text", 'Etudiant'::"text", 'Développeur'::"text"])))
);


ALTER TABLE "public"."alpha_testers_waitlist" OWNER TO "postgres";


COMMENT ON TABLE "public"."alpha_testers_waitlist" IS 'RLS active sans policy = deny-all volontaire. Accès uniquement via service_role (/api/waitlist).';



ALTER TABLE "public"."alpha_testers_waitlist" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."alpha_testers_waitlist_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."calendar_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "time" time without time zone,
    "label" "text" NOT NULL,
    "sub_label" "text",
    "sector" "text" NOT NULL,
    "type" "text" NOT NULL,
    "place" "text",
    "source_module" "text" NOT NULL,
    "source_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "end_time" time without time zone,
    "end_date" "date" NOT NULL
);


ALTER TABLE "public"."calendar_events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."calendar_events"."end_time" IS 'Heure de fin (événements avec time ; défaut +1h si non renseigné côté app).';



COMMENT ON COLUMN "public"."calendar_events"."end_date" IS 'Date de fin inclusive ; égale à date pour un événement d’un jour.';



CREATE TABLE IF NOT EXISTS "public"."contract_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "html_content" "text" DEFAULT ''::"text" NOT NULL,
    "variable_keys" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."contract_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contracts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "template_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "variables" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "html_content" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "status_updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "signed_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "signature_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "project_id" "uuid"
);


ALTER TABLE "public"."contracts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."drive_locked_storage_templates" (
    "id" bigint NOT NULL,
    "path" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."drive_locked_storage_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."drive_locked_storage_templates" IS 'Template des dossiers verrouilles Storage. path est relatif a la racine utilisateur (ex: Admin, Admin/Finance).';



COMMENT ON COLUMN "public"."drive_locked_storage_templates"."path" IS 'Chemin relatif a la racine Storage utilisateur (sans user_id).';



CREATE SEQUENCE IF NOT EXISTS "public"."drive_locked_storage_templates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."drive_locked_storage_templates_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."drive_locked_storage_templates_id_seq" OWNED BY "public"."drive_locked_storage_templates"."id";



CREATE TABLE IF NOT EXISTS "public"."ical_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enabled_sectors" "text"[] DEFAULT '{live,phono,admin,marketing,edition,other}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ical_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mailing_campaigns" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "date_envoi" timestamp with time zone DEFAULT "now"(),
    "envoyes" integer DEFAULT 0 NOT NULL,
    "ouverts" integer DEFAULT 0 NOT NULL,
    "pct_ouverture" numeric(5,2) DEFAULT 0 NOT NULL,
    "clics" integer DEFAULT 0 NOT NULL,
    "pct_clics" numeric(5,2) DEFAULT 0 NOT NULL,
    "subject" "text",
    "accroche" "text",
    "content_html" "text",
    "from_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."mailing_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."presskit_links" (
    "id" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."presskit_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."presskit_user_slugs" (
    "user_id" "uuid" NOT NULL,
    "slug" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."presskit_user_slugs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_suggestions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "suggestions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_suggestions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_admin_document_folders" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "public"."user_admin_document_folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_admin_documents" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."user_admin_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_admin_procedures" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "label" "text" DEFAULT ''::"text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."user_admin_procedures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_admin_statuses" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nom" "text" DEFAULT ''::"text" NOT NULL,
    "type" "text" DEFAULT 'autre'::"text" NOT NULL,
    "actif" boolean DEFAULT true NOT NULL,
    "date_debut" "text",
    "date_fin" "text",
    "notes" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."user_admin_statuses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_admin_structures" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."user_admin_structures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_contacts" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "first_name" "text" DEFAULT ''::"text" NOT NULL,
    "last_name" "text" DEFAULT ''::"text" NOT NULL,
    "role" "text" DEFAULT ''::"text" NOT NULL,
    "city" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "instagram" "text" DEFAULT ''::"text" NOT NULL,
    "phone" "text" DEFAULT ''::"text" NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" "text"
);


ALTER TABLE "public"."user_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_contract_signatures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "label" "text" DEFAULT 'Signature'::"text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "mime_type" "text",
    "file_size_bytes" bigint,
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_contract_signatures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_dashboard_hero" (
    "user_id" "uuid" NOT NULL,
    "phrase" "text" NOT NULL,
    "accent" "text",
    "kind" "text" NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_dashboard_hero_kind_check" CHECK (("kind" = ANY (ARRAY['urgence'::"text", 'event'::"text", 'question'::"text", 'fallback'::"text"])))
);


ALTER TABLE "public"."user_dashboard_hero" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_document_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_system" boolean DEFAULT false NOT NULL,
    "parent_id" "uuid"
);


ALTER TABLE "public"."user_document_folders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_document_folders"."is_system" IS 'Si true, le dossier est verrouillé (module) : pas de renommage ni suppression par l''utilisateur.';



COMMENT ON COLUMN "public"."user_document_folders"."parent_id" IS 'Dossier parent (null = racine). Permet Marketing > Calendrier éditorial > DD-MM-YYYY.';



CREATE TABLE IF NOT EXISTS "public"."user_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "folder_id" "text",
    "link" "text",
    "category" "text",
    "source_module" "text",
    "notes" "text",
    "date_added" "date",
    "date_modified" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_system" boolean DEFAULT false NOT NULL,
    "file_size_bytes" bigint,
    "file_extension" "text",
    "storage_path" "text"
);


ALTER TABLE "public"."user_documents" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_documents"."is_system" IS 'Si true, le document est verrouillé (module/système) : pas de renommage, déplacement ni suppression par l''utilisateur.';



COMMENT ON COLUMN "public"."user_documents"."file_size_bytes" IS 'Taille du fichier en octets (pour quota 1 Go par utilisateur)';



COMMENT ON COLUMN "public"."user_documents"."file_extension" IS 'Extension du fichier (pdf, jpg, etc.) pour affichage dans la colonne Type de fichier';



COMMENT ON COLUMN "public"."user_documents"."storage_path" IS 'Chemin de l''objet dans le bucket Storage (ex: userId/dossier/fichier.pdf). Permet de supprimer le fichier lors de la suppression du document.';



CREATE TABLE IF NOT EXISTS "public"."user_drive_storage" (
    "user_id" "uuid" NOT NULL,
    "storage_used_bytes" bigint DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_drive_storage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_edition_sync" (
    "work_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."user_edition_sync" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_edition_works" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "artist_name" "text" DEFAULT ''::"text" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'in-progress'::"text" NOT NULL,
    "persons" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "dep_repartition" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "drm_repartition" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "splits_authors" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "splits_composers" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "self_published" boolean DEFAULT true NOT NULL,
    "external_publishers" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "iswc" "text" DEFAULT ''::"text" NOT NULL,
    "first_exploitation_date" "text" DEFAULT ''::"text" NOT NULL,
    "genre" "text" DEFAULT ''::"text" NOT NULL,
    "duration" "text" DEFAULT ''::"text" NOT NULL,
    "files" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "exploitation_types" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "first_broadcaster" "text" DEFAULT ''::"text" NOT NULL,
    "worldwide_rights" boolean DEFAULT true NOT NULL,
    "territories" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "linked_track_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_edition_works" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_equipment_inventory" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "condition" "text" DEFAULT 'bon'::"text" NOT NULL,
    "comment" "text"
);


ALTER TABLE "public"."user_equipment_inventory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_equipment_lists" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "item_ids" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."user_equipment_lists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_intermittence_missions" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "text" NOT NULL,
    "employer" "text" NOT NULL,
    "type" "text" NOT NULL,
    "hours" numeric DEFAULT 0 NOT NULL,
    "gross_amount" numeric DEFAULT 0 NOT NULL,
    "charges" numeric DEFAULT 0 NOT NULL,
    "net_amount" numeric DEFAULT 0 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_intermittence_missions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_invoices" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "number" "text" DEFAULT ''::"text" NOT NULL,
    "client" "text" DEFAULT ''::"text" NOT NULL,
    "subject" "text" DEFAULT ''::"text" NOT NULL,
    "amount" "text" DEFAULT ''::"text" NOT NULL,
    "due_date" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'en_attente'::"text" NOT NULL,
    "address" "text",
    "siret" "text",
    "income_type" "text",
    "lines" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "encaissement_date" "text",
    "project_id" "uuid"
);


ALTER TABLE "public"."user_invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_live_prospection" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "venue_name" "text" DEFAULT ''::"text" NOT NULL,
    "city" "text" DEFAULT ''::"text" NOT NULL,
    "contact" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "phone" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'À contacter'::"text" NOT NULL,
    "notes" "text",
    "last_contact" "text",
    "instagram" "text" DEFAULT ''::"text" NOT NULL,
    "touchpoints" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "reliability_tier" "text" DEFAULT 'neutral'::"text" NOT NULL,
    "facebook" "text",
    CONSTRAINT "user_live_prospection_reliability_tier_check" CHECK (("reliability_tier" = ANY (ARRAY['easy'::"text", 'neutral'::"text", 'hard'::"text"])))
);


ALTER TABLE "public"."user_live_prospection" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_mailing_campaigns" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "date_envoi" "text" DEFAULT ''::"text" NOT NULL,
    "envoyes" integer DEFAULT 0 NOT NULL,
    "ouverts" integer DEFAULT 0 NOT NULL,
    "pct_ouverture" numeric DEFAULT 0 NOT NULL,
    "clics" integer DEFAULT 0 NOT NULL,
    "pct_clics" numeric DEFAULT 0 NOT NULL,
    "details" "text",
    "subject" "text",
    "accroche" "text",
    "content_html" "text",
    "target_segment_ids" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "from_email" "text",
    "is_draft" boolean DEFAULT false NOT NULL,
    "project_id" "uuid"
);


ALTER TABLE "public"."user_mailing_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_mailing_contacts" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nom" "text" DEFAULT ''::"text" NOT NULL,
    "prenom" "text" DEFAULT ''::"text" NOT NULL,
    "mail" "text" DEFAULT ''::"text" NOT NULL,
    "date_ajout" "text" DEFAULT ''::"text" NOT NULL,
    "segment_ids" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."user_mailing_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_mailing_segments" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "public"."user_mailing_segments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_marketing_events" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "date" "text" DEFAULT ''::"text" NOT NULL,
    "time" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'idee'::"text" NOT NULL,
    "platforms" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "content_types" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "text" "text" DEFAULT ''::"text" NOT NULL,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "project_id" "uuid"
);


ALTER TABLE "public"."user_marketing_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_marketing_settings" (
    "user_id" "uuid" NOT NULL,
    "editorial_platforms" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "editorial_content_types" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."user_marketing_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_phono_albums" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "type" "text" DEFAULT 'album'::"text" NOT NULL,
    "status" "text" DEFAULT 'en_production'::"text" NOT NULL,
    "artist" "text" DEFAULT ''::"text" NOT NULL,
    "release_date" "text" DEFAULT ''::"text" NOT NULL,
    "upc_ean" "text" DEFAULT ''::"text" NOT NULL,
    "track_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "label" "text",
    "genre" "text",
    "editor" "text",
    "distribution" "text",
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "cover" "text",
    "guests" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_phono_albums" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_phono_podcasts" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "artists" "text" DEFAULT ''::"text" NOT NULL,
    "published_on" "text" DEFAULT ''::"text" NOT NULL,
    "is_video" boolean DEFAULT false NOT NULL,
    "is_live" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'en_production'::"text" NOT NULL,
    "release_date" "text" DEFAULT ''::"text" NOT NULL,
    "tracklist" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "cover" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_phono_podcasts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_phono_sessions" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "date" "text" DEFAULT ''::"text" NOT NULL,
    "time" "text" DEFAULT ''::"text" NOT NULL,
    "location" "text" DEFAULT ''::"text" NOT NULL,
    "address" "text",
    "session_type" "text" DEFAULT 'prise'::"text" NOT NULL,
    "session_type_other" "text",
    "participants" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_phono_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_phono_tracks" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "main_artist" "text" DEFAULT ''::"text" NOT NULL,
    "role" "text" DEFAULT 'artiste_principal'::"text" NOT NULL,
    "guest_artists" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "isrc" "text" DEFAULT ''::"text" NOT NULL,
    "release_date" "text" DEFAULT ''::"text" NOT NULL,
    "self_produced" boolean DEFAULT true NOT NULL,
    "label" "text",
    "editor" "text",
    "versions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "genre" "text",
    "distribution" "text",
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'en_production'::"text" NOT NULL,
    "cover" "text",
    "linked_work_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_phono_tracks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_presskit_profile" (
    "user_id" "uuid" NOT NULL,
    "artist_title" "text" DEFAULT ''::"text" NOT NULL,
    "hook" "text" DEFAULT ''::"text" NOT NULL,
    "artist_logo_url" "text",
    "artist_logo_file_name" "text",
    "artist_display_mode" "text" DEFAULT 'name'::"text" NOT NULL,
    "main_photo_url" "text" DEFAULT ''::"text" NOT NULL,
    "main_photo_file_name" "text",
    "bio" "text" DEFAULT ''::"text" NOT NULL,
    "socials" "jsonb" DEFAULT '{"facebook": "", "instagram": ""}'::"jsonb" NOT NULL,
    "contact" "jsonb" DEFAULT '{"email": "", "whatsapp": ""}'::"jsonb" NOT NULL,
    "streaming_artist_name" "text" DEFAULT ''::"text" NOT NULL,
    "streaming_links" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "custom_streaming_links" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "covers" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "latest" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."user_presskit_profile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_project_budget_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "kind" "text" DEFAULT 'expense'::"text" NOT NULL,
    "category" "text" DEFAULT ''::"text" NOT NULL,
    "label" "text" NOT NULL,
    "amount_planned" numeric(12,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_project_budget_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_project_creation_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "sector" "text" DEFAULT 'general'::"text" NOT NULL,
    "label" "text" NOT NULL,
    "status" "text" DEFAULT 'todo'::"text" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "target_date" "date",
    "assignee" "text" DEFAULT ''::"text" NOT NULL,
    "linked_entity_type" "text" DEFAULT ''::"text" NOT NULL,
    "linked_entity_id" "text" DEFAULT ''::"text" NOT NULL,
    "links" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "task_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "phase" "text" DEFAULT 'creation'::"text" NOT NULL
);


ALTER TABLE "public"."user_project_creation_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_project_expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "category" "text" DEFAULT ''::"text" NOT NULL,
    "amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "date" "date" NOT NULL,
    "notes" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_project_expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text",
    "status" "text" DEFAULT 'idea'::"text" NOT NULL,
    "cover" "text" DEFAULT ''::"text",
    "images" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "sectors" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "members" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "linked_albums" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "linked_tracks" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "linked_sessions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "linked_works" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "linked_tour_dates" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "linked_rehearsals" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "linked_statut_ids" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "key_dates" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "notes" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "brainstorm" "text" DEFAULT ''::"text" NOT NULL,
    "creation_seeded_sectors" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."user_projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_rehearsals" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "label" "text",
    "date" "text" DEFAULT ''::"text" NOT NULL,
    "time" "text" DEFAULT ''::"text" NOT NULL,
    "location" "text" DEFAULT ''::"text" NOT NULL,
    "city" "text",
    "address" "text",
    "note" "text",
    "remunerations" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "equipments" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."user_rehearsals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_royalties_imports" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "distributor" "text" NOT NULL,
    "file_name" "text" DEFAULT ''::"text" NOT NULL,
    "imported_at" "text" DEFAULT ''::"text" NOT NULL,
    "entries" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."user_royalties_imports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_royalties_manual" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "distributor" "text" DEFAULT 'manual'::"text" NOT NULL,
    "period" "text" DEFAULT ''::"text" NOT NULL,
    "store" "text" DEFAULT ''::"text" NOT NULL,
    "country" "text" DEFAULT ''::"text" NOT NULL,
    "track_title" "text" DEFAULT ''::"text" NOT NULL,
    "album" "text",
    "isrc" "text",
    "streams" integer DEFAULT 0 NOT NULL,
    "revenue" numeric DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "project_id" "uuid"
);


ALTER TABLE "public"."user_royalties_manual" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_tasks" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "status" "text" DEFAULT 'todo'::"text" NOT NULL,
    "today_focus" boolean DEFAULT false NOT NULL,
    "description" "text",
    "deadline" "text",
    "sector" "text",
    "created_at" "text",
    "subtasks" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."user_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_tour_dates" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "city" "text" DEFAULT ''::"text" NOT NULL,
    "venue" "text" DEFAULT ''::"text" NOT NULL,
    "date" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'Confirmée'::"text" NOT NULL,
    "address" "text" DEFAULT ''::"text" NOT NULL,
    "organisateur" "text",
    "note" "text",
    "transport" boolean DEFAULT false NOT NULL,
    "lodging" boolean DEFAULT false NOT NULL,
    "remuneration" boolean DEFAULT false NOT NULL,
    "equipment" boolean DEFAULT false NOT NULL,
    "timetable" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "invoice_ids" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "mission_ids" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."user_tour_dates" OWNER TO "postgres";


ALTER TABLE ONLY "public"."drive_locked_storage_templates" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."drive_locked_storage_templates_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."alpha_testers_waitlist"
    ADD CONSTRAINT "alpha_testers_waitlist_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."alpha_testers_waitlist"
    ADD CONSTRAINT "alpha_testers_waitlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_templates"
    ADD CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drive_locked_storage_templates"
    ADD CONSTRAINT "drive_locked_storage_templates_path_key" UNIQUE ("path");



ALTER TABLE ONLY "public"."drive_locked_storage_templates"
    ADD CONSTRAINT "drive_locked_storage_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ical_tokens"
    ADD CONSTRAINT "ical_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ical_tokens"
    ADD CONSTRAINT "ical_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."ical_tokens"
    ADD CONSTRAINT "ical_tokens_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."mailing_campaigns"
    ADD CONSTRAINT "mailing_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."presskit_links"
    ADD CONSTRAINT "presskit_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."presskit_user_slugs"
    ADD CONSTRAINT "presskit_user_slugs_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."presskit_user_slugs"
    ADD CONSTRAINT "presskit_user_slugs_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."task_suggestions"
    ADD CONSTRAINT "task_suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_suggestions"
    ADD CONSTRAINT "task_suggestions_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."user_admin_document_folders"
    ADD CONSTRAINT "user_admin_document_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_admin_documents"
    ADD CONSTRAINT "user_admin_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_admin_procedures"
    ADD CONSTRAINT "user_admin_procedures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_admin_statuses"
    ADD CONSTRAINT "user_admin_statuses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_admin_structures"
    ADD CONSTRAINT "user_admin_structures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_contacts"
    ADD CONSTRAINT "user_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_contract_signatures"
    ADD CONSTRAINT "user_contract_signatures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_dashboard_hero"
    ADD CONSTRAINT "user_dashboard_hero_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_document_folders"
    ADD CONSTRAINT "user_document_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_documents"
    ADD CONSTRAINT "user_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_drive_storage"
    ADD CONSTRAINT "user_drive_storage_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_edition_sync"
    ADD CONSTRAINT "user_edition_sync_pkey" PRIMARY KEY ("work_id");



ALTER TABLE ONLY "public"."user_edition_works"
    ADD CONSTRAINT "user_edition_works_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_equipment_inventory"
    ADD CONSTRAINT "user_equipment_inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_equipment_lists"
    ADD CONSTRAINT "user_equipment_lists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_intermittence_missions"
    ADD CONSTRAINT "user_intermittence_missions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_invoices"
    ADD CONSTRAINT "user_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_live_prospection"
    ADD CONSTRAINT "user_live_prospection_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_mailing_campaigns"
    ADD CONSTRAINT "user_mailing_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_mailing_contacts"
    ADD CONSTRAINT "user_mailing_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_mailing_segments"
    ADD CONSTRAINT "user_mailing_segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_marketing_events"
    ADD CONSTRAINT "user_marketing_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_marketing_settings"
    ADD CONSTRAINT "user_marketing_settings_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_phono_albums"
    ADD CONSTRAINT "user_phono_albums_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_phono_podcasts"
    ADD CONSTRAINT "user_phono_podcasts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_phono_sessions"
    ADD CONSTRAINT "user_phono_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_phono_tracks"
    ADD CONSTRAINT "user_phono_tracks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_presskit_profile"
    ADD CONSTRAINT "user_presskit_profile_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_project_budget_lines"
    ADD CONSTRAINT "user_project_budget_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_project_creation_steps"
    ADD CONSTRAINT "user_project_creation_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_project_expenses"
    ADD CONSTRAINT "user_project_expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_projects"
    ADD CONSTRAINT "user_projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_rehearsals"
    ADD CONSTRAINT "user_rehearsals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_royalties_imports"
    ADD CONSTRAINT "user_royalties_imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_royalties_manual"
    ADD CONSTRAINT "user_royalties_manual_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_tasks"
    ADD CONSTRAINT "user_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_tour_dates"
    ADD CONSTRAINT "user_tour_dates_pkey" PRIMARY KEY ("id");



CREATE INDEX "alpha_testers_waitlist_created_at_idx" ON "public"."alpha_testers_waitlist" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_budget_lines_project_id" ON "public"."user_project_budget_lines" USING "btree" ("project_id");



CREATE UNIQUE INDEX "idx_calendar_events_source" ON "public"."calendar_events" USING "btree" ("user_id", "source_module", "source_id") WHERE ("source_id" IS NOT NULL);



CREATE INDEX "idx_calendar_events_user_id" ON "public"."calendar_events" USING "btree" ("user_id");



CREATE INDEX "idx_contract_templates_user_id" ON "public"."contract_templates" USING "btree" ("user_id");



CREATE INDEX "idx_contracts_project_id" ON "public"."contracts" USING "btree" ("project_id");



CREATE INDEX "idx_contracts_status" ON "public"."contracts" USING "btree" ("user_id", "status");



CREATE INDEX "idx_contracts_template_id" ON "public"."contracts" USING "btree" ("template_id");



CREATE INDEX "idx_contracts_user_id" ON "public"."contracts" USING "btree" ("user_id");



CREATE INDEX "idx_creation_steps_project_id" ON "public"."user_project_creation_steps" USING "btree" ("project_id");



CREATE INDEX "idx_expenses_project_id" ON "public"."user_project_expenses" USING "btree" ("project_id");



CREATE INDEX "idx_mailing_campaigns_user_id" ON "public"."mailing_campaigns" USING "btree" ("user_id");



CREATE INDEX "idx_user_contract_signatures_user_id" ON "public"."user_contract_signatures" USING "btree" ("user_id");



CREATE INDEX "idx_user_document_folders_parent_id" ON "public"."user_document_folders" USING "btree" ("parent_id");



CREATE INDEX "idx_user_document_folders_user_id" ON "public"."user_document_folders" USING "btree" ("user_id");



CREATE INDEX "idx_user_documents_folder_id" ON "public"."user_documents" USING "btree" ("folder_id");



CREATE INDEX "idx_user_documents_user_id" ON "public"."user_documents" USING "btree" ("user_id");



CREATE INDEX "idx_user_invoices_project_id" ON "public"."user_invoices" USING "btree" ("project_id");



CREATE INDEX "idx_user_mailing_campaigns_project_id" ON "public"."user_mailing_campaigns" USING "btree" ("project_id");



CREATE INDEX "idx_user_marketing_events_project_id" ON "public"."user_marketing_events" USING "btree" ("project_id");



CREATE INDEX "idx_user_projects_user_id" ON "public"."user_projects" USING "btree" ("user_id");



CREATE INDEX "idx_user_royalties_manual_project_id" ON "public"."user_royalties_manual" USING "btree" ("project_id");



CREATE UNIQUE INDEX "user_contract_signatures_active_unique" ON "public"."user_contract_signatures" USING "btree" ("user_id") WHERE ("is_active" = true);



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_templates"
    ADD CONSTRAINT "contract_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."user_projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_signature_id_fkey" FOREIGN KEY ("signature_id") REFERENCES "public"."user_contract_signatures"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."contract_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ical_tokens"
    ADD CONSTRAINT "ical_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mailing_campaigns"
    ADD CONSTRAINT "mailing_campaigns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."presskit_user_slugs"
    ADD CONSTRAINT "presskit_user_slugs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_suggestions"
    ADD CONSTRAINT "task_suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_admin_document_folders"
    ADD CONSTRAINT "user_admin_document_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_admin_documents"
    ADD CONSTRAINT "user_admin_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_admin_procedures"
    ADD CONSTRAINT "user_admin_procedures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_admin_statuses"
    ADD CONSTRAINT "user_admin_statuses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_admin_structures"
    ADD CONSTRAINT "user_admin_structures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_contacts"
    ADD CONSTRAINT "user_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_contract_signatures"
    ADD CONSTRAINT "user_contract_signatures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_dashboard_hero"
    ADD CONSTRAINT "user_dashboard_hero_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_document_folders"
    ADD CONSTRAINT "user_document_folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."user_document_folders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_document_folders"
    ADD CONSTRAINT "user_document_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_documents"
    ADD CONSTRAINT "user_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_drive_storage"
    ADD CONSTRAINT "user_drive_storage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_edition_sync"
    ADD CONSTRAINT "user_edition_sync_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_edition_works"
    ADD CONSTRAINT "user_edition_works_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_equipment_inventory"
    ADD CONSTRAINT "user_equipment_inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_equipment_lists"
    ADD CONSTRAINT "user_equipment_lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_intermittence_missions"
    ADD CONSTRAINT "user_intermittence_missions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_invoices"
    ADD CONSTRAINT "user_invoices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."user_projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_invoices"
    ADD CONSTRAINT "user_invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_live_prospection"
    ADD CONSTRAINT "user_live_prospection_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_mailing_campaigns"
    ADD CONSTRAINT "user_mailing_campaigns_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."user_projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_mailing_campaigns"
    ADD CONSTRAINT "user_mailing_campaigns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_mailing_contacts"
    ADD CONSTRAINT "user_mailing_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_mailing_segments"
    ADD CONSTRAINT "user_mailing_segments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_marketing_events"
    ADD CONSTRAINT "user_marketing_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."user_projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_marketing_events"
    ADD CONSTRAINT "user_marketing_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_marketing_settings"
    ADD CONSTRAINT "user_marketing_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_phono_albums"
    ADD CONSTRAINT "user_phono_albums_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_phono_podcasts"
    ADD CONSTRAINT "user_phono_podcasts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_phono_sessions"
    ADD CONSTRAINT "user_phono_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_phono_tracks"
    ADD CONSTRAINT "user_phono_tracks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_presskit_profile"
    ADD CONSTRAINT "user_presskit_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_project_budget_lines"
    ADD CONSTRAINT "user_project_budget_lines_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."user_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_project_creation_steps"
    ADD CONSTRAINT "user_project_creation_steps_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."user_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_project_creation_steps"
    ADD CONSTRAINT "user_project_creation_steps_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."user_tasks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_project_expenses"
    ADD CONSTRAINT "user_project_expenses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."user_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_projects"
    ADD CONSTRAINT "user_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_rehearsals"
    ADD CONSTRAINT "user_rehearsals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_royalties_imports"
    ADD CONSTRAINT "user_royalties_imports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_royalties_manual"
    ADD CONSTRAINT "user_royalties_manual_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."user_projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_royalties_manual"
    ADD CONSTRAINT "user_royalties_manual_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_tasks"
    ADD CONSTRAINT "user_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_tour_dates"
    ADD CONSTRAINT "user_tour_dates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Anyone can read presskit links" ON "public"."presskit_links" FOR SELECT USING (true);



CREATE POLICY "Anyone can read presskit user slugs" ON "public"."presskit_user_slugs" FOR SELECT USING (true);



CREATE POLICY "Authenticated can read locked storage templates" ON "public"."drive_locked_storage_templates" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can insert own presskit slug" ON "public"."presskit_user_slugs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own budget lines" ON "public"."user_project_budget_lines" USING (("project_id" IN ( SELECT "user_projects"."id"
   FROM "public"."user_projects"
  WHERE ("user_projects"."user_id" = "auth"."uid"())))) WITH CHECK (("project_id" IN ( SELECT "user_projects"."id"
   FROM "public"."user_projects"
  WHERE ("user_projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage own calendar events" ON "public"."calendar_events" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage own contract signatures" ON "public"."user_contract_signatures" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage own contract templates" ON "public"."contract_templates" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage own contracts" ON "public"."contracts" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage own creation steps" ON "public"."user_project_creation_steps" USING (("project_id" IN ( SELECT "user_projects"."id"
   FROM "public"."user_projects"
  WHERE ("user_projects"."user_id" = "auth"."uid"())))) WITH CHECK (("project_id" IN ( SELECT "user_projects"."id"
   FROM "public"."user_projects"
  WHERE ("user_projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage own documents" ON "public"."user_documents" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage own folders" ON "public"."user_document_folders" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage own ical token" ON "public"."ical_tokens" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage own mailing campaigns" ON "public"."mailing_campaigns" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own project expenses" ON "public"."user_project_expenses" USING (("project_id" IN ( SELECT "user_projects"."id"
   FROM "public"."user_projects"
  WHERE ("user_projects"."user_id" = "auth"."uid"())))) WITH CHECK (("project_id" IN ( SELECT "user_projects"."id"
   FROM "public"."user_projects"
  WHERE ("user_projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage own projects" ON "public"."user_projects" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage own storage" ON "public"."user_drive_storage" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own presskit slug" ON "public"."presskit_user_slugs" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users insert their own hero phrase" ON "public"."user_dashboard_hero" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own admin document folders" ON "public"."user_admin_document_folders" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own admin documents" ON "public"."user_admin_documents" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own admin procedures" ON "public"."user_admin_procedures" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own admin statuses" ON "public"."user_admin_statuses" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own admin structures" ON "public"."user_admin_structures" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own contacts" ON "public"."user_contacts" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own equipment inventory" ON "public"."user_equipment_inventory" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own equipment lists" ON "public"."user_equipment_lists" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own intermittence missions" ON "public"."user_intermittence_missions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own live prospection" ON "public"."user_live_prospection" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own mailing campaigns" ON "public"."user_mailing_campaigns" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own mailing contacts" ON "public"."user_mailing_contacts" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own mailing segments" ON "public"."user_mailing_segments" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own marketing events" ON "public"."user_marketing_events" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own marketing settings" ON "public"."user_marketing_settings" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own presskit profile" ON "public"."user_presskit_profile" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own rehearsals" ON "public"."user_rehearsals" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own suggestions" ON "public"."task_suggestions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own tasks" ON "public"."user_tasks" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own tour dates" ON "public"."user_tour_dates" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users select their own hero phrase" ON "public"."user_dashboard_hero" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users update their own hero phrase" ON "public"."user_dashboard_hero" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."alpha_testers_waitlist" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contract_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contracts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drive_locked_storage_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ical_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mailing_campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."presskit_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."presskit_user_slugs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_suggestions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user owns albums" ON "public"."user_phono_albums" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user owns invoices" ON "public"."user_invoices" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user owns podcasts" ON "public"."user_phono_podcasts" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user owns royalties imports" ON "public"."user_royalties_imports" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user owns royalties manual" ON "public"."user_royalties_manual" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user owns sessions" ON "public"."user_phono_sessions" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user owns sync" ON "public"."user_edition_sync" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user owns tracks" ON "public"."user_phono_tracks" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user owns works" ON "public"."user_edition_works" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_admin_document_folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_admin_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_admin_procedures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_admin_statuses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_admin_structures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_contract_signatures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_dashboard_hero" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_document_folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_drive_storage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_edition_sync" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_edition_works" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_equipment_inventory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_equipment_lists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_intermittence_missions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_live_prospection" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_mailing_campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_mailing_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_mailing_segments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_marketing_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_marketing_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_phono_albums" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_phono_podcasts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_phono_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_phono_tracks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_presskit_profile" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_project_budget_lines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_project_creation_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_project_expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_rehearsals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_royalties_imports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_royalties_manual" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_tour_dates" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."add_locked_drive_template"("p_path" "text", "p_backfill" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."add_locked_drive_template"("p_path" "text", "p_backfill" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_locked_drive_template"("p_path" "text", "p_backfill" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."backfill_locked_drive_templates"() TO "anon";
GRANT ALL ON FUNCTION "public"."backfill_locked_drive_templates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."backfill_locked_drive_templates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_drive_folders_for_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_drive_folders_for_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_drive_folders_for_user"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_locked_drive_storage"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_locked_drive_storage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_locked_drive_storage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_drive_locked_path"("input_path" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_drive_locked_path"("input_path" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_drive_locked_path"("input_path" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."on_auth_user_created_drive_folders"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_auth_user_created_drive_folders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_auth_user_created_drive_folders"() TO "service_role";



GRANT ALL ON FUNCTION "public"."provision_locked_drive_storage_for_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."provision_locked_drive_storage_for_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."provision_locked_drive_storage_for_user"("p_user_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."alpha_testers_waitlist" TO "anon";
GRANT ALL ON TABLE "public"."alpha_testers_waitlist" TO "authenticated";
GRANT ALL ON TABLE "public"."alpha_testers_waitlist" TO "service_role";



GRANT ALL ON SEQUENCE "public"."alpha_testers_waitlist_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."alpha_testers_waitlist_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."alpha_testers_waitlist_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_events" TO "anon";
GRANT ALL ON TABLE "public"."calendar_events" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_events" TO "service_role";



GRANT ALL ON TABLE "public"."contract_templates" TO "anon";
GRANT ALL ON TABLE "public"."contract_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_templates" TO "service_role";



GRANT ALL ON TABLE "public"."contracts" TO "anon";
GRANT ALL ON TABLE "public"."contracts" TO "authenticated";
GRANT ALL ON TABLE "public"."contracts" TO "service_role";



GRANT ALL ON TABLE "public"."drive_locked_storage_templates" TO "anon";
GRANT ALL ON TABLE "public"."drive_locked_storage_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."drive_locked_storage_templates" TO "service_role";



GRANT ALL ON SEQUENCE "public"."drive_locked_storage_templates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."drive_locked_storage_templates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."drive_locked_storage_templates_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ical_tokens" TO "anon";
GRANT ALL ON TABLE "public"."ical_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."ical_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."mailing_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."mailing_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."mailing_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."presskit_links" TO "anon";
GRANT ALL ON TABLE "public"."presskit_links" TO "authenticated";
GRANT ALL ON TABLE "public"."presskit_links" TO "service_role";



GRANT ALL ON TABLE "public"."presskit_user_slugs" TO "anon";
GRANT ALL ON TABLE "public"."presskit_user_slugs" TO "authenticated";
GRANT ALL ON TABLE "public"."presskit_user_slugs" TO "service_role";



GRANT ALL ON TABLE "public"."task_suggestions" TO "anon";
GRANT ALL ON TABLE "public"."task_suggestions" TO "authenticated";
GRANT ALL ON TABLE "public"."task_suggestions" TO "service_role";



GRANT ALL ON TABLE "public"."user_admin_document_folders" TO "anon";
GRANT ALL ON TABLE "public"."user_admin_document_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."user_admin_document_folders" TO "service_role";



GRANT ALL ON TABLE "public"."user_admin_documents" TO "anon";
GRANT ALL ON TABLE "public"."user_admin_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."user_admin_documents" TO "service_role";



GRANT ALL ON TABLE "public"."user_admin_procedures" TO "anon";
GRANT ALL ON TABLE "public"."user_admin_procedures" TO "authenticated";
GRANT ALL ON TABLE "public"."user_admin_procedures" TO "service_role";



GRANT ALL ON TABLE "public"."user_admin_statuses" TO "anon";
GRANT ALL ON TABLE "public"."user_admin_statuses" TO "authenticated";
GRANT ALL ON TABLE "public"."user_admin_statuses" TO "service_role";



GRANT ALL ON TABLE "public"."user_admin_structures" TO "anon";
GRANT ALL ON TABLE "public"."user_admin_structures" TO "authenticated";
GRANT ALL ON TABLE "public"."user_admin_structures" TO "service_role";



GRANT ALL ON TABLE "public"."user_contacts" TO "anon";
GRANT ALL ON TABLE "public"."user_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."user_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."user_contract_signatures" TO "anon";
GRANT ALL ON TABLE "public"."user_contract_signatures" TO "authenticated";
GRANT ALL ON TABLE "public"."user_contract_signatures" TO "service_role";



GRANT ALL ON TABLE "public"."user_dashboard_hero" TO "anon";
GRANT ALL ON TABLE "public"."user_dashboard_hero" TO "authenticated";
GRANT ALL ON TABLE "public"."user_dashboard_hero" TO "service_role";



GRANT ALL ON TABLE "public"."user_document_folders" TO "anon";
GRANT ALL ON TABLE "public"."user_document_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."user_document_folders" TO "service_role";



GRANT ALL ON TABLE "public"."user_documents" TO "anon";
GRANT ALL ON TABLE "public"."user_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."user_documents" TO "service_role";



GRANT ALL ON TABLE "public"."user_drive_storage" TO "anon";
GRANT ALL ON TABLE "public"."user_drive_storage" TO "authenticated";
GRANT ALL ON TABLE "public"."user_drive_storage" TO "service_role";



GRANT ALL ON TABLE "public"."user_edition_sync" TO "anon";
GRANT ALL ON TABLE "public"."user_edition_sync" TO "authenticated";
GRANT ALL ON TABLE "public"."user_edition_sync" TO "service_role";



GRANT ALL ON TABLE "public"."user_edition_works" TO "anon";
GRANT ALL ON TABLE "public"."user_edition_works" TO "authenticated";
GRANT ALL ON TABLE "public"."user_edition_works" TO "service_role";



GRANT ALL ON TABLE "public"."user_equipment_inventory" TO "anon";
GRANT ALL ON TABLE "public"."user_equipment_inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."user_equipment_inventory" TO "service_role";



GRANT ALL ON TABLE "public"."user_equipment_lists" TO "anon";
GRANT ALL ON TABLE "public"."user_equipment_lists" TO "authenticated";
GRANT ALL ON TABLE "public"."user_equipment_lists" TO "service_role";



GRANT ALL ON TABLE "public"."user_intermittence_missions" TO "anon";
GRANT ALL ON TABLE "public"."user_intermittence_missions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_intermittence_missions" TO "service_role";



GRANT ALL ON TABLE "public"."user_invoices" TO "anon";
GRANT ALL ON TABLE "public"."user_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."user_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."user_live_prospection" TO "anon";
GRANT ALL ON TABLE "public"."user_live_prospection" TO "authenticated";
GRANT ALL ON TABLE "public"."user_live_prospection" TO "service_role";



GRANT ALL ON TABLE "public"."user_mailing_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."user_mailing_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."user_mailing_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."user_mailing_contacts" TO "anon";
GRANT ALL ON TABLE "public"."user_mailing_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."user_mailing_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."user_mailing_segments" TO "anon";
GRANT ALL ON TABLE "public"."user_mailing_segments" TO "authenticated";
GRANT ALL ON TABLE "public"."user_mailing_segments" TO "service_role";



GRANT ALL ON TABLE "public"."user_marketing_events" TO "anon";
GRANT ALL ON TABLE "public"."user_marketing_events" TO "authenticated";
GRANT ALL ON TABLE "public"."user_marketing_events" TO "service_role";



GRANT ALL ON TABLE "public"."user_marketing_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_marketing_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_marketing_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_phono_albums" TO "anon";
GRANT ALL ON TABLE "public"."user_phono_albums" TO "authenticated";
GRANT ALL ON TABLE "public"."user_phono_albums" TO "service_role";



GRANT ALL ON TABLE "public"."user_phono_podcasts" TO "anon";
GRANT ALL ON TABLE "public"."user_phono_podcasts" TO "authenticated";
GRANT ALL ON TABLE "public"."user_phono_podcasts" TO "service_role";



GRANT ALL ON TABLE "public"."user_phono_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_phono_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_phono_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."user_phono_tracks" TO "anon";
GRANT ALL ON TABLE "public"."user_phono_tracks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_phono_tracks" TO "service_role";



GRANT ALL ON TABLE "public"."user_presskit_profile" TO "anon";
GRANT ALL ON TABLE "public"."user_presskit_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."user_presskit_profile" TO "service_role";



GRANT ALL ON TABLE "public"."user_project_budget_lines" TO "anon";
GRANT ALL ON TABLE "public"."user_project_budget_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."user_project_budget_lines" TO "service_role";



GRANT ALL ON TABLE "public"."user_project_creation_steps" TO "anon";
GRANT ALL ON TABLE "public"."user_project_creation_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."user_project_creation_steps" TO "service_role";



GRANT ALL ON TABLE "public"."user_project_expenses" TO "anon";
GRANT ALL ON TABLE "public"."user_project_expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."user_project_expenses" TO "service_role";



GRANT ALL ON TABLE "public"."user_projects" TO "anon";
GRANT ALL ON TABLE "public"."user_projects" TO "authenticated";
GRANT ALL ON TABLE "public"."user_projects" TO "service_role";



GRANT ALL ON TABLE "public"."user_rehearsals" TO "anon";
GRANT ALL ON TABLE "public"."user_rehearsals" TO "authenticated";
GRANT ALL ON TABLE "public"."user_rehearsals" TO "service_role";



GRANT ALL ON TABLE "public"."user_royalties_imports" TO "anon";
GRANT ALL ON TABLE "public"."user_royalties_imports" TO "authenticated";
GRANT ALL ON TABLE "public"."user_royalties_imports" TO "service_role";



GRANT ALL ON TABLE "public"."user_royalties_manual" TO "anon";
GRANT ALL ON TABLE "public"."user_royalties_manual" TO "authenticated";
GRANT ALL ON TABLE "public"."user_royalties_manual" TO "service_role";



GRANT ALL ON TABLE "public"."user_tasks" TO "anon";
GRANT ALL ON TABLE "public"."user_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."user_tour_dates" TO "anon";
GRANT ALL ON TABLE "public"."user_tour_dates" TO "authenticated";
GRANT ALL ON TABLE "public"."user_tour_dates" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































-- ============================================================================
-- Objets hors schéma "public" (non capturés par `supabase db dump`).
-- Recopiés depuis les migrations archivées drive_storage_bucket /
-- drive_locked_storage_templates pour rendre la baseline auto-suffisante :
-- un `supabase db reset` doit recréer le Drive (bucket + RLS + triggers).
-- ============================================================================

-- Extension managée Supabase (webhooks / net). Présente sur le projet distant.
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

-- Bucket Storage du Drive : drive/{user_id}/...
INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES ('drive', 'drive', true, 52428800, NULL)
ON CONFLICT ("id") DO UPDATE SET
  "public" = EXCLUDED."public",
  "file_size_limit" = EXCLUDED."file_size_limit";

-- RLS Storage : chaque utilisateur n'accède qu'à son dossier (1er segment = user_id).
DROP POLICY IF EXISTS "Users can read own drive files" ON "storage"."objects";
CREATE POLICY "Users can read own drive files"
  ON "storage"."objects" FOR SELECT TO "public"
  USING (("bucket_id" = 'drive'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text"));

DROP POLICY IF EXISTS "Users can upload to own drive" ON "storage"."objects";
CREATE POLICY "Users can upload to own drive"
  ON "storage"."objects" FOR INSERT TO "public"
  WITH CHECK (("bucket_id" = 'drive'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text"));

DROP POLICY IF EXISTS "Users can update own drive files" ON "storage"."objects";
CREATE POLICY "Users can update own drive files"
  ON "storage"."objects" FOR UPDATE TO "public"
  USING (("bucket_id" = 'drive'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text"));

DROP POLICY IF EXISTS "Users can delete own drive files" ON "storage"."objects";
CREATE POLICY "Users can delete own drive files"
  ON "storage"."objects" FOR DELETE TO "public"
  USING (("bucket_id" = 'drive'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text"));

-- Triggers de provisionnement Drive à la création d'un compte.
-- Les fonctions public.* correspondantes sont définies plus haut dans ce fichier.
DROP TRIGGER IF EXISTS "on_auth_user_created_drive_folders" ON "auth"."users";
CREATE TRIGGER "on_auth_user_created_drive_folders"
  AFTER INSERT ON "auth"."users"
  FOR EACH ROW EXECUTE FUNCTION "public"."on_auth_user_created_drive_folders"();

DROP TRIGGER IF EXISTS "trg_new_user_locked_drive_storage" ON "auth"."users";
CREATE TRIGGER "trg_new_user_locked_drive_storage"
  AFTER INSERT ON "auth"."users"
  FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user_locked_drive_storage"();































