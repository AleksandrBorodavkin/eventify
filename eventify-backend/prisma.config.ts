import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * `env("DATABASE_URL")` fails on fresh installs / CI without `.env`.
 * Generate only needs a syntactically valid URL; real connections use `DATABASE_URL` at runtime.
 */
const databaseUrl = process.env.DATABASE_URL
    ? env("DATABASE_URL")
    : "postgresql://postgres:postgres@127.0.0.1:5432/eventify";

export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: {
        url: databaseUrl,
    },
});