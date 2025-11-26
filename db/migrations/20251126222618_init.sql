-- migrate:up

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX users_google_id_idx ON users(google_id);
CREATE INDEX users_email_idx ON users(email);

-- 2. Drives table
CREATE TABLE drives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX drives_user_id_idx ON drives(user_id);

-- 3. Folders table
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drive_id UUID NOT NULL REFERENCES drives(id) ON DELETE CASCADE,
    parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT folders_drive_parent_name_unique UNIQUE (drive_id, parent_folder_id, name)
);

CREATE INDEX folders_drive_id_idx ON folders(drive_id);
CREATE INDEX folders_parent_folder_id_idx ON folders(parent_folder_id);
CREATE INDEX folders_drive_parent_name_idx ON folders(drive_id, parent_folder_id, name);

-- Add trigger to ensure parent_folder belongs to same drive
CREATE OR REPLACE FUNCTION check_folder_parent_drive()
RETURNS TRIGGER AS $$
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
$$ language 'plpgsql';

CREATE TRIGGER folders_check_parent_drive_trigger
    BEFORE INSERT OR UPDATE ON folders
    FOR EACH ROW
    EXECUTE FUNCTION check_folder_parent_drive();

-- 4. Files table (created before file_versions, current_version_id FK added later)
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drive_id UUID NOT NULL REFERENCES drives(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(255),
    current_version_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT files_drive_folder_name_unique UNIQUE (drive_id, folder_id, name)
);

CREATE INDEX files_drive_id_idx ON files(drive_id);
CREATE INDEX files_folder_id_idx ON files(folder_id);
CREATE INDEX files_drive_folder_name_idx ON files(drive_id, folder_id, name);

-- Add trigger to ensure folder belongs to same drive
CREATE OR REPLACE FUNCTION check_file_folder_drive()
RETURNS TRIGGER AS $$
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
$$ language 'plpgsql';

CREATE TRIGGER files_check_folder_drive_trigger
    BEFORE INSERT OR UPDATE ON files
    FOR EACH ROW
    EXECUTE FUNCTION check_file_folder_drive();

-- 5. File versions table
CREATE TABLE file_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_key VARCHAR(1000) NOT NULL,
    storage_provider VARCHAR(100) NOT NULL DEFAULT 's3-glacier',
    storage_region VARCHAR(100),
    checksum VARCHAR(255),
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT file_versions_file_version_unique UNIQUE (file_id, version_number)
);

CREATE INDEX file_versions_file_id_idx ON file_versions(file_id);
CREATE INDEX file_versions_storage_key_idx ON file_versions(storage_key);
CREATE INDEX file_versions_uploaded_by_idx ON file_versions(uploaded_by);

-- Add foreign key constraint for files.current_version_id after file_versions table exists
ALTER TABLE files 
    ADD CONSTRAINT files_current_version_id_fkey 
    FOREIGN KEY (current_version_id) REFERENCES file_versions(id) ON DELETE SET NULL;

-- 6. Drive shares table (for future collaboration)
CREATE TABLE drive_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drive_id UUID NOT NULL REFERENCES drives(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(50) NOT NULL CHECK (permission IN ('read', 'write', 'admin')),
    shared_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT drive_shares_unique UNIQUE (drive_id, shared_with_user_id)
);

CREATE INDEX drive_shares_drive_id_idx ON drive_shares(drive_id);
CREATE INDEX drive_shares_shared_with_user_id_idx ON drive_shares(shared_with_user_id);
CREATE INDEX drive_shares_shared_by_idx ON drive_shares(shared_by);

-- 7. User sessions table (for tracking logged in user sessions)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255),
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX user_sessions_user_id_idx ON user_sessions(user_id);
CREATE INDEX user_sessions_session_token_idx ON user_sessions(session_token);
CREATE INDEX user_sessions_expires_at_idx ON user_sessions(expires_at);

-- 8. Key-value store table (for generic key-value storage)
CREATE TABLE key_value_store (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    namespace VARCHAR(100) DEFAULT 'default',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX key_value_store_namespace_idx ON key_value_store(namespace);
CREATE INDEX key_value_store_expires_at_idx ON key_value_store(expires_at);

-- Add updated_at triggers to all tables
CREATE TRIGGER users_updated_at_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER drives_updated_at_trigger
    BEFORE UPDATE ON drives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER folders_updated_at_trigger
    BEFORE UPDATE ON folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER files_updated_at_trigger
    BEFORE UPDATE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER user_sessions_updated_at_trigger
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER key_value_store_updated_at_trigger
    BEFORE UPDATE ON key_value_store
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- migrate:down

-- Drop triggers first
DROP TRIGGER IF EXISTS key_value_store_updated_at_trigger ON key_value_store;
DROP TRIGGER IF EXISTS user_sessions_updated_at_trigger ON user_sessions;
DROP TRIGGER IF EXISTS files_updated_at_trigger ON files;
DROP TRIGGER IF EXISTS folders_updated_at_trigger ON folders;
DROP TRIGGER IF EXISTS drives_updated_at_trigger ON drives;
DROP TRIGGER IF EXISTS users_updated_at_trigger ON users;
DROP TRIGGER IF EXISTS files_check_folder_drive_trigger ON files;
DROP TRIGGER IF EXISTS folders_check_parent_drive_trigger ON folders;

-- Drop foreign key constraint that creates circular dependency
ALTER TABLE IF EXISTS files DROP CONSTRAINT IF EXISTS files_current_version_id_fkey;

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS key_value_store;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS drive_shares;
DROP TABLE IF EXISTS file_versions;
DROP TABLE IF EXISTS files;
DROP TABLE IF EXISTS folders;
DROP TABLE IF EXISTS drives;
DROP TABLE IF EXISTS users;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS check_file_folder_drive();
DROP FUNCTION IF EXISTS check_folder_parent_drive();

-- Drop extension (only if no other objects depend on it)
-- DROP EXTENSION IF EXISTS "uuid-ossp";

