import { UserServiceStatus } from './components/UserServiceStatus'

function App() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 flex h-15 items-center gap-8 border-b border-border bg-elevated/85 px-4 backdrop-blur sm:px-8">
        <a href="/" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
          <span
            aria-hidden="true"
            className="grid size-7.5 place-items-center rounded-lg bg-accent text-sm text-white"
          >
            MP
          </span>
          MapPick
        </a>
        <nav className="flex gap-6">
          <a href="/" aria-current="page" className="font-medium text-text">
            Dashboard
          </a>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-275 flex-1 px-4 py-6 sm:px-8 sm:py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="mt-1.5 text-muted">Find the best CS2 map for you and your squad.</p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
          <UserServiceStatus />
        </div>
      </main>

      <footer className="border-t border-border px-8 py-6 text-center text-sm text-muted">
        MapPick · M7011E
      </footer>
    </div>
  )
}

export default App
