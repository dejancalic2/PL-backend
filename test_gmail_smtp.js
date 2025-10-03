const nodemailer = require('nodemailer');
require('dotenv').config();

async function testGmailSMTP() {
    console.log('🧪 Testiranje Gmail SMTP konfiguracije...\n');
    
    // Proveri environment varijable
    console.log('📋 Environment varijable:');
    console.log(`EMAIL_HOST: ${process.env.EMAIL_HOST || 'smtp.gmail.com'}`);
    console.log(`EMAIL_PORT: ${process.env.EMAIL_PORT || 587}`);
    console.log(`EMAIL_USER: ${process.env.EMAIL_USER || 'NEDEFINISANO'}`);
    console.log(`EMAIL_PASS: ${process.env.EMAIL_PASS ? '***DEFINISANO***' : 'NEDEFINISANO'}\n`);
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('❌ GREŠKA: EMAIL_USER i EMAIL_PASS moraju biti definisani!');
        console.log('\n📝 Instrukcije za Gmail App Password:');
        console.log('1. Idite na https://myaccount.google.com/security');
        console.log('2. Uključite 2-Step Verification');
        console.log('3. Idite na "App passwords"');
        console.log('4. Generišite novi app password za "Mail"');
        console.log('5. Koristite taj password kao EMAIL_PASS\n');
        return;
    }
    
    try {
        // Kreiraj transporter
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        
        console.log('🔗 Povezivanje sa Gmail SMTP...');
        
        // Test konekcije
        await transporter.verify();
        console.log('✅ Gmail SMTP konekcija uspešna!\n');
        
        // Test slanja emaila
        console.log('📧 Slanje test emaila...');
        const testEmail = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Pošalji sebi
            subject: 'Test Gmail SMTP - Playground App',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">🎉 Gmail SMTP Test Uspešan!</h2>
                    <p>Ovo je test email za verifikaciju da Gmail SMTP radi ispravno.</p>
                    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #007bff; font-size: 32px; margin: 0;">123456</h1>
                        <p style="margin: 10px 0 0 0;">Test verifikacioni kod</p>
                    </div>
                    <p><strong>Timestamp:</strong> ${new Date().toLocaleString('sr-RS')}</p>
                    <hr style="margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">Playground App - Gmail SMTP Test</p>
                </div>
            `
        };
        
        const info = await transporter.sendMail(testEmail);
        console.log('✅ Test email uspešno poslat!');
        console.log(`📬 Message ID: ${info.messageId}`);
        console.log(`📧 Odgovor: ${info.response}\n`);
        
        console.log('🎯 Gmail SMTP je spreman za produkciju!');
        console.log('📝 Možete koristiti ove environment varijable:');
        console.log(`EMAIL_HOST=${process.env.EMAIL_HOST || 'smtp.gmail.com'}`);
        console.log(`EMAIL_PORT=${process.env.EMAIL_PORT || 587}`);
        console.log(`EMAIL_USER=${process.env.EMAIL_USER}`);
        console.log(`EMAIL_PASS=${process.env.EMAIL_PASS}`);
        
    } catch (error) {
        console.error('❌ GREŠKA pri testiranju Gmail SMTP:');
        console.error(error.message);
        
        if (error.code === 'EAUTH') {
            console.log('\n🔐 Mogući uzroci autentifikacije:');
            console.log('1. Pogrešan email ili password');
            console.log('2. Niste koristili App Password (ne običnu lozinku)');
            console.log('3. 2-Step Verification nije uključena');
            console.log('4. App Password je istekao');
        }
        
        if (error.code === 'ECONNECTION') {
            console.log('\n🌐 Problem sa konekcijom:');
            console.log('1. Proverite internet konekciju');
            console.log('2. Proverite firewall postavke');
            console.log('3. Proverite da li je port 587 otvoren');
        }
    }
}

// Pokreni test
testGmailSMTP();
