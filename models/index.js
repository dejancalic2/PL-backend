const { Sequelize } = require('sequelize');
const UserModel = require('./User');
const PlaygroundModel = require('./Playground');
const SlotModel = require('./Slot');
const ReservationModel = require('./Reservation');
const NotificationModel = require('./Notification');
const NonWorkingDayModel = require('./NonWorkingDay');

const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    retry: {
      max: 3,
      backoffBase: 1000,
      backoffExponent: 1.5,
    },
    dialectOptions: {
      connectTimeout: 60000,
    }
  }
);

const User = UserModel(sequelize);
const Playground = PlaygroundModel(sequelize);
const Slot = SlotModel(sequelize);
const Reservation = ReservationModel(sequelize);
const Notification = NotificationModel(sequelize);
const NonWorkingDay = NonWorkingDayModel(sequelize);

// Relations
User.hasMany(Playground, { foreignKey: 'ownerId', as: 'playgrounds' });
Playground.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Playground.hasMany(Slot, { foreignKey: 'playgroundId', as: 'slots' });
Slot.belongsTo(Playground, { foreignKey: 'playgroundId', as: 'playground' });
Slot.hasOne(Reservation, { foreignKey: 'slotId', as: 'reservation' });
Reservation.belongsTo(Slot, { foreignKey: 'slotId', as: 'slot' });
Reservation.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Notification, { foreignKey: 'ownerId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Notification.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });
Reservation.hasMany(Notification, { foreignKey: 'reservationId', as: 'notifications' });

// NonWorkingDay relations
Playground.hasMany(NonWorkingDay, { foreignKey: 'playgroundId', as: 'nonWorkingDays' });
NonWorkingDay.belongsTo(Playground, { foreignKey: 'playgroundId', as: 'playground' });

module.exports = {
  sequelize,
  User,
  Playground,
  Slot,
  Reservation,
  Notification,
  NonWorkingDay,
}; 