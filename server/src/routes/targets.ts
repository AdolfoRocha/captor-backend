import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const targetsRouter = Router();

// GET all targets (with optional filters)
targetsRouter.get('/', async (req, res) => {
    try {
        const { missionId, status } = req.query;

        const targets = await prisma.target.findMany({
            where: {
                ...(missionId && { missionId: missionId as string }),
                ...(status && { auditStatus: status as string })
            },
            include: {
                mission: {
                    select: { title: true }
                },
                _count: {
                    select: { auditLogs: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(targets);
    } catch (error) {
        console.error('Error fetching targets:', error);
        res.status(500).json({ error: 'Failed to fetch targets' });
    }
});

// GET single target with audit logs
targetsRouter.get('/:id', async (req, res) => {
    try {
        const target = await prisma.target.findUnique({
            where: { id: req.params.id },
            include: {
                mission: true,
                auditLogs: {
                    orderBy: { timestamp: 'asc' }
                }
            }
        });
        if (!target) {
            return res.status(404).json({ error: 'Target not found' });
        }
        res.json(target);
    } catch (error) {
        console.error('Error fetching target:', error);
        res.status(500).json({ error: 'Failed to fetch target' });
    }
});

// POST create target
targetsRouter.post('/', async (req, res) => {
    try {
        const { name, phone, profileUrl, scrapedBio, missionId } = req.body;

        if (!name || !phone || !missionId) {
            return res.status(400).json({ error: 'Name, phone, and missionId are required' });
        }

        const target = await prisma.target.create({
            data: {
                name,
                phone,
                profileUrl,
                scrapedBio,
                missionId
            }
        });
        res.status(201).json(target);
    } catch (error) {
        console.error('Error creating target:', error);
        res.status(500).json({ error: 'Failed to create target' });
    }
});

// POST bulk create targets
targetsRouter.post('/bulk', async (req, res) => {
    try {
        const { targets, missionId } = req.body;

        if (!Array.isArray(targets) || !missionId) {
            return res.status(400).json({ error: 'Targets array and missionId are required' });
        }

        const created = await prisma.target.createMany({
            data: targets.map((t: { name: string; phone: string; scrapedBio?: string }) => ({
                name: t.name,
                phone: t.phone,
                scrapedBio: t.scrapedBio,
                missionId
            }))
        });
        res.status(201).json({ count: created.count });
    } catch (error) {
        console.error('Error creating targets:', error);
        res.status(500).json({ error: 'Failed to create targets' });
    }
});

// PUT update target
targetsRouter.put('/:id', async (req, res) => {
    try {
        const { name, phone, scrapedBio, auditStatus } = req.body;
        const target = await prisma.target.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name }),
                ...(phone && { phone }),
                ...(scrapedBio !== undefined && { scrapedBio }),
                ...(auditStatus && { auditStatus, lastInteraction: new Date() })
            }
        });
        res.json(target);
    } catch (error) {
        console.error('Error updating target:', error);
        res.status(500).json({ error: 'Failed to update target' });
    }
});

// DELETE target
targetsRouter.delete('/:id', async (req, res) => {
    try {
        await prisma.target.delete({
            where: { id: req.params.id }
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting target:', error);
        res.status(500).json({ error: 'Failed to delete target' });
    }
});
