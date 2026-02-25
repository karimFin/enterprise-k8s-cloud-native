const app = require('./app');
const { pool, testConnection } = require('./db/connection');
const { runMigrations } = require('./db/migrate');

const PORT = process.env.PORT || 8080;

async function startServer() {
  try {
    // Wait for database connection
    await testConnection();
    console.log('✅ Database connected');

    // Run migrations
    await runMigrations();
    console.log('✅ Migrations complete');

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Backend server running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown — important for Kubernetes!
    // When K8s sends SIGTERM, we stop accepting new connections
    // and finish existing ones before exiting.
    const gracefulShutdown = (signal) => {
      console.log(`\n⚠️  Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('   HTTP server closed');
        
        try {
          await pool.end();
          console.log('   Database pool closed');
        } catch (err) {
          console.error('   Error closing database pool:', err);
        }
        
        console.log('👋 Shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 30s if graceful fails
      setTimeout(() => {
        console.error('⛔ Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
