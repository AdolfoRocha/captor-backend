import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const leadsRouter = Router();

// GET all leads (with optional filters)
leadsRouter.get('/', async (req, res) => {
    try {
        const { query, location, whatsappOnly, notImported } = req.query;

        const where: any = {};
        if (query) where.searchQuery = { contains: query as string };
        if (location) where.searchLocation = { contains: location as string };
        if (whatsappOnly === 'true') where.isWhatsapp = true;
        if (notImported === 'true') where.imported = false;

        const leads = await prisma.lead.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        res.json(leads);
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

// POST create a new lead (used by gmaps scraper)
leadsRouter.post('/', async (req, res) => {
    try {
        const { name, phone, phoneRaw, category, address, website, rating, reviews, isWhatsapp, waConfidence, searchQuery, searchLocation } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ error: 'name and phone are required' });
        }

        const lead = await prisma.lead.create({
            data: {
                name,
                phone,
                phoneRaw: phoneRaw || null,
                category: category || null,
                address: address || null,
                website: website || null,
                rating: rating || null,
                reviews: reviews || null,
                isWhatsapp: isWhatsapp || false,
                waConfidence: waConfidence || null,
                searchQuery: searchQuery || '',
                searchLocation: searchLocation || '',
            }
        });

        res.status(201).json(lead);
    } catch (error) {
        console.error('Error creating lead:', error);
        res.status(500).json({ error: 'Failed to create lead' });
    }
});

// POST bulk create leads
leadsRouter.post('/bulk', async (req, res) => {
    try {
        const { leads } = req.body;
        if (!Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({ error: 'leads array is required' });
        }

        const count = await prisma.lead.createMany({
            data: leads.map((l: any) => ({
                name: l.name,
                phone: l.phone,
                phoneRaw: l.phoneRaw || null,
                category: l.category || null,
                address: l.address || null,
                website: l.website || null,
                rating: l.rating || null,
                reviews: l.reviews || null,
                isWhatsapp: l.isWhatsapp || false,
                waConfidence: l.waConfidence || null,
                searchQuery: l.searchQuery || '',
                searchLocation: l.searchLocation || '',
            }))
        });

        res.json({ count: count.count });
    } catch (error) {
        console.error('Error bulk creating leads:', error);
        res.status(500).json({ error: 'Failed to bulk create leads' });
    }
});

// POST import leads as targets into a mission
leadsRouter.post('/import-to-mission', async (req, res) => {
    try {
        const { leadIds, missionId } = req.body;

        if (!Array.isArray(leadIds) || leadIds.length === 0 || !missionId) {
            return res.status(400).json({ error: 'leadIds array and missionId are required' });
        }

        // Fetch selected leads
        const leads = await prisma.lead.findMany({
            where: { id: { in: leadIds } }
        });

        if (leads.length === 0) {
            return res.status(404).json({ error: 'No leads found' });
        }

        // Create targets from leads
        const targets = await prisma.target.createMany({
            data: leads.map(lead => ({
                name: lead.name,
                phone: lead.phoneRaw || lead.phone,
                scrapedBio: [
                    lead.category,
                    lead.address,
                    lead.rating ? `⭐ ${lead.rating}` : null,
                    lead.reviews ? `📝 ${lead.reviews} avaliações` : null,
                    lead.website ? `🌐 ${lead.website}` : null,
                    lead.isWhatsapp ? '✅ WhatsApp' : null,
                ].filter(Boolean).join(' | '),
                missionId,
            }))
        });

        // Mark leads as imported
        await prisma.lead.updateMany({
            where: { id: { in: leadIds } },
            data: { imported: true }
        });

        res.json({ imported: targets.count, message: `${targets.count} leads importados como alvos` });
    } catch (error) {
        console.error('Error importing leads:', error);
        res.status(500).json({ error: 'Failed to import leads' });
    }
});

// DELETE lead
leadsRouter.delete('/:id', async (req, res) => {
    try {
        await prisma.lead.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting lead:', error);
        res.status(500).json({ error: 'Failed to delete lead' });
    }
});

// DELETE all leads (clear list)
leadsRouter.delete('/', async (req, res) => {
    try {
        const result = await prisma.lead.deleteMany({});
        res.json({ deleted: result.count });
    } catch (error) {
        console.error('Error clearing leads:', error);
        res.status(500).json({ error: 'Failed to clear leads' });
    }
});
