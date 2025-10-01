const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Slot = sequelize.define('Slot', {
    date: { type: DataTypes.DATEONLY, allowNull: false },
    timeFrom: { type: DataTypes.STRING, allowNull: false },
    timeTo: { type: DataTypes.STRING, allowNull: false },
    isReserved: { type: DataTypes.BOOLEAN, defaultValue: false },
    isTemporarilyReserved: { type: DataTypes.BOOLEAN, defaultValue: false },
    isDisabled: { type: DataTypes.BOOLEAN, defaultValue: false }, // Dodajemo polje za onemogućene termine
  }, {
    timestamps: true,
  });
  return Slot;
}; 