import { SignUp } from '@clerk/nextjs';
import { AuthShell } from '@/components/auth/auth-shell';
import { clerkAppearance } from '@/lib/clerk-appearance';

export default function SignUpPage() {
  return (
    <AuthShell heading="アカウントを作成" subtitle="数分でセットアップできます。">
      <SignUp appearance={clerkAppearance} />
    </AuthShell>
  );
}
