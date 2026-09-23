export type AgentScope = 'Professional' | 'Personal';
export type AgentGender = 'male' | 'female';

export type AgentDefinition = {
  id: string;
  name: string;
  role: string;
  scope: AgentScope;
  gender?: AgentGender;
  avatar: string;
};

// Suchi is the only initial agent. Specialist agents are created dynamically by Gemini.
export const EXISTING_AGENTS: AgentDefinition[] = [];

export function findMatchingAgent(agents: AgentDefinition[], name: string, role: string, scope: AgentScope) {
  const n = name.toLowerCase().trim();
  const r = role.toLowerCase().trim();
  return agents.find((agent) => {
    if (agent.scope !== scope) return false;
    const an = agent.name.toLowerCase();
    const ar = agent.role.toLowerCase();
    return (n && (an.includes(n) || n.includes(an))) || (r && (ar.includes(r) || r.includes(ar)));
  });
}

export function makeAvatar(role: string, gender: AgentGender = 'female') {
  const r = role.toLowerCase();
  const female = ['🦋', '🦊', '🐼', '🐨', '🐰', '🦉', '🐬', '🌸'];
  const male = ['🦁', '🐙', '🐺', '🦅', '🐻', '🦝', '🐯', '🌿'];
  const set = gender === 'female' ? female : male;
  if (/legal|finance|contract/.test(r)) return gender === 'female' ? '🦉' : '🦁';
  if (/calendar|travel|schedule|logistics/.test(r)) return gender === 'female' ? '🦊' : '🦅';
  if (/product|design|creative|research/.test(r)) return gender === 'female' ? '🐼' : '🐺';
  if (/infra|cloud|api|engineering|technical/.test(r)) return gender === 'female' ? '🐬' : '🐙';
  if (/health|well-being|fitness/.test(r)) return gender === 'female' ? '🐨' : '🐻';
  if (/home|family|personal/.test(r)) return gender === 'female' ? '🐰' : '🦝';
  if (/writing|content|communication/.test(r)) return gender === 'female' ? '🦋' : '🦅';
  return set[Math.floor(Math.random() * set.length)];
}
