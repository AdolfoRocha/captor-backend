import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { Lead } from '@prisma/client';

export const leadsRouter = Router();

// ...

// POST import leads as targets into a mission
leadsRouter.post('/import-to-mission', async (req, res) => {
    // ...
    // Create targets from leads
    const targets = await prisma.target.createMany({
        data: leads.map((lead: Lead) => ({
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
    // ...
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
