const express = require('express');
const { Notification } = require('../models');
const auth = require('../middleware/auth');
const router = express.Router();

// Povuci sve notifikacije za owner-a
router.get('/my', auth, async (req, res) => {
  if (req.user.type !== 'owner') return res.status(403).json({ message: 'Samo vlasnici mogu videti notifikacije.' });
  const notifications = await Notification.findAll({
    where: { ownerId: req.user.id },
    order: [['createdAt', 'DESC']],
    attributes: ['id', 'ownerId', 'message', 'seen', 'createdAt', 'updatedAt', 'reservationId']
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

// Obriši notifikaciju
router.delete('/:id', auth, async (req, res) => {
  const notification = await Notification.findByPk(req.params.id);
  if (!notification || notification.ownerId !== req.user.id) {
    return res.status(404).json({ message: 'Notifikacija nije pronađena.' });
  }
  await notification.destroy();
  res.json({ message: 'Notifikacija obrisana.' });
});

// Obriši sve obrađene notifikacije (odobrene ili odbijene rezervacije)
router.delete('/processed/all', auth, async (req, res) => {
  try {
    if (req.user.type !== 'owner') {
      return res.status(403).json({ message: 'Samo vlasnici mogu brisati notifikacije.' });
    }
    
    const { Reservation } = require('../models');
    const { Op } = require('sequelize');
    
    // Prvo pronađi sve notifikacije koje imaju reservationId
    const allNotifications = await Notification.findAll({
      where: { 
        ownerId: req.user.id,
        reservationId: { [Op.not]: null }
      }
    });
    
    console.log(`Pronađeno ${allNotifications.length} notifikacija sa reservationId`);
    
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
    
    // Obriši pronađene notifikacije
    const deletedCount = notificationsToDelete.length;
    for (const notification of notificationsToDelete) {
      await notification.destroy();
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