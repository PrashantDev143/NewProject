// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        if (req.xhr || req.headers.accept?.includes('json')) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        return res.redirect('/auth/login');
    }
    next();
};

const requireSupervisor = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'supervisor') {
        if (req.xhr || req.headers.accept?.includes('json')) {
            return res.status(403).json({ error: 'Supervisor access required' });
        }
        return res.redirect('/auth/login');
    }
    next();
};

const requireOfficer = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'officer') {
        if (req.xhr || req.headers.accept?.includes('json')) {
            return res.status(403).json({ error: 'Officer access required' });
        }
        return res.redirect('/auth/login');
    }
    next();
};

module.exports = {
    requireAuth,
    requireSupervisor,
    requireOfficer
};