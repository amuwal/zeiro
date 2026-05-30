// freee API response shapes we read. Kept separate from the client so the client
// file stays under the source-size cap. Only the fields we actually use are typed;
// freee returns far more per record.

export type FreeeDeal = {
  id: number;
  issue_date: string;
  amount: number;
  type: 'income' | 'expense';
  status: string;
  partner_id: number | null;
  ref_number: string | null;
  details?: Array<{
    account_item_id: number;
    amount: number;
    description: string | null;
  }>;
};

export type FreeePartner = {
  id: number;
  name: string;
  shortcut1: string | null;
  contact_name: string | null;
};

export type FreeeCompanyMini = {
  id: number;
  name: string;
  role: string;
};

export type FreeeAccountItem = {
  id: number;
  name: string;
};

// /api/1/invoices — issued invoices with settlement status. The two questions
// clients ask most ("has #123 been paid?", "what's still outstanding?") live here.
export type FreeeInvoice = {
  id: number;
  issue_date: string;
  due_date: string | null;
  payment_date: string | null;
  invoice_number: string | null;
  title: string | null;
  total_amount: number;
  partner_id: number | null;
  partner_name: string | null;
  invoice_status: string;
  payment_status: 'unsettled' | 'settled' | string | null;
};

// /api/1/reports/trial_pl — one row per account line in the period P/L.
export type FreeeTrialBalanceLine = {
  account_item_id: number | null;
  account_item_name: string;
  closing_balance: number;
  total_line: boolean;
};

export type FreeeProfitAndLoss = {
  fiscalYear: number | null;
  startMonth: number | null;
  endMonth: number | null;
  lines: Array<{ name: string; balance: number }>;
};
