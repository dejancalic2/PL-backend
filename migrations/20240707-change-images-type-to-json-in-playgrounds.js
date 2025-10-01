'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // MySQL ne podržava direktnu ALTER COLUMN iz STRING u JSON, pa moramo:
    // 1. Dodati novu kolonu
    // 2. Prebaciti podatke (ako treba)
    // 3. Obrisati staru kolonu
    // 4. Preimenovati novu
    await queryInterface.addColumn('Playgrounds', 'images_json', { type: Sequelize.JSON, allowNull: true });
    // Ako imaš podatke koje želiš da sačuvaš, ovde možeš dodati kod za migraciju podataka
    // await queryInterface.sequelize.query('UPDATE Playgrounds SET images_json = JSON_ARRAY(images) WHERE images IS NOT NULL');
    await queryInterface.removeColumn('Playgrounds', 'images');
    await queryInterface.renameColumn('Playgrounds', 'images_json', 'images');
  },

  down: async (queryInterface, Sequelize) => {
    // Povratak na STRING
    await queryInterface.addColumn('Playgrounds', 'images_str', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.removeColumn('Playgrounds', 'images');
    await queryInterface.renameColumn('Playgrounds', 'images_str', 'images');
  }
}; 