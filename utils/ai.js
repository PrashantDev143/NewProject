class AIService {
    // Detect duplicate officer assignments using AI
    static async detectDuplicateOfficers(officerIds, eventId, eventDate) {
        try {
            // This would integrate with a real AI service like OpenAI, Google AI, etc.
            // For now, we'll implement a rule-based system
            
            const Event = require('../models/Event');
            const duplicates = [];
            
            // Check for conflicts with other events on the same date
            const conflictingEvents = await Event.find({
                _id: { $ne: eventId },
                date: {
                    $gte: new Date(eventDate).setHours(0, 0, 0, 0),
                    $lt: new Date(eventDate).setHours(23, 59, 59, 999)
                },
                status: { $in: ['upcoming', 'active'] },
                officers: { $in: officerIds }
            });
            
            for (const event of conflictingEvents) {
                const conflictingOfficers = event.officers.filter(id => officerIds.includes(id));
                if (conflictingOfficers.length > 0) {
                    duplicates.push({
                        type: 'schedule_conflict',
                        eventId: event._id,
                        eventName: event.name,
                        conflictingOfficers,
                        severity: 'high',
                        suggestion: `Officers ${conflictingOfficers.join(', ')} are already assigned to "${event.name}" on the same date.`
                    });
                }
            }
            
            // AI-based analysis for optimal officer distribution
            const analysis = await this.analyzeOfficerWorkload(officerIds, eventDate);
            if (analysis.overloadedOfficers.length > 0) {
                duplicates.push({
                    type: 'workload_warning',
                    overloadedOfficers: analysis.overloadedOfficers,
                    severity: 'medium',
                    suggestion: analysis.suggestion
                });
            }
            
            return {
                duplicates,
                recommendations: await this.getAssignmentRecommendations(officerIds, eventId)
            };
            
        } catch (error) {
            console.error('AI duplicate detection error:', error);
            return { duplicates: [], recommendations: [] };
        }
    }
    
    // Analyze officer workload
    static async analyzeOfficerWorkload(officerIds, eventDate) {
        try {
            const Event = require('../models/Event');
            const CheckIn = require('../models/CheckIn');
            
            // Get events for the past 7 days
            const pastWeek = new Date(eventDate);
            pastWeek.setDate(pastWeek.getDate() - 7);
            
            const recentEvents = await Event.find({
                date: { $gte: pastWeek, $lt: new Date(eventDate) },
                officers: { $in: officerIds }
            });
            
            const officerWorkload = {};
            const overloadedOfficers = [];
            
            // Calculate workload for each officer
            for (const officerId of officerIds) {
                const officerEvents = recentEvents.filter(event => 
                    event.officers.includes(officerId)
                );
                
                // Get check-in data for performance analysis
                const checkIns = await CheckIn.find({
                    officerId,
                    timestamp: { $gte: pastWeek }
                });
                
                const workloadScore = this.calculateWorkloadScore(officerEvents, checkIns);
                officerWorkload[officerId] = workloadScore;
                
                if (workloadScore > 0.8) { // 80% threshold
                    overloadedOfficers.push({
                        officerId,
                        score: workloadScore,
                        eventsCount: officerEvents.length
                    });
                }
            }
            
            return {
                officerWorkload,
                overloadedOfficers,
                suggestion: overloadedOfficers.length > 0 ? 
                    `Consider redistributing workload. Officers ${overloadedOfficers.map(o => o.officerId).join(', ')} may be overworked.` :
                    'Workload distribution appears balanced.'
            };
            
        } catch (error) {
            console.error('Workload analysis error:', error);
            return { officerWorkload: {}, overloadedOfficers: [], suggestion: 'Unable to analyze workload.' };
        }
    }
    
    // Calculate workload score (0-1)
    static calculateWorkloadScore(events, checkIns) {
        if (events.length === 0) return 0;
        
        const eventScore = Math.min(events.length / 5, 1); // Max 5 events per week
        const performanceScore = checkIns.length > 0 ? 
            checkIns.filter(c => c.status === 'active').length / checkIns.length : 1;
        
        return eventScore * (2 - performanceScore); // Higher score for more events and lower performance
    }
    
    // Get AI-based assignment recommendations
    static async getAssignmentRecommendations(officerIds, eventId) {
        try {
            const recommendations = [];
            
            // Recommendation 1: Optimal team size
            if (officerIds.length < 3) {
                recommendations.push({
                    type: 'team_size',
                    priority: 'medium',
                    message: 'Consider assigning at least 3 officers for better coverage and safety.'
                });
            } else if (officerIds.length > 20) {
                recommendations.push({
                    type: 'team_size',
                    priority: 'low',
                    message: 'Large team size may lead to coordination challenges. Consider splitting into smaller units.'
                });
            }
            
            // Recommendation 2: Experience mix
            const experienceAnalysis = await this.analyzeExperienceDistribution(officerIds);
            recommendations.push({
                type: 'experience',
                priority: 'medium',
                message: experienceAnalysis.recommendation
            });
            
            return recommendations;
            
        } catch (error) {
            console.error('Recommendations error:', error);
            return [];
        }
    }
    
    // Analyze experience distribution
    static async analyzeExperienceDistribution(officerIds) {
        // This would analyze officer experience levels from database
        // For now, return a generic recommendation
        return {
            recommendation: 'Ensure a good mix of experienced and junior officers for effective mentoring and coverage.',
            experienceLevels: {
                senior: 0,
                mid: 0,
                junior: 0
            }
        };
    }
    
    // Generate AI-powered performance report
    static async generatePerformanceReport(event, checkIns, officerPerformance) {
        try {
            // Analyze patterns and trends
            const analysis = {
                eventSummary: this.analyzeEventPerformance(event, checkIns),
                officerInsights: this.analyzeOfficerPerformance(officerPerformance),
                recommendations: this.generateRecommendations(event, checkIns, officerPerformance)
            };
            
            // Generate comprehensive report text
            const report = this.generateReportText(event, analysis);
            
            return report;
            
        } catch (error) {
            console.error('AI report generation error:', error);
            return this.generateFallbackReport(event, officerPerformance);
        }
    }
    
    // Analyze event performance metrics
    static analyzeEventPerformance(event, checkIns) {
        const totalOfficers = event.officers.length;
        const activeCheckIns = checkIns.filter(c => c.status === 'active').length;
        const idleCheckIns = checkIns.filter(c => c.status === 'idle').length;
        const violationCheckIns = checkIns.filter(c => c.status === 'out-of-zone').length;
        
        const attendanceRate = totalOfficers > 0 ? (activeCheckIns / totalOfficers) * 100 : 0;
        const complianceRate = checkIns.length > 0 ? (activeCheckIns / checkIns.length) * 100 : 0;
        
        return {
            attendanceRate: Math.round(attendanceRate),
            complianceRate: Math.round(complianceRate),
            totalCheckIns: checkIns.length,
            idleIncidents: idleCheckIns,
            violations: violationCheckIns,
            performance: complianceRate >= 90 ? 'Excellent' : 
                        complianceRate >= 75 ? 'Good' : 
                        complianceRate >= 60 ? 'Fair' : 'Needs Improvement'
        };
    }
    
    // Analyze individual officer performance
    static analyzeOfficerPerformance(officerPerformance) {
        const insights = {
            topPerformers: [],
            needsAttention: [],
            averageMetrics: {
                attendance: 0,
                avgIdleAlerts: 0,
                avgViolations: 0
            }
        };
        
        if (officerPerformance.length === 0) return insights;
        
        const attendanceCount = officerPerformance.filter(p => p.attendance).length;
        const totalIdle = officerPerformance.reduce((sum, p) => sum + p.idleAlerts, 0);
        const totalViolations = officerPerformance.reduce((sum, p) => sum + p.zoneViolations, 0);
        
        insights.averageMetrics = {
            attendance: Math.round((attendanceCount / officerPerformance.length) * 100),
            avgIdleAlerts: Math.round(totalIdle / officerPerformance.length * 10) / 10,
            avgViolations: Math.round(totalViolations / officerPerformance.length * 10) / 10
        };
        
        // Identify top performers and those needing attention
        officerPerformance.forEach(officer => {
            const score = this.calculateOfficerScore(officer);
            if (score >= 0.9) {
                insights.topPerformers.push(officer.officerId);
            } else if (score < 0.6) {
                insights.needsAttention.push(officer.officerId);
            }
        });
        
        return insights;
    }
    
    // Calculate officer performance score
    static calculateOfficerScore(officer) {
        let score = 1.0;
        
        if (!officer.attendance) score -= 0.5;
        score -= (officer.idleAlerts * 0.1);
        score -= (officer.zoneViolations * 0.15);
        
        return Math.max(0, score);
    }
    
    // Generate recommendations based on analysis
    static generateRecommendations(event, checkIns, officerPerformance) {
        const recommendations = [];
        
        // Performance-based recommendations
        const analysis = this.analyzeEventPerformance(event, checkIns);
        
        if (analysis.complianceRate < 75) {
            recommendations.push({
                category: 'Compliance',
                priority: 'high',
                message: 'Consider additional training for officers on location compliance and check-in procedures.'
            });
        }
        
        if (analysis.violations > 0) {
            recommendations.push({
                category: 'Zone Management',
                priority: 'medium',
                message: 'Review zone boundaries and consider implementing GPS-based geofencing alerts.'
            });
        }
        
        if (analysis.idleIncidents > analysis.totalCheckIns * 0.3) {
            recommendations.push({
                category: 'Activity Monitoring',
                priority: 'medium',
                message: 'High idle time detected. Consider optimizing patrol routes and duty assignments.'
            });
        }
        
        return recommendations;
    }
    
    // Generate comprehensive report text
    static generateReportText(event, analysis) {
        const { eventSummary, officerInsights, recommendations } = analysis;
        
        let report = `# Performance Report: ${event.name}\n\n`;
        report += `**Event Date:** ${new Date(event.date).toLocaleDateString()}\n`;
        report += `**Event Time:** ${event.time}\n`;
        report += `**Status:** ${event.status.toUpperCase()}\n\n`;
        
        report += `## Executive Summary\n`;
        report += `The event "${event.name}" has been analyzed with the following key metrics:\n\n`;
        
        report += `### Overall Performance: ${eventSummary.performance}\n`;
        report += `- **Attendance Rate:** ${eventSummary.attendanceRate}%\n`;
        report += `- **Compliance Rate:** ${eventSummary.complianceRate}%\n`;
        report += `- **Total Check-ins:** ${eventSummary.totalCheckIns}\n`;
        report += `- **Idle Incidents:** ${eventSummary.idleIncidents}\n`;
        report += `- **Zone Violations:** ${eventSummary.violations}\n\n`;
        
        report += `## Officer Performance Insights\n`;
        report += `- **Average Attendance:** ${officerInsights.averageMetrics.attendance}%\n`;
        report += `- **Average Idle Alerts per Officer:** ${officerInsights.averageMetrics.avgIdleAlerts}\n`;
        report += `- **Average Violations per Officer:** ${officerInsights.averageMetrics.avgViolations}\n\n`;
        
        if (officerInsights.topPerformers.length > 0) {
            report += `**Top Performers:** Officers ${officerInsights.topPerformers.join(', ')} demonstrated excellent performance.\n\n`;
        }
        
        if (officerInsights.needsAttention.length > 0) {
            report += `**Needs Attention:** Officers ${officerInsights.needsAttention.join(', ')} require additional support or training.\n\n`;
        }
        
        if (recommendations.length > 0) {
            report += `## Recommendations\n`;
            recommendations.forEach((rec, index) => {
                report += `${index + 1}. **${rec.category}** (${rec.priority.toUpperCase()}): ${rec.message}\n`;
            });
            report += `\n`;
        }
        
        report += `## Conclusion\n`;
        report += `This AI-generated report provides insights into the event performance and officer effectiveness. `;
        report += `Regular analysis of these metrics helps improve future deployments and officer training programs.\n\n`;
        report += `*Report generated on ${new Date().toLocaleString()} by E-BANDOBAST AI System*`;
        
        return report;
    }
    
    // Generate fallback report if AI analysis fails
    static generateFallbackReport(event, officerPerformance) {
        const totalOfficers = event.officers.length;
        const presentOfficers = officerPerformance.filter(p => p.attendance).length;
        const totalIdle = officerPerformance.reduce((sum, p) => sum + p.idleAlerts, 0);
        const totalViolations = officerPerformance.reduce((sum, p) => sum + p.zoneViolations, 0);
        
        return `Performance Report for ${event.name}
        
Event Date: ${new Date(event.date).toLocaleDateString()}
Event Time: ${event.time}

Summary:
- Total Officers Assigned: ${totalOfficers}
- Officers Present: ${presentOfficers}
- Attendance Rate: ${totalOfficers > 0 ? ((presentOfficers/totalOfficers)*100).toFixed(1) : 0}%
- Total Idle Alerts: ${totalIdle}
- Total Zone Violations: ${totalViolations}
- Overall Performance: ${totalIdle < 5 && totalViolations < 3 ? 'Good' : 'Needs Improvement'}

This report was generated automatically by the E-BANDOBAST system.`;
    }
}

module.exports = AIService;