'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Playgrounds', 'offerings', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Šta igraonica nudi - hrana, pića, usluge itd.'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Playgrounds', 'offerings');
  }
};

