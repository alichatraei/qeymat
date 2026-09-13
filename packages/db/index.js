const { PrismaClient, Prisma } = require("./generated/client");

const globalForPrisma = globalThis;

/** @type {import('./generated/client').PrismaClient} */
const prisma =
  globalForPrisma.__qeymatPrisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__qeymatPrisma = prisma;
}

module.exports = { prisma, PrismaClient, Prisma };
