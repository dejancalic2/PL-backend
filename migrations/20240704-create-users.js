'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Users', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      password: { type: Sequelize.STRING, allowNull: false },
      type: { type: Sequelize.ENUM('user', 'owner'), defaultValue: 'user' },
      phone: { type: Sequelize.STRING, allowNull: true },
      playerId: { type: Sequelize.STRING, allowNull: true },
      isVerified: { type: Sequelize.BOOLEAN, defaultValue: false },
      verificationCode: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Users');
  }
}; 