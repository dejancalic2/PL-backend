const express = require('express');
const { Reservation, Slot, Playground, User, Notification } = require('../models');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
const axios = require('axios');

const router = express.Router();

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
  const reservation = await Reservation.create({ userId: req.user.id, slotId: slot.id, note: req.body.note, status: 'pending' });

  // Pronađi korisnika i vlasnika
  const user = await User.findByPk(req.user.id);
  const playground = await Playground.findByPk(slot.playgroundId, { include: [{ model: User, as: 'owner' }] });
  const owner = playground.owner;

  // Slanje emaila vlasniku
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD
    }
  });
  const mailOptions = {
    from: process.env.MAIL_FROM_EMAIL,
    to: owner.email,
    subject: 'Nova rezervacija termina (čeka potvrdu)',
    text: `Korisnik ${user.name} (${user.email}${user.phone ? ', tel: ' + user.phone : ''}) je rezervisao termin za ${slot.date} od ${slot.timeFrom} do ${slot.timeTo} u igraonici ${playground.name}. Potvrdite ili odbijte rezervaciju u aplikaciji.`
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Greška pri slanju emaila:', error);
    } else {
      console.log('Email poslat:', info.response);
    }
  });

  // Upis notifikacije u bazu
  await Notification.create({
    ownerId: owner.id,
    message: `Nova rezervacija (čeka potvrdu): ${user.name} (${user.email}${user.phone ? ', tel: ' + user.phone : ''}) za ${slot.date} ${slot.timeFrom}h-${slot.timeTo}h u ${playground.name}.`,
    reservationId: reservation.id
  });

  // OneSignal notifikacija
  if (owner.playerId) {
    await axios.post('https://onesignal.com/api/v1/notifications', {
      app_id: process.env.ONESIGNAL_APP_ID,
      include_player_ids: [owner.playerId],
      contents: { en: `Nova rezervacija (čeka potvrdu): ${user.name} (${user.email}${user.phone ? ', tel: ' + user.phone : ''}) za ${slot.date} ${slot.timeFrom}h-${slot.timeTo}h u ${playground.name}.` }
    }, {
      headers: {
        'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
  }

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
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD
    }
  });
  if (action === 'approve') {
    reservation.status = 'approved';
    slot.isReserved = true;
    slot.isTemporarilyReserved = false; // Ukloni privremenu rezervaciju
    await slot.save();
    // Pošalji email korisniku
    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM_EMAIL,
        to: user.email,
        subject: 'Rezervacija potvrđena',
        text: `Vaša rezervacija termina za ${slot.date} od ${slot.timeFrom}h do ${slot.timeTo}h u igraonici ${playground.name} je ODOBRENA.`
      });
    } catch (error) {
      console.error('Greška pri slanju emaila korisniku:', error);
    }
    // OneSignal push korisniku
    if (user.playerId) {
      try {
        await axios.post('https://onesignal.com/api/v1/notifications', {
          app_id: process.env.ONESIGNAL_APP_ID,
          include_player_ids: [user.playerId],
          contents: { en: `Vaša rezervacija za ${slot.date} ${slot.timeFrom}h-${slot.timeTo}h u ${playground.name} je ODOBRENA.` }
        }, {
          headers: {
            'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('Greška pri slanju push notifikacije korisniku:', error);
      }
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
    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM_EMAIL,
        to: user.email,
        subject: 'Rezervacija odbijena',
        text: `Vaša rezervacija termina za ${slot.date} od ${slot.timeFrom}h do ${slot.timeTo}h u igraonici ${playground.name} je ODBIJENA.`
      });
    } catch (error) {
      console.error('Greška pri slanju emaila korisniku:', error);
    }
    // OneSignal push korisniku
    if (user.playerId) {
      try {
        await axios.post('https://onesignal.com/api/v1/notifications', {
          app_id: process.env.ONESIGNAL_APP_ID,
          include_player_ids: [user.playerId],
          contents: { en: `Vaša rezervacija za ${slot.date} ${slot.timeFrom}h-${slot.timeTo}h u ${playground.name} je ODBIJENA.` }
        }, {
          headers: {
            'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('Greška pri slanju push notifikacije korisniku:', error);
      }
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