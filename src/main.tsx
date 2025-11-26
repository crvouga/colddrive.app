import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from "@/components/theme-provider"
import { PGliteInitProvider, PGliteSchemaProvider } from "@/lib/pglite"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchLink } from "@trpc/client"
import superjson from "superjson"
import { trpc } from "@/lib/trpc-client"

const queryClient = new QueryClient()
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      transformer: superjson,
    }),
  ],
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <PGliteInitProvider>
            <PGliteSchemaProvider>
              <App />
            </PGliteSchemaProvider>
          </PGliteInitProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  </StrictMode>,
)
