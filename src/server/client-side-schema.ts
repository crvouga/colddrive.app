import { z } from 'zod';
import { publicProcedure, router } from './trpc';

export const SCHEMA_SQL = `
-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

-- Functions
CREATE OR REPLACE FUNCTION public.check_file_folder_drive() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.folder_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM folders
            WHERE id = NEW.folder_id AND drive_id = NEW.drive_id
        ) THEN
            RAISE EXCEPTION 'Folder must belong to the same drive';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_folder_parent_drive() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.parent_folder_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM folders
            WHERE id = NEW.parent_folder_id AND drive_id = NEW.drive_id
        ) THEN
            RAISE EXCEPTION 'Parent folder must belong to the same drive';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Tables
CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    google_id character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(255),
    avatar_url character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_google_id_key UNIQUE (google_id)
);

CREATE TABLE public.drives (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT drives_pkey PRIMARY KEY (id),
    CONSTRAINT drives_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE public.folders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    drive_id uuid NOT NULL,
    parent_folder_id uuid,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT folders_pkey PRIMARY KEY (id),
    CONSTRAINT folders_drive_parent_name_unique UNIQUE (drive_id, parent_folder_id, name),
    CONSTRAINT folders_drive_id_fkey FOREIGN KEY (drive_id) REFERENCES public.drives(id) ON DELETE CASCADE,
    CONSTRAINT folders_parent_folder_id_fkey FOREIGN KEY (parent_folder_id) REFERENCES public.folders(id) ON DELETE CASCADE
);

CREATE TABLE public.files (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    drive_id uuid NOT NULL,
    folder_id uuid,
    name character varying(255) NOT NULL,
    mime_type character varying(255),
    current_version_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT files_pkey PRIMARY KEY (id),
    CONSTRAINT files_drive_folder_name_unique UNIQUE (drive_id, folder_id, name),
    CONSTRAINT files_drive_id_fkey FOREIGN KEY (drive_id) REFERENCES public.drives(id) ON DELETE CASCADE,
    CONSTRAINT files_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folders(id) ON DELETE CASCADE
);

CREATE TABLE public.file_versions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    file_id uuid NOT NULL,
    version_number integer NOT NULL,
    size_bytes bigint NOT NULL,
    storage_key character varying(1000) NOT NULL,
    storage_provider character varying(100) DEFAULT 's3-glacier'::character varying NOT NULL,
    storage_region character varying(100),
    checksum character varying(255),
    uploaded_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT file_versions_pkey PRIMARY KEY (id),
    CONSTRAINT file_versions_file_version_unique UNIQUE (file_id, version_number),
    CONSTRAINT file_versions_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE,
    CONSTRAINT file_versions_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE RESTRICT
);

CREATE TABLE public.drive_shares (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    drive_id uuid NOT NULL,
    shared_with_user_id uuid NOT NULL,
    permission character varying(50) NOT NULL,
    shared_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT drive_shares_pkey PRIMARY KEY (id),
    CONSTRAINT drive_shares_unique UNIQUE (drive_id, shared_with_user_id),
    CONSTRAINT drive_shares_permission_check CHECK (((permission)::text = ANY ((ARRAY['read'::character varying, 'write'::character varying, 'admin'::character varying])::text[]))),
    CONSTRAINT drive_shares_drive_id_fkey FOREIGN KEY (drive_id) REFERENCES public.drives(id) ON DELETE CASCADE,
    CONSTRAINT drive_shares_shared_by_fkey FOREIGN KEY (shared_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT drive_shares_shared_with_user_id_fkey FOREIGN KEY (shared_with_user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE public.schema_migrations (
    version character varying(128) NOT NULL,
    CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);

-- Add foreign key for files.current_version_id (must be after file_versions table)
ALTER TABLE public.files
    ADD CONSTRAINT files_current_version_id_fkey FOREIGN KEY (current_version_id) REFERENCES public.file_versions(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX users_google_id_idx ON public.users USING btree (google_id);
CREATE INDEX users_email_idx ON public.users USING btree (email);
CREATE INDEX drives_user_id_idx ON public.drives USING btree (user_id);
CREATE INDEX folders_drive_id_idx ON public.folders USING btree (drive_id);
CREATE INDEX folders_parent_folder_id_idx ON public.folders USING btree (parent_folder_id);
CREATE INDEX folders_drive_parent_name_idx ON public.folders USING btree (drive_id, parent_folder_id, name);
CREATE INDEX files_drive_id_idx ON public.files USING btree (drive_id);
CREATE INDEX files_folder_id_idx ON public.files USING btree (folder_id);
CREATE INDEX files_drive_folder_name_idx ON public.files USING btree (drive_id, folder_id, name);
CREATE INDEX file_versions_file_id_idx ON public.file_versions USING btree (file_id);
CREATE INDEX file_versions_storage_key_idx ON public.file_versions USING btree (storage_key);
CREATE INDEX file_versions_uploaded_by_idx ON public.file_versions USING btree (uploaded_by);
CREATE INDEX drive_shares_drive_id_idx ON public.drive_shares USING btree (drive_id);
CREATE INDEX drive_shares_shared_by_idx ON public.drive_shares USING btree (shared_by);
CREATE INDEX drive_shares_shared_with_user_id_idx ON public.drive_shares USING btree (shared_with_user_id);

-- Triggers
DROP TRIGGER IF EXISTS drives_updated_at_trigger ON public.drives;
CREATE TRIGGER drives_updated_at_trigger BEFORE UPDATE ON public.drives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS files_check_folder_drive_trigger ON public.files;
CREATE TRIGGER files_check_folder_drive_trigger BEFORE INSERT OR UPDATE ON public.files FOR EACH ROW EXECUTE FUNCTION public.check_file_folder_drive();

DROP TRIGGER IF EXISTS files_updated_at_trigger ON public.files;
CREATE TRIGGER files_updated_at_trigger BEFORE UPDATE ON public.files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS folders_check_parent_drive_trigger ON public.folders;
CREATE TRIGGER folders_check_parent_drive_trigger BEFORE INSERT OR UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION public.check_folder_parent_drive();

DROP TRIGGER IF EXISTS folders_updated_at_trigger ON public.folders;
CREATE TRIGGER folders_updated_at_trigger BEFORE UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS users_updated_at_trigger ON public.users;
CREATE TRIGGER users_updated_at_trigger BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
`.trim();

export async function hashSchema(schema: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(schema);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}


export const clientSideSchemaRouter = router({
  get: publicProcedure
    .output(
      z.object({
        schema: z.string(),
        hash: z.string(),
      })
    )
    .query(async () => {
      const schema = SCHEMA_SQL.trim();
      const hash = await hashSchema(schema);
      return {
        schema,
        hash,
      };
    }),
});
