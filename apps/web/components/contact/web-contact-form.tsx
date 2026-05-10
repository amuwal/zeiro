'use client';

import { useActionState } from 'react';
import {
  initialWebFormState,
  submitContactInquiry,
  type WebFormState,
} from '@/app/contact/[firmId]/actions';

export function WebContactForm({ firmId }: { firmId: string }) {
  const action = submitContactInquiry.bind(null, firmId);
  const [state, formAction, pending] = useActionState<WebFormState, FormData>(
    action,
    initialWebFormState,
  );

  if (state.status === 'success') {
    return (
      <div
        style={{
          border: '1px solid var(--line)',
          background: 'var(--surface)',
          borderRadius: 12,
          padding: '24px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--positive)' }}>
          送信が完了しました
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7 }}>
          ご登録いただいたメールアドレス宛に、担当者より追ってご返信いたします。
          営業時間内は通常1営業日以内にお返事しております。
        </div>
      </div>
    );
  }

  const errors = state.status === 'error' ? state.fieldErrors : undefined;

  return (
    <form action={formAction} style={formStyle} noValidate>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }}
        aria-hidden="true"
      />
      <Field
        id="contact-name"
        name="name"
        label="お名前"
        placeholder="山田 太郎"
        required
        errors={errors?.name}
      />
      <Field
        id="contact-email"
        name="email"
        type="email"
        label="メールアドレス"
        placeholder="example@example.com"
        required
        errors={errors?.email}
      />
      <Field
        id="contact-subject"
        name="subject"
        label="件名"
        placeholder="例: 役員報酬の改定について"
        required
        errors={errors?.subject}
      />
      <FieldArea
        id="contact-body"
        name="body"
        label="ご相談内容"
        placeholder="できるだけ具体的にお書きください (10文字以上)"
        required
        errors={errors?.body}
      />

      {state.status === 'error' && !errors && (
        <div style={{ color: 'var(--urgent)', fontSize: 12.5 }}>{state.message}</div>
      )}

      <button type="submit" className="btn btn-primary" disabled={pending} style={submitStyle}>
        {pending ? '送信中…' : '送信する'}
      </button>
    </form>
  );
}

type FieldProps = {
  id: string;
  name: string;
  label: string;
  type?: string | undefined;
  placeholder?: string | undefined;
  required?: boolean | undefined;
  errors?: string[] | undefined;
};

function Field({ id, name, label, type = 'text', placeholder, required, errors }: FieldProps) {
  return (
    <div style={fieldStyle}>
      <label htmlFor={id} style={labelStyle}>
        {label}
        {required && <span style={{ color: 'var(--urgent)' }}> *</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        style={inputStyle}
      />
      {errors?.[0] && <span style={errorStyle}>{errors[0]}</span>}
    </div>
  );
}

function FieldArea({ id, name, label, placeholder, required, errors }: Omit<FieldProps, 'type'>) {
  return (
    <div style={fieldStyle}>
      <label htmlFor={id} style={labelStyle}>
        {label}
        {required && <span style={{ color: 'var(--urgent)' }}> *</span>}
      </label>
      <textarea
        id={id}
        name={name}
        placeholder={placeholder}
        required={required}
        rows={7}
        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }}
      />
      {errors?.[0] && <span style={errorStyle}>{errors[0]}</span>}
    </div>
  );
}

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  position: 'relative',
};
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 };
const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)' };
const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid var(--line)',
  borderRadius: 8,
  background: 'var(--surface)',
  fontSize: 14,
  outline: 'none',
};
const errorStyle: React.CSSProperties = { color: 'var(--urgent)', fontSize: 11.5 };
const submitStyle: React.CSSProperties = { marginTop: 8, alignSelf: 'flex-start', minWidth: 140 };
