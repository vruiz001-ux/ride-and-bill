import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import type { EmailMessage } from '@/lib/types';

export async function getGmailClient(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'google' },
  });

  if (!account?.access_token) {
    throw new Error('No Google account connected');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    const updateData: Record<string, unknown> = {};
    if (tokens.access_token) updateData.access_token = tokens.access_token;
    if (tokens.refresh_token) updateData.refresh_token = tokens.refresh_token;
    if (tokens.expiry_date) updateData.expires_at = Math.floor(tokens.expiry_date / 1000);

    await prisma.account.update({
      where: { id: account.id },
      data: updateData,
    });
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

const RECEIPT_QUERY = '(from:(noreply@uber.com OR uber.receipt@uber.com OR receipts@uber.com) OR (from:privaterelay.appleid.com uber) OR (from:bolt.eu subject:(trip OR ride OR podr OR przejazd OR trajet)) OR (from:waymo.com subject:(riding OR receipt)) OR (from:billing@careem.com subject:Receipt) OR (from:freenow.com subject:(receipt OR ride OR trip OR fahrt)))';

export async function searchReceiptEmails(
  userId: string,
  afterDate?: string,
  beforeDate?: string
): Promise<string[]> {
  const gmail = await getGmailClient(userId);
  let query = RECEIPT_QUERY;
  if (afterDate) {
    query += ` after:${afterDate}`;
  }
  if (beforeDate) {
    query += ` before:${beforeDate}`;
  }

  const messageIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 100,
      includeSpamTrash: true,
      pageToken,
    });

    if (res.data.messages) {
      for (const msg of res.data.messages) {
        if (msg.id) messageIds.push(msg.id);
      }
    }

    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);

  return messageIds;
}

export async function fetchEmail(
  userId: string,
  messageId: string
): Promise<EmailMessage> {
  const gmail = await getGmailClient(userId);

  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const headers = res.data.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

  const from = getHeader('From');
  const subject = getHeader('Subject');
  const date = getHeader('Date');

  let htmlBody = '';
  let textBody = '';

  function extractParts(part: typeof res.data.payload) {
    if (!part) return;

    if (part.mimeType === 'text/html' && part.body?.data) {
      htmlBody = Buffer.from(part.body.data, 'base64url').toString('utf-8');
    }
    if (part.mimeType === 'text/plain' && part.body?.data) {
      textBody = Buffer.from(part.body.data, 'base64url').toString('utf-8');
    }

    if (part.parts) {
      for (const sub of part.parts) {
        extractParts(sub);
      }
    }
  }

  extractParts(res.data.payload);

  // If no parts, body may be at top level
  if (!htmlBody && !textBody && res.data.payload?.body?.data) {
    const decoded = Buffer.from(res.data.payload.body.data, 'base64url').toString('utf-8');
    if (res.data.payload.mimeType === 'text/html') {
      htmlBody = decoded;
    } else {
      textBody = decoded;
    }
  }

  return {
    messageId,
    from,
    subject,
    date: (() => { try { return date ? new Date(date).toISOString() : new Date().toISOString(); } catch { return new Date().toISOString(); } })(),
    htmlBody,
    textBody,
    attachments: [],
  };
}
