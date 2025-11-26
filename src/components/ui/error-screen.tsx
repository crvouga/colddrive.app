import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorScreenProps {
    title?: string
    message: string
    className?: string
}

export function ErrorScreen({
    title = 'Error',
    message,
    className
}: ErrorScreenProps) {
    return (
        <div className={cn(
            'flex min-h-svh items-center justify-center bg-background p-4',
            className
        )}>
            <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/50 bg-card p-6 shadow-sm max-w-md w-full">
                <AlertCircle className="size-8 text-destructive" />
                <div className="text-center space-y-2">
                    <h2 className="text-lg font-semibold text-card-foreground">{title}</h2>
                    <p className="text-sm text-muted-foreground">{message}</p>
                </div>
            </div>
        </div>
    )
}

