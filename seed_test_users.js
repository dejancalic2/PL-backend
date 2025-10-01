require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User } = require('./models');

async function seedTestUsers() {
  try {
    console.log('🌱 Kreiram test korisnike...\n');

    // Hash password
    const hashedPassword = await bcrypt.hash('test123', 10);

    // Test Owner
    const [owner, ownerCreated] = await User.findOrCreate({
      where: { email: 'owner@test.com' },
      defaults: {
        email: 'owner@test.com',
        password: hashedPassword,
        name: 'Test Owner',
        phone: '+381601234567',
        type: 'owner',
        termsAccepted: true,
        termsAcceptedAt: new Date()
      }
    });

    if (ownerCreated) {
      console.log('✅ Owner kreiran:');
      console.log('   Email: owner@test.com');
      console.log('   Password: test123');
      console.log('   Tip: owner\n');
    } else {
      console.log('⚠️ Owner već postoji: owner@test.com\n');
    }

    // Test User
    const [user, userCreated] = await User.findOrCreate({
      where: { email: 'user@test.com' },
      defaults: {
        email: 'user@test.com',
        password: hashedPassword,
        name: 'Test User',
        phone: '+381609876543',
        type: 'user',
        termsAccepted: true,
        termsAcceptedAt: new Date()
      }
    });

    if (userCreated) {
      console.log('✅ User kreiran:');
      console.log('   Email: user@test.com');
      console.log('   Password: test123');
      console.log('   Tip: user\n');
    } else {
      console.log('⚠️ User već postoji: user@test.com\n');
    }

    console.log('🎉 Test korisnici spremni za korišćenje!');
    console.log('\n📱 Možete se ulogovati u aplikaciji sa:');
    console.log('   Owner: owner@test.com / test123');
    console.log('   User: user@test.com / test123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Greška pri kreiranju test korisnika:', error.message);
    process.exit(1);
  }
}

seedTestUsers();

