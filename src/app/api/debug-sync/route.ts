import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getGmailClient } from '@/lib/services/gmail';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'samples';

  try {
    const user = await prisma.user.findFirst();
    if (!user) return NextResponse.json({ error: 'No user found' });

    const gmail = await getGmailClient(user.id);

    if (mode === 'raw') {
      const q = url.searchParams.get('q') || 'from:uber.com';
      const res = await gmail.users.messages.list({
        userId: 'me', q, maxResults: 1, includeSpamTrash: true,
      });
      if (!res.data.messages?.length) return NextResponse.json({ error: 'No email found' });
      const msg = await gmail.users.messages.get({ userId: 'me', id: res.data.messages[0].id!, format: 'full' });
      const headers = msg.data.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value;
      const from = headers.find(h => h.name === 'From')?.value;
      let html = '';
      function extractRaw(part: typeof msg.data.payload) {
        if (!part) return;
        if (part.mimeType === 'text/html' && part.body?.data) html = Buffer.from(part.body.data, 'base64url').toString('utf-8');
        if (part.parts) part.parts.forEach(extractRaw);
      }
      extractRaw(msg.data.payload);
      const text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, ' ').replace(/&\w+;/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
      return NextResponse.json({ subject, from, textLength: text.length, text: text.slice(0, 4000) });
    }

    if (mode === 'uber-html') {
      // Get raw uber receipt HTML
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: 'from:privaterelay.appleid.com uber subject:"trip with Uber"',
        maxResults: 1, includeSpamTrash: true,
      });
      if (!res.data.messages?.length) return NextResponse.json({ error: 'No Uber receipt found' });
      const msg = await gmail.users.messages.get({ userId: 'me', id: res.data.messages[0].id!, format: 'full' });
      const headers = msg.data.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value;

      // Extract body
      let html = '';
      function extractParts(part: typeof msg.data.payload) {
        if (!part) return;
        if (part.mimeType === 'text/html' && part.body?.data) {
          html = Buffer.from(part.body.data, 'base64url').toString('utf-8');
        }
        if (part.parts) part.parts.forEach(extractParts);
      }
      extractParts(msg.data.payload);

      // Strip to text for analysis
      const text = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#\d+;/g, ' ')
        .replace(/&\w+;/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return NextResponse.json({ subject, textLength: text.length, text: text.slice(0, 4000) });
    }

    if (mode === 'bolt-html') {
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: 'from:receipts-poland@bolt.eu subject:"Bolt trip"',
        maxResults: 1, includeSpamTrash: true,
      });
      if (!res.data.messages?.length) return NextResponse.json({ error: 'No Bolt receipt found' });
      const msg = await gmail.users.messages.get({ userId: 'me', id: res.data.messages[0].id!, format: 'full' });
      const headers = msg.data.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value;

      let html = '';
      function extractParts2(part: typeof msg.data.payload) {
        if (!part) return;
        if (part.mimeType === 'text/html' && part.body?.data) {
          html = Buffer.from(part.body.data, 'base64url').toString('utf-8');
        }
        if (part.parts) part.parts.forEach(extractParts2);
      }
      extractParts2(msg.data.payload);

      const text = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#\d+;/g, ' ')
        .replace(/&\w+;/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return NextResponse.json({ subject, textLength: text.length, text: text.slice(0, 4000) });
    }

    if (mode === 'search') {
      const q = url.searchParams.get('q') || 'from:uber.com';
      const allIds: string[] = [];
      let pageToken: string | undefined;
      do {
        const res = await gmail.users.messages.list({
          userId: 'me', q, maxResults: 100, includeSpamTrash: true, pageToken,
        });
        for (const m of (res.data.messages || [])) {
          if (m.id) allIds.push(m.id);
        }
        pageToken = res.data.nextPageToken || undefined;
      } while (pageToken);

      // Get headers for first 10
      const results = [];
      for (const id of allIds.slice(0, 10)) {
        const msg = await gmail.users.messages.get({ userId: 'me', id, format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] });
        const headers = msg.data.payload?.headers || [];
        results.push({
          id,
          from: headers.find(h => h.name === 'From')?.value,
          subject: headers.find(h => h.name === 'Subject')?.value,
          date: headers.find(h => h.name === 'Date')?.value,
        });
      }
      // Also get headers for last 10
      const lastResults = [];
      for (const id of allIds.slice(-10)) {
        const msg = await gmail.users.messages.get({ userId: 'me', id, format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] });
        const headers = msg.data.payload?.headers || [];
        lastResults.push({
          id,
          from: headers.find(h => h.name === 'From')?.value,
          subject: headers.find(h => h.name === 'Subject')?.value,
          date: headers.find(h => h.name === 'Date')?.value,
        });
      }
      return NextResponse.json({ query: q, totalIds: allIds.length, first10: results, last10: lastResults });
    }

    // Default: show current DB stats
    const receipts = await prisma.receipt.findMany({
      select: { provider: true, amountTotal: true, currency: true, city: true, country: true, rawEmailSubject: true, status: true, parsingConfidence: true },
      orderBy: { tripDate: 'desc' },
      take: 20,
    });
    return NextResponse.json({ totalReceipts: receipts.length, receipts });

  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.stack : String(e) });
  }
}
