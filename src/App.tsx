import { ModeToggle } from "@/components/mode-toggle"
import { ThemeProvider } from "@/components/theme-provider"
import { PGliteProvider } from "@/lib/pglite"
import { PGliteDemo } from "@/components/pglite-demo"
import { TrpcDemo } from "@/components/trpc-demo"
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

function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <PGliteProvider>
            <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-4 text-foreground">
              <div className="absolute right-4 top-4">
                <ModeToggle />
              </div>
              <TrpcDemo />
              <PGliteDemo />
            </div>
          </PGliteProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  )
}

export default App