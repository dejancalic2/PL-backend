const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const auth = require('../middleware/auth');
const mailjet = require('node-mailjet');

const router = express.Router();





// Registracija
// router.post('/register', async (req, res) => {
// 	console.log(req.body);
// 	try {
// 		const { name, email, password, type } = req.body;
// 		if (!name || !email || !password) {
// 			return res.status(400).json({ message: 'Sva polja su obavezna.' });
// 		}
// 		const existingUser = await User.findOne({ where: { email } });
// 		if (existingUser) {
// 			return res.status(400).json({ message: 'Email je već registrovan.' });
// 		}
// 		const hashedPassword = await bcrypt.hash(password, 10);
// 		const user = await User.create({
// 			name,
// 			email,
// 			password: hashedPassword,
// 			type,
// 		});
// 		res.status(201).json({ message: 'Uspešna registracija.' });
// 	} catch (err) {
// 		res.status(500).json({ message: 'Greška na serveru.' });
// 	}
// });
router.post('/register', async (req, res) => {
	try {
		const { name, email, password, type, phone, pib } = req.body;
		console.log('📝 Register request:', { name, email, type, phone, pib });
		
		if (!name || !email || !password) {
			return res.status(400).json({ message: 'Sva polja su obavezna.' });
		}
		
		const existingUser = await User.findOne({ where: { email } });
		if (existingUser) {
			return res.status(400).json({ message: 'Email je već registrovan.' });
		}
		
		const hashedPassword = await bcrypt.hash(password, 10);
        // Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
		
		const userData = {
			name,
			email,
			password: hashedPassword,
			type,
			phone,
			pib,
            isVerified: false,
            verificationCode
		};
		
		const user = await User.create(userData);
        // Send verification email via Mailjet API
        console.log('📧 Mailjet Configuration:');
        console.log(`API Key: ${process.env.MAILJET_API_KEY ? '***DEFINED***' : 'NOT DEFINED'}`);
        console.log(`Secret Key: ${process.env.MAILJET_SECRET_KEY ? '***DEFINED***' : 'NOT DEFINED'}`);
        
        const client = mailjet.apiConnect(
            process.env.MAILJET_API_KEY,
            process.env.MAILJET_SECRET_KEY
        );
        
        const emailData = {
            Messages: [
                {
                    From: {
                        Email: process.env.MAIL_FROM_EMAIL || 'termino@playgroundapp.com',
                        Name: 'Termino - Playground App'
                    },
                    To: [
                        {
                            Email: email,
                            Name: name
                        }
                    ],
                    Subject: 'Verifikacija naloga - Playground App',
                    HTMLPart: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #333;">Dobrodošli u Playground App!</h2>
                            <p>Hvala vam što ste se registrovali. Da biste aktivirali nalog, unesite sledeći verifikacioni kod:</p>
                            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                                <h1 style="color: #007bff; font-size: 32px; margin: 0;">${verificationCode}</h1>
                                <p style="margin: 10px 0 0 0; color: #666;">Verifikacioni kod</p>
                            </div>
                            <p>Ovaj kod je važeći 24 sata.</p>
                            <p>Ako niste zatražili ovaj kod, ignorišite ovaj email.</p>
                            <hr style="margin: 30px 0;">
                            <p style="color: #666; font-size: 12px;">Termino - Playground App - Rezervacija igrališta</p>
                        </div>
                    `,
                    TextPart: `Vaš verifikacioni kod je: ${verificationCode}\n\nOvaj kod je važeći 24 sata.\n\nAko niste zatražili ovaj kod, ignorišite ovaj email.`
                }
            ]
        };
        
        console.log('📤 Attempting to send email via Mailjet...');
        console.log(`To: ${email}`);
        console.log(`From: ${process.env.MAIL_FROM_EMAIL || 'termino@playgroundapp.com'}`);
        console.log(`Subject: Verifikacija naloga - Playground App`);
        
        try {
            const result = await client.post('send', { version: 'v3.1' }).request(emailData);
            console.log('✅ Verifikacioni email poslat uspešno!');
            console.log('Message ID:', result.body.Messages[0].To[0].MessageID);
            console.log('Status:', result.body.Messages[0].Status);
        } catch (error) {
            console.error('❌ Greška pri slanju verifikacionog emaila:');
            console.error('Error message:', error.message);
            console.error('Full error:', error);
        }
		res.status(201).json({ message: 'Verifikacioni kod je poslat na email. Unesite kod da biste završili registraciju.' });
	} catch (err) {
		console.error('REGISTER ERROR:', err); // <--- DODAJ OVO
		res.status(500).json({ message: 'Greška na serveru.' });
	}
});
// Login
router.post('/login', async (req, res) => {
	try {
		const { email, password } = req.body;
		const user = await User.findOne({ where: { email } });
		if (!user) {
			return res.status(400).json({ message: 'Pogrešan email ili lozinka.' });
		}
        if (!user.isVerified) {
            return res.status(403).json({ message: 'Nalog nije verifikovan. Proverite email za verifikacioni kod.' });
        }
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res.status(400).json({ message: 'Pogrešan email ili lozinka.' });
		}
		const token = jwt.sign(
			{ id: user.id, type: user.type },
			process.env.JWT_SECRET,
			{ expiresIn: '7d' }
		);
		res.json({
			token,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				type: user.type,
				termsAccepted: user.termsAccepted,
			},
		});
	} catch (err) {
		console.error('LOGIN ERROR:', err);
		res.status(500).json({ message: 'Greška na serveru.' });
	}
});

router.post('/playerid', auth, async (req, res) => {
	const user = await User.findByPk(req.user.id);
	if (!user) return res.status(404).json({ message: 'Korisnik nije pronađen.' });
	user.playerId = req.body.playerId;
	await user.save();
	res.json({ message: 'PlayerId sačuvan.' });
});

// Email verification endpoint
router.post('/verify-email', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
        return res.status(400).json({ message: 'Email i kod su obavezni.' });
    }
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'Korisnik nije pronađen.' });
        }
        if (user.isVerified) {
            return res.status(400).json({ message: 'Nalog je već verifikovan.' });
        }
        if (user.verificationCode !== code) {
            return res.status(400).json({ message: 'Pogrešan verifikacioni kod.' });
        }
        user.isVerified = true;
        user.verificationCode = null;
        await user.save();
        return res.json({ message: 'Nalog je uspešno verifikovan.' });
    } catch (err) {
        console.error('VERIFY EMAIL ERROR:', err);
        res.status(500).json({ message: 'Greška na serveru.' });
    }
});


// Prihvatanje uslova korišćenja
router.post('/accept-terms', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Korisnik nije pronađen.' });
        }
        
        user.termsAccepted = true;
        user.termsAcceptedAt = new Date();
        await user.save();
        
        res.json({ message: 'Uslovi korišćenja su prihvaćeni.' });
    } catch (err) {
        console.error('ACCEPT TERMS ERROR:', err);
        res.status(500).json({ message: 'Greška na serveru.' });
    }
});

// Provera da li je korisnik prihvatio uslove
router.post('/check-terms', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email je obavezan.' });
        }
        
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.json({ termsAccepted: false });
        }
        
        res.json({ termsAccepted: user.termsAccepted || false });
    } catch (err) {
        console.error('CHECK TERMS ERROR:', err);
        res.status(500).json({ message: 'Greška na serveru.' });
    }
});

// Admin endpoint za verifikaciju korisnika (samo za testiranje)
router.post('/admin/verify-user', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email je obavezan.' });
        }
        
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'Korisnik nije pronađen.' });
        }
        
        user.isVerified = true;
        user.termsAccepted = true;
        user.verificationCode = null;
        await user.save();
        
        res.json({ message: `Korisnik ${email} je uspešno verifikovan i označen kao admin.` });
    } catch (err) {
        console.error('ADMIN VERIFY ERROR:', err);
        res.status(500).json({ message: 'Greška na serveru.' });
    }
});

module.exports = router;
