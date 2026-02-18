import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const agentRouter = Router();

// In-memory status (for simplicity)
let agentStatus: { status: string; qrCode: string | null; lastUpdate: Date; currentAction: string } = {
    status: 'DISCONNECTED', // DISCONNECTED, WAITING_QR, CONNECTED
    qrCode: null,
    lastUpdate: new Date(),
    currentAction: ''
};

// In-memory logs (circular buffer - keeps last 100 logs)
const agentLogs: Array<{ timestamp: string; type: string; message: string }> = [];
const MAX_LOGS = 100;

// GET agent status/QR
agentRouter.get('/status', (req, res) => {
    res.json({
        ...agentStatus,
        logsCount: agentLogs.length
    });
});

// POST agent status update (from python agent)
agentRouter.post('/status', (req, res) => {
    const { status, qrCode, currentAction } = req.body;
    agentStatus = {
        status: status || agentStatus.status,
        qrCode: qrCode || null,
        lastUpdate: new Date(),
        currentAction: currentAction || agentStatus.currentAction || ''
    };
    // console.log(`Updated agent status: ${agentStatus.status} - ${agentStatus.currentAction}`);
    res.json({ success: true });
});

// POST log entry (from python agent)
agentRouter.post('/logs', (req, res) => {
    const { type, message } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'message is required' });
    }

    const logEntry = {
        timestamp: new Date().toISOString(),
        type: type || 'info',
        message
    };

    agentLogs.push(logEntry);

    // Keep only last MAX_LOGS entries
    while (agentLogs.length > MAX_LOGS) {
        agentLogs.shift();
    }

    res.json({ success: true });
});

// GET logs
agentRouter.get('/logs', (req, res) => {
    const { since } = req.query;

    if (since) {
        const sinceTime = new Date(since as string).getTime();
        const newLogs = agentLogs.filter(log => new Date(log.timestamp).getTime() > sinceTime);
        res.json(newLogs);
    } else {
        res.json(agentLogs);
    }
});


agentRouter.get('/pending', async (req, res) => {
    try {
        // PRIORITY 1: SCRAPING (Find 'pending' targets)
        // We want to scrape everyone first before sending messages
        // BUT ONLY if we haven't reached the mission's target limit yet.

        const pendingTarget = await prisma.target.findFirst({
            where: {
                auditStatus: 'pending',
                mission: {
                    status: 'active'
                }
            },
            include: {
                mission: {
                    select: {
                        id: true,
                        title: true,
                        promptInstruction: true,
                        targetLimit: true // Include limit
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        let canScrape = false;

        if (pendingTarget) {
            // Check if we reached the limit for this mission
            const missionId = pendingTarget.mission.id;
            const limit = pendingTarget.mission.targetLimit;

            if (limit && limit > 0) {
                // Count current successful contacts (scraped + completed)
                // We use 'scraped', 'completed', 'in_progress_messaging' to count towards the goal.
                // We exclude 'failed' and 'pending'.
                const successCount = await prisma.target.count({
                    where: {
                        missionId: missionId,
                        auditStatus: {
                            in: ['scraped', 'completed', 'in_progress_messaging']
                        }
                    }
                });

                if (successCount < limit) {
                    canScrape = true;
                } else {
                    // Limit reached! Do not scrape this pending target.
                    // We will fall through to check for messaging jobs.
                    console.log(`Mission ${missionId} limit reached (${successCount}/${limit}). Skipping pending scrape.`);
                    canScrape = false;
                }
            } else {
                // No limit, scrape away
                canScrape = true;
            }
        }

        if (pendingTarget && canScrape) {
            // Mark as in_progress (scraping)
            await prisma.target.update({
                where: { id: pendingTarget.id },
                data: {
                    auditStatus: 'in_progress_scraping',
                    lastInteraction: new Date()
                }
            });

            return res.json({
                hasWork: true,
                jobType: 'scrape',
                target: {
                    id: pendingTarget.id,
                    name: pendingTarget.name,
                    phone: pendingTarget.phone,
                    profileUrl: pendingTarget.profileUrl,
                    scrapedBio: pendingTarget.scrapedBio
                },
                mission: pendingTarget.mission
            });
        }

        // PRIORITY 2: MESSAGING (Find 'scraped' targets)
        // Only if no pending targets are left for active missions OR limit is reached.
        // However, to make it more robust, we can just pick any 'scraped' target if available.
        // It's better to finish scraping a mission before messaging? 
        // For now, let's just pick any 'scraped' target.

        const scrapedTarget = await prisma.target.findFirst({
            where: {
                auditStatus: 'scraped',
                mission: {
                    status: 'active'
                }
            },
            include: {
                mission: {
                    select: {
                        id: true,
                        title: true,
                        promptInstruction: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        if (scrapedTarget) {
            // Mark as in_progress (messaging)
            await prisma.target.update({
                where: { id: scrapedTarget.id },
                data: {
                    auditStatus: 'in_progress_messaging',
                    lastInteraction: new Date()
                }
            });

            return res.json({
                hasWork: true,
                jobType: 'message',
                target: {
                    id: scrapedTarget.id,
                    name: scrapedTarget.name,
                    phone: scrapedTarget.phone,
                    profileUrl: scrapedTarget.profileUrl,
                    scrapedBio: scrapedTarget.scrapedBio
                },
                mission: scrapedTarget.mission
            });
        }

        return res.json({ hasWork: false, target: null, mission: null });

    } catch (error) {
        console.error('Error fetching pending work:', error);
        res.status(500).json({ error: 'Failed to fetch pending work' });
    }
});

// POST report audit result
agentRouter.post('/report', async (req, res) => {
    try {
        const { targetId, status, messages, scrapedData } = req.body;

        if (!targetId || !status) {
            return res.status(400).json({ error: 'targetId and status are required' });
        }

        const updateData: any = {
            auditStatus: status, // 'scraped', 'completed', 'failed'
            lastInteraction: new Date()
        };

        // If we have scraped data (phone, bio), update it
        if (scrapedData) {
            if (scrapedData.phone) updateData.phone = scrapedData.phone;
            if (scrapedData.bio) updateData.scrapedBio = scrapedData.bio;
            if (scrapedData.name) updateData.name = scrapedData.name;
        }

        // Update target status
        await prisma.target.update({
            where: { id: targetId },
            data: updateData
        });

        // Save conversation logs if provided
        if (messages && Array.isArray(messages) && messages.length > 0) {
            await prisma.auditLog.createMany({
                data: messages.map((msg: { role: string; message: string; timestamp?: string }) => ({
                    targetId,
                    role: msg.role,
                    message: msg.message,
                    timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
                }))
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving report:', error);
        res.status(500).json({ error: 'Failed to save report' });
    }
});

// GET stats for the agent dashboard
agentRouter.get('/stats', async (req, res) => {
    try {
        const [pending, scraped, inProgress, completed, failed] = await Promise.all([
            prisma.target.count({ where: { auditStatus: 'pending' } }),
            prisma.target.count({ where: { auditStatus: 'scraped' } }),
            prisma.target.count({ where: { auditStatus: { contains: 'in_progress' } } }), // Covers 'in_progress_scraping' and 'in_progress_messaging'
            prisma.target.count({ where: { auditStatus: 'completed' } }),
            prisma.target.count({ where: { auditStatus: 'failed' } })
        ]);

        res.json({
            pending,
            scraped,
            inProgress,
            completed,
            failed,
            total: pending + scraped + inProgress + completed + failed
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});
