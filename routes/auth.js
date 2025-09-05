const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const User = require('../models/User');
const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Login - E-BANDOBAST' });
});

router.post('/google-login', async (req, res) => {
  try {
    const { token } = req.body;
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Find or create user in MongoDB
    let dbUser = await User.findOne({ email: user.email });
    
    if (!dbUser) {
      // Create new user with default role as officer
      dbUser = new User({
        id: user.id,
        role: 'officer', // Default role
        name: user.user_metadata.full_name || user.email,
        email: user.email,
        phone: user.phone || ''
      });
      await dbUser.save();
    }

    // Store user in session
    req.session.user = dbUser;

    // Redirect based on role
    const redirectUrl = dbUser.role === 'supervisor' ? '/dashboard' : '/officers/duty-panel';
    
    res.json({ 
      success: true, 
      user: dbUser,
      redirectUrl 
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

module.exports = router;