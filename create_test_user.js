const { User } = require('./models');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  try {
    // Proveri da li korisnik već postoji
    const existingUser = await User.findOne({ where: { email: 'test@test.com' } });
    
    if (existingUser) {
      // Ažuriraj postojećeg korisnika da bude verifikovan
      await existingUser.update({
        isVerified: true,
        termsAccepted: true
      });
      console.log('✅ Postojeći korisnik test@test.com je ažuriran (verifikovan)');
    } else {
      // Kreiraj novog korisnika
      const hashedPassword = await bcrypt.hash('test123', 10);
      
      await User.create({
        name: 'Test Korisnik',
        email: 'test@test.com',
        password: hashedPassword,
        type: 'user',
        phone: '123456789',
        isVerified: true,
        termsAccepted: true
      });
      console.log('✅ Kreiran novi test korisnik: test@test.com / test123');
    }

    // Kreiraj i owner korisnika
    const existingOwner = await User.findOne({ where: { email: 'owner@test.com' } });
    
    if (existingOwner) {
      await existingOwner.update({
        isVerified: true,
        termsAccepted: true
      });
      console.log('✅ Postojeći owner owner@test.com je ažuriran (verifikovan)');
    } else {
      const hashedPassword = await bcrypt.hash('owner123', 10);
      
      await User.create({
        name: 'Test Owner',
        email: 'owner@test.com',
        password: hashedPassword,
        type: 'owner',
        phone: '987654321',
        isVerified: true,
        termsAccepted: true
      });
      console.log('✅ Kreiran novi test owner: owner@test.com / owner123');
    }

    console.log('\n🎯 Test korisnici su spremni:');
    console.log('   👤 User: test@test.com / test123');
    console.log('   👑 Owner: owner@test.com / owner123');
    
  } catch (error) {
    console.error('❌ Greška pri kreiranju test korisnika:', error);
  } finally {
    process.exit(0);
  }
}

createTestUser();
