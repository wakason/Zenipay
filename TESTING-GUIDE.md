# Manual Testing Guide

## Quick Start Testing

### 1. Start the Server
```powershell
npm run dev
```

Wait for the server to start. You should see:
- ✅ Database connected successfully
- ✅ Database tables initialized successfully
- ✅ Default employee accounts ensured
- 🌐 HTTP Server running on port 5000

### 2. Test Health Check
Open your browser or use PowerShell:
```powershell
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "...",
  "environment": "development",
  "version": "1.0.0"
}
```

### 3. Test Customer Registration

**Using PowerShell:**
```powershell
$body = @{
    fullName = "John Doe"
    idNumber = "1234567890123"
    accountNumber = "CUST001"
    password = "SecurePass123!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $body -ContentType "application/json"
```

**Using Browser (Postman/Thunder Client):**
- URL: `POST http://localhost:5000/api/auth/register`
- Body (JSON):
```json
{
  "fullName": "John Doe",
  "idNumber": "1234567890123",
  "accountNumber": "CUST001",
  "password": "SecurePass123!"
}
```

Expected: Status 201 with token

### 4. Test Customer Login

```powershell
$body = @{
    accountNumber = "CUST001"
    password = "SecurePass123!"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
$token = $response.token
Write-Host "Token: $token"
```

### 5. Test Employee Login

```powershell
$body = @{
    accountNumber = "EMP001"
    password = "Admin123!"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
$empToken = $response.token
Write-Host "Employee Token: $empToken"
```

### 6. Test Create Payment (Customer)

```powershell
$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    amount = "1000.50"
    currency = "USD"
    payeeAccount = "PAYEE123"
    swiftCode = "SBZAZAJJ"
    payeeName = "Jane Smith"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/payments/create" -Method POST -Body $body -Headers $headers
```

### 7. Test Get Pending Transactions (Employee)

```powershell
$empHeaders = @{
    Authorization = "Bearer $empToken"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/payments/pending" -Method GET -Headers $empHeaders
```

## Security Feature Tests

### Test 1: Weak Password Rejection
```powershell
$body = @{
    fullName = "Test User"
    idNumber = "1234567890123"
    accountNumber = "WEAK001"
    password = "weak"
} | ConvertTo-Json

# Should return 400 error
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $body -ContentType "application/json" -ErrorAction SilentlyContinue
```

### Test 2: Employee Registration Prevention
```powershell
$body = @{
    fullName = "Test Employee"
    idNumber = "1234567890123"
    accountNumber = "EMP999"
    password = "SecurePass123!"
    role = "employee"
} | ConvertTo-Json

# Should return 403 error
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $body -ContentType "application/json" -ErrorAction SilentlyContinue
```

### Test 3: SQL Injection Protection
```powershell
$body = @{
    accountNumber = "' OR '1'='1"
    password = "anything"
} | ConvertTo-Json

# Should return 400 or 401 error
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $body -ContentType "application/json" -ErrorAction SilentlyContinue
```

### Test 4: Authentication Required
```powershell
# Should return 401 error
Invoke-RestMethod -Uri "http://localhost:5000/api/payments/pending" -Method GET -ErrorAction SilentlyContinue
```

## Frontend Testing

### Start Frontend (if available)
```powershell
npm start
```

Then open: `http://localhost:3000`

### Test Frontend Features:
1. **Registration Page**: `http://localhost:3000/register`
   - Try registering a new customer
   - Try weak password (should show error)
   - Try invalid account number (should show error)

2. **Login Page**: `http://localhost:3000/login`
   - Login as customer: `CUST001` / `SecurePass123!`
   - Login as employee: `EMP001` / `Admin123!`

3. **Customer Dashboard**: After customer login
   - Create a payment
   - View transaction history

4. **Employee Dashboard**: After employee login
   - View pending transactions
   - Verify transactions
   - Submit to SWIFT

## Automated Test Suite

Run the comprehensive test suite:
```powershell
npm run test:api
```

This will test:
- ✅ Health check
- ✅ Customer registration
- ✅ Customer login
- ✅ Employee login
- ✅ Payment creation
- ✅ Get pending transactions
- ✅ Input validation
- ✅ Employee registration prevention
- ✅ Rate limiting
- ✅ SQL injection protection
- ✅ Authentication required

## Troubleshooting

### Server won't start
1. Check MySQL is running (XAMPP Control Panel)
2. Check `.env` file exists with correct database credentials
3. Run `npm run setup:db` manually

### Database connection errors
1. Verify MySQL is running on port 3306
2. Check database credentials in `.env`
3. Ensure database `payment_portal` exists

### Employee login fails
Run: `npm run seed:employees`

### Port already in use
Change `PORT` in `.env` file or stop the process using port 5000

## Expected Test Results

✅ **All security features working:**
- Password validation ✅
- Input whitelisting ✅
- Employee registration blocked ✅
- SQL injection protection ✅
- XSS protection ✅
- Rate limiting ✅
- Authentication required ✅

The website is working correctly! 🎉

