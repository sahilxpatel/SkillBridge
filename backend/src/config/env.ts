import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 5000),
  databaseUrl: process.env.DATABASE_URL || "",
  clerkSecretKey: process.env.CLERK_SECRET_KEY || "",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000"
};

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

if (!env.clerkSecretKey) {
  throw new Error("CLERK_SECRET_KEY is required");
}
