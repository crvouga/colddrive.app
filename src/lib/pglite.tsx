import { PGlite } from '@electric-sql/pglite'
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

interface PGliteContextType {
    db: PGlite | null
    isReady: boolean
}

const PGliteContext = createContext<PGliteContextType>({
    db: null,
    isReady: false,
})

export function PGliteProvider({ children }: { children: ReactNode }) {
    const [db, setDb] = useState<PGlite | null>(null)
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
        let mounted = true
        let pglite: PGlite | null = null

        const initDb = async () => {
            try {
                // Initialize PGlite in memory mode (no persistence)
                // Change to 'idb://colddrive-db' for IndexedDB persistence once working
                pglite = new PGlite()

                // Wait for the database to be ready
                await pglite.waitReady

                if (mounted) {
                    setDb(pglite)
                    setIsReady(true)
                    console.log('PGlite initialized successfully (in-memory mode)')
                }
            } catch (error) {
                console.error('Failed to initialize PGlite:', error)
            }
        }

        initDb()

        // Cleanup function
        return () => {
            mounted = false
            if (pglite) {
                pglite.close()
            }
        }
    }, [])

    return (
        <PGliteContext.Provider value={{ db, isReady }}>
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

