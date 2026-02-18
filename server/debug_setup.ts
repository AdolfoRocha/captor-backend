
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('\n--- SETUP DEBUG DATA ---');

    // 1. Find or create a Mission
    let mission = await prisma.mission.findFirst({
        where: { title: "Debug Mission" }
    });

    if (!mission) {
        console.log("Creating Debug Mission...");
        mission = await prisma.mission.create({
            data: {
                title: "Debug Mission",
                promptInstruction: "Olá, sou o Captor. Isso é um teste.",
                targetLimit: 5,
                status: 'active'
            }
        });
    } else {
        console.log("Found existing Debug Mission:", mission.id);
    }

    // 2. Find or create a Target
    // You might want to update this phone number to a real test number or safe dummy
    const targetPhone = "5511999999999";

    let target = await prisma.target.findFirst({
        where: {
            missionId: mission.id,
            phone: targetPhone
        }
    });

    if (!target) {
        console.log("Creating Debug Target...");
        target = await prisma.target.create({
            data: {
                missionId: mission.id,
                name: "Debug Target",
                phone: targetPhone,
                profileUrl: "https://web.whatsapp.com/send?phone=" + targetPhone,
                auditStatus: 'pending'
            }
        });
    } else {
        console.log("Found existing Debug Target:", target.id);
        console.log("Resetting target to PENDING...");
        target = await prisma.target.update({
            where: { id: target.id },
            data: { auditStatus: 'pending', auditLogs: { deleteMany: {} } }
        });
    }

    console.log("\n✅ SETUP COMPLETE");
    console.log("Mission ID:", mission.id);
    console.log("Target ID:", target.id);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
