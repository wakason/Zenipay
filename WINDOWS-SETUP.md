## ZeniPay Payment Portal — Windows Setup Guide

This guide explains how to set up and run the app on Windows using XAMPP (MySQL/MariaDB) and Node.js.

### 1) Prerequisites
- Node.js 18+ (install from `https://nodejs.org`)
- XAMPP with MySQL/MariaDB (install from `https://www.apachefriends.org`)


### 2) Start MySQL (XAMPP)
1. Open XAMPP Control Panel.
2. Click Start on MySQL (leave port at 3306).
3. Optional: Start Apache if you plan to serve static content.

### 3) Project files
Place the project at:
`C:\Users\<YourUser>\Desktop\payment-portal`

Open a PowerShell window in the project folder.

### 4) Environment variables (.env)
Create a `.env` file in the project root with:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=payment_portal
PORT=5000
NODE_ENV=development
JWT_SECRET=change-me
```
If your MySQL root user has a password in XAMPP, set `DB_PASSWORD` accordingly.

### 5) Install dependencies
PowerShell (from project root):
```powershell
npm install
```
Notes:
- The project will automatically attempt to set up the database after install (`postinstall`) and before server startup.

### 6) Database setup (two options)

Option A — Automatic (recommended)
- The project includes scripts to auto-create the database/tables and seed default employees.
- This runs on `npm install` and before `npm run dev`/`npm run server`.
- You can also trigger it manually:
```powershell
npm run setup:db
```

Option B — Manual (MySQL CLI)
1. Ensure the MySQL CLI is available. If `mysql --version` doesn’t work in PowerShell, temporarily add it to PATH for the session:
```powershell
$env:Path = "C:\xampp\mysql\bin;" + $env:Path
mysql --version
```
2. Import the schema with cmd redirection (PowerShell-friendly):
```powershell
cmd /c "mysql -u root < database-setup.sql"
```
If root has a password:
```powershell
cmd /c "mysql -u root -p < database-setup.sql"
```

The schema creates:
- `users (id, full_name, id_number, account_number, password_hash, role, is_active, created_at, updated_at)`
- `transactions (id, customer_id, amount, currency, payee_account, swift_code, payee_name, status, employee_notes, created_at, updated_at)`
- `audit_logs (id, user_id, action, details, ip_address, user_agent, created_at)`

Default employee accounts (if using the JS setup script):
- Admin: account_number=EMP001, password=Admin123!
- Manager: account_number=EMP002, password=Manager123!

### 7) Run the servers

Backend only (API):
```powershell
npm run dev
```
Starts Express API on `http://localhost:5000`.

Frontend (if included) uses React dev server:
```powershell
npm start
```

Health check:
`http://localhost:5000/health`

Key API endpoints:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile`
- `PUT /api/auth/change-password`
- `POST /api/payments/create`
- `GET /api/payments/my-transactions`

### 8) Quick test (PowerShell)
Register a customer:
```powershell
curl -Method POST http://localhost:5000/api/auth/register -Headers @{"Content-Type"="application/json"} -Body '{"fullName":"John Doe","idNumber":"1234567890123","accountNumber":"CUST001","password":"SecurePass123!"}'
```

### 9) Troubleshooting (Windows)
- MySQL CLI not found:
  - Add to PATH for the session: `$env:Path = "C:\xampp\mysql\bin;" + $env:Path`
- Access denied (ERROR 1045):
  - Verify `DB_USER`/`DB_PASSWORD` and try manual import with `-p`.
- Port 5000 in use:
  - Change `PORT` in `.env`, restart `npm run dev`.
- Schema mismatch errors (e.g., unknown column `account_number`):
  - Reset DB: `cmd /c "mysql -u root -e \"DROP DATABASE IF EXISTS payment_portal;\""`
  - Re-import schema (Option B above) or run `npm run setup:db`.
- Rate limiting while testing auth:
  - The auth rate limit allows 10 attempts per 15 minutes.

### 10) Production notes
- Set a strong `JWT_SECRET`.
- Create a non-root MySQL user for production.
- Set `NODE_ENV=production`.
- Consider reverse proxy (IIS/Nginx) and HTTPS termination.


