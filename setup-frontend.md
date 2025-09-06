# Frontend Setup Instructions

## Prerequisites
- Node.js (v16 or higher)
- npm or yarn

## Installation Steps

1. **Install Frontend Dependencies**
   ```bash
   npm install react@^18.2.0 react-dom@^18.2.0 react-router-dom@^6.8.0 react-scripts@5.0.1 axios@^1.3.0 lucide-react@^0.263.1 typescript@^4.9.5 @types/react@^18.0.28 @types/react-dom@^18.0.11 @types/node@^18.15.0
   ```

2. **Install Development Dependencies**
   ```bash
   npm install --save-dev tailwindcss@^3.2.7 autoprefixer@^10.4.14 postcss@^8.4.21 @types/jest@^27.5.2
   ```

3. **Create Environment File**
   Create a `.env` file in the root directory with:
   ```
   REACT_APP_API_URL=http://localhost:5000
   ```

4. **Start the Frontend**
   ```bash
   npm start
   ```

## Backend Setup

1. **Install Backend Dependencies**
   ```bash
   npm install
   ```

2. **Create Environment File**
   Create a `.env` file with:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=payment_portal
   JWT_SECRET=your-super-secret-jwt-key
   PORT=5000
   NODE_ENV=development
   ```

3. **Setup Database**
   - Create MySQL database named `payment_portal`
   - Run the SQL script: `database-setup.sql`

4. **Start the Backend**
   ```bash
   npm run dev
   ```

## Default Login Credentials

**Employee Accounts:**
- Admin: account_number=EMP001, password=Admin123!
- Manager: account_number=EMP002, password=Manager123!

## API Endpoints

- Backend: http://localhost:5000
- Frontend: http://localhost:3000
- Health Check: http://localhost:5000/health
