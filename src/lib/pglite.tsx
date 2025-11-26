import { PGlite } from '@electric-sql/pglite'
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

interface PGliteContextType {
    db: PGlite | null
    isReady: boolean
    error: Error | null
}

const PGliteContext = createContext<PGliteContextType>({
    db: null,
    isReady: false,
    error: null,
})

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

export function PGliteProvider({ children }: { children: ReactNode }) {
    const [db, setDb] = useState<PGlite | null>(globalDb)
    const [isReady, setIsReady] = useState(!!globalDb)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        let mounted = true

        const initDb = async () => {
            try {
                const dbInstance = await getOrCreateDb()
                if (mounted) {
                    setDb(dbInstance)
                    setIsReady(true)
                }
            } catch (err) {
                if (mounted) {
                    setError(err as Error)
                }
            }
        }

        if (!globalDb) {
            initDb()
        }

        return () => {
            mounted = false
        }
    }, [])

    return (
        <PGliteContext.Provider value={{ db, isReady, error }}>
            {children}
        </PGliteContext.Provider>
    )
}

export function usePGlite() {
    const context = useContext(PGliteContext)
    if (context === undefined) {
        throw new Error('usePGlite must be used within a PGliteProvider')
    }
    return context
}

// Accept HMR updates without reloading
if (import.meta.hot) {
    import.meta.hot.accept(() => {
        console.log('PGlite module updated')
    })
}

