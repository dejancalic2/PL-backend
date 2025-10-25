'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Playgrounds', 'allowOwnFood', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Da li korisnici mogu doneti svoju hranu'
    });
    
    await queryInterface.addColumn('Playgrounds', 'allowOwnDrinks', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Da li korisnici mogu doneti svoja pića'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Playgrounds', 'allowOwnFood');
    await queryInterface.removeColumn('Playgrounds', 'allowOwnDrinks');
  }
};

