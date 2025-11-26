import { ModeToggle } from "@/components/mode-toggle"
import { PGliteDemo } from "@/components/pglite-demo"
import { TrpcDemo } from "@/components/trpc-demo"

function App() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-4 text-foreground">
      <div className="absolute right-4 top-4">
        <ModeToggle />
      </div>
      <TrpcDemo />
      <PGliteDemo />
    </div>
  )
}

export default App