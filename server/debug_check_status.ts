
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('\n--- CHECKING TARGET STATUS ---');
    const target = await prisma.target.findFirst({
        where: { name: "Debug Target" },
        include: { auditLogs: true }
    });

    if (target) {
        console.log(`Target: ${target.name}`);
        console.log(`Status: ${target.auditStatus}`);
        console.log(`Logs: ${target.auditLogs.length}`);
        console.log(JSON.stringify(target.auditLogs, null, 2));
    } else {
        console.log("Target not found");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
