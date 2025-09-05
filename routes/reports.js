const express = require('express');
const Event = require('../models/Event');
const CheckIn = require('../models/CheckIn');
const Report = require('../models/Report');
const router = express.Router();

// Middleware to check if user is supervisor
const requireSupervisor = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'supervisor') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

router.get('/', requireSupervisor, async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('eventId')
      .sort({ createdAt: -1 });
    
    res.render('reports/index', {
      title: 'Reports - E-BANDOBAST',
      user: req.session.user,
      reports
    });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).send('Server Error');
  }
});

router.post('/events/:id/report', requireSupervisor, async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Get all check-ins for the event
    const checkIns = await CheckIn.find({ eventId });
    
    // Generate AI-based performance summary
    const officerPerformance = await generateOfficerPerformance(event, checkIns);
    const summary = await generateAISummary(event, officerPerformance);
    
    const report = new Report({
      eventId,
      summary,
      officerPerformance
    });
    
    await report.save();
    
    res.json({ success: true, report });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// AI function to generate performance summary
async function generateAISummary(event, officerPerformance) {
  try {
    // Simplified AI summary generation
    const totalOfficers = event.officers.length;
    const presentOfficers = officerPerformance.filter(p => p.attendance).length;
    const totalIdleAlerts = officerPerformance.reduce((sum, p) => sum + p.idleAlerts, 0);
    const totalZoneViolations = officerPerformance.reduce((sum, p) => sum + p.zoneViolations, 0);
    
    return `Event Summary for ${event.name}:
    - Total Officers Assigned: ${totalOfficers}
    - Officers Present: ${presentOfficers}
    - Attendance Rate: ${((presentOfficers/totalOfficers)*100).toFixed(1)}%
    - Total Idle Alerts: ${totalIdleAlerts}
    - Total Zone Violations: ${totalZoneViolations}
    - Overall Performance: ${totalIdleAlerts < 5 && totalZoneViolations < 3 ? 'Excellent' : 'Needs Improvement'}`;
  } catch (error) {
    console.error('AI summary error:', error);
    return 'Summary generation failed';
  }
}

async function generateOfficerPerformance(event, checkIns) {
  const performance = [];
  
  for (const officerId of event.officers) {
    const officerCheckIns = checkIns.filter(c => c.officerId === officerId);
    const attendance = officerCheckIns.length > 0;
    const idleAlerts = officerCheckIns.filter(c => c.status === 'idle').length;
    const zoneViolations = officerCheckIns.filter(c => c.status === 'out-of-zone').length;
    
    performance.push({
      officerId,
      attendance,
      idleAlerts,
      zoneViolations
    });
  }
  
  return performance;
}

module.exports = router;