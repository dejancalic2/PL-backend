const express = require('express');
const { Slot, Playground, User, Reservation } = require('../models');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const router = express.Router();

// SVE admin rute zaštićene
router.use(auth, adminOnly);

// Osnovni pregled stanja (brojači)
router.get('/overview', async (req, res) => {
  try {
    const [users, playgrounds, reservations, slots] = await Promise.all([
      User.count(),
      Playground.count(),
      Reservation.count(),
      Slot.count(),
    ]);
    res.json({ users, playgrounds, reservations, slots });
  } catch (error) {
    res.status(500).json({ message: 'Greška pri dohvatanju pregleda', error: error.message });
  }
});

// Admin endpoint za čišćenje slotova za Dekiland
router.post('/cleanup-dekiland-slots', async (req, res) => {
  try {
    console.log('🔧 Počinje čišćenje Dekiland slotova...');
    
    // 1. Obriši sve postojeće slotove za Dekiland (playground ID 5)
    const deletedCount = await Slot.destroy({
      where: { playgroundId: 5 }
    });
    
    console.log(`🗑️  Obrisano ${deletedCount} postojećih slotova za Dekiland`);
    
    // 2. Kreiraj nove slotove za sledećih 30 dana
    const playground = await Playground.findByPk(5);
    if (!playground || !playground.slotTemplates) {
      return res.status(404).json({ message: 'Dekiland playground ili slotTemplates nisu pronađeni' });
    }
    
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    let createdCount = 0;
    
    for (let d = new Date(today); d <= thirtyDaysFromNow; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      
      for (const template of playground.slotTemplates) {
        if (template.from && template.to) {
          await Slot.create({
            playgroundId: 5,
            date: dateStr,
            timeFrom: template.from,
            timeTo: template.to,
            isReserved: false,
            isTemporarilyReserved: false,
            isDisabled: false
          });
          createdCount++;
        }
      }
    }
    
    console.log(`✅ Kreirano ${createdCount} novih slotova za Dekiland`);
    
    res.json({
      success: true,
      message: 'Dekiland slotovi su uspešno očišćeni',
      deletedCount,
      createdCount
    });
    
  } catch (error) {
    console.error('❌ Greška pri čišćenju Dekiland slotova:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri čišćenju slotova',
      error: error.message
    });
  }
});

module.exports = router;
