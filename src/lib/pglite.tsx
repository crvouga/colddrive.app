import { PGlite } from '@electric-sql/pglite'
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { trpc } from './trpc-client'

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

export function PGliteProvider({ children }: { children: ReactNode }) {
    const [db, setDb] = useState<PGlite | null>(globalDb)
    const [isReady, setIsReady] = useState(!!globalDb)
    const [error, setError] = useState<Error | null>(null)
    const { data: schemaData, isLoading: schemaLoading } = trpc.clientSideSchema.get.useQuery()

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

        // Always call getOrCreateDb to ensure DB is ready
        // It will return existing globalDb if available
        initDb()
    }, [])

    // Handle schema versioning when schema data is available
    useEffect(() => {
        if (!schemaData || !db || schemaLoading) return

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
    }, [schemaData, db, schemaLoading])

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

