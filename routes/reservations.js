const express = require('express');
const { Reservation, Slot, Playground, User, Notification } = require('../models');
const auth = require('../middleware/auth');
const mailjet = require('node-mailjet');
const axios = require('axios');

const router = express.Router();

// Helper funkcija za Mailjet klijent (sa error handlingom)
function getMailjetClient() {
  const apiKey = process.env.MAILJET_API_KEY;
  const secretKey = process.env.MAILJET_SECRET_KEY;
  
  if (!apiKey || !secretKey) {
    console.error('❌ MAILJET kredencijali nisu postavljeni u environment varijablama!');
    console.error('   MAILJET_API_KEY:', apiKey ? '✅ SET' : '❌ NOT SET');
    console.error('   MAILJET_SECRET_KEY:', secretKey ? '✅ SET' : '❌ NOT SET');
    return null;
  }
  
  try {
    return mailjet.apiConnect(apiKey, secretKey);
  } catch (error) {
    console.error('❌ Greška pri kreiranju Mailjet klijenta:', error.message);
    return null;
  }
}

// Helper funkcija za OneSignal push notifikacije
async function sendOneSignalNotification(playerId, title, message, data = {}) {
  try {
    const oneSignalAppId = '5d2d5ab6-d3a1-4abf-8dbd-12fae350ce4f';
    // OneSignal REST API Key
    const oneSignalApiKey = 'os_v2_app_luwvvnwtuffl7dn5cl5ogugoj7jbtdgjiwme7fmt6ogj7fqeksjupogqugnuzn24m6d3t2pgsorxshuvnjc2k3p52yo243gjogbgysy';
    
    if (!oneSignalApiKey) {
      console.error('❌ OneSignal REST API Key nije postavljen!');
      return false;
    }
    
    const response = await axios.post('https://onesignal.com/api/v1/notifications', {
      app_id: oneSignalAppId,
      include_player_ids: [playerId],
      headings: { en: title },
      contents: { en: message },
      data: data
    }, {
      headers: {
        'Authorization': `Basic ${oneSignalApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ OneSignal notifikacija poslata:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Greška pri slanju OneSignal notifikacije:');
    console.error('   Error message:', error.message);
    console.error('   Error response:', error.response?.data);
    console.error('   Error status:', error.response?.status);
    return false;
  }
}

// Rezervacija termina (korisnik ili vlasnik)
router.post('/:slotId', auth, async (req, res) => {
  const slot = await Slot.findByPk(req.params.slotId);
  if (!slot || slot.isReserved || slot.isTemporarilyReserved || slot.isDisabled) {
    return res.status(400).json({ message: 'Termin nije dostupan.' });
  }
  
  // Označi termin kao privremeno rezervisan
  slot.isTemporarilyReserved = true;
  await slot.save();
  
  // Kreiraj rezervaciju sa statusom 'pending'
  const reservation = await Reservation.create({ 
    userId: req.user.id, 
    slotId: slot.id, 
    note: req.body.note, 
    numberOfAnimators: req.body.numberOfAnimators || 1, // Broj animatorki (default: 1)
    status: 'pending' 
  });

  // Pronađi korisnika i vlasnika
  const user = await User.findByPk(req.user.id);
  const playground = await Playground.findByPk(slot.playgroundId, { include: [{ model: User, as: 'owner' }] });
  const owner = playground.owner;
  
  console.log(`🔍 User ID: ${user.id}, Player ID: ${user.playerId}`);
  console.log(`🔍 Owner ID: ${owner.id}, Player ID: ${owner.playerId}`);

  // Slanje emaila vlasniku preko Mailjet
  const client = getMailjetClient();
  
  const emailData = {
    Messages: [
      {
        From: {
          Email: process.env.MAIL_FROM_EMAIL || 'termino@playgroundapp.com',
          Name: 'Termino - Playground App'
        },
        To: [
          {
            Email: owner.email,
            Name: owner.name
          }
        ],
        Subject: 'Nova rezervacija termina (čeka potvrdu)',
        HTMLPart: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Nova rezervacija termina</h2>
            <p>Korisnik <strong>${user.name}</strong> je rezervisao termin u vašoj igraonici.</p>
            <div style="background-color: #f4f4f4; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3 style="color: #007bff; margin-top: 0;">Detalji rezervacije:</h3>
              <p><strong>Korisnik:</strong> ${user.name}</p>
              <p><strong>Email:</strong> ${user.email}</p>
              ${user.phone ? `<p><strong>Telefon:</strong> ${user.phone}</p>` : ''}
              <p><strong>Datum:</strong> ${slot.date}</p>
              <p><strong>Vreme:</strong> ${slot.timeFrom} - ${slot.timeTo}</p>
              <p><strong>Igraonica:</strong> ${playground.name}</p>
            </div>
            <p>Molimo potvrdite ili odbijte rezervaciju u aplikaciji.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">Termino - Playground App</p>
          </div>
        `,
        TextPart: `Korisnik ${user.name} (${user.email}${user.phone ? ', tel: ' + user.phone : ''}) je rezervisao termin za ${slot.date} od ${slot.timeFrom} do ${slot.timeTo} u igraonici ${playground.name}. Potvrdite ili odbijte rezervaciju u aplikaciji.`
      }
    ]
  };
  
  if (client) {
    try {
      const result = await client.post('send', { version: 'v3.1' }).request(emailData);
      console.log('✅ Email vlasniku poslat uspešno!');
      console.log('Message ID:', result.body.Messages[0].To[0].MessageID);
    } catch (error) {
      console.error('❌ Greška pri slanju emaila vlasniku:', error);
    }
  } else {
    console.error('⚠️ Mailjet klijent nije dostupan - email nije poslat');
  }

  // Pošalji OneSignal push notifikaciju owner-u
  console.log(`🔍 Owner ID: ${owner.id}, Player ID: ${owner.playerId || 'NEMA'}`);
  if (owner.playerId) {
    const title = 'Nova rezervacija termina';
    const message = `${user.name} je rezervisao termin za ${slot.date} od ${slot.timeFrom}-${slot.timeTo}`;
    const data = {
      reservationId: reservation.id,
      playgroundId: playground.id,
      slotId: slot.id,
      type: 'new_reservation'
    };
    
    console.log(`📱 Šaljem OneSignal notifikaciju owner-u: ${owner.playerId}`);
    console.log(`   Title: ${title}`);
    console.log(`   Message: ${message}`);
    try {
      await sendOneSignalNotification(owner.playerId, title, message, data);
      console.log('✅ OneSignal notifikacija owner-u poslata uspešno');
    } catch (error) {
      console.error('❌ Greška pri slanju OneSignal notifikacije owner-u:', error);
    }
  } else {
    console.log('⚠️ Owner nema playerId - push notifikacija nije poslata');
    console.log('💡 Owner mora da se uloguje u aplikaciju da bi dobio playerId');
  }

  // Upis notifikacije u bazu
  await Notification.create({
    ownerId: owner.id,
    message: `Nova rezervacija (čeka potvrdu): ${user.name} (${user.email}${user.phone ? ', tel: ' + user.phone : ''}) za ${slot.date} ${slot.timeFrom}h-${slot.timeTo}h u ${playground.name}.`,
    reservationId: reservation.id
  });

  // Duplikat OneSignal poziva je uklonjen - koristi se samo sendOneSignalNotification funkcija iznad

  res.status(201).json(reservation);
});

