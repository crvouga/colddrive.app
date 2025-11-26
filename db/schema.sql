SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: check_file_folder_drive(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_file_folder_drive() RETURNS trigger
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


--
-- Name: check_folder_parent_drive(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_folder_parent_drive() RETURNS trigger
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


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: drive_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drive_shares (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    drive_id uuid NOT NULL,
    shared_with_user_id uuid NOT NULL,
    permission character varying(50) NOT NULL,
    shared_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT drive_shares_permission_check CHECK (((permission)::text = ANY ((ARRAY['read'::character varying, 'write'::character varying, 'admin'::character varying])::text[])))
);


--
-- Name: drives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drives (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: file_versions; Type: TABLE; Schema: public; Owner: -
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.files (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    drive_id uuid NOT NULL,
    folder_id uuid,
    name character varying(255) NOT NULL,
    mime_type character varying(255),
    current_version_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.folders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    drive_id uuid NOT NULL,
    parent_folder_id uuid,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying(128) NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    google_id character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(255),
    avatar_url character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: drive_shares drive_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_shares
    ADD CONSTRAINT drive_shares_pkey PRIMARY KEY (id);


--
-- Name: drive_shares drive_shares_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_shares
    ADD CONSTRAINT drive_shares_unique UNIQUE (drive_id, shared_with_user_id);


--
-- Name: drives drives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drives
    ADD CONSTRAINT drives_pkey PRIMARY KEY (id);


--
-- Name: file_versions file_versions_file_version_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_versions
    ADD CONSTRAINT file_versions_file_version_unique UNIQUE (file_id, version_number);


--
-- Name: file_versions file_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_versions
    ADD CONSTRAINT file_versions_pkey PRIMARY KEY (id);


--
-- Name: files files_drive_folder_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_drive_folder_name_unique UNIQUE (drive_id, folder_id, name);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: folders folders_drive_parent_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_drive_parent_name_unique UNIQUE (drive_id, parent_folder_id, name);


--
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_google_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key UNIQUE (google_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: drive_shares_drive_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX drive_shares_drive_id_idx ON public.drive_shares USING btree (drive_id);


--
-- Name: drive_shares_shared_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX drive_shares_shared_by_idx ON public.drive_shares USING btree (shared_by);


--
-- Name: drive_shares_shared_with_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX drive_shares_shared_with_user_id_idx ON public.drive_shares USING btree (shared_with_user_id);


--
-- Name: drives_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX drives_user_id_idx ON public.drives USING btree (user_id);


--
-- Name: file_versions_file_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX file_versions_file_id_idx ON public.file_versions USING btree (file_id);


--
-- Name: file_versions_storage_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX file_versions_storage_key_idx ON public.file_versions USING btree (storage_key);


--
-- Name: file_versions_uploaded_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX file_versions_uploaded_by_idx ON public.file_versions USING btree (uploaded_by);


--
-- Name: files_drive_folder_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX files_drive_folder_name_idx ON public.files USING btree (drive_id, folder_id, name);


--
-- Name: files_drive_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX files_drive_id_idx ON public.files USING btree (drive_id);


--
-- Name: files_folder_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX files_folder_id_idx ON public.files USING btree (folder_id);


--
-- Name: folders_drive_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX folders_drive_id_idx ON public.folders USING btree (drive_id);


--
-- Name: folders_drive_parent_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX folders_drive_parent_name_idx ON public.folders USING btree (drive_id, parent_folder_id, name);


--
-- Name: folders_parent_folder_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX folders_parent_folder_id_idx ON public.folders USING btree (parent_folder_id);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_google_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_google_id_idx ON public.users USING btree (google_id);


--
-- Name: drives drives_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER drives_updated_at_trigger BEFORE UPDATE ON public.drives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: files files_check_folder_drive_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER files_check_folder_drive_trigger BEFORE INSERT OR UPDATE ON public.files FOR EACH ROW EXECUTE FUNCTION public.check_file_folder_drive();


--
-- Name: files files_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER files_updated_at_trigger BEFORE UPDATE ON public.files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: folders folders_check_parent_drive_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER folders_check_parent_drive_trigger BEFORE INSERT OR UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION public.check_folder_parent_drive();


--
-- Name: folders folders_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER folders_updated_at_trigger BEFORE UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users users_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_updated_at_trigger BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: drive_shares drive_shares_drive_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_shares
    ADD CONSTRAINT drive_shares_drive_id_fkey FOREIGN KEY (drive_id) REFERENCES public.drives(id) ON DELETE CASCADE;


--
-- Name: drive_shares drive_shares_shared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_shares
    ADD CONSTRAINT drive_shares_shared_by_fkey FOREIGN KEY (shared_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: drive_shares drive_shares_shared_with_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_shares
    ADD CONSTRAINT drive_shares_shared_with_user_id_fkey FOREIGN KEY (shared_with_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: drives drives_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drives
    ADD CONSTRAINT drives_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: file_versions file_versions_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_versions
    ADD CONSTRAINT file_versions_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE;


--
-- Name: file_versions file_versions_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_versions
    ADD CONSTRAINT file_versions_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: files files_current_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_current_version_id_fkey FOREIGN KEY (current_version_id) REFERENCES public.file_versions(id) ON DELETE SET NULL;


--
-- Name: files files_drive_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_drive_id_fkey FOREIGN KEY (drive_id) REFERENCES public.drives(id) ON DELETE CASCADE;


--
-- Name: files files_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folders(id) ON DELETE CASCADE;


--
-- Name: folders folders_drive_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_drive_id_fkey FOREIGN KEY (drive_id) REFERENCES public.drives(id) ON DELETE CASCADE;


--
-- Name: folders folders_parent_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_parent_folder_id_fkey FOREIGN KEY (parent_folder_id) REFERENCES public.folders(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20251126222618');
