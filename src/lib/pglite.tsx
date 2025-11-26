import { PGlite } from '@electric-sql/pglite'
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { trpc } from './trpc-client'
import { Spinner } from '@/components/ui/spinner'

const SCHEMA_HASH_KEY = 'pglite-schema-hash'

// Store the DB instance globally to avoid reinitialization during HMR
let globalDb: PGlite | null = null
let initPromise: Promise<PGlite> | null = null

async function getOrCreateDb(): Promise<PGlite> {
    if (globalDb) {
        return globalDb
    }

    if (initPromise) {
        return initPromise
    }

    initPromise = (async () => {
        try {
            const db = new PGlite("idb://colddrive-db")
            await db.waitReady
            globalDb = db
            console.log('PGlite initialized successfully (IndexedDB mode)')
            return db
        } catch (error) {
            console.error('Failed to initialize PGlite:', error)
            initPromise = null
            throw error
        }
    })()

    return initPromise
}

async function applySchema(db: PGlite, schema: string): Promise<void> {
    try {
        // Drop all existing tables by dropping and recreating the public schema
        await db.exec('DROP SCHEMA IF EXISTS public CASCADE;')
        await db.exec('CREATE SCHEMA public;')

        // Execute the new schema
        await db.exec(schema)
        console.log('Schema applied successfully')
    } catch (error) {
        console.error('Error applying schema:', error)
        throw error
    }
}

// Context for PGlite DB instance
interface PGliteInitContextType {
    db: PGlite
}

const PGliteInitContext = createContext<PGliteInitContextType | null>(null)

// Provider for initializing PGlite database
export function PGliteInitProvider({ children }: { children: ReactNode }) {
    const [db, setDb] = useState<PGlite | null>(globalDb)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        let mounted = true

        const initDb = async () => {
            try {
                const dbInstance = await getOrCreateDb()

                if (mounted) {
                    setDb(dbInstance)
                }
            } catch (err) {
                if (mounted) {
                    setError(err as Error)
                }
            }
        }

        initDb()

        return () => {
            mounted = false
        }
    }, [])

    // Show loading spinner until DB is ready
    if (!db) {
        return (
            <div className="flex min-h-svh items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Spinner size={32} />
                    <p className="text-sm text-muted-foreground">Initializing database...</p>
                </div>
            </div>
        )
    }

    // Show error state if initialization failed
    if (error) {
        return (
            <div className="flex min-h-svh items-center justify-center">
                <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive bg-card p-6">
                    <p className="text-center text-destructive">Error initializing PGlite: {error.message}</p>
                </div>
            </div>
        )
    }

    return (
        <PGliteInitContext.Provider value={{ db }}>
            {children}
        </PGliteInitContext.Provider>
    )
}

// Hook to get PGlite DB instance (only works within PGliteInitProvider)
function usePGliteInit(): PGlite {
    const context = useContext(PGliteInitContext)
    if (context === null) {
        throw new Error('usePGliteInit must be used within a PGliteInitProvider')
    }
    return context.db
}

// Provider for schema initialization
export function PGliteSchemaProvider({ children }: { children: ReactNode }) {
    const db = usePGliteInit()
    const [isReady, setIsReady] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const { data: schemaData, isLoading: schemaLoading } = trpc.clientSideSchema.get.useQuery()

    useEffect(() => {
        if (!schemaData || schemaLoading) return

        let mounted = true

        const checkAndApplySchema = async () => {
            try {
                const storedHash = localStorage.getItem(SCHEMA_HASH_KEY)

                // Check if schema needs to be updated
                if (storedHash !== schemaData.hash) {
                    console.log('Schema version mismatch, applying new schema...')
                    await applySchema(db, schemaData.schema)
                    localStorage.setItem(SCHEMA_HASH_KEY, schemaData.hash)
                    console.log('Schema updated successfully')
                } else {
                    console.log('Schema is up to date')
                }

                if (mounted) {
                    setIsReady(true)
                }
            } catch (err) {
                console.error('Failed to check/update schema:', err)
                if (mounted) {
                    setError(err as Error)
                }
            }
        }

        checkAndApplySchema()

        return () => {
            mounted = false
        }
    }, [schemaData, schemaLoading, db])

    // Show loading spinner while fetching or applying schema
    if (schemaLoading || !isReady) {
        return (
            <div className="flex min-h-svh items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Spinner size={32} />
                    <p className="text-sm text-muted-foreground">Loading schema...</p>
                </div>
            </div>
        )
    }

    // Show error state if schema application failed
    if (error) {
        return (
            <div className="flex min-h-svh items-center justify-center">
                <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive bg-card p-6">
                    <p className="text-center text-destructive">Error applying schema: {error.message}</p>
                </div>
            </div>
        )
    }

    return <>{children}</>
}

// Main hook for consumers - throws if not ready, returns only db
export function usePGlite(): PGlite {
    const db = usePGliteInit()

    // At this point, if we have db from PGliteInitProvider and we're past PGliteSchemaProvider,
    // everything should be ready. But we'll throw if db is somehow null as a safety check.
    if (!db) {
        throw new Error('PGlite database is not ready. Ensure you are using usePGlite within both PGliteInitProvider and PGliteSchemaProvider.')
    }

    return db
}

// Accept HMR updates without reloading
if (import.meta.hot) {
    import.meta.hot.accept(() => {
        console.log('PGlite module updated')
    })
}
