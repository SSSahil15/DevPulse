import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { storeToken, decodeJWTPayload } from '../api';

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error || !token) {
      navigate('/login?error=auth_failed', { replace: true });
      return;
    }

    // Decode and validate the JWT
    const payload = decodeJWTPayload(token);
    if (!payload || !payload.sub) {
      navigate('/login?error=auth_failed', { replace: true });
      return;
    }

    // Store the JWT and redirect to the dashboard
    storeToken(token);
    // Use window.location.href to force a full app reload so App.jsx bootstraps the new session state
    window.location.href = '/dashboard';
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col items-center justify-center gap-6">
      <div className="animate-pulse w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
        <img src="/Logo.png" alt="DevPulse" className="w-full h-full object-cover" />
      </div>
      {errorMessage ? (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-6 py-4 max-w-md">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{errorMessage}</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Signing you in with GitHub...
        </div>
      )}
    </div>
  );
}

export default AuthCallbackPage;
