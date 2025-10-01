const { sequelize } = require('../models');

const dbCheckMiddleware = async (req, res, next) => {
  try {
    // Provera da li je konekcija aktivna
    await sequelize.authenticate();
    next();
  } catch (error) {
    console.error('Database connection error in middleware:', error.message);
    res.status(503).json({
      error: 'Database connection error',
      message: 'Servis trenutno nije dostupan. Pokušajte ponovo.',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = dbCheckMiddleware;
