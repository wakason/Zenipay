import express from 'express';
import dotenv from 'dotenv';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import configurations and middleware
import { setupSecurityMiddleware } from './middleware/security.js';
import { testConnection, initializeDatabase, createDefaultEmployees } from './config/db.js';

// Import routes
import authRoutes from './routes/auth.js';
import paymentRoutes from './routes/payments.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Setup security middleware
setupSecurityMiddleware(app);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Don't leak error details in production
  const isDevelopment = NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    error: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    console.log('🚀 Starting Payment Portal Backend...');
    
    // Test database connection
    await testConnection();
    
    // Initialize database tables
    await initializeDatabase();
    
    // Create default employee accounts
    await createDefaultEmployees();
    
    // Start server with SSL/TLS support
    const sslCertPath = process.env.SSL_CERT_PATH || (NODE_ENV === 'development' ? './certs/server.crt' : null);
    const sslKeyPath = process.env.SSL_KEY_PATH || (NODE_ENV === 'development' ? './certs/server.key' : null);
    
    // Check if SSL certificates exist
    const sslCertExists = sslCertPath && fs.existsSync(sslCertPath);
    const sslKeyExists = sslKeyPath && fs.existsSync(sslKeyPath);
    
    if (sslCertExists && sslKeyExists) {
      // HTTPS server with SSL/TLS
      const sslOptions = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
        // Additional SSL/TLS security options
        secureProtocol: 'TLSv1_2_method', // Use TLS 1.2 or higher
        ciphers: [
          'ECDHE-RSA-AES128-GCM-SHA256',
          'ECDHE-ECDSA-AES128-GCM-SHA256',
          'ECDHE-RSA-AES256-GCM-SHA384',
          'ECDHE-ECDSA-AES256-GCM-SHA384',
          '!aNULL',
          '!eNULL',
          '!EXPORT',
          '!DES',
          '!RC4',
          '!MD5',
          '!PSK',
          '!SRP',
          '!CAMELLIA'
        ].join(':'),
        honorCipherOrder: true
      };
      
      https.createServer(sslOptions, app).listen(PORT, () => {
        console.log(`🔒 HTTPS Server running on port ${PORT}`);
        console.log(`🌐 Environment: ${NODE_ENV}`);
        console.log(`📊 Health check: https://localhost:${PORT}/health`);
        console.log(`🔑 Auth endpoints: https://localhost:${PORT}/api/auth`);
        console.log(`💳 Payment endpoints: https://localhost:${PORT}/api/payments`);
        console.log(`🔐 SSL/TLS enabled with secure cipher suites`);
        if (NODE_ENV === 'development') {
          console.log(`⚠️  Using self-signed certificate - browser will show security warning`);
        }
      });
    } else {
      // HTTP server for development (fallback)
      if (NODE_ENV === 'production') {
        console.warn('⚠️  WARNING: Running in production without SSL certificates!');
        console.warn('   Set SSL_CERT_PATH and SSL_KEY_PATH environment variables.');
        console.warn('   All traffic should be served over HTTPS in production.');
      }
      
      app.listen(PORT, () => {
        console.log(`🌐 HTTP Server running on port ${PORT}`);
        console.log(`🌐 Environment: ${NODE_ENV}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
        console.log(`🔑 Auth endpoints: http://localhost:${PORT}/api/auth`);
        console.log(`💳 Payment endpoints: http://localhost:${PORT}/api/payments`);
        if (NODE_ENV === 'development') {
          console.log(`💡 To enable HTTPS, run: node scripts/generate-ssl-certs.js`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();
