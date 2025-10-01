const express = require('express');
const { Playground, User, Slot, sequelize } = require('../models');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');

const router = express.Router();

// Funkcija za ažuriranje postojećih termina kada se promene slotTemplates
async function updateExistingSlots(playgroundId, newSlotTemplates) {
  try {
    console.log('Ažuriram postojeće termine za playground:', playgroundId);
    console.log('Novi slotTemplates:', newSlotTemplates);
    
    // Pronađi sve termine za ovu igraonicu od današnjeg datuma
    const today = new Date().toISOString().slice(0, 10);
    console.log(`Tražim termine za playground ${playgroundId} od datuma ${today}`);
    
    const existingSlots = await Slot.findAll({
      where: {
        playgroundId: playgroundId,
        date: {
          [Op.gte]: today
        }
      },
      order: [['date', 'ASC'], ['timeFrom', 'ASC']]
    });
    
    console.log(`Pronađeno ${existingSlots.length} postojećih termina od ${today}`);
    
    if (existingSlots.length === 0) {
      console.log('Nema postojećih termina za ažuriranje');
      return;
    }
    
    // Grupiši termine po datumu
    const slotsByDate = {};
    existingSlots.forEach(slot => {
      if (!slotsByDate[slot.date]) {
        slotsByDate[slot.date] = [];
      }
      slotsByDate[slot.date].push(slot);
    });
    
    // Za svaki datum, ažuriraj termine
    for (const [date, slots] of Object.entries(slotsByDate)) {
      console.log(`Ažuriram termine za datum: ${date}`);
      console.log(`Postojeći termini za ${date}:`, slots.map(s => `${s.timeFrom}-${s.timeTo} (reserved: ${s.isReserved})`));
      
      // Sačuvaj informacije o rezervisanim terminima pre brisanja
      const reservedSlots = slots.filter(slot => slot.isReserved || slot.isTemporarilyReserved);
      console.log(`Pronađeno ${reservedSlots.length} rezervisanih termina za ${date}`);
      
      // Obriši SAMO nerezervisane termine za taj datum
      const unreservedSlots = slots.filter(slot => !slot.isReserved && !slot.isTemporarilyReserved);
      console.log(`Brišem ${unreservedSlots.length} nerezervisanih termina za ${date}`);
      
      for (const slot of unreservedSlots) {
        await slot.destroy();
        console.log(`Obrisan nerezervisan termin: ${slot.timeFrom}-${slot.timeTo}`);
      }
      
      // Kreiraj nove termine prema novim šablonima
      console.log(`Kreiram nove termine prema šablonima:`, newSlotTemplates);
      for (const template of newSlotTemplates) {
        if (template.from && template.to) {
          // Proveri da li već postoji rezervisan termin sa ovim početnim vremenom
          const existingReservedSlot = reservedSlots.find(rs => 
            rs.timeFrom === template.from
          );
          
          if (existingReservedSlot) {
            console.log(`Preskačem termin ${template.from}-${template.to} jer je već rezervisan`);
            continue; // Ne kreiraj novi termin ako je već rezervisan
          }
          
          await Slot.create({
            playgroundId: playgroundId,
            date: date,
            timeFrom: template.from,
            timeTo: template.to,
            isReserved: false,
            isTemporarilyReserved: false
          });
          console.log(`Kreiran novi termin: ${template.from}-${template.to} za ${date}`);
        }
      }
    }
    
    console.log('Uspešno ažurirani postojeći termini');
    
    // Emituj event da se osveže Flutter aplikacija
    // Ovo će biti implementirano kroz WebSocket ili polling
    console.log('Emitovan event za osvežavanje termina za playground:', playgroundId);
    
  } catch (error) {
    console.error('Greška pri ažuriranju postojećih termina:', error);
    throw error;
  }
} 

