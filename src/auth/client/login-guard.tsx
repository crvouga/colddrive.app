import { type ReactNode } from 'react';
import { useAuth } from './context';
import { LoginUI } from './login-ui';
import { LoadingScreen } from '@/components/ui/loading-screen';

export function LoginGuard({ children }: { children: ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (!isAuthenticated) {
        return <LoginUI />;
    }

    return <>{children}</>;
}

