import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { PGlite } from '@electric-sql/pglite'
import { usePGliteInit } from './init'
import { trpc } from '../trpc-client'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { ErrorScreen } from '@/components/ui/error-screen'

const SCHEMA_HASH_KEY = 'pglite-schema-hash'

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
        return <LoadingScreen message="Loading schema..." />
    }

    // Show error state if schema application failed
    if (error) {
        return (
            <ErrorScreen
                title="Schema Error"
                message={`Failed to apply schema: ${error.message}`}
            />
        )
    }

    return <>{children}</>
}

