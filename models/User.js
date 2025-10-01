const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.ENUM('user', 'owner'), defaultValue: 'user' },
    phone: { type: DataTypes.STRING, allowNull: true },
    // PIB i companyName kolone su uklonjene migracijom 20241218-remove-pib-columns.js
    playerId: { type: DataTypes.STRING, allowNull: true },
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    verificationCode: { type: DataTypes.STRING, allowNull: true },
    termsAccepted: { type: DataTypes.BOOLEAN, defaultValue: false },
    termsAcceptedAt: { type: DataTypes.DATE, allowNull: true },
  }, {
    timestamps: true,
  });
  return User;
}; 