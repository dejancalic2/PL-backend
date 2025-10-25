const express = require('express');
const { NonWorkingDay, Playground, Slot, Reservation, User } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

// Dohvatanje svih neradnih dana za igraonicu
router.get('/:playgroundId', async (req, res) => {
  try {
    const nonWorkingDays = await NonWorkingDay.findAll({
      where: { playgroundId: req.params.playgroundId },
      order: [['date', 'ASC']],
    });
    res.json(nonWorkingDays);
  } catch (error) {
    console.error('Greška pri dohvatanju neradnih dana:', error);
    res.status(500).json({ message: 'Greška na serveru.' });
  }
});

// Dodavanje neradnog dana (samo vlasnik)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.type !== 'owner') {
      return res.status(403).json({ message: 'Samo vlasnici mogu dodavati neradne dane.' });
    }

    const { playgroundId, date, type, description, isRecurring, recurringDay, recurringMonth, recurringDate } = req.body;

    // Proveri da li je vlasnik igraonice
    const playground = await Playground.findByPk(playgroundId);
    if (!playground) {
      return res.status(404).json({ message: 'Igraonica nije pronađena.' });
    }
    if (playground.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Niste vlasnik ove igraonice.' });
    }

    // Proveri da li već postoji neradan dan za taj datum
    const existingNonWorkingDay = await NonWorkingDay.findOne({
      where: { playgroundId, date }
    });
    if (existingNonWorkingDay) {
      return res.status(400).json({ message: 'Već postoji neradan dan za ovaj datum.' });
    }

    // NOVA PROVERA: Da li postoje aktivne rezervacije za taj datum?
    const slotsForDate = await Slot.findAll({
      where: { playgroundId, date }
    });
    
    if (slotsForDate.length > 0) {
      const slotIds = slotsForDate.map(s => s.id);
      
      // Proveri da li postoje rezervacije (pending ili approved, NE odbijene)
      const existingReservations = await Reservation.findAll({
        where: {
          slotId: slotIds,
          status: ['pending', 'approved'],
          isDeleted: false
        },
        include: [
          { model: Slot, as: 'slot' },
          { model: User, as: 'user', attributes: ['name', 'email', 'phone'] }
        ]
      });

      if (existingReservations.length > 0) {
        // Postoje aktivne rezervacije - NE DOZVOLI dodavanje neradnog dana
        const reservationDetails = existingReservations.map(r => ({
          userName: r.user.name,
          userEmail: r.user.email,
          userPhone: r.user.phone,
          timeFrom: r.slot.timeFrom,
          timeTo: r.slot.timeTo,
          status: r.status
        }));

        return res.status(400).json({ 
          message: `Ne možete dodati neradan dan jer postoje ${existingReservations.length} aktivne rezervacije za ${date}.`,
          reservations: reservationDetails
        });
      }
    }

    // Kreiraj neradan dan
    const nonWorkingDay = await NonWorkingDay.create({
      playgroundId,
      date,
      type,
      description,
      isRecurring,
      recurringDay,
      recurringMonth,
      recurringDate
    });

    // Automatski onemogući sve termine za taj datum
    await Slot.update(
      { isDisabled: true },
      { 
        where: { 
          playgroundId: playgroundId,
          date: date
        }
      }
    );

    console.log(`Termini onemogućeni za ${date} u igraonici ${playgroundId}`);

    res.status(201).json(nonWorkingDay);
  } catch (error) {
    console.error('Greška pri dodavanju neradnog dana:', error);
    res.status(500).json({ message: 'Greška na serveru.' });
  }
});

