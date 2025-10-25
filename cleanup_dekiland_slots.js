require('dotenv').config();
const { Slot, Playground } = require('./models');

async function cleanupDekilandSlots() {
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
      console.error('❌ Dekiland playground ili slotTemplates nisu pronađeni');
      return;
    }
    
    console.log('📋 SlotTemplates za Dekiland:', playground.slotTemplates);
    
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
    console.log(`📅 Termini kreirani od ${today.toISOString().slice(0, 10)} do ${thirtyDaysFromNow.toISOString().slice(0, 10)}`);
    
    // 3. Proveri da li su slotovi kreirani
    const newSlots = await Slot.findAll({
      where: { playgroundId: 5 },
      order: [['date', 'ASC'], ['timeFrom', 'ASC']],
      limit: 5
    });
    
    console.log('🔍 Prvih 5 novih slotova:');
    newSlots.forEach(slot => {
      console.log(`   ${slot.date} ${slot.timeFrom}-${slot.timeTo}`);
    });
    
  } catch (error) {
    console.error('❌ Greška pri čišćenju Dekiland slotova:', error);
  } finally {
    process.exit(0);
  }
}

cleanupDekilandSlots();
