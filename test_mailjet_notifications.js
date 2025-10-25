#!/usr/bin/env node

/**
 * 📧 Test Mailjet Email Notifikacija
 * 
 * Ovaj script testira da li su Mailjet kredencijali pravilno podešeni
 * i da li email notifikacije mogu da se šalju.
 */

require('dotenv').config();
const mailjet = require('node-mailjet');

console.log('🔔 TESTIRANJE MAILJET NOTIFIKACIJA\n');
console.log('=' .repeat(50));

// Proverite environment varijable
console.log('\n📋 KORAK 1: Provera Environment Varijabli\n');

const requiredVars = {
  'MAILJET_API_KEY': process.env.MAILJET_API_KEY,
  'MAILJET_SECRET_KEY': process.env.MAILJET_SECRET_KEY,
  'MAIL_FROM_EMAIL': process.env.MAIL_FROM_EMAIL
};

let allVarsSet = true;

Object.entries(requiredVars).forEach(([key, value]) => {
  if (value) {
    console.log(`✅ ${key}: ${value.substring(0, 15)}...`);
  } else {
    console.log(`❌ ${key}: NIJE POSTAVLJENO`);
    allVarsSet = false;
  }
});

if (!allVarsSet) {
  console.log('\n❌ GREŠKA: Nedostaju environment varijable!');
  console.log('\n📝 Dodajte sledeće u .env fajl:');
  console.log('   MAILJET_API_KEY=your_api_key');
  console.log('   MAILJET_SECRET_KEY=your_secret_key');
  console.log('   MAIL_FROM_EMAIL=termino@playgroundapp.com');
  console.log('\n📖 Pogledajte: FIX_NOTIFIKACIJE_HETZNER.md\n');
  process.exit(1);
}

// Test slanja emaila
console.log('\n📧 KORAK 2: Test Slanja Email-a\n');

const testEmail = process.argv[2] || 'test@example.com';

if (testEmail === 'test@example.com') {
  console.log('⚠️  UPOZORENJE: Koristite default email adresu');
  console.log('💡 Pokrenite sa: node test_mailjet_notifications.js vas@email.com\n');
}

const client = mailjet.apiConnect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_SECRET_KEY
);

const emailData = {
  Messages: [
    {
      From: {
        Email: process.env.MAIL_FROM_EMAIL,
        Name: 'Termino - Playground App'
      },
      To: [
        {
          Email: testEmail,
          Name: 'Test User'
        }
      ],
      Subject: '✅ Test Email - Notifikacije Rade!',
      HTMLPart: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">🎉 Uspešno!</h2>
          <p>Mailjet notifikacije su pravilno konfigurisane i rade na Hetzner serveru!</p>
          <div style="background-color: #d4edda; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #28a745;">
            <h3 style="color: #155724; margin-top: 0;">Status:</h3>
            <p><strong>✅ Mailjet API:</strong> Povezan</p>
            <p><strong>✅ Email servis:</strong> Funkcionalan</p>
            <p><strong>✅ Notifikacije:</strong> Aktivne</p>
          </div>
          <p>Sada će korisnici i vlasnici primati email notifikacije o rezervacijama!</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">Termino - Playground App | Test Email</p>
        </div>
      `,
      TextPart: `
✅ USPEŠNO!

Mailjet notifikacije su pravilno konfigurisane i rade na Hetzner serveru!

Status:
- Mailjet API: Povezan
- Email servis: Funkcionalan  
- Notifikacije: Aktivne

Sada će korisnici i vlasnici primati email notifikacije o rezervacijama!

---
Termino - Playground App | Test Email
      `
    }
  ]
};

console.log(`📤 Šaljem test email na: ${testEmail}...`);

client.post('send', { version: 'v3.1' })
  .request(emailData)
  .then((result) => {
    console.log('\n✅ EMAIL USPEŠNO POSLAT!\n');
    console.log('=' .repeat(50));
    console.log(`📬 Message ID: ${result.body.Messages[0].To[0].MessageID}`);
    console.log(`📊 Status: ${result.body.Messages[0].Status}`);
    console.log('=' .repeat(50));
    console.log('\n💡 PROVERA:');
    console.log(`   1. Idite na email inbox: ${testEmail}`);
    console.log('   2. Proverite SPAM folder ako nije u inbox-u');
    console.log('   3. Email naslov: "✅ Test Email - Notifikacije Rade!"');
    console.log('\n🎉 NOTIFIKACIJE SU AKTIVNE!');
    console.log('   Korisnici i vlasnici će sada primati email notifikacije.\n');
  })
  .catch((err) => {
    console.log('\n❌ GREŠKA PRI SLANJU EMAIL-A!\n');
    console.log('=' .repeat(50));
    console.log(`Status Code: ${err.statusCode}`);
    console.log(`Error: ${err.message}`);
    
    if (err.statusCode === 401) {
      console.log('\n🔍 PROBLEM: Invalid credentials');
      console.log('   Mailjet API Key ili Secret Key je pogrešan.');
      console.log('\n✅ REŠENJE:');
      console.log('   1. Idite na: https://app.mailjet.com/account/apikeys');
      console.log('   2. Kopirajte API Key i Secret Key');
      console.log('   3. Ažurirajte .env fajl');
      console.log('   4. Restartujte backend: pm2 restart playground-backend');
    } else if (err.statusCode === 400) {
      console.log('\n🔍 PROBLEM: Bad request');
      console.log('   Sender email adresa možda nije verifikovana.');
      console.log('\n✅ REŠENJE:');
      console.log('   1. Idite na: https://app.mailjet.com/account/sender');
      console.log('   2. Verifikujte sender email adresu');
      console.log('   3. Sačekajte 5-10 minuta');
      console.log('   4. Pokrenite test ponovo');
    } else {
      console.log('\n✅ REŠENJE:');
      console.log('   1. Proverite internet konekciju');
      console.log('   2. Proverite Mailjet dashboard status');
      console.log('   3. Pogledajte: FIX_NOTIFIKACIJE_HETZNER.md');
    }
    
    console.log('\n📖 Za detaljno uputstvo: FIX_NOTIFIKACIJE_HETZNER.md\n');
    process.exit(1);
  });

