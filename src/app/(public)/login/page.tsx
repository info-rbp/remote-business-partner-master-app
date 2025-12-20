import AuthForm from '@/app/components/auth-form';

export default function LoginPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-center">Access DealFlow AI</h1>
      <p className="text-gray-400 mb-6 text-center">
        Sign in to generate proposals and manage your clients.
      </p>
      <AuthForm />
    </div>
  );
}