// Owner potvrđuje ili odbija rezervaciju
router.post('/confirm/:reservationId', auth, async (req, res) => {
  // Očekuje se { action: 'approve' | 'reject' }
  const { action } = req.body;
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'Akcija mora biti approve ili reject.' });
  }
  const reservation = await Reservation.findByPk(req.params.reservationId, { include: [{ model: Slot, as: 'slot' }] });
  if (!reservation) return res.status(404).json({ message: 'Rezervacija nije pronađena.' });
  // Proveri da li je owner
  const slot = await Slot.findByPk(reservation.slotId);
  const playground = await Playground.findByPk(slot.playgroundId);
  if (playground.ownerId !== req.user.id) {
    return res.status(403).json({ message: 'Niste vlasnik ove igraonice.' });
  }
  const user = await User.findByPk(reservation.userId);
  const client = getMailjetClient();
  
  if (action === 'approve') {
    reservation.status = 'approved';
    slot.isReserved = true;
    slot.isTemporarilyReserved = false; // Ukloni privremenu rezervaciju
    await slot.save();
    // Pošalji email korisniku
    if (client) {
      try {
        const emailData = {
          Messages: [
            {
              From: {
                Email: process.env.MAIL_FROM_EMAIL || 'termino@playgroundapp.com',
                Name: 'Termino - Playground App'
              },
              To: [
                {
                  Email: user.email,
                  Name: user.name
                }
              ],
              Subject: 'Rezervacija potvrđena',
              HTMLPart: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #28a745;">🎉 Rezervacija potvrđena!</h2>
                  <p>Vaša rezervacija je uspešno potvrđena.</p>
                  <div style="background-color: #d4edda; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #28a745;">
                    <h3 style="color: #155724; margin-top: 0;">Detalji rezervacije:</h3>
                    <p><strong>Datum:</strong> ${slot.date}</p>
                    <p><strong>Vreme:</strong> ${slot.timeFrom} - ${slot.timeTo}</p>
                    <p><strong>Igraonica:</strong> ${playground.name}</p>
                  </div>
                  <p>Vidimo se na terminu! 🏀</p>
                  <hr style="margin: 30px 0;">
                  <p style="color: #666; font-size: 12px;">Termino - Playground App</p>
                </div>
              `,
              TextPart: `Vaša rezervacija termina za ${slot.date} od ${slot.timeFrom}h do ${slot.timeTo}h u igraonici ${playground.name} je ODOBRENA.`
            }
          ]
        };
        
        const result = await client.post('send', { version: 'v3.1' }).request(emailData);
        console.log('✅ Email korisniku poslat uspešno!');
        console.log('Message ID:', result.body.Messages[0].To[0].MessageID);
      } catch (error) {
        console.error('❌ Greška pri slanju emaila korisniku:', error);
      }
    } else {
      console.error('⚠️ Mailjet klijent nije dostupan - email nije poslat korisniku');
    }
    // Pošalji OneSignal push notifikaciju korisniku
    console.log(`🔍 User PlayerID: ${user.playerId || 'NEMA'}`);
    if (user.playerId) {
      const title = 'Rezervacija potvrđena';
      const message = `Vaša rezervacija za ${slot.date} od ${slot.timeFrom}-${slot.timeTo} u ${playground.name} je ODOBRENA!`;
      const data = {
        reservationId: reservation.id,
        playgroundId: playground.id,
        slotId: slot.id,
        type: 'reservation_approved'
      };
      
      console.log(`📱 Šaljem OneSignal notifikaciju korisniku: ${user.playerId}`);
      await sendOneSignalNotification(user.playerId, title, message, data);
    } else {
      console.log('⚠️ User nema playerId - push notifikacija nije poslata');
      console.log('💡 Korisnik mora da se uloguje u aplikaciju da bi dobio playerId');
    }
    // Ažuriraj originalnu notifikaciju vlasnika
    await Notification.update(
      { 
        message: `Nova rezervacija (potvrđeno): ${user.name} (${user.email}${user.phone ? ', tel: ' + user.phone : ''}) za ${slot.date} ${slot.timeFrom}h-${slot.timeTo}h u ${playground.name}.`,
        seen: true
      },
      { where: { ownerId: playground.ownerId, reservationId: reservation.id } }
    );
    
    // Upis notifikacije za korisnika
    await Notification.create({
      ownerId: user.id, // korisnik dobija notifikaciju
      message: `Vaša rezervacija za ${slot.date} ${slot.timeFrom}h-${slot.timeTo}h u ${playground.name} je ODOBRENA.`,
      reservationId: reservation.id
    });
  } else {
    reservation.status = 'rejected';
    slot.isTemporarilyReserved = false; // Vrati termin kao slobodan
    await slot.save();
    // Pošalji email korisniku
    if (client) {
      try {
        const emailData = {
          Messages: [
            {
              From: {
                Email: process.env.MAIL_FROM_EMAIL || 'termino@playgroundapp.com',
                Name: 'Termino - Playground App'
              },
              To: [
                {
                  Email: user.email,
                  Name: user.name
                }
              ],
              Subject: 'Rezervacija odbijena',
              HTMLPart: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #dc3545;">Rezervacija odbijena</h2>
                  <p>Nažalost, vaša rezervacija nije mogla biti potvrđena.</p>
                  <div style="background-color: #f8d7da; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #dc3545;">
                    <h3 style="color: #721c24; margin-top: 0;">Detalji rezervacije:</h3>
                    <p><strong>Datum:</strong> ${slot.date}</p>
                    <p><strong>Vreme:</strong> ${slot.timeFrom} - ${slot.timeTo}</p>
                    <p><strong>Igraonica:</strong> ${playground.name}</p>
                  </div>
                  <p>Molimo pokušajte sa drugim terminom.</p>
                  <hr style="margin: 30px 0;">
                  <p style="color: #666; font-size: 12px;">Termino - Playground App</p>
                </div>
              `,
              TextPart: `Vaša rezervacija termina za ${slot.date} od ${slot.timeFrom}h do ${slot.timeTo}h u igraonici ${playground.name} je ODBIJENA.`
            }
          ]
        };
        
        const result = await client.post('send', { version: 'v3.1' }).request(emailData);
        console.log('✅ Email korisniku poslat uspešno!');
        console.log('Message ID:', result.body.Messages[0].To[0].MessageID);
      } catch (error) {
        console.error('❌ Greška pri slanju emaila korisniku:', error);
      }
    } else {
      console.error('⚠️ Mailjet klijent nije dostupan - email nije poslat korisniku');
    }
    // Pošalji OneSignal push notifikaciju korisniku
    console.log(`🔍 User PlayerID (reject): ${user.playerId || 'NEMA'}`);
    if (user.playerId) {
      const title = 'Rezervacija odbijena';
      const message = `Nažalost, vaša rezervacija za ${slot.date} od ${slot.timeFrom}-${slot.timeTo} u ${playground.name} je ODBIJENA.`;
      const data = {
        reservationId: reservation.id,
        playgroundId: playground.id,
        slotId: slot.id,
        type: 'reservation_rejected'
      };
      
      console.log(`📱 Šaljem OneSignal notifikaciju korisniku (reject): ${user.playerId}`);
      await sendOneSignalNotification(user.playerId, title, message, data);
    } else {
      console.log('⚠️ User nema playerId - push notifikacija nije poslata (reject)');
      console.log('💡 Korisnik mora da se uloguje u aplikaciju da bi dobio playerId');
    }
    // Ažuriraj originalnu notifikaciju vlasnika
    await Notification.update(
      { 
        message: `Nova rezervacija (odbijeno): ${user.name} (${user.email}${user.phone ? ', tel: ' + user.phone : ''}) za ${slot.date} ${slot.timeFrom}h-${slot.timeTo}h u ${playground.name}.`,
        seen: true
      },
      { where: { ownerId: playground.ownerId, reservationId: reservation.id } }
    );
    
    // Upis notifikacije za korisnika
    await Notification.create({
      ownerId: user.id, // korisnik dobija notifikaciju
      message: `Vaša rezervacija za ${slot.date} ${slot.timeFrom}h-${slot.timeTo}h u ${playground.name} je ODBIJENA.`,
      reservationId: reservation.id
    });
  }
  await reservation.save();
  res.json({ message: `Rezervacija je ${action === 'approve' ? 'odobrena' : 'odbijena'}.` });
});

