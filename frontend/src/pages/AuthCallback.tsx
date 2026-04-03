import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../providers/useAuth';

const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setTokenFromCallback } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setTokenFromCallback(token);
      void navigate('/');
    } else {
      void navigate('/login?error=no_token');
    }
  }, [searchParams, navigate, setTokenFromCallback]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-6">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xl font-bold tracking-tight">Authenticating...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
