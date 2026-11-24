"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding offline database...');
    // Ensure default projects exist
    const natureGreen = await prisma.project.upsert({
        where: { name: 'NATURE GREEN' },
        update: {},
        create: {
            name: 'NATURE GREEN',
            address: 'Mathura Vrindavan',
            isActive: true,
        },
    });
    const aligarh = await prisma.project.upsert({
        where: { name: 'ALIGARH' },
        update: {},
        create: {
            name: 'ALIGARH',
            address: 'Ecostan Infra Aligarh',
            isActive: true,
        },
    });
    const hashedPw = await bcrypt_1.default.hash('admin123', 10);
    const hashedSuperPw = await bcrypt_1.default.hash('superadmin123', 10);
    // Global admin & superadmin
    await prisma.user.upsert({
        where: { username: 'admin' },
        update: { password: hashedPw, isActive: true },
        create: {
            username: 'admin',
            password: hashedPw,
            role: 'admin',
            fullName: 'System Admin',
            isActive: true,
        },
    });
    await prisma.user.upsert({
        where: { username: 'superadmin' },
        update: { password: hashedSuperPw, isActive: true },
        create: {
            username: 'superadmin',
            password: hashedSuperPw,
            role: 'superadmin',
            fullName: 'Platform Superadmin',
            isActive: true,
        },
    });
    // adminaligarh
    await prisma.user.upsert({
        where: { username: 'adminaligarh' },
        update: { password: hashedPw, isActive: true, projectId: aligarh.id },
        create: {
            username: 'adminaligarh',
            password: hashedPw,
            role: 'admin',
            fullName: 'Aligarh Project Admin',
            projectId: aligarh.id,
            isActive: true,
        },
    });
    // adminnature
    await prisma.user.upsert({
        where: { username: 'adminnature' },
        update: { password: hashedPw, isActive: true, projectId: natureGreen.id },
        create: {
            username: 'adminnature',
            password: hashedPw,
            role: 'admin',
            fullName: 'Nature Green Admin',
            projectId: natureGreen.id,
            isActive: true,
        },
    });
    console.log('Offline database seeded successfully with default users!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
