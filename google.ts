import { google } from 'googleapis';
import crypto from 'node:crypto';

export const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/forms.body',
];

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function redirectUri() {
  const appUrl = required('APP_URL').replace(/\/$/, '');
  return `${appUrl}/api/auth/callback`;
}

export function oauthClient() {
  return new google.auth.OAuth2(required('GOOGLE_CLIENT_ID'), required('GOOGLE_CLIENT_SECRET'), redirectUri());
}

export function createState() {
  return crypto.randomBytes(32).toString('base64url');
}

export function authorizedClient(session: { accessToken: string; refreshToken?: string; expiry?: number }) {
  const auth = new google.auth.OAuth2(required('GOOGLE_CLIENT_ID'), required('GOOGLE_CLIENT_SECRET'));
  auth.setCredentials({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    expiry_date: session.expiry,
  });
  return auth;
}

function decodeHeaderValue(headers: { name?: string | null; value?: string | null }[] | undefined, name: string) {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

function extractPlainText(payload: any): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  }
  if (Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const text = extractPlainText(part);
      if (text) return text;
    }
  }
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  }
  return '';
}

export type UnreadEmailSummary = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
};

export async function listUnreadNeedingReply(auth: InstanceType<typeof google.auth.OAuth2>, maxResults = 10): Promise<UnreadEmailSummary[]> {
  const gmail = google.gmail({ version: 'v1', auth });
  const list = await gmail.users.messages.list({ userId: 'me', q: 'is:unread in:inbox -category:promotions -category:social', maxResults });
  const messages = list.data.messages || [];
  const details = await Promise.all(
    messages.map(async (m) => {
      if (!m.id) return null;
      const full = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['Subject', 'From', 'Date'] });
      return {
        id: m.id,
        threadId: full.data.threadId || m.id,
        subject: decodeHeaderValue(full.data.payload?.headers, 'Subject') || '(no subject)',
        from: decodeHeaderValue(full.data.payload?.headers, 'From') || 'Unknown sender',
        snippet: full.data.snippet || '',
        date: decodeHeaderValue(full.data.payload?.headers, 'Date') || '',
      };
    }),
  );
  return details.filter((d): d is UnreadEmailSummary => Boolean(d));
}

export type FullEmail = UnreadEmailSummary & { body: string; to: string; messageIdHeader: string };

export async function getFullEmail(auth: InstanceType<typeof google.auth.OAuth2>, messageId: string): Promise<FullEmail> {
  const gmail = google.gmail({ version: 'v1', auth });
  const full = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
  const headers = full.data.payload?.headers;
  return {
    id: messageId,
    threadId: full.data.threadId || messageId,
    subject: decodeHeaderValue(headers, 'Subject') || '(no subject)',
    from: decodeHeaderValue(headers, 'From') || 'Unknown sender',
    to: decodeHeaderValue(headers, 'To') || '',
    snippet: full.data.snippet || '',
    date: decodeHeaderValue(headers, 'Date') || '',
    body: extractPlainText(full.data.payload) || full.data.snippet || '',
    messageIdHeader: decodeHeaderValue(headers, 'Message-ID'),
  };
}

function extractEmailAddress(fromHeader: string) {
  const match = fromHeader.match(/<([^>]+)>/);
  return match ? match[1] : fromHeader.trim();
}

export async function createGmailDraftReply(
  auth: InstanceType<typeof google.auth.OAuth2>,
  params: { threadId: string; to: string; subject: string; body: string; inReplyTo?: string },
) {
  const gmail = google.gmail({ version: 'v1', auth });
  const toAddress = extractEmailAddress(params.to);
  const replySubject = params.subject.toLowerCase().startsWith('re:') ? params.subject : `Re: ${params.subject}`;
  const lines = [
    `To: ${toAddress}`,
    `Subject: ${replySubject}`,
    params.inReplyTo ? `In-Reply-To: ${params.inReplyTo}` : '',
    params.inReplyTo ? `References: ${params.inReplyTo}` : '',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    params.body,
  ].filter((line) => line !== '');
  const raw = Buffer.from(lines.join('\r\n')).toString('base64url');

  const draft = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw, threadId: params.threadId } },
  });
  return draft.data;
}
