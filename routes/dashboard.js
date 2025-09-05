const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
const HolidayRequest = require('../models/HolidayRequest');
const router = express.Router();

// Middleware to check if user is supervisor
const requireSupervisor = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'supervisor') {
    return res.redirect('/auth/login');
  }
  next();
};

router.get('/', requireSupervisor, async (req, res) => {
  try {
    const events = await Event.find({ supervisorId: req.session.user.id })
      .sort({ createdAt: -1 })
      .limit(10);
    
    const pendingHolidays = await HolidayRequest.find({ status: 'pending' })
      .populate('eventId')
      .limit(5);
    
    const officers = await User.find({ role: 'officer' }).limit(10);
    
    res.render('dashboard/index', {
      title: 'Supervisor Dashboard - E-BANDOBAST',
      user: req.session.user,
      events,
      pendingHolidays,
      officers
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;