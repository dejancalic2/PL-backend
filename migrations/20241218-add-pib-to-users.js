'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'pib', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });
    
    await queryInterface.addColumn('Users', 'companyName', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    
    await queryInterface.addColumn('Users', 'companyAddress', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'pib');
    await queryInterface.removeColumn('Users', 'companyName');
    await queryInterface.removeColumn('Users', 'companyAddress');
  }
};