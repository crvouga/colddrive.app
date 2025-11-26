import { PGlite } from '@electric-sql/pglite'
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp'
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { ErrorScreen } from '@/components/ui/error-screen'

// Store the DB instance globally to avoid reinitialization during HMR
let globalDb: PGlite | null = null
let initPromise: Promise<PGlite> | null = null

function getCurrentDb(): PGlite | null {
    return globalDb
}

async function getOrCreateDb(): Promise<PGlite> {
    if (globalDb) {
        return globalDb
    }

    if (initPromise) {
        return initPromise
    }

    initPromise = (async () => {
        try {
            const db = new PGlite("idb://colddrive-db", {
                extensions: {
                    uuid_ossp,
                },
            })
            await db.waitReady
            globalDb = db
            console.log('PGlite initialized successfully (IndexedDB mode) with extensions')
            return db
        } catch (error) {
            console.error('Failed to initialize PGlite:', error)
            initPromise = null
            throw error
        }
    })()

    return initPromise
}

// Context for PGlite DB instance
interface PGliteInitContextType {
    db: PGlite
}

const PGliteInitContext = createContext<PGliteInitContextType | null>(null)

// Hook to get PGlite DB instance (only works within PGliteInitProvider)
function usePGliteInit(): PGlite {
    const context = useContext(PGliteInitContext)
    if (context === null) {
        throw new Error('usePGliteInit must be used within a PGliteInitProvider')
    }
    return context.db
}

// Provider for initializing PGlite database
export function PGliteInitProvider({ children }: { children: ReactNode }) {
    const [db, setDb] = useState<PGlite | null>(getCurrentDb())
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
        return <LoadingScreen message="Initializing database..." />
    }

    // Show error state if initialization failed
    if (error) {
        return (
            <ErrorScreen
                title="Database Initialization Error"
                message={`Failed to initialize PGlite: ${error.message}`}
            />
        )
    }

    return (
        <PGliteInitContext.Provider value={{ db }}>
            {children}
        </PGliteInitContext.Provider>
    )
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

// Export the internal hook for use by schema initialization
export { usePGliteInit }

