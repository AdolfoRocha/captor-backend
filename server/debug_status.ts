
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const targetId = "cml9yr4140001yikojrtsrrcm";
    console.log('\n--- TARGET STATUS ---');
    const target = await prisma.target.findUnique({ where: { id: targetId } });
    console.log(JSON.stringify(target, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
