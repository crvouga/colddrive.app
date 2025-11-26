import { Spinner } from './spinner'
import { cn } from '@/lib/utils'

interface LoadingScreenProps {
    message?: string
    className?: string
}

export function LoadingScreen({
    message = 'Loading...',
    className
}: LoadingScreenProps) {
    return (
        <div className={cn(
            'flex min-h-svh items-center justify-center bg-background',
            className
        )}>
            <div className="flex flex-col items-center gap-4">
                <Spinner size={32} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{message}</p>
            </div>
        </div>
    )
}

