/* global React */
const { useState, useMemo, useEffect, useRef } = React;

// ===== Categories =====
const CATEGORIES = {
  deadline: {
    id: 'deadline',
    jp: '期日確認',
    en: 'Deadline',
    color: 'var(--cat-deadline)',
    soft: 'var(--cat-deadline-soft)',
  },
  docs: {
    id: 'docs',
    jp: '書類提出',
    en: 'Documents',
    color: 'var(--cat-docs)',
    soft: 'var(--cat-docs-soft)',
  },
  tax: {
    id: 'tax',
    jp: '税務質問',
    en: 'Tax',
    color: 'var(--cat-tax)',
    soft: 'var(--cat-tax-soft)',
  },
  contract: {
    id: 'contract',
    jp: '顧問契約',
    en: 'Contract',
    color: 'var(--cat-contract)',
    soft: 'var(--cat-contract-soft)',
  },
  other: {
    id: 'other',
    jp: 'その他',
    en: 'Other',
    color: 'var(--cat-other)',
    soft: 'var(--cat-other-soft)',
  },
};

// ===== Knowledge base entries (referenced by drafts) =====
const KB = {
  'kb-001': {
    title: '法人税申告書 提出期限の運用ルール',
    src: '事務所マニュアル',
    section: '§ 4.2',
    updated: '2025-12-04',
    uses: 142,
    status: 'fresh',
  },
  'kb-002': {
    title: '決算月別 申告期限カレンダー（3月決算）',
    src: 'FAQ集',
    section: 'Q-018',
    updated: '2026-01-20',
    uses: 88,
    status: 'fresh',
  },
  'kb-003': {
    title: '山田商事 顧問契約 特記事項',
    src: '顧問先マスタ',
    section: 'C-0142',
    updated: '2025-08-11',
    uses: 12,
    status: 'fresh',
  },
  'kb-004': {
    title: '源泉徴収票 送付先運用（住所変更時）',
    src: '過去回答ログ',
    section: '2025-11',
    updated: '2025-11-02',
    uses: 47,
    status: 'fresh',
  },
  'kb-005': {
    title: '電子提出（e-Tax）優先運用ガイド',
    src: '事務所マニュアル',
    section: '§ 6.1',
    updated: '2025-09-30',
    uses: 64,
    status: 'review',
  },
  'kb-006': {
    title: '役員報酬 期中改定の例外要件',
    src: '業務マニュアル',
    section: '§ 11.4',
    updated: '2024-04-12',
    uses: 31,
    status: 'outdated',
  },
  'kb-007': {
    title: '税務調査 初動対応プロトコル',
    src: '所内規程',
    section: '§ S-01',
    updated: '2025-06-20',
    uses: 8,
    status: 'fresh',
  },
  'kb-008': {
    title: '消費税 中間納付 (年11回)スケジュール',
    src: 'FAQ集',
    section: 'Q-031',
    updated: '2026-02-08',
    uses: 53,
    status: 'fresh',
  },
  'kb-009': {
    title: '海外送金 源泉徴収判定フロー',
    src: '業務マニュアル',
    section: '§ 9.7',
    updated: '2025-10-14',
    uses: 19,
    status: 'review',
  },
  'kb-010': {
    title: '年末調整 受付期限と督促ルール',
    src: 'FAQ集',
    section: 'Q-007',
    updated: '2025-11-25',
    uses: 96,
    status: 'fresh',
  },
};

