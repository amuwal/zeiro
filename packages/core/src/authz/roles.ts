import { z } from 'zod';

// The authoritative authorization axis. `appRole` lives on the membership row
// and drives every permission decision. Clerk's org role (admin/member) is
// only used to mirror billing-admin status: owner ⟷ org:admin, everyone else
// ⟷ org:member.
export const APP_ROLES = ['owner', 'reviewer', 'staff', 'viewer'] as const;
export type AppRole = (typeof APP_ROLES)[number];

// Whether a user sees every client's inquiries or only the ones they're 担当 of.
// §54 守秘義務 makes "assigned-only" the defensible default for non-税理士 staff.
export const CLIENT_SCOPES = ['assigned', 'all'] as const;
export type ClientScope = (typeof CLIENT_SCOPES)[number];

// Per-client assignment kind (担当者 relation).
export const ASSIGNEE_ROLES = ['primary', 'secondary', 'reviewer'] as const;
export type AssigneeRole = (typeof ASSIGNEE_ROLES)[number];

export const appRoleSchema = z.enum(APP_ROLES);
export const clientScopeSchema = z.enum(CLIENT_SCOPES);
export const assigneeRoleSchema = z.enum(ASSIGNEE_ROLES);

export function asAppRole(value: string | null | undefined): AppRole {
  return APP_ROLES.includes(value as AppRole) ? (value as AppRole) : 'staff';
}

export function asClientScope(value: string | null | undefined): ClientScope {
  return value === 'all' ? 'all' : 'assigned';
}

export function asAssigneeRole(value: string | null | undefined): AssigneeRole {
  return ASSIGNEE_ROLES.includes(value as AssigneeRole) ? (value as AssigneeRole) : 'primary';
}

// owner > reviewer > staff > viewer. Used for "an actor may only manage roles
// at or below their own" and tree ordering.
export function roleRank(role: AppRole): number {
  switch (role) {
    case 'owner':
      return 3;
    case 'reviewer':
      return 2;
    case 'staff':
      return 1;
    case 'viewer':
      return 0;
  }
}

export function roleLabel(role: AppRole): string {
  switch (role) {
    case 'owner':
      return '所長';
    case 'reviewer':
      return '税理士';
    case 'staff':
      return '担当スタッフ';
    case 'viewer':
      return '閲覧';
  }
}

export function roleDescription(role: AppRole): string {
  switch (role) {
    case 'owner':
      return '全権限。連携設定・メンバー管理・削除要求(RTBF)・請求。事務所に1名以上。';
    case 'reviewer':
      return '問い合わせ対応 + 下書き送信 + ナレッジ編集 + 顧問先管理。連携・メンバー管理は不可。';
    case 'staff':
      return '問い合わせ対応・下書き作成。送信は所長/税理士の承認が必要(送信権限は個別付与可)。担当顧問先のみ閲覧。';
    case 'viewer':
      return '閲覧のみ。送信・編集は不可。';
  }
}

// Clerk org role ⟷ appRole bridge. Owner is the only role that maps to Clerk's
// billing-admin; the rest are org members whose authority is carried by appRole.
export function clerkRoleForAppRole(role: AppRole): 'org:admin' | 'org:member' {
  return role === 'owner' ? 'org:admin' : 'org:member';
}

// Sensible capability defaults when a role is assigned. Owner/Reviewer can send
// and see all clients; Staff/Viewer draft-only and assigned-scope.
export function defaultsForRole(role: AppRole): { canSend: boolean; clientScope: ClientScope } {
  switch (role) {
    case 'owner':
    case 'reviewer':
      return { canSend: true, clientScope: 'all' };
    case 'staff':
      return { canSend: false, clientScope: 'assigned' };
    case 'viewer':
      return { canSend: false, clientScope: 'assigned' };
  }
}
