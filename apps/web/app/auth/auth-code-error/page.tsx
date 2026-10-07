export default function AuthCodeErrorPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--zion-light)] px-6 py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,162,74,0.14),transparent_35%),linear-gradient(135deg,rgba(11,45,77,0.06),transparent_55%)]" />
      <section className="relative w-full max-w-md rounded-3xl border border-[var(--zion-border)] bg-white p-8 shadow-[var(--zion-shadow-lg)]">
        <div className="mb-6 h-1 w-12 rounded-full bg-[var(--zion-gold)]" />
        <p className="text-sm font-semibold tracking-[0.22em] text-[var(--zion-muted)]">ZION OS</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--zion-dark)]">Não foi possível concluir o acesso</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--zion-muted)]">
          O código de autenticação expirou ou já foi utilizado. Volte ao início e tente novamente.
        </p>
      </section>
    </main>
  );
}
