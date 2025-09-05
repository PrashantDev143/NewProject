const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const Event = require('../models/Event');
const User = require('../models/User');
const CheckIn = require('../models/CheckIn');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

// Middleware to check if user is supervisor
const requireSupervisor = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'supervisor') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

router.post('/', requireSupervisor, async (req, res) => {
  try {
    const { name, date, time, latitude, longitude, officers } = req.body;
    
    const event = new Event({
      name,
      date: new Date(date),
      time,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      supervisorId: req.session.user.id,
      officers: officers || []
    });
    
    await event.save();
    res.json({ success: true, event });
  } catch (error) {
    console.error('Event creation error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

router.get('/', requireSupervisor, async (req, res) => {
  try {
    const events = await Event.find({ supervisorId: req.session.user.id })
      .sort({ createdAt: -1 });
    res.json({ events });
  } catch (error) {
    console.error('Events fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.post('/:id/upload', requireSupervisor, upload.single('excel'), async (req, res) => {
  try {
    const eventId = req.params.id;
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const officers = xlsx.utils.sheet_to_json(worksheet);
    
    // Extract officer IDs from Excel data
    const officerIds = officers.map(officer => officer.officerId || officer.id).filter(Boolean);
    
    // Check for duplicates using AI (simplified implementation)
    const duplicates = await detectDuplicateOfficers(officerIds, eventId);
    
    if (duplicates.length > 0) {
      return res.json({ 
        success: false, 
        error: 'Duplicate officers detected',
        duplicates 
      });
    }
    
    // Update event with officer assignments
    await Event.findByIdAndUpdate(eventId, { 
      officers: officerIds 
    });
    
    res.json({ 
      success: true, 
      message: `${officerIds.length} officers assigned successfully` 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload officers' });
  }
});

router.get('/:id/monitor', requireSupervisor, async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).send('Event not found');
    }
    
    const checkIns = await CheckIn.find({ eventId })
      .sort({ timestamp: -1 });
    
    res.render('events/monitor', {
      title: `Monitor ${event.name} - E-BANDOBAST`,
      user: req.session.user,
      event,
      checkIns
    });
  } catch (error) {
    console.error('Monitor error:', error);
    res.status(500).send('Server Error');
  }
});

// AI function to detect duplicate officers
async function detectDuplicateOfficers(officerIds, eventId) {
  try {
    // Check if any officers are already assigned to other active events
    const activeEvents = await Event.find({
      _id: { $ne: eventId },
      status: { $in: ['upcoming', 'active'] },
      officers: { $in: officerIds }
    });
    
    const duplicates = [];
    for (const event of activeEvents) {
      const conflictingOfficers = event.officers.filter(id => officerIds.includes(id));
      if (conflictingOfficers.length > 0) {
        duplicates.push({
          eventName: event.name,
          officers: conflictingOfficers
        });
      }
    }
    
    return duplicates;
  } catch (error) {
    console.error('Duplicate detection error:', error);
    return [];
  }
}

module.exports = router;