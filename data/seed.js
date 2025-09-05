const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const CheckIn = require('../models/CheckIn');
require('dotenv').config();

async function seedData() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/police-deployment');
        console.log('Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Event.deleteMany({});
        await CheckIn.deleteMany({});
        console.log('Cleared existing data');

        // Create sample users
        const users = [
            {
                id: 'supervisor-001',
                role: 'supervisor',
                name: 'John Smith',
                email: 'supervisor@example.com',
                phone: '+1234567890'
            },
            {
                id: 'officer-001',
                role: 'officer',
                name: 'Michael Johnson',
                email: 'officer1@example.com',
                phone: '+1234567891'
            },
            {
                id: 'officer-002',
                role: 'officer',
                name: 'Sarah Williams',
                email: 'officer2@example.com',
                phone: '+1234567892'
            },
            {
                id: 'officer-003',
                role: 'officer',
                name: 'David Brown',
                email: 'officer3@example.com',
                phone: '+1234567893'
            },
            {
                id: 'officer-004',
                role: 'officer',
                name: 'Emily Davis',
                email: 'officer4@example.com',
                phone: '+1234567894'
            },
            {
                id: 'officer-005',
                role: 'officer',
                name: 'Robert Wilson',
                email: 'officer5@example.com',
                phone: '+1234567895'
            }
        ];

        await User.insertMany(users);
        console.log('Created sample users');

        // Create sample events
        const events = [
            {
                name: 'Downtown Festival Security',
                date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
                time: '10:00',
                location: {
                    type: 'Point',
                    coordinates: [-74.006, 40.7128] // New York City coordinates
                },
                supervisorId: 'supervisor-001',
                officers: ['officer-001', 'officer-002', 'officer-003'],
                status: 'upcoming'
            },
            {
                name: 'Stadium Event Coverage',
                date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
                time: '18:00',
                location: {
                    type: 'Point',
                    coordinates: [-74.016, 40.7282]
                },
                supervisorId: 'supervisor-001',
                officers: ['officer-004', 'officer-005'],
                status: 'upcoming'
            },
            {
                name: 'VIP Protection Detail',
                date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
                time: '14:00',
                location: {
                    type: 'Point',
                    coordinates: [-73.985, 40.7589]
                },
                supervisorId: 'supervisor-001',
                officers: ['officer-001', 'officer-003', 'officer-005'],
                status: 'completed'
            }
        ];

        const createdEvents = await Event.insertMany(events);
        console.log('Created sample events');

        // Create sample check-ins for the completed event
        const completedEvent = createdEvents.find(e => e.status === 'completed');
        const checkIns = [
            {
                officerId: 'officer-001',
                eventId: completedEvent._id,
                timestamp: new Date(completedEvent.date.getTime() + 60 * 60 * 1000), // 1 hour after event start
                location: {
                    type: 'Point',
                    coordinates: [-73.985, 40.7589]
                },
                status: 'active'
            },
            {
                officerId: 'officer-003',
                eventId: completedEvent._id,
                timestamp: new Date(completedEvent.date.getTime() + 90 * 60 * 1000), // 1.5 hours after event start
                location: {
                    type: 'Point',
                    coordinates: [-73.984, 40.7590]
                },
                status: 'active'
            },
            {
                officerId: 'officer-005',
                eventId: completedEvent._id,
                timestamp: new Date(completedEvent.date.getTime() + 120 * 60 * 1000), // 2 hours after event start
                location: {
                    type: 'Point',
                    coordinates: [-73.986, 40.7588]
                },
                status: 'idle'
            }
        ];

        await CheckIn.insertMany(checkIns);
        console.log('Created sample check-ins');

        console.log('Seed data created successfully!');
        console.log('\nDemo Accounts:');
        console.log('Supervisor: supervisor@example.com');
        console.log('Officer: officer1@example.com');
        console.log('\nNote: Update your .env file with proper Supabase credentials for Google OAuth');

    } catch (error) {
        console.error('Seed data creation failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run seed script
if (require.main === module) {
    seedData();
}

module.exports = seedData;