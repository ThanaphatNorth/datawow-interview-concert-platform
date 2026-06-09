import { LoginForm } from '@/components/auth/LoginForm';

// User-facing login (Figma: User/Access Level). Any role can authenticate here;
// the JWT role drives the post-login redirect.
export default function LoginPage() {
  return <LoginForm submitLabel="Login as User" quote="Your digital workspace, simplified." />;
}
