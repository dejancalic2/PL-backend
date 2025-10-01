const { User } = require('./backend/models');
const bcrypt = require('bcrypt');

async function checkPassword() {
  try {
    console.log('Proveravam šifru za k@gmail.com...');
    
    const user = await User.findOne({
      where: { email: 'k@gmail.com' }
    });
    
    if (!user) {
      console.log('Korisnik k@gmail.com nije pronađen u bazi.');
      return;
    }
    
    console.log('Korisnik pronađen:');
    console.log('- ID:', user.id);
    console.log('- Email:', user.email);
    console.log('- Ime:', user.name);
    console.log('- Verifikovan:', user.isVerified);
    console.log('- Hash šifre:', user.password);
    
    // Testiraj da li je šifra 111111
    const isPasswordCorrect = await bcrypt.compare('111111', user.password);
    console.log('\nTest šifre "111111":', isPasswordCorrect ? 'TAČNO' : 'NETAČNO');
    
    // Testiraj i druge česte šifre
    const commonPasswords = ['123456', 'password', '123123', '000000', 'admin'];
    console.log('\nTestiranje čestih šifara:');
    
    for (const pwd of commonPasswords) {
      const isMatch = await bcrypt.compare(pwd, user.password);
      console.log(`- "${pwd}": ${isMatch ? 'TAČNO' : 'NETAČNO'}`);
    }
    
  } catch (error) {
    console.error('Greška:', error);
  } finally {
    process.exit(0);
  }
}

checkPassword();
