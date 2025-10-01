'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Playgrounds', 'city', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Beograd'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Playgrounds', 'city');
  }
}; 