const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Playground = sequelize.define('Playground', {
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    images: { type: DataTypes.JSON, defaultValue: [] },
    location: { type: DataTypes.STRING },
    city: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Beograd' },
    capacity: { type: DataTypes.INTEGER },
    price: { type: DataTypes.FLOAT },
    slotDuration: { type: DataTypes.INTEGER }, // u satima
    prices: { type: DataTypes.JSON },
    ownerId: { type: DataTypes.INTEGER, allowNull: false },
    slotTemplates: { type: DataTypes.JSON }, // šablon termina (lista objekata {from, to})
    logo: { type: DataTypes.STRING }, // URL logotipa
    latitude: { type: DataTypes.FLOAT }, // geografska širina
    longitude: { type: DataTypes.FLOAT }, // geografska dužina
    phone: { type: DataTypes.STRING }, // kontakt telefon igraonice
  }, {
    timestamps: true,
  });

  try {
    // ... neki Sequelize poziv
  } catch (err) {
    console.error('Greška:', err); // ili err.message, ili err.stack
  }

  return Playground;
}; 