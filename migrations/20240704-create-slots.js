'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Slots', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      playgroundId: { type: Sequelize.INTEGER, allowNull: false },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      timeFrom: { type: Sequelize.STRING, allowNull: false },
      timeTo: { type: Sequelize.STRING, allowNull: false },
      isReserved: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Slots');
  }
}; 