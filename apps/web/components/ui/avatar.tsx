import { makeInitials } from '@/lib/format';

export function Avatar({ name }: { name: string }) {
  return <div className="pic">{makeInitials(name)}</div>;
}
