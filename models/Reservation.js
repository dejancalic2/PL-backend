const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Reservation = sequelize.define('Reservation', {
    note: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
    isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    numberOfAnimators: { type: DataTypes.INTEGER, defaultValue: 1 }, // Koliko animatorki korisnik želi (1, 2, ili 3)
  }, {
    timestamps: true,
  });
  return Reservation;
}; 