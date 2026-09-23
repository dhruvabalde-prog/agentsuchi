import { GoogleGenAI, Type } from '@google/genai';
import type { AgentDefinition } from './agents';
import { DIRECTIVES_PROMPT } from './directives';

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function models() {
  const primary = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  return [...new Set([primary, 'gemini-2.5-flash'])];
}

function isTemporaryModelError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /503|UNAVAILABLE|high demand|temporarily unavailable|overloaded|429|RESOURCE_EXHAUSTED/i.test(message);
}

async function generateWithFallback<T>(build: (ai: GoogleGenAI, model: string) => Promise<T>) {
  const ai = new GoogleGenAI({ apiKey: required('GEMINI_API_KEY') });
  let lastError: unknown;
  for (const model of models()) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await build(ai, model);
      } catch (error) {
        lastError = error;
        if (!isTemporaryModelError(error) || attempt === 1) break;
        await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
      }
    }
  }
  if (isTemporaryModelError(lastError)) {
    throw new Error('Gemini is temporarily unavailable. Suchi is ready to retry; please try again in a moment.');
  }
  throw lastError instanceof Error ? lastError : new Error('Gemini request failed.');
}

export async function planWithGemini(
  message: string,
  scope: 'Professional' | 'Personal' | 'General',
  agentContext?: { name: string; role: string },
  availableAgents: AgentDefinition[] = [],
) {
  const existing = availableAgents.length
    ? `Existing specialist agents (reuse one when the task clearly matches; do not create a duplicate):\n${availableAgents.map((a) => `- ${a.name} | ${a.role} | ${a.scope}`).join('\n')}`
    : 'There are currently no specialist agents. Suchi is the only agent at startup.';

  const context = agentContext
    ? `You are the delegated specialist agent "${agentContext.name}" (${agentContext.role}). Suchi is female and uses she/her pronouns. Do not create another agent. Work on the user's request and give a concrete deliverable or action update.`
    : `You are Suchi AI, a female master orchestrator (she/her). Suchi is the only initial agent. Classify work as General, Personal, or Professional. General administrative work stays with Suchi. Personal and Professional work that needs sustained specialist handling is delegated to a specialist agent. Reuse an existing matching specialist when possible; otherwise create one. Keep specialist personalities distinct but professional.`;

  const response = await generateWithFallback((ai, model) => ai.models.generateContent({
    model,
    contents: `${DIRECTIVES_PROMPT}\n\n${context}\n${existing}\nUser scope: ${scope}\nUser request: ${message}`,
    config: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: { type: Type.STRING },
          shouldDelegate: { type: Type.BOOLEAN },
          agentName: { type: Type.STRING },
          agentRole: { type: Type.STRING },
          agentGender: { type: Type.STRING, enum: ['male', 'female'] },
          action: { type: Type.STRING, enum: ['none', 'create_calendar_event', 'create_task'] },
          eventTitle: { type: Type.STRING },
          eventStart: { type: Type.STRING },
          eventEnd: { type: Type.STRING },
          taskTitle: { type: Type.STRING },
        },
        required: ['reply', 'shouldDelegate', 'agentName', 'agentRole', 'action'],
      },
    },
  }));

  try {
    return JSON.parse(response.text || '{}');
  } catch {
    throw new Error('Gemini returned an invalid structured response.');
  }
}

export async function draftEmailReply(email: { from: string; subject: string; body: string }) {
  return generateWithFallback(async (ai, model) => {
    const response = await ai.models.generateContent({
      model,
      contents: `${DIRECTIVES_PROMPT}\n\nDraft a concise, professional English reply to this email. Only return the reply body text, no subject line, no headers, no markdown.\n\nFrom: ${email.from}\nSubject: ${email.subject}\nBody:\n${email.body.slice(0, 6000)}`,
      config: { temperature: 0.4 },
    });
    return (response.text || '').trim();
  });
}
