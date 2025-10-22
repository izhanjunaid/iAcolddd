-- ==========================================
-- PostgreSQL Development Database Setup
-- ==========================================
-- Run this script as a PostgreSQL superuser (e.g., postgres)
-- to create the development database and user
--
-- Command: psql -U postgres -f setup_dev_database.sql
-- ==========================================

-- Create the user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'admin') THEN
        CREATE USER admin WITH PASSWORD 'admin123';
    END IF;
END
$$;

-- Create the database if it doesn't exist
SELECT 'CREATE DATABASE advance_erp OWNER admin ENCODING ''UTF8'''
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'advance_erp')\gexec

-- Grant all privileges to the admin user
GRANT ALL PRIVILEGES ON DATABASE advance_erp TO admin;

-- Connect to the database and grant schema privileges
\c advance_erp

-- Grant privileges on the public schema
GRANT ALL ON SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;

-- Ensure future objects also have correct privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO admin;

\echo '✅ Database setup complete!'
\echo '   Database: advance_erp'
\echo '   User: admin'
\echo '   Password: admin123'
\echo ''
\echo 'Next steps:'
\echo '1. Run the schema script: psql -U admin -d advance_erp -f postgres_schema.sql'
\echo '2. Restart your NestJS backend server'

