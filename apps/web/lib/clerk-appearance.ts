import type { SignIn } from '@clerk/nextjs';
import type { ComponentProps } from 'react';

type ClerkAppearance = NonNullable<ComponentProps<typeof SignIn>['appearance']>;

// Themes Clerk's <SignIn>/<SignUp> to the Zeiro design tokens so the auth form
// reads as ours, not Clerk's default. `variables` drive Clerk's own CSS (the
// reliable path for colors); element overrides use Tailwind `!important` utilities
// because Clerk ships its styles unlayered and would otherwise win the cascade.
export const clerkAppearance: ClerkAppearance = {
  variables: {
    colorPrimary: '#0a0a0a',
    colorText: '#0a0a0a',
    colorTextSecondary: '#8a8a8a',
    colorTextOnPrimaryBackground: '#ffffff',
    colorBackground: '#ffffff',
    colorInputText: '#0a0a0a',
    colorInputBackground: '#f4f4f4',
    colorDanger: '#c4422f',
    borderRadius: '10px',
    fontFamily: '"Inter Tight", "Noto Sans JP", system-ui, sans-serif',
    fontSize: '14px',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full shadow-none! border-0!',
    card: 'bg-transparent! shadow-none! border-0! p-0! w-full! gap-5!',
    // Clerk's form is a responsive grid that fits 2 columns at this width; force a
    // single stacked column so the field, button and label don't crowd onto one row.
    form: 'grid-cols-1!',
    formFieldRow: 'grid-cols-1!',
    header: 'hidden!',
    socialButtonsBlockButton:
      'h-11! border! border-line! bg-surface! text-ink! shadow-none! normal-case! hover:bg-bg-2!',
    socialButtonsBlockButtonText: 'font-medium! text-[13.5px]!',
    dividerLine: 'bg-line!',
    dividerText: 'text-muted! text-[12px]!',
    // JP "パスワードをお忘れですか？" is long; let the label row wrap instead of clipping.
    formFieldLabelRow: 'flex-wrap! items-baseline! gap-x-3! gap-y-1!',
    formFieldLabel: 'text-[13px]! font-medium! text-ink!',
    formFieldInput:
      'h-11! rounded-md! border-line! bg-bg-2! text-[14px]! focus:border-accent! focus:shadow-[0_0_0_3px_var(--accent-soft)]!',
    formButtonPrimary:
      'h-11! bg-ink! text-bg! text-[14px]! font-medium! normal-case! tracking-normal! shadow-none! hover:bg-[#1f1f1f]!',
    footer: 'bg-transparent!',
    footerActionText: 'text-muted! text-[13px]!',
    footerActionLink: 'text-accent! hover:text-accent-ink! font-medium!',
    formFieldAction: 'text-accent! hover:text-accent-ink! text-[12.5px]! whitespace-nowrap!',
    identityPreviewEditButton: 'text-accent!',
    otpCodeFieldInput: 'border-line! focus:border-accent!',
    formResendCodeLink: 'text-accent!',
  },
  layout: {
    logoPlacement: 'none',
    socialButtonsPlacement: 'top',
    showOptionalFields: true,
  },
};
