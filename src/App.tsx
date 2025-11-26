import { ModeToggle } from "@/components/mode-toggle"
import { ThemeProvider } from "@/components/theme-provider"
import { PGliteProvider } from "@/lib/pglite"
import { PGliteDemo } from "@/components/pglite-demo"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <PGliteProvider>
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-4 text-foreground">
          <div className="absolute right-4 top-4">
            <ModeToggle />
          </div>
          <PGliteDemo />
        </div>
      </PGliteProvider>
    </ThemeProvider>
  )
}

export default App