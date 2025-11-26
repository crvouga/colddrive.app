import { createContext, useContext, useState, type ReactNode } from 'react';
import { trpc } from '@/lib/trpc-client';

export interface AuthUser {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
}

interface AuthContextType {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: () => void;
    logout: () => Promise<void>;
    refetch: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const utils = trpc.useUtils();

    const { data: sessionData, isLoading: isLoadingSession, refetch: refetchSession } = trpc.auth.getSession.useQuery();

    const login = async () => {
        try {
            const data = await utils.auth.login.fetch();
            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Error getting login URL:', error);
        }
    };

    const logout = async () => {
        setIsLoggingOut(true);
        try {
            // Use logout API endpoint which properly handles HTTP-only cookies
            await fetch('/api/auth/logout', { method: 'POST' });

            // Clear any client-side state
            await refetchSession();
        } catch (error) {
            console.error('Error logging out:', error);
            // Still try to clear session state even if fetch fails
            await refetchSession();
        } finally {
            setIsLoggingOut(false);
        }
    };

    const isLoading = isLoadingSession || isLoggingOut;
    const isAuthenticated = sessionData?.isAuthenticated ?? false;
    const user = sessionData?.user ?? null;

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated,
                isLoading,
                login,
                logout,
                refetch: refetchSession,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

