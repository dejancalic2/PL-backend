'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('NonWorkingDays', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      playgroundId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Playgrounds',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('HOLIDAY', 'MAINTENANCE', 'PERSONAL_LEAVE', 'OTHER'),
        allowNull: false,
        defaultValue: 'OTHER'
      },
      description: {
        type: Sequelize.STRING
      },
      isRecurring: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      recurringDay: {
        type: Sequelize.INTEGER
      },
      recurringMonth: {
        type: Sequelize.INTEGER
      },
      recurringDate: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Dodajemo unique index za playgroundId i date
    await queryInterface.addIndex('NonWorkingDays', ['playgroundId', 'date'], {
      unique: true,
      name: 'non_working_days_playground_date_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('NonWorkingDays');
  }
}; 