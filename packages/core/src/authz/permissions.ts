import type { AppRole } from './roles';

// Discrete capability actions gated by appRole. Data *visibility* (which
// clients/inquiries a user sees) is a separate concern handled by clientScope
// at the repository layer — these are the "may this actor perform X" gates.
export const ACTIONS = [
  'inquiry.draft', // generate / edit an AI draft
  'inquiry.reject', // reject a draft for rewrite
  'inquiry.note', // internal note / comment
  'inquiry.send', // send a reply to the client (blast-radius)
  'inquiry.reassign', // change an inquiry's 担当
  'knowledge.propose', // suggest knowledge (e.g. auto-add on send)
  'knowledge.edit', // add / edit firm-authoritative knowledge
  'knowledge.delete', // remove knowledge
  'knowledge.flagReview', // 法改正 mandatory-review flag
  'client.manage', // create / edit / import 顧問先
  'client.assign', // assign 担当者 to a client
  'client.tombstone', // RTBF / delete client data (destructive)
  'integration.manage', // connect / disconnect freee etc. (firm-wide data access)
  'channel.manage', // LINE / web form / email channel config
  'member.manage', // invite / remove / set member role
  'member.setCapabilities', // toggle another user's send / scope
  'analytics.viewFirm', // firm-wide KPIs
  'analytics.viewOwn', // own / assigned-client KPIs
  'audit.view', // audit log explorer
  'billing.manage', // plan / billing
] as const;
export type Action = (typeof ACTIONS)[number];

export type Actor = {
  role: AppRole;
  canSend: boolean;
};

// Base allow-list per action. `inquiry.send` is special-cased below to honour
// the per-user canSend flag for staff.
const ALLOW: Record<Action, readonly AppRole[]> = {
  'inquiry.draft': ['owner', 'reviewer', 'staff'],
  'inquiry.reject': ['owner', 'reviewer', 'staff'],
  'inquiry.note': ['owner', 'reviewer', 'staff', 'viewer'],
  'inquiry.send': ['owner', 'reviewer'],
  'inquiry.reassign': ['owner', 'reviewer'],
  'knowledge.propose': ['owner', 'reviewer', 'staff'],
  'knowledge.edit': ['owner', 'reviewer'],
  'knowledge.delete': ['owner', 'reviewer'],
  'knowledge.flagReview': ['owner', 'reviewer'],
  'client.manage': ['owner', 'reviewer'],
  'client.assign': ['owner', 'reviewer'],
  'client.tombstone': ['owner'],
  'integration.manage': ['owner'],
  'channel.manage': ['owner'],
  'member.manage': ['owner'],
  'member.setCapabilities': ['owner'],
  'analytics.viewFirm': ['owner', 'reviewer'],
  'analytics.viewOwn': ['owner', 'reviewer', 'staff'],
  'audit.view': ['owner'],
  'billing.manage': ['owner'],
};

export function can(actor: Actor, action: Action): boolean {
  if (action === 'inquiry.send') {
    if (actor.role === 'owner' || actor.role === 'reviewer') return true;
    if (actor.role === 'staff') return actor.canSend;
    return false;
  }
  return ALLOW[action].includes(actor.role);
}

// Owner is the only role that administers membership; this guards the team UI
// and the role-change actions. Demoting the last owner is a separate call-site
// guard (ensureNotLastOwner).
export function canManageMembers(actor: Actor): boolean {
  return actor.role === 'owner';
}

// Convenience for routes/pages that should 404/redirect non-permitted users.
export function assertCan(actor: Actor, action: Action): void {
  if (!can(actor, action)) {
    throw new ForbiddenError(action);
  }
}

export class ForbiddenError extends Error {
  readonly action: Action;
  constructor(action: Action) {
    super(`権限がありません: ${action}`);
    this.name = 'ForbiddenError';
    this.action = action;
  }
}
