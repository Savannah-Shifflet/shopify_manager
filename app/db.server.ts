import { PrismaClient } from "@prisma/client";

declare global {
  // Prevent multiple Prisma client instances in development (hot reload)
  // eslint-disable-next-line no-var
  var __db__: PrismaClient | undefined;
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

let db: PrismaClient;

if (process.env.NODE_ENV === "production") {
  db = createPrismaClient();
} else {
  if (!global.__db__) {
    global.__db__ = createPrismaClient();
  }
  db = global.__db__;
}

export default db;
