require('dotenv').config();
const nodemailer = require('nodemailer');

async function testGmail() {
  try {
    console.log('📧 Testiram Gmail SMTP konekciju...\n');

    // Proveri da li su environment varijable postavljene
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('❌ GMAIL_USER ili GMAIL_APP_PASSWORD nisu postavljeni!');
      console.log('📝 Dodajte ih u .env fajl ili Render Environment Variables');
      process.exit(1);
    }

    console.log('✅ Gmail kredencijali pronađeni');
    console.log(`   Email: ${process.env.GMAIL_USER}`);
    console.log(`   App Password: ${process.env.GMAIL_APP_PASSWORD.substring(0, 4)}...\n`);

    // Kreiraj transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    // Test konekcije
    console.log('🔌 Testiram konekciju sa Gmail SMTP...');
    await transporter.verify();
    console.log('✅ Konekcija uspešna!\n');

    // Test email
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    console.log(`📤 Šaljem test email na: ${testEmail}`);

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: testEmail,
      subject: 'Test Email - Playground App Gmail',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Test Email - Gmail SMTP</h2>
          <p>Ovo je test email za proveru Gmail SMTP konfiguracije.</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0;">${verificationCode}</h1>
          </div>
          <p>Ako vidite ovaj email, Gmail SMTP je uspešno konfigurisan! 🎉</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">Playground App - Test Email</p>
        </div>
      `,
      text: `Test email - Verifikacioni kod: ${verificationCode}\n\nAko vidite ovaj email, Gmail SMTP je uspešno konfigurisan!`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email uspešno poslat!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);

    console.log('\n🎉 Gmail SMTP je uspešno konfigurisan!');
    console.log('📱 Sada možete testirati registraciju u aplikaciji.');

  } catch (error) {
    console.error('❌ Greška pri testiranju Gmail SMTP-a:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 Rešenje:');
      console.log('   - Proverite da li su GMAIL_USER i GMAIL_APP_PASSWORD tačni');
      console.log('   - Koristite App Password, ne običnu lozinku');
      console.log('   - Omogućite 2FA na Gmail nalogu');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Rešenje:');
      console.log('   - Proverite internet konekciju');
      console.log('   - Gmail SMTP server možda nije dostupan');
    }
    
    process.exit(1);
  }
}

testGmail();
