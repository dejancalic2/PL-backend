const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Notification = sequelize.define('Notification', {
    ownerId: { type: DataTypes.INTEGER, allowNull: false },
    message: { type: DataTypes.STRING, allowNull: false },
    seen: { type: DataTypes.BOOLEAN, defaultValue: false },
    reservationId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'Reservations', key: 'id' } }
  }, {
    timestamps: true,
  });

  Notification.associate = (models) => {
    Notification.belongsTo(models.Reservation, { foreignKey: 'reservationId' });
  };

  return Notification;
}; 