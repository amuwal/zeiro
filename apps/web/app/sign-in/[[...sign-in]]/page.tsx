import { SignIn } from '@clerk/nextjs';
import { AuthShell } from '@/components/auth/auth-shell';
import { clerkAppearance } from '@/lib/clerk-appearance';

export default function SignInPage() {
  return (
    <AuthShell heading="おかえりなさい" subtitle="アカウントにログインして続けます。">
      <SignIn appearance={clerkAppearance} />
    </AuthShell>
  );
}
