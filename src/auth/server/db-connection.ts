/**
 * Database connection abstraction
 * Uses regular PostgreSQL client for local development
 * Uses @vercel/postgres for production/Vercel
 */

// Check if we should use local PostgreSQL (has localhost or docker-compose pattern)
function shouldUseLocalPostgres(): boolean {
  const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
  // If POSTGRES_URL contains localhost or docker-compose hostname, use local
  return postgresUrl.includes('localhost') || 
         postgresUrl.includes('127.0.0.1') ||
         postgresUrl.includes('postgres:5432'); // docker-compose service name
}

let localPostgresClient: any = null;
let clientInitPromise: Promise<any> | null = null;

// Initialize local postgres client
async function ensureLocalClient() {
  if (localPostgresClient) return localPostgresClient;
  if (clientInitPromise) return clientInitPromise;
  
  clientInitPromise = (async () => {
    const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!postgresUrl) {
      throw new Error('POSTGRES_URL or DATABASE_URL must be set');
    }
    
    const postgres = await import('postgres');
    localPostgresClient = postgres.default(postgresUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    return localPostgresClient;
  })();
  
  return clientInitPromise;
}

// Normalize response format to match @vercel/postgres API
function normalizeResponse(result: any) {
  // If result already has .rows property (from @vercel/postgres), return as-is
  if (result && typeof result === 'object' && 'rows' in result) {
    return result;
  }
  
  // If result is an array (from postgres package), wrap it
  if (Array.isArray(result)) {
    return { rows: result };
  }
  
  // Otherwise, wrap in rows array
  return { rows: [result] };
}

// Create sql template tag - it can be async but template tags are called sync
// So we return a promise that resolves when the query completes
export function sql(strings: TemplateStringsArray, ...values: any[]) {
  if (shouldUseLocalPostgres()) {
    // For local postgres, we need to ensure client is initialized
    // Since template tags are called synchronously, we need to handle the async init
    const promise = ensureLocalClient().then(client => {
      return client(strings, ...values).then((result: any) => normalizeResponse(result));
    });
    // Return the promise - the caller will await it
    return promise as any;
  } else {
    // Use @vercel/postgres (synchronous) - it already returns {rows: [...]}
    const { sql: vercelSql } = require('@vercel/postgres');
    return vercelSql(strings, ...values);
  }
}
