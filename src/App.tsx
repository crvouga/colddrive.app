import { ModeToggle } from "@/components/mode-toggle"
import { PGliteDemo } from "@/components/pglite-demo"
import { TrpcDemo } from "@/components/trpc-demo"
import { LoginGuard } from "@/auth/client/login-guard"

function App() {
  return (
    <LoginGuard>
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-4 text-foreground">
        <div className="absolute right-4 top-4">
          <ModeToggle />
        </div>
        <TrpcDemo />
        <PGliteDemo />
      </div>
    </LoginGuard>
  )
}

export default App