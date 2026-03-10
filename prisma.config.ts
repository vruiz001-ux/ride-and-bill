// @ts-nocheck
import path from 'node:path';
import { defineConfig } from 'prisma/config';

const dbUrl = `file:${path.join('prisma', 'dev.db')}`;

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrate: {
    adapter: async () => {
      const { PrismaLibSql } = await import('@prisma/adapter-libsql');
      const { createClient } = await import('@libsql/client');
      const client = createClient({ url: dbUrl });
      return new PrismaLibSql(client);
    },
  },
  datasource: {
    url: dbUrl,
  },
});