// Moje rezervacije (korisnik) - samo aktivne (neobrisane)
router.get('/my', auth, async (req, res) => {
  try {
    console.log('GET /my - User ID:', req.user.id, 'Type:', req.user.type);
    const reservations = await Reservation.findAll({
      where: { 
        userId: req.user.id,
        isDeleted: false // Samo aktivne rezervacije
      },
      include: [{ model: Slot, as: 'slot', include: [{ model: Playground, as: 'playground' }] }]
    });
    console.log('Found reservations:', reservations.length);
    console.log('Reservations data:', JSON.stringify(reservations, null, 2));
    res.json(reservations);
  } catch (error) {
    console.error('Error in GET /my:', error);
    res.status(500).json({ message: 'Greška pri dohvatanju rezervacija', error: error.message });
  }
});

// Otkazivanje rezervacije (korisnik) - oslobađa slot
router.delete('/:reservationId', auth, async (req, res) => {
  try {
    console.log('DELETE /reservations/:reservationId - User ID:', req.user.id, 'Reservation ID:', req.params.reservationId);
    const reservation = await Reservation.findByPk(req.params.reservationId, { include: [{ model: Slot, as: 'slot' }] });
    if (!reservation) return res.status(404).json({ message: 'Rezervacija nije pronađena.' });
    if (reservation.userId !== req.user.id) return res.status(403).json({ message: 'Nije dozvoljeno.' });
    
    // Proveri da li je rezervacija već obrisana
    if (reservation.isDeleted) {
      return res.status(400).json({ message: 'Rezervacija je već otkazana.' });
    }
    
    const slot = await Slot.findByPk(reservation.slotId);
    if (slot) {
      slot.isReserved = false;
      slot.isTemporarilyReserved = false; // Ukloni i privremenu rezervaciju
      await slot.save();
      console.log('Slot marked as not reserved:', slot.id);
    }
    
    // Soft delete - samo označi kao obrisanu
    reservation.isDeleted = true;
    await reservation.save();
    console.log('Reservation soft deleted successfully:', req.params.reservationId);
    res.json({ message: 'Rezervacija otkazana.' });
  } catch (error) {
    console.error('Error in DELETE /reservations/:reservationId:', error);
    res.status(500).json({ message: 'Greška pri brisanju rezervacije', error: error.message });
  }
});

