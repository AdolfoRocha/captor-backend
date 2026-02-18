import { Router } from 'express';
import { spawn, ChildProcess } from 'child_process';
import { prisma } from '../lib/prisma.js';
import path from 'path';
import { fileURLToPath } from 'url';

export const scraperRouter = Router();

// In-memory scraper status
interface ScraperJob {
    id: string;
    missionId: string;
    sourceUrl: string;
    status: 'running' | 'completed' | 'failed' | 'stopped';
    startedAt: Date;
    completedAt?: Date;
    output: string[];
    error?: string;
    process?: ChildProcess;
}

const scraperJobs: Map<string, ScraperJob> = new Map();

// POST start scraper for a mission
scraperRouter.post('/start', async (req, res) => {
    try {
        const { missionId } = req.body;

        if (!missionId) {
            return res.status(400).json({ error: 'missionId is required' });
        }

        // Get mission to check sourceUrl
        const mission = await prisma.mission.findUnique({
            where: { id: missionId }
        });

        if (!mission) {
            return res.status(404).json({ error: 'Mission not found' });
        }

        if (!mission.sourceUrl) {
            return res.status(400).json({ error: 'Mission has no sourceUrl configured' });
        }

        // Check if scraper is already running for this mission
        for (const [id, job] of scraperJobs) {
            if (job.missionId === missionId && job.status === 'running') {
                return res.status(400).json({ error: 'Scraper already running for this mission', jobId: id });
            }
        }

        // Create job
        const jobId = `job_${Date.now()}`;
        const job: ScraperJob = {
            id: jobId,
            missionId,
            sourceUrl: mission.sourceUrl,
            status: 'running',
            startedAt: new Date(),
            output: []
        };
        scraperJobs.set(jobId, job);

        // Spawn scraper process - use absolute paths
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const agentDir = path.resolve(__dirname, '../../../agent');
        const scraperPath = path.join(agentDir, 'scraper.py');
        const maxTargets = mission.targetLimit || 5;

        console.log(`📁 Agent dir: ${agentDir}`);
        console.log(`📜 Scraper path: ${scraperPath}`);
        console.log(`🎯 Max targets: ${maxTargets}`);

        const scraper = spawn('python3', [
            scraperPath,
            mission.sourceUrl,
            '-n', maxTargets.toString(),
            '--mission-id', missionId
        ], {
            cwd: agentDir
        });

        // Store process reference so we can kill it later
        job.process = scraper;

        scraper.stdout.on('data', (data) => {
            const lines = data.toString().split('\n').filter((l: string) => l.trim());
            for (const line of lines) {
                job.output.push(line);
                console.log(`[Scraper ${jobId}] ${line}`);
            }
        });

        scraper.stderr.on('data', (data) => {
            const lines = data.toString().split('\n').filter((l: string) => l.trim());
            for (const line of lines) {
                job.output.push(`[ERR] ${line}`);
                console.error(`[Scraper ${jobId}] ${line}`);
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
            console.log(`[Scraper ${jobId}] Finished with code ${code}`);
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
            message: 'Scraper started',
            sourceUrl: mission.sourceUrl,
            maxTargets
        });

    } catch (error) {
        console.error('Error starting scraper:', error);
        res.status(500).json({ error: 'Failed to start scraper' });
    }
});

// POST stop scraper
scraperRouter.post('/stop', async (req, res) => {
    try {
        const { jobId, missionId } = req.body;

        let jobsToStop: ScraperJob[] = [];

        if (jobId) {
            const job = scraperJobs.get(jobId);
            if (job) jobsToStop.push(job);
        } else if (missionId) {
            // Stop all jobs for this mission
            for (const [id, job] of scraperJobs) {
                if (job.missionId === missionId && job.status === 'running') {
                    jobsToStop.push(job);
                }
            }
        } else {
            // Stop all running jobs
            for (const [id, job] of scraperJobs) {
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
                job.output.push('⛔ Scraper parado pelo usuário');
                stoppedCount++;
                console.log(`[Scraper ${job.id}] Stopped by user`);
            }
        }

        res.json({
            success: true,
            stoppedCount,
            message: stoppedCount > 0 ? `${stoppedCount} scraper(s) parado(s)` : 'Nenhum scraper em execução'
        });

    } catch (error) {
        console.error('Error stopping scraper:', error);
        res.status(500).json({ error: 'Failed to stop scraper' });
    }
});

// GET scraper job status
scraperRouter.get('/status/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = scraperJobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
        id: job.id,
        missionId: job.missionId,
        status: job.status,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        output: job.output.slice(-20), // Last 20 lines
        error: job.error
    });
});

// GET active jobs for a mission
scraperRouter.get('/jobs/:missionId', (req, res) => {
    const { missionId } = req.params;
    const jobs: Omit<ScraperJob, 'process'>[] = [];

    for (const [id, job] of scraperJobs) {
        if (job.missionId === missionId) {
            const { process, ...jobData } = job;
            jobs.push(jobData);
        }
    }

    res.json(jobs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()));
});
