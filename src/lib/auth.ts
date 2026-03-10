import { getServerSession, type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

// Known fields in the Account model — filter out anything else
const ACCOUNT_FIELDS = new Set([
  'id', 'userId', 'type', 'provider', 'providerAccountId',
  'refresh_token', 'access_token', 'expires_at', 'token_type',
  'scope', 'id_token', 'session_state',
]);

function safeAdapter() {
  const adapter = PrismaAdapter(prisma) as ReturnType<typeof PrismaAdapter>;
  return {
    ...adapter,
    linkAccount: (data: Record<string, unknown>) => {
      const filtered: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (ACCOUNT_FIELDS.has(key)) {
          filtered[key] = value;
        }
      }
      return prisma.account.create({ data: filtered as Parameters<typeof prisma.account.create>[0]['data'] });
    },
  };
}

export const authOptions: NextAuthOptions = {
  adapter: safeAdapter() as NextAuthOptions['adapter'],
  session: { strategy: 'jwt' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
    ...(process.env.AZURE_AD_CLIENT_ID ? [AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: 'common',
      authorization: {
        params: {
          scope: 'openid email profile offline_access Mail.Read',
        },
      },
    })] : []),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user?.hashedPassword) return null;

        const valid = await bcrypt.compare(credentials.password, user.hashedPassword);
        if (!valid) return null;

        if (!user.emailVerified) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true },
          });
          token.role = dbUser?.role || 'user';
        } catch {
          token.role = 'user';
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as Record<string, unknown>).role = token.role;
      }
      return session;
    },
  },
  debug: true,
  pages: {
    signIn: '/login',
    error: '/login',
  },
};

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session;
}
