export const CONTRACT_LABELS: Record<string, string> = {
  monthly: '顧問契約',
  spot: '単発',
  prospect: '見込み',
  unverified: '未確認',
  // legacy/imported tiers kept so they never render raw English
  premium: 'プレミアム顧問',
  standard: '顧問契約',
};

export const CONTRACT_OPTIONS = [
  { value: 'monthly', label: '顧問契約 (月次)' },
  { value: 'spot', label: '単発 (申告のみ等)' },
  { value: 'prospect', label: '見込み (リード)' },
  { value: 'unverified', label: '未確認' },
] as const;