// Soft delete rezervacije (korisnik) - samo skriva od korisnika, ne oslobađa slot
router.patch('/:reservationId/hide', auth, async (req, res) => {
  try {
    console.log('PATCH /reservations/:reservationId/hide - User ID:', req.user.id, 'Reservation ID:', req.params.reservationId);
    const reservation = await Reservation.findByPk(req.params.reservationId);
    if (!reservation) return res.status(404).json({ message: 'Rezervacija nije pronađena.' });
    if (reservation.userId !== req.user.id) return res.status(403).json({ message: 'Nije dozvoljeno.' });
    
    // Proveri da li je rezervacija već obrisana
    if (reservation.isDeleted) {
      return res.status(400).json({ message: 'Rezervacija je već uklonjena iz vašeg prikaza.' });
    }
    
    // Soft delete - samo označi kao obrisanu, NE oslobađaj slot
    reservation.isDeleted = true;
    await reservation.save();
    console.log('Reservation hidden from user successfully:', req.params.reservationId);
    res.json({ message: 'Rezervacija je uklonjena iz vašeg prikaza.' });
  } catch (error) {
    console.error('Error in PATCH /reservations/:reservationId/hide:', error);
    res.status(500).json({ message: 'Greška pri skrivanju rezervacije', error: error.message });
  }
});

