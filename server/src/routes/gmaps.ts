import { Router } from 'express';
import { spawn, ChildProcess } from 'child_process';
import { prisma } from '../lib/prisma.js';
import path from 'path';
import { fileURLToPath } from 'url';

export const gmapsRouter = Router();

// In-memory Google Maps scraper jobs
interface GmapsJob {
    id: string;
    missionId?: string;
    query: string;
    location: string;
    status: 'running' | 'completed' | 'failed' | 'stopped';
    startedAt: Date;
    completedAt?: Date;
    output: string[];
    error?: string;
    process?: ChildProcess;
}

const gmapsJobs: Map<string, GmapsJob> = new Map();

// POST start Google Maps search
gmapsRouter.post('/search', async (req, res) => {
    try {
        const { missionId, query, location, maxResults } = req.body;

        // missionId is optional now
        // if (!missionId) {
        //     return res.status(400).json({ error: 'missionId is required' });
        // }
        if (!query) {
            return res.status(400).json({ error: 'query (nicho) is required' });
        }
        if (!location) {
            return res.status(400).json({ error: 'location is required' });
        }

        // If missionId provided, validate it exists
        if (missionId) {
            const mission = await prisma.mission.findUnique({
                where: { id: missionId }
            });

            if (!mission) {
                return res.status(404).json({ error: 'Mission not found' });
            }
        }

        // Check if a gmaps job is already running for this mission
        for (const [id, job] of gmapsJobs) {
            if (job.missionId === missionId && job.status === 'running') {
                return res.status(400).json({ error: 'Google Maps search already running for this mission', jobId: id });
            }
        }

        // Create job
        const jobId = `gmaps_${Date.now()}`;
        const job: GmapsJob = {
            id: jobId,
            missionId,
            query,
            location,
            status: 'running',
            startedAt: new Date(),
            output: []
        };
        gmapsJobs.set(jobId, job);

        // Spawn Google Maps scraper process
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const agentDir = path.resolve(__dirname, '../../../agent');
        const scraperPath = path.join(agentDir, 'gmaps_scraper.py');
        const max = maxResults || 20;

        console.log(`📁 Agent dir: ${agentDir}`);
        console.log(`📜 GMaps scraper path: ${scraperPath}`);
        console.log(`🔍 Query: ${query} em ${location}`);
        console.log(`🎯 Max results: ${max}`);

        const args = [
            scraperPath,
            '--query', query,
            '--location', location,
            '--max', max.toString()
        ];

        if (missionId) {
            args.push('--mission-id', missionId);
        }

        const scraper = spawn('python3', args, {
            cwd: agentDir
        });

        job.process = scraper;

        scraper.stdout.on('data', (data) => {
            const lines = data.toString().split('\n').filter((l: string) => l.trim());
            for (const line of lines) {
                job.output.push(line);
                console.log(`[GMaps ${jobId}] ${line}`);
            }
        });

        scraper.stderr.on('data', (data) => {
            const lines = data.toString().split('\n').filter((l: string) => l.trim());
            for (const line of lines) {
                job.output.push(`[ERR] ${line}`);
                console.error(`[GMaps ${jobId}] ${line}`);
            }
        });

        scraper.on('close', (code) => {
            job.completedAt = new Date();
            if (job.status === 'running') {
                job.status = code === 0 ? 'completed' : 'failed';
            }
            if (code !== 0 && job.status !== 'stopped') {
                job.error = `Process exited with code ${code}`;
            }
            job.process = undefined;
            console.log(`[GMaps ${jobId}] Finished with code ${code}`);
        });

        scraper.on('error', (err) => {
            job.status = 'failed';
            job.error = err.message;
            job.completedAt = new Date();
            job.process = undefined;
        });

        res.json({
            success: true,
            jobId,
            message: 'Google Maps search started',
            query,
            location,
            maxResults: max
        });

    } catch (error) {
        console.error('Error starting Google Maps search:', error);
        res.status(500).json({ error: 'Failed to start Google Maps search' });
    }
});

// POST stop Google Maps search
gmapsRouter.post('/stop', async (req, res) => {
    try {
        const { jobId, missionId } = req.body;

        let jobsToStop: GmapsJob[] = [];

        if (jobId) {
            const job = gmapsJobs.get(jobId);
            if (job) jobsToStop.push(job);
        } else if (missionId) {
            for (const [id, job] of gmapsJobs) {
                if (job.missionId === missionId && job.status === 'running') {
                    jobsToStop.push(job);
                }
            }
        } else {
            for (const [id, job] of gmapsJobs) {
                if (job.status === 'running') {
                    jobsToStop.push(job);
                }
            }
        }

        let stoppedCount = 0;
        for (const job of jobsToStop) {
            if (job.process) {
                job.process.kill('SIGTERM');
                job.status = 'stopped';
                job.completedAt = new Date();
                job.output.push('⛔ Busca no Google Maps parada pelo usuário');
                stoppedCount++;
                console.log(`[GMaps ${job.id}] Stopped by user`);
            }
        }

        res.json({
            success: true,
            stoppedCount,
            message: stoppedCount > 0 ? `${stoppedCount} busca(s) parada(s)` : 'Nenhuma busca em execução'
        });

    } catch (error) {
        console.error('Error stopping Google Maps search:', error);
        res.status(500).json({ error: 'Failed to stop search' });
    }
});

// GET Google Maps job status
gmapsRouter.get('/status/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = gmapsJobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
        id: job.id,
        missionId: job.missionId,
        query: job.query,
        location: job.location,
        status: job.status,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        output: job.output.slice(-30), // Last 30 lines
        error: job.error
    });
});

// GET active Google Maps jobs for a mission
gmapsRouter.get('/jobs/:missionId', (req, res) => {
    const { missionId } = req.params;
    const jobs: Omit<GmapsJob, 'process'>[] = [];

    for (const [id, job] of gmapsJobs) {
        if (job.missionId === missionId) {
            const { process, ...jobData } = job;
            jobs.push(jobData);
        }
    }

    res.json(jobs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()));
});
