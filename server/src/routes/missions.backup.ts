import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const missionsRouter = Router();

// GET all missions
missionsRouter.get('/', async (req, res) => {
    try {
        const missions = await prisma.mission.findMany({
            include: {
                _count: {
                    select: { targets: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(missions);
    } catch (error) {
        console.error('Error fetching missions:', error);
        res.status(500).json({ error: 'Failed to fetch missions' });
    }
});

// GET single mission
missionsRouter.get('/:id', async (req, res) => {
    try {
        const mission = await prisma.mission.findUnique({
            where: { id: req.params.id },
            include: { targets: true }
        });
        if (!mission) {
            return res.status(404).json({ error: 'Mission not found' });
        }
        res.json(mission);
    } catch (error) {
        console.error('Error fetching mission:', error);
        res.status(500).json({ error: 'Failed to fetch mission' });
    }
});

// POST create mission
missionsRouter.post('/', async (req, res) => {
    try {
        const { title, promptInstruction, sourceUrl, targetLimit } = req.body;

        if (!title || !promptInstruction) {
            return res.status(400).json({ error: 'Title and promptInstruction are required' });
        }

        // 1. Create the mission first
        const mission = await prisma.mission.create({
            data: {
                title,
                promptInstruction,
                sourceUrl,
                targetLimit: targetLimit ? parseInt(targetLimit.toString()) : 5  // Default: 5 targets
            }
        });

        // 2. If sourceUrl is provided, trigger the scraper in BACKGROUND
        if (sourceUrl) {
            console.log(`🔍 Triggering scraper for mission ${mission.id}: ${sourceUrl}`);

            const { exec } = await import('child_process');
            const path = await import('path');
            const { fileURLToPath } = await import('url');

            // Get absolute path from current file location
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);

            // Determine paths - use absolute paths
            const agentDir = path.resolve(__dirname, '../../../agent');
            const scraperScript = path.join(agentDir, 'scraper.py');

            // Limit (use mission's targetLimit, default to 5)
            const limit = mission.targetLimit || 5;

            console.log(`📁 Agent dir: ${agentDir}`);
            console.log(`📜 Scraper script: ${scraperScript}`);
            console.log(`🎯 Limit: ${limit}`);

            // Command: python3 scraper.py <url> -n <limit> --mission-id <id>
            const command = `python3 "${scraperScript}" "${sourceUrl}" -n ${limit} --mission-id "${mission.id}"`;
            console.log(`🚀 Command: ${command}`);

            // Execute scraper asynchronously (FIRE AND FORGET)
            // We do NOT await this, so the UI returns immediately
            exec(command, { cwd: agentDir }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`❌ Background scraper error: ${error.message}`);
                    console.error(`Stderr: ${stderr}`);
                } else {
                    console.log(`✅ Background scraper completed`);
                    console.log(stdout);
                }
            });
        }

        // Return created mission immediately
        res.status(201).json(mission);
    } catch (error) {
        console.error('Error creating mission:', error);
        res.status(500).json({ error: 'Failed to create mission' });
    }
});

// PUT update mission
missionsRouter.put('/:id', async (req, res) => {
    try {
        const { title, promptInstruction, sourceUrl, status, targetLimit } = req.body;
        const mission = await prisma.mission.update({
            where: { id: req.params.id },
            data: {
                ...(title && { title }),
                ...(promptInstruction && { promptInstruction }),
                ...(sourceUrl !== undefined && { sourceUrl }),
                ...(status && { status }),
                ...(targetLimit !== undefined && { targetLimit: targetLimit ? parseInt(targetLimit.toString()) : null })
            }
        });
        res.json(mission);
    } catch (error) {
        console.error('Error updating mission:', error);
        res.status(500).json({ error: 'Failed to update mission' });
    }
});

// DELETE mission
missionsRouter.delete('/:id', async (req, res) => {
    try {
        await prisma.mission.delete({
            where: { id: req.params.id }
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting mission:', error);
        res.status(500).json({ error: 'Failed to delete mission' });
    }
});
