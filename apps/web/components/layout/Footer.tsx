export default function Footer() {
  return (
    <footer className="border-t border-[var(--zion-border)] bg-white px-6 py-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-[var(--zion-primary)]">ZION OS</p>
          <p className="mt-1 text-xs text-[var(--zion-muted)]">Global Adventist Digital Ecosystem</p>
        </div>

        <div className="sm:text-right">
          <p className="text-sm text-[var(--zion-muted)]">© {new Date().getFullYear()} ZION OS</p>
          <p className="mt-1 text-xs text-[var(--zion-muted)]">Powered by Magestade Pura Digital</p>
        </div>
      </div>
    </footer>
  );
}
