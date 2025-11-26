import { ModeToggle } from "@/components/mode-toggle"
import { PGliteDemo } from "@/components/pglite-demo"
import { TrpcDemo } from "@/components/trpc-demo"
import { LoginGuard } from "@/auth/client/login-guard"
import { UserMenu } from "@/components/user-menu"

function App() {
  return (
    <LoginGuard>
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-4 text-foreground">
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <UserMenu />
          <ModeToggle />
        </div>
        <TrpcDemo />
        <PGliteDemo />
      </div>
    </LoginGuard>
  )
}

export default App