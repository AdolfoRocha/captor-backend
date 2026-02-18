
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const targetId = "cml9yr4140001yikojrtsrrcm";

    console.log('\n--- AUDIT LOGS ---');
    const logs = await prisma.auditLog.findMany({ where: { targetId } });
    console.log(JSON.stringify(logs, null, 2));

    console.log('\n--- RESETTING TARGET ---');
    await prisma.target.update({
        where: { id: targetId },
        data: { auditStatus: 'pending' }
    });
    console.log('Target reset to PENDING.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
