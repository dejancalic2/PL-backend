require('dotenv').config();
const { Sequelize } = require('sequelize');

// Kreiranje konekcije sa Aiven bazom
const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT || 3306,
    dialect: 'mysql',
    dialectOptions: {
      connectTimeout: 60000,
      ssl: {
        rejectUnauthorized: false
      }
    }
  }
);

async function checkDatabase() {
  try {
    console.log('🔌 Povezujem se sa Aiven bazom...');
    await sequelize.authenticate();
    console.log('✅ Konekcija uspešna!\n');

    // Provera postojećih tabela
    const [tables] = await sequelize.query("SHOW TABLES");
    
    console.log('📊 Trenutne tabele u bazi:');
    if (tables.length === 0) {
      console.log('   ❌ Baza je prazna - potrebna je migracija!');
    } else {
      console.log(`   📋 Pronađeno ${tables.length} tabela:`);
      tables.forEach((table, index) => {
        const tableName = Object.values(table)[0];
        console.log(`      ${index + 1}. ${tableName}`);
      });
    }

    // Provera da li postoji SequelizeMeta tabela (za praćenje migracija)
    const hasMetaTable = tables.some(t => Object.values(t)[0] === 'SequelizeMeta');
    console.log('\n📌 SequelizeMeta tabela (za praćenje migracija):');
    if (hasMetaTable) {
      console.log('   ✅ Postoji');
      const [migrations] = await sequelize.query("SELECT * FROM SequelizeMeta");
      console.log(`   📝 Pokrenuto ${migrations.length} migracija:`);
      migrations.forEach((m, i) => {
        console.log(`      ${i + 1}. ${m.name}`);
      });
    } else {
      console.log('   ❌ Ne postoji - migracije nisu pokrenute');
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Greška:', error.message);
    process.exit(1);
  }
}

checkDatabase();

