'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Notifications', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      ownerId: { type: Sequelize.INTEGER, allowNull: false },
      message: { type: Sequelize.STRING, allowNull: false },
      seen: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Notifications');
  }
}; 