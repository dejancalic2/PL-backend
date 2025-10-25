'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Reservations', 'numberOfAnimators', {
      type: Sequelize.INTEGER,
      defaultValue: 1,
      allowNull: false,
      comment: 'Broj animatorki koje korisnik želi (1, 2, ili 3)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Reservations', 'numberOfAnimators');
  }
};

