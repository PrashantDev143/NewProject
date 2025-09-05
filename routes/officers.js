const express = require('express');
const multer = require('multer');
const Event = require('../models/Event');
const CheckIn = require('../models/CheckIn');
const HolidayRequest = require('../models/HolidayRequest');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  next();
};

router.get('/duty-panel', requireAuth, async (req, res) => {
  try {
    const events = await Event.find({
      officers: req.session.user.id,
      status: { $in: ['upcoming', 'active'] }
    }).sort({ date: 1 });
    
    const recentCheckIns = await CheckIn.find({
      officerId: req.session.user.id
    }).sort({ timestamp: -1 }).limit(5);
    
    res.render('officers/duty-panel', {
      title: 'Duty Panel - E-BANDOBAST',
      user: req.session.user,
      events,
      recentCheckIns
    });
  } catch (error) {
    console.error('Duty panel error:', error);
    res.status(500).send('Server Error');
  }
});

router.post('/:id/checkin', requireAuth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const officerId = req.session.user.id;
    
    const checkIn = new CheckIn({
      officerId,
      eventId: req.params.id,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      status: 'active'
    });
    
    await checkIn.save();
    
    // Emit location update via Socket.IO
    req.io.to(req.params.id).emit('officer-location', {
      officerId,
      location: checkIn.location,
      timestamp: checkIn.timestamp,
      status: checkIn.status
    });
    
    res.json({ success: true, checkIn });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Check-in failed' });
  }
});

router.post('/:id/holiday', requireAuth, upload.single('proofFile'), async (req, res) => {
  try {
    const { reason } = req.body;
    
    const holidayRequest = new HolidayRequest({
      officerId: req.session.user.id,
      eventId: req.params.id,
      reason,
      proofFile: req.file ? req.file.filename : null
    });
    
    await holidayRequest.save();
    res.json({ success: true, request: holidayRequest });
  } catch (error) {
    console.error('Holiday request error:', error);
    res.status(500).json({ error: 'Failed to submit holiday request' });
  }
});

module.exports = router;