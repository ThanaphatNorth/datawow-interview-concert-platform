import { LoginForm } from '@/components/auth/LoginForm';

// Admin login (Figma: Admin/Access Level). Same endpoint as /login; the label and
// tagline match the admin artboard.
export default function AdminLoginPage() {
  return (
    <LoginForm
      submitLabel="Login as Administrator"
      quote="Powering the tools that power the team."
      showRegister={false}
    />
  );
}
