import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from './context';
import { trpc } from '@/lib/trpc-client';
import { AlertCircle } from 'lucide-react';
import { LoadingScreen } from '@/components/ui/loading-screen';

export function LoginUI() {
    const { login, isLoading: isAuthLoading } = useAuth();
    const { data: configStatus, isLoading: isLoadingConfig } = trpc.auth.configStatus.useQuery();
    const isLoading = isAuthLoading || isLoadingConfig;

    // Check for OAuth errors in URL
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');

    // Clear error from URL after showing
    if (error) {
        window.history.replaceState({}, '', window.location.pathname);
    }

    if (isLoading) {
        return <LoadingScreen />;
    }

    const isConfigured = configStatus?.configured ?? false;
    const configMessage = configStatus?.message ?? '';

    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Welcome</CardTitle>
                    <CardDescription>Sign in to continue</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!isConfigured && (
                        <Alert variant="destructive">
                            <AlertCircle />
                            <AlertTitle>Google Auth Not Configured</AlertTitle>
                            <AlertDescription>{configMessage}</AlertDescription>
                        </Alert>
                    )}

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle />
                            <AlertTitle>Authentication Error</AlertTitle>
                            <AlertDescription>
                                {error === 'oauth_error' && 'An error occurred during Google authentication.'}
                                {error === 'missing_code' && 'Missing authorization code. Please try again.'}
                                {error === 'token_exchange_failed' && 'Failed to exchange authorization code. Please try again.'}
                                {error === 'token_verification_failed' && 'Failed to verify authentication token. Please try again.'}
                                {error === 'auth_failed' && 'Authentication failed. Please try again.'}
                                {!['oauth_error', 'missing_code', 'token_exchange_failed', 'token_verification_failed', 'auth_failed'].includes(error) && 'An unexpected error occurred. Please try again.'}
                            </AlertDescription>
                        </Alert>
                    )}

                    <Button
                        onClick={login}
                        disabled={!isConfigured || isLoading}
                        className="w-full"
                        size="lg"
                    >
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Sign in with Google
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

