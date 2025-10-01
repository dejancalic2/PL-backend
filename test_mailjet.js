require('dotenv').config();
const nodemailer = require('nodemailer');

async function testMailjet() {
  try {
    console.log('📧 Testiram Mailjet konekciju...\n');

    // Proveri da li su environment varijable postavljene
    if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
      console.error('❌ MAILJET_API_KEY ili MAILJET_SECRET_KEY nisu postavljeni!');
      console.log('📝 Dodajte ih u .env fajl ili Render Environment Variables');
      process.exit(1);
    }

    console.log('✅ Mailjet kredencijali pronađeni');
    console.log(`   API Key: ${process.env.MAILJET_API_KEY.substring(0, 8)}...`);
    console.log(`   Secret Key: ${process.env.MAILJET_SECRET_KEY.substring(0, 8)}...\n`);

    // Kreiraj transporter
    const transporter = nodemailer.createTransport({
      host: 'in-v3.mailjet.com',
      port: 587,
      auth: {
        user: process.env.MAILJET_API_KEY,
        pass: process.env.MAILJET_SECRET_KEY
      }
    });

    // Test konekcije
    console.log('🔌 Testiram konekciju sa Mailjet...');
    await transporter.verify();
    console.log('✅ Konekcija uspešna!\n');

    // Test email
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    console.log(`📤 Šaljem test email na: ${testEmail}`);

    const mailOptions = {
      from: process.env.MAIL_FROM_EMAIL || 'noreply@playgroundapp.com',
      to: testEmail,
      subject: 'Test Email - Playground App Mailjet',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Test Email - Mailjet</h2>
          <p>Ovo je test email za proveru Mailjet konfiguracije.</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0;">${verificationCode}</h1>
          </div>
          <p>Ako vidite ovaj email, Mailjet je uspešno konfigurisan! 🎉</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">Playground App - Test Email</p>
        </div>
      `,
      text: `Test email - Verifikacioni kod: ${verificationCode}\n\nAko vidite ovaj email, Mailjet je uspešno konfigurisan!`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email uspešno poslat!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);

    console.log('\n🎉 Mailjet je uspešno konfigurisan!');
    console.log('📱 Sada možete testirati registraciju u aplikaciji.');

  } catch (error) {
    console.error('❌ Greška pri testiranju Mailjet-a:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 Rešenje:');
      console.log('   - Proverite da li su MAILJET_API_KEY i MAILJET_SECRET_KEY tačni');
      console.log('   - Kopirajte ih direktno iz Mailjet dashboard-a');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Rešenje:');
      console.log('   - Proverite internet konekciju');
      console.log('   - Mailjet server možda nije dostupan');
    }
    
    process.exit(1);
  }
}

testMailjet();