// ===== Inquiries =====
const INQUIRIES = [
  {
    id: 'INQ-2026-0418',
    company: '株式会社山田商事',
    contactName: '山田 正彦',
    contactRole: '経理部長',
    email: 'yamada@yamada-shoji.co.jp',
    initials: 'YS',
    received: '10:42',
    receivedFull: '2026-05-09 10:42',
    subject: '3月決算法人税の申告期限について確認させてください',
    preview: 'いつもお世話になっております。本年度の法人税申告ですが、提出期限と納付期限について…',
    body: `税理士法人 凜事務所
担当 ○○様

いつもお世話になっております。山田商事 経理部の山田です。

本年度の法人税の申告について、提出期限と納付期限を改めて確認させていただきたくご連絡しました。
当社は3月決算ですので、原則は5月末日と認識しておりますが、念のため正確な日付をいただけますでしょうか。

また、e-Taxでの電子提出を希望しております。必要な書類があれば併せてご教示ください。

何卒よろしくお願い申し上げます。

──────────
株式会社山田商事 経理部
山田 正彦
TEL: 03-XXXX-XXXX`,
    attachments: [{ name: '決算書ドラフト_2025FY.pdf', size: '2.4MB', type: 'pdf' }],
    category: 'deadline',
    confidence: 0.94,
    status: 'draft',
    urgent: false,
    unread: true,
    aiReason:
      '「申告期限」「納付期限」「3月決算」の語句と過去同様の問い合わせパターンから「期日確認」と判定。顧問先マスタの契約区分（標準法人税顧問）と整合。',
    citations: ['kb-001', 'kb-002', 'kb-003', 'kb-005'],
    draft: [
      { t: '山田 正彦様' },
      { t: '' },
      { t: 'いつもお世話になっております。' },
      { t: '' },
      {
        t: 'ご照会いただきました法人税の申告・納付期限につきまして、以下のとおりご回答申し上げます。',
      },
      { t: '' },
      { t: '■ 提出期限・納付期限' },
      { t: '貴社は3月決算（事業年度末: 2026年3月31日）ですので、' },
      { t: ' ・法人税申告書の提出期限: ' },
      { t: '2026年5月31日（日）', b: true },
      { t: '（ただし当日が日曜のため、翌営業日 6月1日まで）', c: 'kb-001' },
      { t: '\n ・法人税の納付期限: 同日（提出と同日まで）', c: 'kb-002' },
      { t: '\n ・地方法人税・法人事業税・法人住民税: 同様に6月1日が期限となります。', c: 'kb-002' },
      { t: '' },
      { t: '' },
      { t: '■ e-Tax電子提出について' },
      {
        t: '電子申告ご希望の旨、承知いたしました。当事務所では原則すべての法人申告をe-Taxにて行っております。',
        c: 'kb-005',
      },
      { t: '\n貴社からご準備いただく書類は以下のとおりです：' },
      { t: '\n  1. 決算書（PL/BS/SS）— 既にドラフトをお送りいただきありがとうございます' },
      { t: '\n  2. 勘定科目内訳明細書' },
      { t: '\n  3. 事業概況説明書' },
      { t: '' },
      { t: '' },
      {
        t: '貴社の顧問契約には「申告書ドラフトの事前確認」が含まれておりますので、5月20日頃に弊所より確認用のドラフトをお送りいたします。',
        c: 'kb-003',
      },
      { t: '' },
      { t: 'ご不明な点がございましたら、お気軽にお問い合わせください。' },
      { t: '' },
      { t: '' },
      { t: '税理士法人 凜事務所' },
      { t: '担当: 佐藤 健一' },
    ],
  },
  {
    id: 'INQ-2026-0417',
    company: '合同会社みらいテック',
    contactName: '鈴木 拓海',
    contactRole: '代表',
    email: 'suzuki@mirai-tech.jp',
    initials: 'MT',
    received: '10:21',
    receivedFull: '2026-05-09 10:21',
    subject: '【至急】税務調査の事前通知が来ました',
    preview: '本日、税務署から電話があり、来月初旬に税務調査を実施したいとの連絡がありました。…',
    body: `凜事務所 担当者様

お世話になっております。合同会社みらいテック 代表の鈴木です。

本日、税務署より電話がございまして、来月（6月）初旬に税務調査を実施したい旨の連絡がありました。
正直なところ、何をどう準備すればよいか分からず、不安です。
近日中にお打ち合わせのお時間をいただけませんでしょうか。

ご対応よろしくお願いいたします。`,
    attachments: [],
    category: 'tax',
    confidence: 0.62,
    status: 'escalated',
    urgent: true,
    unread: true,
    aiReason:
      '「税務調査」キーワードを検知。緊急度フラグが立つカテゴリのため、所長への即時エスカレーションを推奨。下書きは「初動連絡のみ」のテンプレートを使用。',
    citations: ['kb-007'],
    draft: [
      { t: '鈴木 拓海様' },
      { t: '' },
      { t: 'ご連絡ありがとうございます。税務調査のご通知の件、承知いたしました。', c: 'kb-007' },
      { t: '' },
      {
        t: '本件は所長税理士の佐藤が直接対応させていただきます。本日中（17:00まで）に佐藤よりお電話を差し上げます。',
        b: true,
      },
      { t: '' },
      {
        t: 'それまでの間、以下のものをお手元にご用意いただけますと、初動の打ち合わせがスムーズです：',
      },
      { t: '\n  • 税務署からの通知書面（あれば）' },
      { t: '\n  • 直近3期分の総勘定元帳・領収書ファイル' },
      { t: '\n  • 担当調査官の氏名・所属部署' },
      { t: '' },
      {
        t: 'ご不安な点も多いかと存じますが、初動対応は当事務所が完全にサポートいたします。どうぞご安心ください。',
        c: 'kb-007',
      },
    ],
  },
  {
    id: 'INQ-2026-0416',
    company: '田中製作所株式会社',
    contactName: '田中 美咲',
    contactRole: '総務',
    email: 'misaki.tanaka@tanaka-mfg.co.jp',
    initials: 'TM',
    received: '09:58',
    receivedFull: '2026-05-09 09:58',
    subject: '源泉徴収票の送付先について',
    preview: '退職者の源泉徴収票の送付先で、本人が引っ越しをされていまして、新住所での送付は…',
    body: '退職者（4月末退職）の源泉徴収票の送付先について確認させてください。\n本人が引っ越しをされていまして、新住所への送付で問題ないでしょうか。',
    attachments: [],
    category: 'docs',
    confidence: 0.91,
    status: 'draft',
    urgent: false,
    unread: false,
    aiReason:
      '「源泉徴収票」「送付先」「住所変更」のパターンに完全一致。過去回答ログに同種事例が複数。',
    citations: ['kb-004'],
    draft: [
      { t: '田中 美咲様' },
      { t: '' },
      { t: 'お問い合わせありがとうございます。' },
      { t: '' },
      {
        t: '退職者本人より新住所をご申告いただいている場合、当該新住所への送付で問題ございません。',
        c: 'kb-004',
      },
      { t: '\n念のため、送付前にメール等で本人へ送付先の最終確認を行うことをお勧めいたします。' },
      { t: '' },
      {
        t: 'また、住民税の特別徴収から普通徴収への切替手続きにつきましても、市区町村への異動届出書を別途ご提出いただく必要があります。',
        c: 'kb-004',
      },
    ],
  },
  {
    id: 'INQ-2026-0415',
    company: '株式会社グリーンリーフ',
    contactName: '佐々木 慎吾',
    contactRole: '代表取締役',
    email: 'sasaki@greenleaf.co.jp',
    initials: 'GL',
    received: '09:14',
    receivedFull: '2026-05-09 09:14',
    subject: '役員報酬の期中変更について',
    preview:
      '業績の関係で役員報酬を下げたいと考えていますが、税務上の影響や手続きを教えてください。',
    body: '業績の関係で、私を含む役員2名の月額報酬を下げたいと考えています。\n税務上、期中の役員報酬の変更は損金算入の可否に影響すると聞いたのですが、当社のケースで何かアドバイスをいただけますか。',
    attachments: [],
    category: 'tax',
    confidence: 0.48,
    status: 'escalated',
    urgent: false,
    unread: false,
    aiReason:
      '「役員報酬」「期中変更」は個別判断（業績悪化に伴う改定該当性）が必要。信頼度0.48で閾値未満。',
    citations: ['kb-006'],
    draft: null,
  },
  {
    id: 'INQ-2026-0414',
    company: '鈴木建設株式会社',
    contactName: '鈴木 健司',
    contactRole: '経理課',
    email: 'kenji.s@suzuki-kensetsu.co.jp',
    initials: 'SK',
    received: '08:47',
    receivedFull: '2026-05-09 08:47',
    subject: '消費税の中間納付の納期について',
    preview: '今期から年11回の中間納付に該当するとお聞きしました。スケジュールを教えてください。',
    body: '今期から年11回の中間納付に該当するとお聞きしました。具体的なスケジュールと納付額の計算方法を教えていただけますでしょうか。',
    attachments: [],
    category: 'deadline',
    confidence: 0.88,
    status: 'draft',
    urgent: false,
    unread: false,
    aiReason: '「消費税」「中間納付」「年11回」がFAQ集Q-031に直接マッチ。',
    citations: ['kb-008'],
    draft: [
      { t: '鈴木 健司様' },
      { t: '' },
      { t: '中間納付スケジュールにつきまして、以下のとおりご案内申し上げます。' },
      { t: '' },
      {
        t: '貴社は前期の消費税年税額が4,800万円を超えたため、今期は年11回の中間申告対象となります。',
        c: 'kb-008',
      },
      { t: '\n各回の納付額は、前期年税額の12分の1（約 ¥XXX,XXX）です。', c: 'kb-008' },
      { t: '' },
      {
        t: '納付期限は各月末日（土日祝の場合は翌営業日）となっております。スケジュール表を添付ファイルにてお送りします。',
      },
    ],
  },
  {
    id: 'INQ-2026-0413',
    company: '株式会社ノーブルデザイン',
    contactName: '中村 玲奈',
    contactRole: '経理担当',
    email: 'nakamura@noble-design.jp',
    initials: 'ND',
    received: '昨日',
    receivedFull: '2026-05-08 17:30',
    subject: '海外（米国）への外注費の源泉徴収について',
    preview: '米国在住の個人デザイナーへの外注費を支払う予定です。源泉徴収は必要でしょうか？',
    body: '米国在住の個人デザイナーへ外注費（$3,200）を支払う予定です。源泉徴収義務の有無と、租税条約の適用可否を教えてください。',
    attachments: [{ name: '契約書ドラフト.pdf', size: '412KB', type: 'pdf' }],
    category: 'tax',
    confidence: 0.71,
    status: 'escalated',
    urgent: false,
    unread: false,
    aiReason:
      '「海外送金」「源泉徴収」は判定フローが必要。日米租税条約の適用可否は個別事情に依存。',
    citations: ['kb-009'],
    draft: null,
  },
  {
    id: 'INQ-2026-0412',
    company: '佐藤クリニック',
    contactName: '佐藤 美和子',
    contactRole: '事務長',
    email: 'sato@sato-clinic.jp',
    initials: 'SC',
    received: '昨日',
    receivedFull: '2026-05-08 14:12',
    subject: '顧問料の追加について',
    preview: '新たに別法人を設立予定です。追加の顧問料がどの程度になるか目安を教えてください。',
    body: '新たに別法人（メディカルサービス会社）を設立予定です。グループ全体の顧問契約として、追加料金の目安を教えてください。',
    attachments: [],
    category: 'contract',
    confidence: 0.83,
    status: 'escalated',
    urgent: false,
    unread: false,
    aiReason: '顧問契約カテゴリは全件エスカレーション対象。事務長による直接対応案件。',
    citations: [],
    draft: null,
  },
  {
    id: 'INQ-2026-0411',
    company: '株式会社ジオメトリクス',
    contactName: '高橋 啓介',
    contactRole: 'CFO',
    email: 'takahashi@geometrics.io',
    initials: 'GE',
    received: '昨日',
    receivedFull: '2026-05-08 11:05',
    subject: '年末調整書類の受付期限',
    preview: '年末調整の書類提出期限ですが、今年から運用が変わると伺いました。',
    body: '年末調整の書類提出期限ですが、今年から運用が変わると伺いました。最新のスケジュールをご共有ください。',
    attachments: [],
    category: 'deadline',
    confidence: 0.93,
    status: 'sent',
    urgent: false,
    unread: false,
    aiReason: 'FAQ Q-007に直接マッチ。送信済み。',
    citations: ['kb-010'],
    draft: null,
  },
  {
    id: 'INQ-2026-0410',
    company: '株式会社山田商事',
    contactName: '山田 正彦',
    contactRole: '経理部長',
    email: 'yamada@yamada-shoji.co.jp',
    initials: 'YS',
    received: '5/7',
    receivedFull: '2026-05-07 16:20',
    subject: '振込先口座の変更について',
    preview: 'メインバンクを変更する予定です。手続きの流れと書類を教えてください。',
    body: 'メインバンクを変更する予定です。当事務所への顧問料振込先口座変更の手続きの流れと必要書類を教えてください。',
    attachments: [],
    category: 'other',
    confidence: 0.86,
    status: 'sent',
    urgent: false,
    unread: false,
    aiReason: '「振込先変更」「口座」一般的事務手続き。低リスク・送信済み。',
    citations: [],
    draft: null,
  },
];

