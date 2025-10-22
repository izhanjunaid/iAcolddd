# 🗄️ Database Setup Guide

## Prerequisites

- PostgreSQL 15+ installed on your system
- PostgreSQL service running
- Access to `psql` command-line tool

## Quick Setup (3 Steps)

### Step 1: Create Database & User

Run this command from the project root:

```bash
psql -U postgres -f database/setup_dev_database.sql
```

**Note:** You'll be prompted for the `postgres` user password. If you don't know it:
- **Windows**: Check the password you set during PostgreSQL installation
- **Default**: Often `postgres` or blank (just press Enter)

### Step 2: Run Schema Migration

```bash
psql -U admin -d advance_erp -f database/postgres_schema.sql
```

**Password:** `admin123`

### Step 3: Verify Connection

Test the database connection:

```bash
psql -U admin -d advance_erp -c "\dt"
```

You should see a list of tables if everything worked correctly.

---

## Alternative: Using pgAdmin

If you prefer a GUI:

1. **Open pgAdmin**
2. **Create User:**
   - Right-click "Login/Group Roles" → Create → Login/Group Role
   - Name: `admin`
   - Password: `admin123`
   - Privileges: Check "Can login?"
   
3. **Create Database:**
   - Right-click "Databases" → Create → Database
   - Name: `advance_erp`
   - Owner: `admin`
   
4. **Run Schema:**
   - Right-click `advance_erp` → Query Tool
   - Open file: `database/postgres_schema.sql`
   - Execute (F5)

---

## Troubleshooting

### `psql: command not found`

**Windows:** Add PostgreSQL to PATH:
```bash
setx PATH "%PATH%;C:\Program Files\PostgreSQL\15\bin"
```
Then restart your terminal.

### `password authentication failed for user "postgres"`

1. Check your PostgreSQL password
2. Edit `pg_hba.conf` to allow local connections:
   ```
   # IPv4 local connections:
   host    all             all             127.0.0.1/32            trust
   ```
3. Restart PostgreSQL service

### Connection refused

Make sure PostgreSQL service is running:

**Windows:**
```powershell
Get-Service postgresql*
# If not running:
Start-Service postgresql-x64-15
```

---

## After Database Setup

Once the database is set up, restart your backend server and it should connect successfully! 🎉

