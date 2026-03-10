import { Client } from '@microsoft/microsoft-graph-client';
import { prisma } from '@/lib/prisma';
import type { EmailMessage } from '@/lib/types';

async function getOutlookClient(userId: string): Promise<Client> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'azure-ad' },
  });

  if (!account?.access_token) {
    throw new Error('No Outlook account connected');
  }

  let accessToken = account.access_token;

  // Refresh if expired
  if (account.expires_at && account.expires_at * 1000 < Date.now() && account.refresh_token) {
    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    const body = new URLSearchParams({
      client_id: process.env.AZURE_AD_CLIENT_ID!,
      client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: account.refresh_token,
      scope: 'openid email profile offline_access Mail.Read',
    });

    const res = await fetch(tokenUrl, { method: 'POST', body });
    if (res.ok) {
      const tokens = await res.json();
      accessToken = tokens.access_token;
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || account.refresh_token,
          expires_at: tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : undefined,
        },
      });
    }
  }

  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

const RECEIPT_SENDERS = [
  'noreply@uber.com', 'uber.receipt@uber.com', 'receipts@uber.com',
  'bolt.eu', 'waymo.com', 'freenow.com', 'careem.com', 'billing@careem.com',
];

function buildReceiptFilter(afterDate?: string, beforeDate?: string): string {
  const senderFilters = RECEIPT_SENDERS.map(s =>
    s.includes('@')
      ? `from/emailAddress/address eq '${s}'`
      : `contains(from/emailAddress/address, '${s}')`
  );

  let filter = `(${senderFilters.join(' or ')})`;

  if (afterDate) {
    const isoDate = afterDate.replace(/\//g, '-');
    filter += ` and receivedDateTime ge ${isoDate}T00:00:00Z`;
  }
  if (beforeDate) {
    const isoDate = beforeDate.replace(/\//g, '-');
    filter += ` and receivedDateTime lt ${isoDate}T00:00:00Z`;
  }

  return filter;
}

export async function searchOutlookReceiptEmails(
  userId: string,
  afterDate?: string,
  beforeDate?: string
): Promise<string[]> {
  const client = await getOutlookClient(userId);
  const filter = buildReceiptFilter(afterDate, beforeDate);
  const messageIds: string[] = [];
  let nextLink: string | null = null;

  // Initial request
  let response = await client
    .api('/me/messages')
    .filter(filter)
    .select('id')
    .top(100)
    .orderby('receivedDateTime desc')
    .get();

  if (response.value) {
    for (const msg of response.value) {
      if (msg.id) messageIds.push(msg.id);
    }
  }

  nextLink = response['@odata.nextLink'] || null;

  // Pagination
  while (nextLink) {
    response = await client.api(nextLink).get();
    if (response.value) {
      for (const msg of response.value) {
        if (msg.id) messageIds.push(msg.id);
      }
    }
    nextLink = response['@odata.nextLink'] || null;
  }

  return messageIds;
}

export async function fetchOutlookEmail(
  userId: string,
  messageId: string
): Promise<EmailMessage> {
  const client = await getOutlookClient(userId);

  const msg = await client
    .api(`/me/messages/${messageId}`)
    .select('id,subject,from,receivedDateTime,body')
    .get();

  const from = msg.from?.emailAddress?.address
    ? `${msg.from.emailAddress.name || ''} <${msg.from.emailAddress.address}>`
    : '';

  const htmlBody = msg.body?.contentType === 'html' ? msg.body.content || '' : '';
  const textBody = msg.body?.contentType === 'text' ? msg.body.content || '' : '';

  let date: string;
  try {
    date = msg.receivedDateTime ? new Date(msg.receivedDateTime).toISOString() : new Date().toISOString();
  } catch {
    date = new Date().toISOString();
  }

  return {
    messageId,
    from,
    subject: msg.subject || '',
    date,
    htmlBody: htmlBody || textBody,
    textBody: textBody || htmlBody,
    attachments: [],
  };
}