// ===== icons (inline SVG, stroke-based) =====
const Icon = ({ name, size = 16, stroke = 1.6 }) => {
  const s = {
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  switch (name) {
    case 'inbox':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <path d="M3 13l3-7h12l3 7" />
          <path d="M3 13v6a1 1 0 001 1h16a1 1 0 001-1v-6" />
          <path d="M3 13h5l1 2h6l1-2h5" />
        </svg>
      );
    case 'edit':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4z" />
        </svg>
      );
    case 'send':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4z" />
        </svg>
      );
    case 'check':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      );
    case 'alert':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <path d="M12 9v4" />
          <circle cx="12" cy="17" r="0.5" fill="currentColor" />
        </svg>
      );
    case 'search':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      );
    case 'bell':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 01-3.4 0" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      );
    case 'filter':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
        </svg>
      );
    case 'more':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <circle cx="19" cy="12" r="1" fill="currentColor" />
          <circle cx="5" cy="12" r="1" fill="currentColor" />
        </svg>
      );
    case 'archive':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <rect x="3" y="3" width="18" height="4" rx="1" />
          <path d="M5 7v13a1 1 0 001 1h12a1 1 0 001-1V7" />
          <path d="M10 12h4" />
        </svg>
      );
    case 'user':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0116 0" />
        </svg>
      );
    case 'users':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2 20a7 7 0 0114 0" />
          <circle cx="17" cy="6" r="2.5" />
          <path d="M16 13a6 6 0 016 6" />
        </svg>
      );
    case 'book':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        </svg>
      );
    case 'chart':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <path d="M3 3v18h18" />
          <path d="M7 14l3-3 4 4 5-7" />
        </svg>
      );
    case 'flag':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <path d="M4 22V4" />
          <path d="M4 4h13l-2 5 2 5H4" />
        </svg>
      );
    case 'paperclip':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <path d="M21 12.5l-9 9a5.5 5.5 0 11-7.78-7.78l9-9a3.5 3.5 0 014.95 4.95L9.4 17.5a1.5 1.5 0 11-2.12-2.12L15 7.5" />
        </svg>
      );
    case 'clock':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case 'spark':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <path d="M12 3l1.5 5L19 9.5 13.5 11 12 16l-1.5-5L5 9.5 10.5 8z" />
        </svg>
      );
    case 'x':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      );
    case 'shield':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case 'doc':
      return (
        <svg viewBox="0 0 24 24" {...s}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M9 13h6M9 17h6" />
        </svg>
      );
    default:
      return null;
  }
};

window.CATEGORIES = CATEGORIES;
window.KB = KB;
window.INQUIRIES = INQUIRIES;
window.Icon = Icon;
