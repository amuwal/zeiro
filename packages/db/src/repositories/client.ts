import { getPrisma } from '../server';

export function findClientByEmail(firmId: string, email: string) {
  return getPrisma().client.findUnique({
    where: { firmId_primaryEmail: { firmId, primaryEmail: email.toLowerCase() } },
  });
}

export function findClientByLineUserId(firmId: string, lineUserId: string) {
  return getPrisma().client.findUnique({
    where: { firmId_lineUserId: { firmId, lineUserId } },
  });
}

export function getClient(firmId: string, id: string) {
  return getPrisma().client.findFirstOrThrow({ where: { id, firmId } });
}
