const express = require('express');
const { Notification } = require('../models');
const auth = require('../middleware/auth');
const router = express.Router();

// Povuci sve AKTIVNE notifikacije za korisnika (vlasnika ili obicnog korisnika)
router.get('/my', auth, async (req, res) => {
  // Svi korisnici mogu videti svoje notifikacije (ne samo vlasnici)
  // Vraćamo samo neobrisane notifikacije (isDeleted: false)
  const notifications = await Notification.findAll({
    where: { 
      ownerId: req.user.id,
      isDeleted: false  // Samo aktivne (neobrisane) notifikacije
    },
    order: [['createdAt', 'DESC']],
    attributes: ['id', 'ownerId', 'message', 'seen', 'createdAt', 'updatedAt', 'reservationId', 'isDeleted']
  });
  res.json(notifications);
});

// Označi notifikaciju kao pročitanu
router.post('/seen/:id', auth, async (req, res) => {
  const notification = await Notification.findByPk(req.params.id);
  if (!notification || notification.ownerId !== req.user.id) return res.status(404).json({ message: 'Notifikacija nije pronađena.' });
  notification.seen = true;
  await notification.save();
  res.json({ message: 'Notifikacija označena kao pročitana.' });
});

// Soft delete notifikacije (samo sakrij iz prikaza, ostavi u bazi)
router.delete('/:id', auth, async (req, res) => {
  const notification = await Notification.findByPk(req.params.id);
  if (!notification || notification.ownerId !== req.user.id) {
    return res.status(404).json({ message: 'Notifikacija nije pronađena.' });
  }
  
  // Proveri da li je već obrisana
  if (notification.isDeleted) {
    return res.status(400).json({ message: 'Notifikacija je već obrisana.' });
  }
  
  // Soft delete - samo označi kao obrisanu, NE briši fizički
  notification.isDeleted = true;
  await notification.save();
  
  console.log(`Notifikacija ${req.params.id} soft deleted za korisnika ${req.user.id}`);
  res.json({ message: 'Notifikacija uklonjena iz prikaza.' });
});

// Povuci SVE notifikacije (uključujući obrisane) - za vlasnika/admina (praćenje i statistika)
router.get('/all', auth, async (req, res) => {
  try {
    // Samo vlasnici mogu videti sve notifikacije (uključujući obrisane)
    if (req.user.type !== 'owner') {
      return res.status(403).json({ message: 'Samo vlasnici mogu videti sve notifikacije.' });
    }
    
    const notifications = await Notification.findAll({
      where: { ownerId: req.user.id },
      // Ne filtriramo po isDeleted - vraćamo SVE
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'ownerId', 'message', 'seen', 'createdAt', 'updatedAt', 'reservationId', 'isDeleted']
    });
    
    // Dodaj statistiku
    const stats = {
      total: notifications.length,
      active: notifications.filter(n => !n.isDeleted).length,
      deleted: notifications.filter(n => n.isDeleted).length,
      unseen: notifications.filter(n => !n.seen && !n.isDeleted).length
    };
    
    res.json({ 
      notifications,
      stats 
    });
  } catch (error) {
    console.error('Greška pri dohvatanju svih notifikacija:', error);
    res.status(500).json({ 
      message: 'Greška pri dohvatanju notifikacija.',
      error: error.message 
    });
  }
});

// Soft delete svih obrađenih notifikacija (odobrene ili odbijene rezervacije)
router.delete('/processed/all', auth, async (req, res) => {
  try {
    if (req.user.type !== 'owner') {
      return res.status(403).json({ message: 'Samo vlasnici mogu brisati notifikacije.' });
    }
    
    const { Reservation } = require('../models');
    const { Op } = require('sequelize');
    
    // Prvo pronađi sve AKTIVNE notifikacije koje imaju reservationId
    const allNotifications = await Notification.findAll({
      where: { 
        ownerId: req.user.id,
        reservationId: { [Op.not]: null },
        isDeleted: false  // Samo aktivne notifikacije
      }
    });
    
    console.log(`Pronađeno ${allNotifications.length} aktivnih notifikacija sa reservationId`);
    
    // Zatim proveri koje od njih imaju obrađene rezervacije
    const notificationsToDelete = [];
    
    for (const notification of allNotifications) {
      try {
        const reservation = await Reservation.findByPk(notification.reservationId);
        if (reservation && (reservation.status === 'approved' || reservation.status === 'rejected')) {
          notificationsToDelete.push(notification);
        }
      } catch (error) {
        console.log(`Greška pri proveri rezervacije ${notification.reservationId}:`, error.message);
        // Nastavi sa ostalima
      }
    }
    
    console.log(`Pronađeno ${notificationsToDelete.length} notifikacija za brisanje`);
    
    // Soft delete pronađenih notifikacija (ne briši fizički, samo označi)
    const deletedCount = notificationsToDelete.length;
    for (const notification of notificationsToDelete) {
      notification.isDeleted = true;
      await notification.save();
    }
    
    res.json({ 
      message: `Obrisano je ${deletedCount} obrađenih notifikacija.`,
      deletedCount: deletedCount
    });
    
  } catch (error) {
    console.error('Greška pri brisanju obrađenih notifikacija:', error);
    res.status(500).json({ 
      message: 'Greška pri brisanju notifikacija.',
      error: error.message 
    });
  }
});

module.exports = router; 