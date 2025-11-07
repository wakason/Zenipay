# 🏦 ZeniPay - Secure International Payment Portal

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-20.x-green)
![Express](https://img.shields.io/badge/Express-5.x-lightgrey)
![React](https://img.shields.io/badge/React-18.x-blue)
![MySQL](https://img.shields.io/badge/MySQL-8.0-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-Configured-success)

**A secure, production-ready international payment portal with comprehensive security features, employee verification workflows, and SWIFT integration.**

[Features](#-features) • [Quick Start](#-quick-start) • [API Documentation](#-api-documentation) • [Security](#-security-features) • [Testing](#-testing)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [API Documentation](#-api-documentation)
- [Security Features](#-security-features)
- [Project Structure](#-project-structure)
- [Testing](#-testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Default Accounts](#-default-accounts)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

ZeniPay is a secure international payment portal designed for banks and financial institutions. It enables customers to create international payments via SWIFT, while employees verify and process transactions through a dedicated portal.

### Key Capabilities

- ✅ **Customer Portal**: Registration, login, and payment creation
- ✅ **Employee Portal**: Transaction verification and SWIFT submission
- ✅ **Security**: Comprehensive protection against OWASP Top 10 vulnerabilities
- ✅ **Audit Logging**: Complete security audit trails
- ✅ **CI/CD**: Automated testing and code quality analysis

---

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication with secure token management
- Role-based access control (Customer/Employee)
- Password hashing with bcrypt (12 salt rounds)
- Strong password requirements enforcement

### 💳 Payment Processing
- International payment creation with SWIFT codes
- Multi-currency support (USD, EUR, ZAR, etc.)
- Transaction status tracking (pending → verified → completed)
- Payment verification workflow for employees

### 🛡️ Security Features
- **Input Validation**: RegEx-based whitelisting for all inputs
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Multi-layer input sanitization
- **CSRF Protection**: Token-based CSRF prevention
- **Rate Limiting**: DDoS protection (3 tiers)
- **Security Headers**: Helmet.js with comprehensive CSP
- **SSL/TLS**: Secure data in transit
- **Clickjacking Protection**: X-Frame-Options headers
- **Session Security**: Secure token management

### 📊 Additional Features
- Comprehensive audit logging
- Employee registration prevention (pre-registered only)
- Automated test suite
- GitHub Actions CI/CD with SonarQube
- Windows setup documentation

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 20.x
- **Framework**: Express.js 5.x
- **Database**: MySQL 8.0 / MariaDB
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet, CORS, express-rate-limit, csurf
- **Password Hashing**: bcrypt

### Frontend
- **Framework**: React 18.x with TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios

### DevOps
- **CI/CD**: GitHub Actions
- **Code Quality**: SonarQube
- **Version Control**: Git/GitHub

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **MySQL/MariaDB** 8.0+ (XAMPP recommended for Windows)
- **Git** ([Download](https://git-scm.com/))

### 1. Clone the Repository

```bash
git clone https://github.com/wakason/Zenipay.git
cd Zenipay
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.env` file in the project root:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=payment_portal

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1h

# Security Configuration
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# SSL/TLS (Optional - for production)
SSL_CERT_PATH=./certs/server.crt
SSL_KEY_PATH=./certs/server.key
```

### 4. Start MySQL

**Windows (XAMPP):**
1. Open XAMPP Control Panel
2. Start MySQL service

**Linux/Mac:**
```bash
sudo systemctl start mysql
# or
brew services start mysql
```

### 5. Start the Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The server will automatically:
- ✅ Connect to the database
- ✅ Create tables if they don't exist
- ✅ Seed default employee accounts

### 6. Verify Installation

Visit: `http://localhost:5000/health`

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-01-06T...",
  "environment": "development",
  "version": "1.0.0"
}
```

---

## 📦 Installation

### Detailed Setup Instructions

<details>
<summary><b>Windows Setup (XAMPP)</b></summary>

See [WINDOWS-SETUP.md](./WINDOWS-SETUP.md) for detailed Windows installation instructions.

</details>

<details>
<summary><b>Linux/Mac Setup</b></summary>

```bash
# Install MySQL
sudo apt-get install mysql-server  # Ubuntu/Debian
brew install mysql                 # macOS

# Start MySQL
sudo systemctl start mysql

# Create database
mysql -u root -p < database-setup.sql

# Install Node.js dependencies
npm install

# Start server
npm run dev
```

</details>

### Generate SSL Certificates (Optional)

For HTTPS in development:

```bash
npm run setup:ssl
```

This generates self-signed certificates in the `certs/` directory.

---

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register Customer
```http
POST /api/auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "idNumber": "1234567890123",
  "accountNumber": "CUST001",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "message": "Registration successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "fullName": "John Doe",
    "accountNumber": "CUST001",
    "role": "customer"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "accountNumber": "CUST001",
  "password": "SecurePass123!"
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

### Payment Endpoints

#### Create Payment (Customer)
```http
POST /api/payments/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": "1000.50",
  "currency": "USD",
  "payeeAccount": "PAYEE123",
  "swiftCode": "SBZAZAJJ",
  "payeeName": "Jane Smith"
}
```

#### Get Pending Transactions (Employee)
```http
GET /api/payments/pending?page=1&limit=10
Authorization: Bearer <employee_token>
```

#### Verify Transaction (Employee)
```http
PUT /api/payments/verify/:transactionId
Authorization: Bearer <employee_token>
Content-Type: application/json

{
  "verified": true,
  "notes": "Account verified, SWIFT code valid"
}
```

#### Submit to SWIFT (Employee)
```http
POST /api/payments/submit-to-swift/:transactionId
Authorization: Bearer <employee_token>
```

### Complete API Reference

See [API Documentation](./docs/API.md) for complete endpoint documentation.

---

## 🔒 Security Features

### Password Security
- ✅ Bcrypt hashing with 12 salt rounds (configurable)
- ✅ Strong password requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&)

### Input Validation
- ✅ RegEx patterns for all input fields:
  - Account numbers: `/^[A-Z0-9]{6,20}$/`
  - ID numbers: `/^[0-9]{13}$/`
  - SWIFT codes: `/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/`
  - Currency codes: `/^[A-Z]{3}$/`
- ✅ SQL injection prevention via parameterized queries
- ✅ XSS protection with multi-layer sanitization
- ✅ Query parameter validation

### Security Headers
- ✅ **X-Frame-Options**: DENY (clickjacking protection)
- ✅ **X-Content-Type-Options**: nosniff
- ✅ **Content-Security-Policy**: Comprehensive CSP
- ✅ **Strict-Transport-Security**: HSTS enabled
- ✅ **Referrer-Policy**: strict-origin-when-cross-origin

### Rate Limiting
- ✅ **General API**: 100 requests per 15 minutes
- ✅ **Authentication**: 10 requests per 15 minutes (production)
- ✅ **Payment Creation**: 3 requests per minute

### Attack Protection
- ✅ **Session Jacking**: JWT tokens with expiration
- ✅ **Clickjacking**: X-Frame-Options + CSP
- ✅ **SQL Injection**: Parameterized queries + pattern detection
- ✅ **XSS**: Input sanitization + CSP
- ✅ **MITM**: SSL/TLS + HSTS
- ✅ **DDoS**: Multi-tier rate limiting

### Employee Registration Prevention
- ✅ Employees cannot register through public API
- ✅ Only pre-registered employees can access employee portal
- ✅ Account number pattern validation (blocks EMP* accounts)

See [SECURITY.md](./SECURITY.md) for comprehensive security documentation.

---

## 📁 Project Structure

```
zenipay/
├── .github/                # GitHub configuration
│   └── workflows/          # GitHub Actions workflows
│       └── ci.yml          # CI/CD pipeline
├── src/
│   ├── config/             # Database configuration
│   │   └── db.js           # Connection pool & initialization
│   ├── middleware/         # Express middleware
│   │   ├── auth.js         # Authentication & authorization
│   │   └── security.js     # Security headers & validation
│   ├── routes/             # API routes
│   │   ├── auth.js         # Authentication routes
│   │   └── payments.js     # Payment routes
│   ├── utils/              # Utility functions
│   │   ├── auth.js         # Password hashing, JWT, validation
│   │   └── validation.ts   # Frontend validation patterns
│   ├── pages/              # React components (frontend)
│   ├── components/         # Reusable React components
│   ├── contexts/           # React contexts (AuthContext)
│   ├── services/           # API service layer
│   └── server.js           # Application entry point
├── scripts/
│   └── generate-ssl-certs.js  # SSL certificate generator
├── .env                    # Environment variables (not in repo)
├── .gitignore             # Git ignore rules
├── package.json           # Dependencies & scripts
├── sonar-project.properties  # SonarQube configuration
├── database-setup.sql    # Database schema
├── test-website.js       # Automated test suite
├── README.md             # This file
├── SECURITY.md           # Security documentation
├── TESTING-GUIDE.md      # Testing instructions
└── CICD-SETUP.md         # CI/CD setup guide
```

---

## 🧪 Testing

### Automated Test Suite

Run the comprehensive test suite:

```bash
npm run test:api
```

This tests:
- ✅ Health check
- ✅ Customer registration & login
- ✅ Employee login
- ✅ Payment creation
- ✅ Transaction retrieval
- ✅ Input validation
- ✅ Security features
- ✅ Employee registration prevention

### Manual Testing

See [TESTING-GUIDE.md](./TESTING-GUIDE.md) for detailed testing instructions.

### Example API Calls

```bash
# Health check
curl http://localhost:5000/health

# Register customer
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John Doe","idNumber":"1234567890123","accountNumber":"CUST001","password":"SecurePass123!"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"accountNumber":"CUST001","password":"SecurePass123!"}'
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Integration

The project includes GitHub Actions workflows for automated builds, testing, and code quality analysis.

**Features:**
- ✅ Automated builds on push and pull requests
- ✅ Dependency installation and caching
- ✅ Application build verification
- ✅ Linting and testing
- ✅ SonarQube code quality analysis

**Setup:**
1. Configure SonarCloud token in GitHub Secrets
2. Push code to trigger pipeline automatically
3. View workflow runs in the Actions tab

See [CICD-SETUP.md](./CICD-SETUP.md) for detailed setup instructions.

### SonarQube Analysis

- Code quality metrics
- Security hotspot detection
- Code smell identification
- Coverage reporting
- Automatic analysis on pull requests and main branch

---

## 👥 Default Accounts

The system automatically creates default employee accounts:

| Role | Account Number | Password | Description |
|------|---------------|----------|-------------|
| Admin | `EMP001` | `Admin123!` | Admin User |
| Manager | `EMP002` | `Manager123!` | Bank Manager |

**Note:** Employees cannot register through the public API. They must be pre-registered by administrators.

---

## 🐛 Troubleshooting

### Common Issues

<details>
<summary><b>MySQL Connection Error</b></summary>

**Problem:** `ER_ACCESS_DENIED_ERROR` or `ECONNREFUSED`

**Solutions:**
1. Verify MySQL is running: `mysql --version`
2. Check `.env` credentials match MySQL setup
3. Test connection: `mysql -u root -p`
4. Ensure database exists: `CREATE DATABASE payment_portal;`

</details>

<details>
<summary><b>Port Already in Use</b></summary>

**Problem:** `EADDRINUSE: address already in use :::5000`

**Solutions:**
1. Change port in `.env`: `PORT=5001`
2. Or kill process using port 5000:
   ```bash
   # Windows
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F
   
   # Linux/Mac
   lsof -ti:5000 | xargs kill
   ```

</details>

<details>
<summary><b>Module Not Found</b></summary>

**Problem:** `Cannot find module '...'`

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

</details>

<details>
<summary><b>Database Schema Mismatch</b></summary>

**Problem:** `Unknown column 'accountNumber'` or similar errors

**Solution:**
```bash
# Reset database
mysql -u root -p -e "DROP DATABASE IF EXISTS payment_portal;"

# Recreate schema
mysql -u root -p < database-setup.sql

# Or use automated setup
npm run setup:db
```

</details>

### Getting Help

- 📖 Check [WINDOWS-SETUP.md](./WINDOWS-SETUP.md) for Windows-specific issues
- 🔒 See [SECURITY.md](./SECURITY.md) for security-related questions
- 🧪 Review [TESTING-GUIDE.md](./TESTING-GUIDE.md) for testing help
- 🐛 Open an [Issue](https://github.com/wakason/Zenipay/issues) on GitHub

---

## 📝 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with nodemon |
| `npm run server` | Start server once (no auto-restart) |
| `npm run build` | Build React frontend for production |
| `npm run test` | Run React tests |
| `npm run test:api` | Run comprehensive API test suite |
| `npm run setup:db` | Setup database tables |
| `npm run setup:ssl` | Generate SSL certificates for development |
| `npm run seed:employees` | Seed/update default employee accounts |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Add tests** if applicable
5. **Commit your changes**
   ```bash
   git commit -m "feat: Add amazing feature"
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Code Style

- Follow existing code style
- Add comments for complex logic
- Update documentation as needed
- Ensure all tests pass

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Express.js community
- React team
- OWASP security guidelines
- All contributors and testers

---

## 📞 Support

For support, questions, or issues:

- 📧 Open an [Issue](https://github.com/wakason/Zenipay/issues)
- 📖 Check the [Documentation](./docs/)
- 🔒 Review [Security Documentation](./SECURITY.md)

---

<div align="center">

**Made with ❤️ for secure international payments**

[⬆ Back to Top](#-zenipay---secure-international-payment-portal)

</div>
