import { cookies } from 'next/headers';
import { EncryptJWT, jwtDecrypt } from 'jose';
import crypto from 'node:crypto';

export const TOOL_KEYS = ['gmail', 'calendar', 'tasks', 'drive', 'docs', 'sheets', 'slides', 'forms'] as const;
export type ToolKey = typeof TOOL_KEYS[number];
export type ToolPreferences = Record<ToolKey, boolean>;

const COOKIE = 'suchi_tool_preferences';
const DEFAULTS: ToolPreferences = {
  gmail: true,
  calendar: true,
  tasks: true,
  drive: true,
  docs: true,
  sheets: true,
  slides: true,
  forms: true,
};

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');
  return crypto.createHash('sha256').update(value).digest();
}

export async function getToolPreferences(): Promise<ToolPreferences> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return { ...DEFAULTS };
  try {
    const { payload } = await jwtDecrypt(raw, secret(), { algorithms: ['dir'] });
    const tools = payload.tools as Partial<ToolPreferences> | undefined;
    return { ...DEFAULTS, ...Object.fromEntries(TOOL_KEYS.map((key) => [key, tools?.[key] !== false])) } as ToolPreferences;
  } catch {
    return { ...DEFAULTS };
  }
}

export async function clearToolPreferences() {
  (await cookies()).delete(COOKIE);
}

export async function setToolPreferences(input: Partial<ToolPreferences>) {
  const current = await getToolPreferences();
  const next = { ...current, ...Object.fromEntries(TOOL_KEYS.map((key) => [key, input[key] !== false])) } as ToolPreferences;
  const token = await new EncryptJWT({ tools: next })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .encrypt(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return next;
}
