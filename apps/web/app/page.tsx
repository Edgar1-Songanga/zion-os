import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--zion-dark)]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,30,53,0.94),rgba(11,45,77,0.86))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,162,74,0.24),transparent_34%)]" />

      <section className="relative z-10 max-w-5xl px-6 text-center text-white sm:px-8">
        <div className="mx-auto h-1 w-14 rounded-full bg-[var(--zion-gold)]" />

        <p className="mt-7 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
          ZION OS
        </p>

        <h1 className="mt-4 text-6xl font-semibold tracking-[0.08em] sm:text-8xl">
          ZION<span className="text-[var(--zion-warm)]">OS</span>
        </h1>

        <h2 className="mt-8 text-3xl font-semibold tracking-tight sm:text-5xl">
          The Future of Digital
          <br />
          Community Intelligence
        </h2>

        <p className="mx-auto mt-8 max-w-xl text-lg leading-8 text-white/65 sm:text-xl">
          One ecosystem.
          <br />
          One platform.
          <br />
          Millions connected.
        </p>

        <Link
          href="/dashboard"
          className="mt-10 inline-flex rounded-full bg-[var(--zion-gold)] px-9 py-4 font-semibold tracking-wide text-[var(--zion-dark)] shadow-[var(--zion-shadow-lg)] transition hover:-translate-y-0.5 hover:bg-[var(--zion-warm)]"
        >
          ENTER ZION OS
        </Link>

        <div className="mt-16 grid gap-5 sm:grid-cols-3">
          {[
            ["Global", "Digital Network"],
            ["Millions", "Connected People"],
            ["100+", "Languages"],
          ].map(([value, label]) => (
            <div key={value} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-5 backdrop-blur-sm">
              <p className="text-3xl font-bold">{value}</p>
              <p className="mt-1 text-sm text-white/50">{label}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
