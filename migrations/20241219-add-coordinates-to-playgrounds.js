'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Playgrounds', 'latitude', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    
    await queryInterface.addColumn('Playgrounds', 'longitude', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Playgrounds', 'latitude');
    await queryInterface.removeColumn('Playgrounds', 'longitude');
  }
};