// Izmena neradnog dana (samo vlasnik)
router.put('/:id', auth, async (req, res) => {
  try {
    const nonWorkingDay = await NonWorkingDay.findByPk(req.params.id, {
      include: [{ model: Playground, as: 'playground' }]
    });
    
    if (!nonWorkingDay) {
      return res.status(404).json({ message: 'Neradni dan nije pronađen.' });
    }
    
    if (nonWorkingDay.playground.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Nije dozvoljeno.' });
    }

    const { date, type, description, isRecurring, recurringDay, recurringMonth, recurringDate } = req.body;
    
    // Provera da li već postoji neradni dan za novi datum (ako se menja datum)
    if (date && date !== nonWorkingDay.date) {
      const existing = await NonWorkingDay.findOne({
        where: { 
          playgroundId: nonWorkingDay.playgroundId,
          date: date
        }
      });
      
      if (existing) {
        return res.status(400).json({ message: 'Već postoji neradni dan za izabrani datum.' });
      }

      // NOVA PROVERA: Da li postoje aktivne rezervacije za novi datum?
      const slotsForDate = await Slot.findAll({
        where: { playgroundId: nonWorkingDay.playgroundId, date: date }
      });
      
      if (slotsForDate.length > 0) {
        const slotIds = slotsForDate.map(s => s.id);
        
        const existingReservations = await Reservation.findAll({
          where: {
            slotId: slotIds,
            status: ['pending', 'approved'],
            isDeleted: false
          },
          include: [
            { model: Slot, as: 'slot' },
            { model: User, as: 'user', attributes: ['name', 'email', 'phone'] }
          ]
        });

        if (existingReservations.length > 0) {
          const reservationDetails = existingReservations.map(r => ({
            userName: r.user.name,
            userEmail: r.user.email,
            userPhone: r.user.phone,
            timeFrom: r.slot.timeFrom,
            timeTo: r.slot.timeTo,
            status: r.status
          }));

          return res.status(400).json({ 
            message: `Ne možete promeniti na datum ${date} jer postoje ${existingReservations.length} aktivne rezervacije.`,
            reservations: reservationDetails
          });
        }
      }
    }

    Object.assign(nonWorkingDay, {
      date: date || nonWorkingDay.date,
      type: type || nonWorkingDay.type,
      description: description !== undefined ? description : nonWorkingDay.description,
      isRecurring: isRecurring !== undefined ? isRecurring : nonWorkingDay.isRecurring,
      recurringDay: recurringDay !== undefined ? recurringDay : nonWorkingDay.recurringDay,
      recurringMonth: recurringMonth !== undefined ? recurringMonth : nonWorkingDay.recurringMonth,
      recurringDate: recurringDate !== undefined ? recurringDate : nonWorkingDay.recurringDate
    });

    await nonWorkingDay.save();
    res.json(nonWorkingDay);
  } catch (error) {
    console.error('Greška pri izmeni neradnog dana:', error);
    res.status(500).json({ message: 'Greška na serveru.' });
  }
});

// Brisanje neradnog dana (samo vlasnik)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.type !== 'owner') {
      return res.status(403).json({ message: 'Samo vlasnici mogu brisati neradne dane.' });
    }

    const nonWorkingDay = await NonWorkingDay.findByPk(req.params.id);
    if (!nonWorkingDay) {
      return res.status(404).json({ message: 'Neradni dan nije pronađen.' });
    }

    // Proveri da li je vlasnik igraonice
    const playground = await Playground.findByPk(nonWorkingDay.playgroundId);
    if (playground.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Niste vlasnik ove igraonice.' });
    }

    // Sačuvaj podatke pre brisanja
    const { playgroundId, date } = nonWorkingDay;

    // Obriši neradan dan
    await nonWorkingDay.destroy();

    // Automatski ponovo omogući sve termine za taj datum
    await Slot.update(
      { isDisabled: false },
      { 
        where: { 
          playgroundId: playgroundId,
          date: date
        }
      }
    );

    console.log(`Termini ponovo omogućeni za ${date} u igraonici ${playgroundId}`);

    res.json({ message: 'Neradni dan obrisan.' });
  } catch (error) {
    console.error('Greška pri brisanju neradnog dana:', error);
    res.status(500).json({ message: 'Greška na serveru.' });
  }
});

// Dohvatanje neradnih dana za period (za kalendar)
router.get('/:playgroundId/period', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Potrebni su startDate i endDate parametri.' });
    }

    const nonWorkingDays = await NonWorkingDay.findAll({
      where: { 
        playgroundId: req.params.playgroundId,
        date: {
          [require('sequelize').Op.between]: [startDate, endDate]
        }
      },
      order: [['date', 'ASC']],
    });

    res.json(nonWorkingDays);
  } catch (error) {
    console.error('Greška pri dohvatanju neradnih dana za period:', error);
    res.status(500).json({ message: 'Greška na serveru.' });
  }
});

module.exports = router; 