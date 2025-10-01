'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Playgrounds', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.STRING, allowNull: true },
      images: { type: Sequelize.STRING, allowNull: true },
      location: { type: Sequelize.STRING, allowNull: false },
      capacity: { type: Sequelize.INTEGER, allowNull: false },
      price: { type: Sequelize.INTEGER, allowNull: false },
      slotDuration: { type: Sequelize.INTEGER, allowNull: false },
      prices: { type: Sequelize.STRING, allowNull: true },
      ownerId: { type: Sequelize.INTEGER, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Playgrounds');
  }
}; 