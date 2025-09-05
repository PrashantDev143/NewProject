const twilio = require('twilio');

// Initialize Twilio client
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

class NotificationService {
    // Send SMS notification
    static async sendSMS(to, message) {
        try {
            if (!process.env.TWILIO_PHONE_NUMBER) {
                console.warn('Twilio phone number not configured');
                return false;
            }

            const result = await client.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: to
            });

            console.log(`SMS sent successfully: ${result.sid}`);
            return true;
        } catch (error) {
            console.error('SMS sending failed:', error);
            return false;
        }
    }

    // Make voice call
    static async makeCall(to, message) {
        try {
            if (!process.env.TWILIO_PHONE_NUMBER) {
                console.warn('Twilio phone number not configured');
                return false;
            }

            const twiml = `
                <Response>
                    <Say voice="alice">${message}</Say>
                    <Say voice="alice">Please acknowledge by pressing any key.</Say>
                    <Gather numDigits="1" timeout="10">
                        <Say voice="alice">Press any key to confirm.</Say>
                    </Gather>
                </Response>
            `;

            const result = await client.calls.create({
                twiml: twiml,
                to: to,
                from: process.env.TWILIO_PHONE_NUMBER
            });

            console.log(`Call initiated successfully: ${result.sid}`);
            return true;
        } catch (error) {
            console.error('Call initiation failed:', error);
            return false;
        }
    }

    // Send push notification
    static async sendPushNotification(userId, title, body, data = {}) {
        try {
            // This would integrate with a push notification service like Firebase Cloud Messaging
            // For now, we'll simulate the functionality
            console.log(`Push notification for user ${userId}:`, { title, body, data });
            
            // In a real implementation, you would:
            // 1. Store user push tokens in the database
            // 2. Use FCM or similar service to send notifications
            // 3. Handle notification delivery status
            
            return true;
        } catch (error) {
            console.error('Push notification failed:', error);
            return false;
        }
    }

    // Send idle alert
    static async sendIdleAlert(officer) {
        const message = `ALERT: Officer ${officer.name} (${officer.id}) has been idle for more than 10 minutes. Please check status immediately.`;
        
        const promises = [
            this.sendSMS(officer.phone, message),
            this.sendPushNotification(officer.id, 'Idle Alert', message),
        ];

        // If critical, also make a call
        if (officer.criticalRole) {
            promises.push(this.makeCall(officer.phone, message));
        }

        const results = await Promise.allSettled(promises);
        return results.some(result => result.status === 'fulfilled' && result.value);
    }

    // Send zone violation alert
    static async sendZoneViolationAlert(officer, event) {
        const message = `ALERT: Officer ${officer.name} (${officer.id}) has left the designated zone for event "${event.name}". Immediate attention required.`;
        
        const promises = [
            this.sendSMS(officer.phone, message),
            this.sendPushNotification(officer.id, 'Zone Violation', message),
            this.makeCall(officer.phone, message) // Zone violations are critical
        ];

        const results = await Promise.allSettled(promises);
        return results.some(result => result.status === 'fulfilled' && result.value);
    }

    // Send event start notification
    static async sendEventStartNotification(officers, event) {
        const message = `EVENT STARTED: "${event.name}" has begun. Please check in at your assigned location. Time: ${event.time}`;
        
        const promises = officers.map(officer => 
            Promise.allSettled([
                this.sendSMS(officer.phone, message),
                this.sendPushNotification(officer.id, 'Event Started', message)
            ])
        );

        await Promise.all(promises);
        console.log(`Event start notifications sent to ${officers.length} officers`);
    }

    // Send holiday request notification to supervisor
    static async sendHolidayRequestNotification(supervisor, officer, event) {
        const message = `HOLIDAY REQUEST: Officer ${officer.name} (${officer.id}) has requested holiday for event "${event.name}". Please review and approve/reject.`;
        
        const promises = [
            this.sendSMS(supervisor.phone, message),
            this.sendPushNotification(supervisor.id, 'Holiday Request', message)
        ];

        const results = await Promise.allSettled(promises);
        return results.some(result => result.status === 'fulfilled' && result.value);
    }

    // Send emergency alert
    static async sendEmergencyAlert(recipients, message, location) {
        const emergencyMessage = `🚨 EMERGENCY ALERT: ${message}. Location: ${location.address || `${location.latitude}, ${location.longitude}`}. Respond immediately.`;
        
        const promises = recipients.map(recipient => 
            Promise.allSettled([
                this.sendSMS(recipient.phone, emergencyMessage),
                this.makeCall(recipient.phone, emergencyMessage),
                this.sendPushNotification(recipient.id, 'EMERGENCY', emergencyMessage)
            ])
        );

        await Promise.all(promises);
        console.log(`Emergency alerts sent to ${recipients.length} recipients`);
    }
}

module.exports = NotificationService;