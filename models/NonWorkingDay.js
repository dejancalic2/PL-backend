const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NonWorkingDay = sequelize.define('NonWorkingDay', {
    playgroundId: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    type: { 
      type: DataTypes.ENUM('HOLIDAY', 'MAINTENANCE', 'PERSONAL_LEAVE', 'OTHER'), 
      allowNull: false 
    },
    description: { type: DataTypes.TEXT },
    isRecurring: { type: DataTypes.BOOLEAN, defaultValue: false },
    recurringDay: { type: DataTypes.INTEGER }, // Dan u nedelji (0-6, 0 = nedelja)
    recurringMonth: { type: DataTypes.INTEGER }, // Mesec (1-12)
    recurringDate: { type: DataTypes.INTEGER }, // Dan u mesecu (1-31)
  }, {
    timestamps: true,
  });

  NonWorkingDay.associate = (models) => {
    NonWorkingDay.belongsTo(models.Playground, { foreignKey: 'playgroundId' });
  };

  return NonWorkingDay;
}; 