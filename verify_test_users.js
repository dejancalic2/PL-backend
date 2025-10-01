require('dotenv').config();
const { User } = require('./models');

async function verifyTestUsers() {
  try {
    console.log('🔓 Verifikujem test korisnike...\n');

    // Verifikuj owner@test.com
    const owner = await User.findOne({ where: { email: 'owner@test.com' } });
    if (owner) {
      owner.isVerified = true;
      owner.verificationCode = null;
      owner.termsAccepted = true;
      owner.termsAcceptedAt = new Date();
      await owner.save();
      console.log('✅ owner@test.com - VERIFIKOVAN');
    }

    // Verifikuj user@test.com
    const user = await User.findOne({ where: { email: 'user@test.com' } });
    if (user) {
      user.isVerified = true;
      user.verificationCode = null;
      user.termsAccepted = true;
      user.termsAcceptedAt = new Date();
      await user.save();
      console.log('✅ user@test.com - VERIFIKOVAN');
    }

    console.log('\n🎉 Test korisnici su verifikovani i spremni za login!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Greška:', error.message);
    process.exit(1);
  }
}

verifyTestUsers();

