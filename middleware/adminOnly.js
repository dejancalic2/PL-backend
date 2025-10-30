const { User } = require('../models');

async function adminOnly(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Nema korisnika u tokenu.' });
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'termino.igraonice@gmail.com';
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(401).json({ message: 'Korisnik nije pronađen.' });
    }

    if (user.email === adminEmail || user.type === 'admin') {
      return next();
    }

    return res.status(403).json({ message: 'Samo administrator ima pristup.' });
  } catch (err) {
    return res.status(500).json({ message: 'Greška pri proveri admin privilegija.' });
  }
}

module.exports = adminOnly;


