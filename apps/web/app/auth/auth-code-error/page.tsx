export default function AuthCodeErrorPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <section className="max-w-md rounded-3xl bg-white border border-slate-200 shadow-xl p-8">
        <h1 className="text-2xl font-semibold text-[#0C1A3D]">Não foi possível concluir o acesso</h1>
        <p className="mt-3 text-slate-600">
          O código de autenticação expirou ou já foi utilizado. Volte ao início e tente novamente.
        </p>
      </section>
    </main>
  );
}
