import dotenv from 'dotenv';
dotenv.config();

import { createDefaultEmployees, testConnection, initializeDatabase } from './src/config/db.js';

const run = async () => {
  try {
    console.log('🔧 Seeding default employees...');
    await testConnection();
    await initializeDatabase();
    await createDefaultEmployees();
    console.log('🎉 Seeding complete. You can login with EMP001 / Admin123!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err?.message || err);
    process.exit(1);
  }
};

run();


