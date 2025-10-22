# 🔐 Authentication & User Management Guide

## 📋 **Overview**

Advance ERP uses a **role-based access control (RBAC)** system with JWT authentication. Unlike consumer apps, **there is NO public user registration** - all users are created by administrators.

## 🏗️ **System Architecture**

### Authentication Flow
```
1. Admin creates user account → 2. User receives credentials → 3. User logs in → 4. JWT token issued → 5. Access granted
```

### Initial Setup Flow
```
1. Database migration → 2. Run seed script → 3. Super admin created → 4. Admin logs in → 5. Admin creates other users
```

---

## 🚀 **Initial Setup**

### Step 1: Run Database Migration

```bash
# Make sure PostgreSQL is running and database exists
psql -U postgres -f database/setup_dev_database.sql
psql -U admin -d advance_erp -f database/postgres_schema.sql
```

### Step 2: Run Seed Script

This creates the initial super admin account:

```bash
cd backend
npm run seed
```

**Output:**
```
✅ Database connection established
🌱 Starting database seed...
✅ Super Admin role created
✅ Permissions created
✅ Permissions linked to Super Admin role
✅ Admin user created
✅ Super Admin role assigned to admin user

🎉 Database seed completed successfully!

📝 Login Credentials:
   Username: admin
   Password: Admin@123
   Email: admin@advance-erp.com

⚠️  IMPORTANT: Change the admin password after first login!
```

### Step 3: Test Login

Visit `http://localhost:5173/login` and use:
- **Username:** `admin`
- **Password:** `Admin@123`

---

## 👥 **User Management**

### Creating New Users (Admin Only)

Only users with the `users.create` permission can create new users.

#### Via API:

```bash
POST /users
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "phone": "+1234567890",
  "roleIds": ["role-uuid-here"]
}
```

#### Via Frontend (Phase 3+):
The admin panel will have a user management interface for creating users.

---

## 🔑 **Roles & Permissions**

### Default Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **Super Admin** | Full system access | ALL |
| **Accountant** | Financial operations | accounts.*, vouchers.*, reports.view |
| **Warehouse Manager** | Warehouse operations | warehouse.*, products.* |
| **Billing Officer** | Invoice management | invoices.*, customers.* |
| **Viewer** | Read-only access | *.read, reports.view |

### Available Permissions

```
users.create          - Create new users
users.read            - View users
users.update          - Update users
users.delete          - Delete users
roles.create          - Create roles
roles.read            - View roles
roles.update          - Update roles
roles.delete          - Delete roles
accounts.create       - Create accounts
accounts.read         - View accounts
accounts.update       - Update accounts
accounts.delete       - Delete accounts
vouchers.create       - Create vouchers
vouchers.read         - View vouchers
vouchers.update       - Update vouchers
vouchers.delete       - Delete vouchers
vouchers.post         - Post vouchers
vouchers.unpost       - Unpost vouchers
invoices.create       - Create invoices
invoices.read         - View invoices
invoices.update       - Update invoices
invoices.delete       - Delete invoices
invoices.approve      - Approve invoices
warehouse.create      - Create warehouse entries
warehouse.read        - View warehouse entries
warehouse.update      - Update warehouse entries
warehouse.delete      - Delete warehouse entries
reports.view          - View reports
reports.export        - Export reports
settings.manage       - Manage system settings
```

---

## 🔒 **Security Best Practices**

### Password Requirements
- Minimum 8 characters
- Must contain uppercase, lowercase, number, and special character
- Cannot be common passwords
- Must be changed on first login

### Account Lockout
- 5 failed login attempts → Account locked for 30 minutes
- Admins can unlock accounts via user management

### Token Management
- **Access Token:** Expires in 1 hour
- **Refresh Token:** Expires in 30 days
- Refresh tokens are stored in database
- Logout invalidates all refresh tokens

### Session Security
- HTTPS in production (required)
- HttpOnly cookies for refresh tokens
- CORS configured for frontend domain only
- JWT secrets rotated regularly (production)

---

## 📚 **API Endpoints**

### Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | User login |
| `POST` | `/auth/refresh` | Refresh access token |

### Protected Endpoints (Auth Required)

| Method | Endpoint | Description | Required Permission |
|--------|----------|-------------|---------------------|
| `POST` | `/auth/logout` | User logout | - |
| `POST` | `/auth/me` | Get current user | - |
| `GET` | `/users` | List all users | `users.read` |
| `GET` | `/users/:id` | Get user by ID | `users.read` |
| `POST` | `/users` | Create new user | `users.create` |
| `PATCH` | `/users/:id` | Update user | `users.update` |
| `DELETE` | `/users/:id` | Delete user | `users.delete` |
| `POST` | `/users/:id/change-password` | Change user password | `users.update` |

---

## 🧪 **Testing Authentication**

### 1. Test Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@123"
  }'
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@advance-erp.com",
    "fullName": "System Administrator",
    "roles": ["Super Admin"],
    "permissions": ["users.create", "users.read", ...]
  }
}
```

### 2. Test Protected Endpoint
```bash
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer <your_access_token>"
```

### 3. Test User Creation
```bash
curl -X POST http://localhost:3000/users \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123!",
    "fullName": "Test User",
    "phone": "+1234567890"
  }'
```

---

## ❓ **Troubleshooting**

### "Unauthorized" Error
- **Cause:** No token or invalid token
- **Solution:** Make sure you're sending the `Authorization: Bearer <token>` header

### "Forbidden" Error
- **Cause:** User doesn't have required permission
- **Solution:** Check user's roles and permissions

### "Account Locked" Error
- **Cause:** Too many failed login attempts
- **Solution:** Wait 30 minutes or have an admin unlock the account

### Seed Script Fails
- **Cause:** Database not created or not accessible
- **Solution:** Check database connection settings in `.env`

---

## 📝 **Common Tasks**

### Creating a New Role
```sql
INSERT INTO roles (role_name, description, is_active, created_at, updated_at)
VALUES ('Accountant', 'Financial operations staff', true, NOW(), NOW());
```

### Assigning Permission to Role
```sql
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT role_id FROM roles WHERE role_name = 'Accountant'),
  permission_id
FROM permissions
WHERE permission_code IN ('accounts.create', 'accounts.read', 'vouchers.create');
```

### Resetting User Password (SQL)
```sql
-- Password: NewPass123!
-- Use bcrypt to hash it first
UPDATE users 
SET password_hash = '<bcrypt_hashed_password>',
    password_changed_at = NOW()
WHERE username = 'admin';
```

---

## 🔄 **Production Considerations**

1. **Change default admin password immediately**
2. **Rotate JWT secrets regularly**
3. **Enable HTTPS (required)**
4. **Use strong passwords (enforce policy)**
5. **Monitor failed login attempts**
6. **Regular security audits**
7. **Implement 2FA (Phase 9)**
8. **Set up security logging**

---

**Last Updated:** October 20, 2025