// Svi mogu da vide sve igraonice
router.get('/', async (req, res) => {
  try {
    const { city } = req.query;
    let whereClause = {};
    
    if (city && city !== 'Svi gradovi') {
      whereClause.city = city;
    }
    
    const playgrounds = await Playground.findAll({ 
      where: whereClause,
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }] 
    });
    res.json(playgrounds);
  } catch (err) {
    console.error('Greška GET /playgrounds:', err);
    res.status(500).json({ error: err.message, details: err });
  }
});

// Moje igraonice (samo vlasnik)
router.get('/my', auth, async (req, res) => {
  try {
    if (req.user.type !== 'owner') return res.status(403).json({ message: 'Samo vlasnici mogu videti svoje igraonice.' });
    const playgrounds = await Playground.findAll({ where: { ownerId: req.user.id } });
    console.log('USER ID:', req.user.id, 'TYPE:', req.user.type);
    console.log('PLAYGROUNDS:', playgrounds);
    res.json(playgrounds);
  } catch (err) {
    console.error('Greška GET /playgrounds/my:', err);
    res.status(500).json({ error: err.message, details: err });
  }
});

// Endpoint za dobijanje liste gradova
router.get('/cities', async (req, res) => {
  try {
    const cities = await Playground.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('city')), 'city']],
      raw: true
    });
    const cityList = cities.map(item => item.city).filter(city => city);
    res.json(cityList);
  } catch (err) {
    console.error('Greška GET /playgrounds/cities:', err);
    res.status(500).json({ error: err.message, details: err });
  }
});

// Detalji igraonice
router.get('/:id', async (req, res) => {
  try {
    const playground = await Playground.findByPk(req.params.id, { include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }] });
    if (!playground) return res.status(404).json({ message: 'Igraonica nije pronađena.' });
    res.json(playground);
  } catch (err) {
    console.error('Greška GET /playgrounds/:id:', err);
    res.status(500).json({ error: err.message, details: err });
  }
});

// Kreiranje igraonice (samo vlasnik)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.type !== 'owner') return res.status(403).json({ message: 'Samo vlasnici mogu dodavati igraonice.' });
    const { name, description, images, location, city, prices, capacity, price, slotDuration, slotTemplates, latitude, longitude, phone } = req.body;
    const playground = await Playground.create({
      name, description, images, location, city, prices, capacity, price, slotDuration, ownerId: req.user.id, slotTemplates, latitude, longitude, phone
    });

    // Automatsko kreiranje slotova za celu godinu
    if (Array.isArray(slotTemplates) && slotTemplates.length > 0) {
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().slice(0, 10);
        for (const t of slotTemplates) {
          if (t.from && t.to) {
            await Slot.create({
              playgroundId: playground.id,
              date: dateStr,
              timeFrom: t.from,
              timeTo: t.to,
              isReserved: false
            });
          }
        }
      }
    }

    res.status(201).json(playground);
  } catch (err) {
    console.error('Greška POST /playgrounds:', err);
    res.status(500).json({ error: err.message, details: err });
  }
});

