require('dotenv').config();
const { User } = require('./models');

async function viewUsers() {
  try {
    console.log('👥 Prikazivanje svih korisnika iz Aiven baze...\n');

    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'type', 'phone', 'termsAccepted', 'createdAt'],
      order: [['createdAt', 'ASC']]
    });

    if (users.length === 0) {
      console.log('⚠️ Nema korisnika u bazi.');
    } else {
      console.log(`✅ Pronađeno ${users.length} korisnika:\n`);
      
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   👤 Tip: ${user.type}`);
        console.log(`   📱 Telefon: ${user.phone}`);
        console.log(`   ✅ Prihvatili uslove: ${user.termsAccepted ? 'Da' : 'Ne'}`);
        console.log(`   📅 Kreiran: ${user.createdAt.toLocaleString()}`);
        console.log('');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Greška:', error.message);
    process.exit(1);
  }
}

viewUsers();