// Rezervacije za igraonice (vlasnik) - sve rezervacije (uključujući obrisane)
router.get('/owner', auth, async (req, res) => {
  if (req.user.type !== 'owner') return res.status(403).json({ message: 'Samo vlasnici mogu videti rezervacije za svoje igraonice.' });
  const playgrounds = await Playground.findAll({ where: { ownerId: req.user.id } });
  const playgroundIds = playgrounds.map(p => p.id);
  const slots = await Slot.findAll({ where: { playgroundId: playgroundIds } });
  const slotIds = slots.map(s => s.id);
  const reservations = await Reservation.findAll({
    where: { slotId: slotIds }, // Vidi sve rezervacije, uključujući obrisane
    include: [
      { model: Slot, as: 'slot', include: [{ model: Playground, as: 'playground' }] },
      { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }
    ]
  });
  res.json(reservations);
});

// Mesečne rezervacije za određenu igraonicu (vlasnik)
router.get('/monthly/:playgroundId', auth, async (req, res) => {
  try {
    if (req.user.type !== 'owner') {
      return res.status(403).json({ message: 'Samo vlasnici mogu videti mesečne rezervacije.' });
    }

    const { playgroundId } = req.params;
    const { month } = req.query; // Format: YYYY-MM

    // Proveri da li je vlasnik ove igraonice
    const playground = await Playground.findOne({
      where: { 
        id: playgroundId,
        ownerId: req.user.id 
      }
    });

    if (!playground) {
      return res.status(403).json({ message: 'Niste vlasnik ove igraonice.' });
    }

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'Neispravan format meseca. Koristite YYYY-MM.' });
    }

    // Kreiraj date range za mesec
    const startDate = new Date(month + '-01');
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    // Pronađi sve slotove za tu igraonicu u tom mesecu
    const slots = await Slot.findAll({
      where: {
        playgroundId: playgroundId,
        date: {
          [require('sequelize').Op.between]: [startDate, endDate]
        }
      }
    });

    const slotIds = slots.map(s => s.id);

    // Pronađi sve rezervacije za te slotove (uključujući obrisane)
    const reservations = await Reservation.findAll({
      where: { slotId: slotIds }, // Vidi sve rezervacije, uključujući obrisane
      include: [
        { 
          model: Slot, 
          as: 'slot',
          where: {
            date: {
              [require('sequelize').Op.between]: [startDate, endDate]
            }
          }
        },
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'name', 'email', 'phone'] 
        }
      ],
      order: [
        [{ model: Slot, as: 'slot' }, 'date', 'ASC'],
        [{ model: Slot, as: 'slot' }, 'timeFrom', 'ASC']
      ]
    });

    res.json(reservations);
  } catch (error) {
    console.error('Error in GET /monthly/:playgroundId:', error);
    res.status(500).json({ message: 'Greška pri dohvatanju mesečnih rezervacija', error: error.message });
  }
});

