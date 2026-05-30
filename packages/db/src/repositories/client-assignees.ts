import { getPrisma } from '../server';

export type ClientAssigneeRow = {
  clientId: string;
  userId: string;
  role: string;
  userName: string;
  userEmail: string;
};

// The allow-list of client IDs an assigned-scope user may see. Drives inbox /
// clients / analytics scoping for Staff and Viewer.
export async function listAssignedClientIds(firmId: string, userId: string): Promise<string[]> {
  const rows = await getPrisma().clientAssignee.findMany({
    where: { firmId, userId },
    select: { clientId: true },
  });
  return rows.map((r) => r.clientId);
}

export async function countAssignedClients(firmId: string, userId: string): Promise<number> {
  return getPrisma().clientAssignee.count({ where: { firmId, userId } });
}

export async function listAssigneesForClient(
  firmId: string,
  clientId: string,
): Promise<ClientAssigneeRow[]> {
  const rows = await getPrisma().clientAssignee.findMany({
    where: { firmId, clientId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((r) => ({
    clientId: r.clientId,
    userId: r.userId,
    role: r.role,
    userName: r.user.name,
    userEmail: r.user.email,
  }));
}

// Assignees for many clients at once, keyed by clientId — for the clients list.
export async function assigneesByClient(
  firmId: string,
  clientIds: string[],
): Promise<Map<string, ClientAssigneeRow[]>> {
  const byClient = new Map<string, ClientAssigneeRow[]>();
  if (clientIds.length === 0) return byClient;
  const rows = await getPrisma().clientAssignee.findMany({
    where: { firmId, clientId: { in: clientIds } },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
  for (const r of rows) {
    const entry: ClientAssigneeRow = {
      clientId: r.clientId,
      userId: r.userId,
      role: r.role,
      userName: r.user.name,
      userEmail: r.user.email,
    };
    const list = byClient.get(r.clientId);
    if (list) list.push(entry);
    else byClient.set(r.clientId, [entry]);
  }
  return byClient;
}

export async function addClientAssignee(input: {
  firmId: string;
  clientId: string;
  userId: string;
  role?: string;
}): Promise<void> {
  await getPrisma().clientAssignee.upsert({
    where: { clientId_userId: { clientId: input.clientId, userId: input.userId } },
    update: { role: input.role ?? 'primary' },
    create: {
      firmId: input.firmId,
      clientId: input.clientId,
      userId: input.userId,
      role: input.role ?? 'primary',
    },
  });
}

export async function removeClientAssignee(
  firmId: string,
  clientId: string,
  userId: string,
): Promise<void> {
  await getPrisma().clientAssignee.deleteMany({ where: { firmId, clientId, userId } });
}
