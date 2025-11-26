import { ModeToggle } from "@/components/mode-toggle"
import { ThemeProvider } from "@/components/theme-provider"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background text-foreground">
        <ModeToggle />
      </div>
    </ThemeProvider>
  )
}

export default App