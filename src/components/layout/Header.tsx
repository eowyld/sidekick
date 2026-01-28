export function Header() {
  return (
    <header className="flex items-center justify-between border-b bg-background/80 px-6 py-4 backdrop-blur">
      <div>
        <h1 className="text-lg font-semibold leading-tight tracking-tight">
          Workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          Centralize admin, publishing, live, tasks and more.
        </p>
      </div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>Signed in</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
          SK
        </div>
      </div>
    </header>
  );
}

