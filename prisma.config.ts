// @ts-nocheck
import path from 'node:path';
import { defineConfig } from 'prisma/config';

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;
const localUrl = `file:${path.join('prisma', 'dev.db')}`;

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrate: {
    adapter: async () => {
      const { PrismaLibSql } = await import('@prisma/adapter-libsql');
      const { createClient } = await import('@libsql/client');
      const client = createClient(
        tursoUrl && tursoToken
          ? { url: tursoUrl, authToken: tursoToken }
          : { url: localUrl }
      );
      return new PrismaLibSql(client);
    },
  },
  datasource: {
    url: localUrl,
  },
});