// Dodavanje slika igraonici (Cloudinary URL-ovi)
router.post('/:id/images', async (req, res) => {
  const { images, logo } = req.body;
  try {
    const playground = await Playground.findByPk(req.params.id);
    if (!playground) return res.status(404).json({ message: 'Igraonica nije pronađena.' });
    if (images) {
      let currentImages = Array.isArray(playground.images) ? playground.images : [];
      playground.images = [...currentImages, ...images];
    }
    if (logo) {
      playground.logo = logo;
    }
    await playground.save();
    res.json({ success: true, images: playground.images, logo: playground.logo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Izmena igraonice (samo vlasnik)
router.put('/:id', auth, async (req, res) => {
  try {
    const playground = await Playground.findByPk(req.params.id);
    if (!playground) return res.status(404).json({ message: 'Igraonica nije pronađena.' });
    if (playground.ownerId !== req.user.id) return res.status(403).json({ message: 'Nije dozvoljeno.' });
    
    // Sačuvaj stare slotTemplates za poređenje
    const oldSlotTemplates = playground.slotTemplates;
    
    Object.assign(playground, req.body);
    await playground.save();
    
    // Ako su se slotTemplates promenili, ažuriraj postojeće termine
    if (req.body.slotTemplates && JSON.stringify(oldSlotTemplates) !== JSON.stringify(req.body.slotTemplates)) {
      console.log('SlotTemplates su se promenili, ažuriram postojeće termine...');
      console.log('Stari slotTemplates:', oldSlotTemplates);
      console.log('Novi slotTemplates:', req.body.slotTemplates);
      await updateExistingSlots(playground.id, req.body.slotTemplates);
    } else {
      console.log('SlotTemplates se nisu promenili ili nisu poslati');
    }
    
    res.json(playground);
  } catch (err) {
    console.error('Greška PUT /playgrounds/:id:', err);
    res.status(500).json({ error: err.message, details: err });
  }
});

// Brisanje slike ili logoa (samo vlasnik)
router.put('/:id/images', auth, async (req, res) => {
  try {
    const playground = await Playground.findByPk(req.params.id);
    if (!playground) return res.status(404).json({ message: 'Igraonica nije pronađena.' });
    if (playground.ownerId !== req.user.id) return res.status(403).json({ message: 'Nije dozvoljeno.' });
    let changed = false;
    if (req.body.removeImage) {
      let currentImages = Array.isArray(playground.images) ? playground.images : [];
      playground.images = currentImages.filter(img => img !== req.body.removeImage);
      changed = true;
    }
    if (req.body.removeLogo) {
      playground.logo = null;
      changed = true;
    }
    if (changed) {
      await playground.save();
    }
    res.json({ success: true, images: playground.images, logo: playground.logo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Brisanje igraonice (samo vlasnik)
router.delete('/:id', auth, async (req, res) => {
  try {
    const playground = await Playground.findByPk(req.params.id);
    if (!playground) return res.status(404).json({ message: 'Igraonica nije pronađena.' });
    if (playground.ownerId !== req.user.id) return res.status(403).json({ message: 'Nije dozvoljeno.' });
    await playground.destroy();
    res.json({ message: 'Igraonica obrisana.' });
  } catch (err) {
    console.error('Greška DELETE /playgrounds/:id:', err);
    res.status(500).json({ error: err.message, details: err });
  }
});

// Test endpoint
router.get('/test', async (req, res) => {
  res.json({ message: 'Backend radi!', time: new Date().toISOString() });
});

// Endpoint za proveru da li su se termini ažurirali
router.get('/:id/slots-updated', async (req, res) => {
  try {
    const playground = await Playground.findByPk(req.params.id);
    if (!playground) return res.status(404).json({ message: 'Igraonica nije pronađena.' });
    
    // Vrati informaciju o poslednjem ažuriranju
    res.json({ 
      lastUpdated: playground.updatedAt,
      playgroundId: playground.id 
    });
  } catch (err) {
    console.error('Greška GET /playgrounds/:id/slots-updated:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint za ručno ažuriranje termina
router.post('/:id/update-slots', async (req, res) => {
  try {
    const playground = await Playground.findByPk(req.params.id);
    if (!playground) return res.status(404).json({ message: 'Igraonica nije pronađena.' });
    
    console.log('Ručno ažuriranje termina za playground:', req.params.id);
    console.log('Trenutni slotTemplates:', playground.slotTemplates);
    
    if (playground.slotTemplates && playground.slotTemplates.length > 0) {
      await updateExistingSlots(playground.id, playground.slotTemplates);
      res.json({ message: 'Termini su uspešno ažurirani.' });
    } else {
      res.json({ message: 'Nema slotTemplates za ažuriranje.' });
    }
  } catch (err) {
    console.error('Greška POST /playgrounds/:id/update-slots:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 