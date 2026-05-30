'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { cloneElement, type ReactElement, type ReactNode, useEffect, useId, useRef } from 'react';
import { CopyButton } from '@/components/onboarding/copy-button';
import { BrandButton } from '@/components/ui/brand-button';
import { Icon, type IconName } from '@/components/ui/icon';

const itemV = { enter: { opacity: 0, y: 8 }, center: { opacity: 1, y: 0 } };
export function Item({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={itemV} transition={{ type: 'spring', stiffness: 320, damping: 26 }}>
      {children}
    </motion.div>
  );
}

function StepHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <Item>
      <p className="text-[12px] font-semibold tracking-[0.06em] text-accent">{eyebrow}</p>
      <h1 className="mt-2 font-sans text-[23px] font-semibold tracking-[-0.02em] text-ink">
        {title}
      </h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{sub}</p>
    </Item>
  );
}

export function ProfileStep({
  firmName,
  signature,
  onFirmName,
  onSignature,
  action,
  saving,
  error,
}: {
  firmName: string;
  signature: string;
  onFirmName: (v: string) => void;
  onSignature: (v: string) => void;
  action: (fd: FormData) => void;
  saving: boolean;
  error: string | null;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    nameRef.current?.focus();
  }, []);
  return (
    <div className="flex flex-col gap-5">
      <StepHead
        eyebrow="事務所プロフィール"
        title="Zeiro へようこそ"
        sub="返信の差出人・署名に使う事務所情報を設定します。右のプレビューに即反映されます。"
      />
      <form action={action} className="flex flex-col gap-4">
        <Item>
          <Field label="事務所名" hint="例: さくら税理士事務所">
            <input
              ref={nameRef}
              name="name"
              value={firmName}
              onChange={(e) => onFirmName(e.target.value)}
              required
              className={inputCls}
            />
          </Field>
        </Item>
        <Item>
          <Field label="担当者署名" hint="任意 — 返信の結びに使います">
            <input
              name="signature"
              value={signature}
              onChange={(e) => onSignature(e.target.value)}
              placeholder="例: 税理士 佐藤 太郎"
              className={inputCls}
            />
          </Field>
        </Item>
        {error && <p className="text-[12px] text-urgent">{error}</p>}
        <Item>
          <BrandButton type="submit" disabled={saving}>
            {saving ? '保存中…' : '保存して次へ'} <Icon name="arrow-right" size={14} />
          </BrandButton>
        </Item>
      </form>
    </div>
  );
}

export function InboxStep({
  inboundAddress,
  onBack,
  onNext,
}: {
  inboundAddress: string;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <StepHead
        eyebrow="受信トレイ"
        title="受信トレイをつなぐ"
        sub="顧問先のメールをこの専用アドレスへ自動転送すると、AI が下書きを作成します。"
      />
      <Item>
        <div className="flex items-center gap-2 rounded-md border border-line bg-bg-2 px-3 py-2.5">
          <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink-2">
            {inboundAddress}
          </code>
          <CopyButton text={inboundAddress} />
        </div>
        <p className="mt-2 text-[12px] text-muted">
          Gmail / Outlook の自動転送の手順は、設定 → メール受信 で確認できます。
        </p>
      </Item>
      <Item>
        <div className="flex items-center gap-4">
          <BackButton onClick={onBack} />
          <BrandButton type="button" onClick={onNext}>
            次へ <Icon name="arrow-right" size={14} />
          </BrandButton>
        </div>
      </Item>
    </div>
  );
}

export function DoneStep({
  leaving,
  onTest,
  onDashboard,
  onBack,
}: {
  leaving: boolean;
  onTest: () => void;
  onDashboard: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <StepHead
        eyebrow="準備完了"
        title="準備が整いました"
        sub="サンプルの問い合わせを送って、AI の下書きがその場で作られる様子を確認しましょう。"
      />
      <Item>
        <BrandButton type="button" disabled={leaving} onClick={onTest} className="w-full py-3">
          <Icon name="spark" size={15} />
          {leaving ? 'AI が下書き中…' : 'テスト問い合わせを送って試す'}
        </BrandButton>
      </Item>
      <Item>
        <div className="flex flex-col divide-y divide-line overflow-hidden rounded-md border border-line">
          <NextRow href="/clients/import" icon="upload" label="顧問先を取り込む" />
          <NextRow href="/knowledge/new" icon="book" label="ナレッジを追加" />
          <NextRow href="/settings" icon="settings" label="freee を連携" />
        </div>
      </Item>
      <Item>
        <div className="flex items-center gap-4">
          <BackButton onClick={onBack} />
          <button
            type="button"
            disabled={leaving}
            onClick={onDashboard}
            className="text-[13px] font-medium text-accent transition-colors hover:text-accent-ink disabled:opacity-60"
          >
            ダッシュボードへ進む →
          </button>
        </div>
      </Item>
    </div>
  );
}

const inputCls =
  'w-full rounded-md border border-line bg-bg-2 px-3.5 py-2.5 text-[14px] text-ink outline-none transition-[border-color,box-shadow] focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactElement<{ id?: string }>;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-baseline gap-2">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        <span className="text-[11px] text-muted">{hint}</span>
      </label>
      {cloneElement(children, { id })}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[13px] text-muted transition-colors hover:text-ink"
    >
      戻る
    </button>
  );
}

function NextRow({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2.5 bg-bg-2 px-3 py-2.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-surface hover:text-accent-ink"
    >
      <Icon name={icon} size={14} className="text-muted" />
      {label}
      <Icon
        name="arrow-right"
        size={13}
        className="ml-auto text-muted transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
