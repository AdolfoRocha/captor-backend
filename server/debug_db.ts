
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- MISSIONS ---');
    const missions = await prisma.mission.findMany({ include: { _count: { select: { targets: true } } } });
    console.log(JSON.stringify(missions, null, 2));

    console.log('\n--- TARGETS ---');
    const targets = await prisma.target.findMany();
    console.log(JSON.stringify(targets, null, 2));

    console.log('\n--- AGENT PENDING LOGIC CHECK ---');
    const pendingWork = await prisma.target.findFirst({
        where: {
            auditStatus: 'pending',
            mission: {
                status: 'active'
            }
        },
        include: {
            mission: true
        }
    });
    console.log('Pending Work Available:', pendingWork ? 'YES' : 'NO');
    if (pendingWork) console.log(pendingWork);

}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
