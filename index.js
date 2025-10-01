require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const playgroundRoutes = require('./routes/playgrounds');
const slotRoutes = require('./routes/slots');
const reservationRoutes = require('./routes/reservations');
const notificationRoutes = require('./routes/notifications');
const nonWorkingDayRoutes = require('./routes/nonWorkingDays');
const dbCheckMiddleware = require('./middleware/dbCheck');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Funkcija za testiranje konekcije sa bazom
async function testDatabaseConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL konekcija uspešna');
    return true;
  } catch (error) {
    console.error('❌ MySQL konekcija neuspešna:', error.message);
    return false;
  }
}

// Funkcija za periodičnu proveru konekcije
function startHealthCheck() {
  setInterval(async () => {
    try {
      await sequelize.authenticate();
      console.log('💚 Health check: Baza podataka OK');
    } catch (error) {
      console.error('💔 Health check: Problem sa bazom podataka:', error.message);
      // NE zatvaraj connection pool, samo pokušaj ponovno povezivanje
      try {
        await sequelize.authenticate();
        console.log('🔄 Konekcija sa bazom obnovljena');
      } catch (reconnectError) {
        console.error('❌ Neuspešno ponovno povezivanje:', reconnectError.message);
      }
    }
  }, 30000); // Provera svakih 30 sekundi
}

// Funkcija za pokretanje servera
async function startServer() {
  const isConnected = await testDatabaseConnection();
  
  if (isConnected) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server radi na portu ${PORT}`);
      console.log(`📊 Baza podataka: ${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT || 3306}`);
    });
  } else {
    console.log('🔄 Pokušavam ponovno povezivanje za 5 sekundi...');
    setTimeout(startServer, 5000);
  }
}

// Pokretanje servera
startServer();

// Pokretanje health check-a
startHealthCheck();

// Dodavanje graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Zatvaranje servera...');
  try {
    await sequelize.close();
    console.log('✅ Konekcija sa bazom zatvorena');
    process.exit(0);
  } catch (error) {
    console.error('❌ Greška pri zatvaranju konekcije:', error);
    process.exit(1);
  }
});

app.get('/', (req, res) => {
	res.send('API radi!');
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.use('/api/auth', dbCheckMiddleware, authRoutes);
app.use('/api/playgrounds', dbCheckMiddleware, playgroundRoutes);
app.use('/api/slots', dbCheckMiddleware, slotRoutes);
app.use('/api/reservations', dbCheckMiddleware, reservationRoutes);
app.use('/api/notifications', dbCheckMiddleware, notificationRoutes);
app.use('/api/non-working-days', dbCheckMiddleware, nonWorkingDayRoutes);