// Mesečne rezervacije za sve igraonice vlasnika
router.get('/monthly/all', auth, async (req, res) => {
  try {
    if (req.user.type !== 'owner') {
      return res.status(403).json({ message: 'Samo vlasnici mogu videti mesečne rezervacije.' });
    }

    const { month } = req.query; // Format: YYYY-MM

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'Neispravan format meseca. Koristite YYYY-MM.' });
    }

    // Kreiraj date range za mesec
    const startDate = new Date(month + '-01');
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    // Pronađi sve igraonice vlasnika
    const playgrounds = await Playground.findAll({
      where: { ownerId: req.user.id }
    });

    const playgroundIds = playgrounds.map(p => p.id);

    // Pronađi sve slotove za te igraonice u tom mesecu
    const slots = await Slot.findAll({
      where: {
        playgroundId: playgroundIds,
        date: {
          [require('sequelize').Op.between]: [startDate, endDate]
        }
      }
    });

    const slotIds = slots.map(s => s.id);

    // Pronađi sve rezervacije za te slotove (uključujući obrisane)
    const reservations = await Reservation.findAll({
      where: { slotId: slotIds }, // Vidi sve rezervacije, uključujući obrisane
      include: [
        { 
          model: Slot, 
          as: 'slot',
          include: [{ model: Playground, as: 'playground' }],
          where: {
            date: {
              [require('sequelize').Op.between]: [startDate, endDate]
            }
          }
        },
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'name', 'email', 'phone'] 
        }
      ],
      order: [
        [{ model: Slot, as: 'slot' }, 'playground', 'name', 'ASC'],
        [{ model: Slot, as: 'slot' }, 'date', 'ASC'],
        [{ model: Slot, as: 'slot' }, 'timeFrom', 'ASC']
      ]
    });

    res.json(reservations);
  } catch (error) {
    console.error('Error in GET /monthly/all:', error);
    res.status(500).json({ message: 'Greška pri dohvatanju mesečnih rezervacija', error: error.message });
  }
});

module.exports = router; 