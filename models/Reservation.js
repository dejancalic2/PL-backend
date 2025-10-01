const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Reservation = sequelize.define('Reservation', {
    note: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
    isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, {
    timestamps: true,
  });
  return Reservation;
}; 