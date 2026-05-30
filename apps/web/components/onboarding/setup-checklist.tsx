import {
  findIntegration,
  getFirm,
  getInboxCounts,
  listClientsRich,
  listFirmUsers,
  listKnowledgeChunks,
} from '@zeiro/db';
import Link from 'next/link';
import { CopyButton } from '@/components/onboarding/copy-button';
import { Icon, type IconName } from '@/components/ui/icon';
import { requireFirmContext } from '@/lib/firm-context';

/**
 * SetupChecklist — first-run setup progress card (server component).
 *
 * Drop it on the dashboard with `<SetupChecklist />`. By default it fetches
 * everything it needs from the firm context. To avoid a second round-trip when
 * the parent already loaded these numbers, pass them in:
 *
 *   <SetupChecklist
 *     firmId={ctx.firmId}
 *     inboundAddress={firm.inboundAddress}
 *     clientCount={clients.length}
 *     memberCount={members.length}
 *     knowledgeCount={chunks.length}
 *     freeeActive={integration?.status === 'active'}
 *   />
 *
 * If `firmId` is omitted the component self-fetches via requireFirmContext().
 * Pass `clientCount` etc. only alongside `firmId`; partial props fall back to a
 * self-fetch so the card is never half-computed.
 */

type Props = {
  firmId?: string;
  inboundAddress?: string;
  inquiryReceived?: boolean;
  clientCount?: number;
  memberCount?: number;
  knowledgeCount?: number;
  freeeActive?: boolean;
};

type StepState = {
  num: number;
  icon: IconName;
  title: string;
  sub: string;
  href: string;
  done: boolean;
  optional?: boolean;
};

type SetupData = {
  inboundAddress: string;
  inquiryReceived: boolean;
  clientCount: number;
  memberCount: number;
  knowledgeCount: number;
  freeeActive: boolean;
};

function fromProps(props: Props): SetupData | null {
  const {
    firmId,
    inboundAddress,
    inquiryReceived,
    clientCount,
    memberCount,
    knowledgeCount,
    freeeActive,
  } = props;
  if (
    firmId === undefined ||
    inboundAddress === undefined ||
    inquiryReceived === undefined ||
    clientCount === undefined ||
    memberCount === undefined ||
    knowledgeCount === undefined ||
    freeeActive === undefined
  ) {
    return null;
  }
  return { inboundAddress, inquiryReceived, clientCount, memberCount, knowledgeCount, freeeActive };
}

async function resolveData(props: Props): Promise<SetupData> {
  const fromCaller = fromProps(props);
  if (fromCaller) return fromCaller;

  const ctx = await requireFirmContext();
  const [firm, clients, members, chunks, freee, counts] = await Promise.all([
    getFirm(ctx.firmId),
    listClientsRich(ctx.firmId),
    listFirmUsers(ctx.firmId),
    listKnowledgeChunks(ctx.firmId),
    findIntegration(ctx.firmId, 'freee'),
    getInboxCounts(ctx.firmId),
  ]);
  return {
    inboundAddress: firm.inboundAddress,
    inquiryReceived: counts.all > 0,
    clientCount: clients.length,
    memberCount: members.length,
    knowledgeCount: chunks.length,
    freeeActive: freee?.status === 'active',
  };
}

export async function SetupChecklist(props: Props) {
  const data = await resolveData(props);

  const steps: StepState[] = [
    {
      num: 1,
      icon: 'inbox',
      title: '受信アドレスを共有',
      sub: '顧問先からのメールをこのアドレスへ転送（最初の1通で完了）',
      href: '/settings',
      done: data.inquiryReceived,
    },
    {
      num: 2,
      icon: 'upload',
      title: '顧問先マスタを取り込む',
      sub: 'CSV から顧問先を一括で取り込み',
      href: '/clients/import',
      done: data.clientCount > 0,
    },
    {
      num: 3,
      icon: 'users',
      title: 'チームを招待して担当を割り当て',
      sub: 'メンバーを招待し、顧問先の担当を設定',
      href: '/settings',
      done: data.memberCount > 1,
    },
    {
      num: 4,
      icon: 'book',
      title: 'ナレッジを追加',
      sub: '事務所の回答資産を登録して下書き精度を向上',
      href: '/knowledge/new',
      done: data.knowledgeCount > 0,
    },
    {
      num: 5,
      icon: 'spark',
      title: 'freee を連携',
      sub: '会計データを参照して回答の根拠に',
      href: '/settings',
      done: data.freeeActive,
      optional: true,
    },
  ];

  const completed = steps.filter((s) => s.done).length;

  return (
    <section className="rounded-lg border border-line bg-surface shadow-sm">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-sans text-[13px] font-semibold text-ink">セットアップ</h2>
        <span className="text-[11px] font-medium text-muted">{completed}/5 完了</span>
      </header>

      <div className="flex items-center justify-between gap-3 border-b border-line bg-bg-2 px-4 py-2.5">
        <code className="truncate font-mono text-[12px] text-ink-2">{data.inboundAddress}</code>
        <CopyButton text={data.inboundAddress} />
      </div>

      <ul className="flex flex-col">
        {steps.map((step) => (
          <StepRow key={step.num} step={step} />
        ))}
      </ul>
    </section>
  );
}

function StepRow({ step }: { step: StepState }) {
  return (
    <li className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-[12px] font-semibold ${
          step.done ? 'bg-accent-soft text-accent' : 'border border-line text-muted'
        }`}
      >
        {step.done ? <Icon name="check" size={14} /> : step.num}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium text-ink">{step.title}</span>
          {step.optional && (
            <span className="rounded-sm bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent-ink">
              任意
            </span>
          )}
        </span>
        <span className="block truncate text-[11px] text-muted">{step.sub}</span>
      </span>
      {step.done ? (
        <span className="shrink-0 text-[11px] font-medium text-positive">完了</span>
      ) : (
        <Link
          href={step.href}
          className="flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-accent hover:underline"
        >
          設定する
          <Icon name="arrow-right" size={12} />
        </Link>
      )}
    </li>
  );
}

export default SetupChecklist;
