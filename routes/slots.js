const express = require('express');
const { Slot, Playground, NonWorkingDay } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

// Funkcija koja osigurava da postoje termini za sledećih 30 dana
async function ensureSlotsExist(playgroundId) {
  try {
    const playground = await Playground.findByPk(playgroundId);
    if (!playground || !playground.slotTemplates) {
      return; // Nema šablona za termine
    }

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    // Proveri da li postoje termini za sledećih 30 dana
    const existingSlots = await Slot.findAll({
      where: {
        playgroundId: playgroundId,
        date: {
          [require('sequelize').Op.gte]: today.toISOString().slice(0, 10),
          [require('sequelize').Op.lte]: thirtyDaysFromNow.toISOString().slice(0, 10)
        }
      },
      attributes: ['date'],
      group: ['date']
    });

    const existingDates = existingSlots.map(slot => slot.date);
    
    // Kreiraj termine za datume koji nemaju termine
    for (let d = new Date(today); d <= thirtyDaysFromNow; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      
      if (!existingDates.includes(dateStr)) {
        console.log(`Kreiram termine za datum: ${dateStr}`);
        
        // Kreiraj termine prema šablonima
        for (const template of playground.slotTemplates) {
          if (template.from && template.to) {
            await Slot.create({
              playgroundId: playgroundId,
              date: dateStr,
              timeFrom: template.from,
              timeTo: template.to,
              isReserved: false,
              isTemporarilyReserved: false
            });
            console.log(`Kreiran termin: ${template.from}-${template.to} za ${dateStr}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Greška pri kreiranju termina:', error);
  }
}

// Svi mogu da vide termine za igraonicu
router.get('/:playgroundId', async (req, res) => {
  try {
    // Prvo proveri da li postoje termini za sledećih 30 dana
    await ensureSlotsExist(req.params.playgroundId);
    
    const slots = await Slot.findAll({
      where: { 
        playgroundId: req.params.playgroundId,
        isDisabled: false // Samo aktivni termini
      },
      order: [['date', 'ASC'], ['timeFrom', 'ASC']],
    });
    
    // Dohvati neradne dane za ovu igraonicu
    const nonWorkingDays = await NonWorkingDay.findAll({
      where: { playgroundId: req.params.playgroundId },
      attributes: ['date', 'type', 'description']
    });
    
    // Dodaj informaciju o neradnim danima u response
    const response = {
      slots,
      nonWorkingDays: nonWorkingDays.map(nwd => ({
        date: nwd.date,
        type: nwd.type,
        description: nwd.description
      }))
    };
    
    res.json(response);
  } catch (error) {
    console.error('Greška pri dohvatanju termina:', error);
    res.status(500).json({ message: 'Greška na serveru.' });
  }
});

// Svi slotovi za igraonicu (uključujući onemogućene - za admin/vlasnik)
router.get('/playground/:playgroundId', async (req, res) => {
  const slots = await Slot.findAll({ 
    where: { playgroundId: req.params.playgroundId }, 
    order: [['date', 'ASC'], ['timeFrom', 'ASC']] 
  });
  res.json(slots);
});

// Dodavanje termina (samo vlasnik)
router.post('/:playgroundId', auth, async (req, res) => {
  const playground = await Playground.findByPk(req.params.playgroundId);
  if (!playground) return res.status(404).json({ message: 'Igraonica nije pronađena.' });
  if (playground.ownerId !== req.user.id) return res.status(403).json({ message: 'Nije dozvoljeno.' });
  const { date, timeFrom, timeTo, isReserved } = req.body;
  const slot = await Slot.create({ playgroundId: playground.id, date, timeFrom, timeTo, isReserved: isReserved === true });
  res.status(201).json(slot);
});

// Izmena termina (samo vlasnik)
router.put('/:slotId', auth, async (req, res) => {
  const slot = await Slot.findByPk(req.params.slotId, { include: [{ model: Playground, as: 'playground' }] });
  if (!slot) return res.status(404).json({ message: 'Termin nije pronađen.' });
  if (slot.playground.ownerId !== req.user.id) return res.status(403).json({ message: 'Nije dozvoljeno.' });
  Object.assign(slot, req.body);
  await slot.save();
  res.json(slot);
});

// Brisanje termina (samo vlasnik)
router.delete('/:slotId', auth, async (req, res) => {
  const slot = await Slot.findByPk(req.params.slotId, { include: [{ model: Playground, as: 'playground' }] });
  if (!slot) return res.status(404).json({ message: 'Termin nije pronađen.' });
  if (slot.playground.ownerId !== req.user.id) return res.status(403).json({ message: 'Nije dozvoljeno.' });
  await slot.destroy();
  res.json({ message: 'Termin obrisan.' });
});

module.exports = router; 