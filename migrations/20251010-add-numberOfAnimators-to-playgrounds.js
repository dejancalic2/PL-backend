'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Playgrounds', 'numberOfAnimators', {
      type: Sequelize.INTEGER,
      defaultValue: 1,
      allowNull: false,
      comment: 'Broj animatorki (1, 2, ili 3)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Playgrounds', 'numberOfAnimators');
  }
};

