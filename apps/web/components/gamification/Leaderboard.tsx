"use client";

interface RankingUser {
  id:string;
  name:string;
  points:number;
  role:string;
}

const ranking:RankingUser[]=[
  { id:"1", name:"Edgar Songanga", points:9500, role:"Fundador" },
  { id:"2", name:"Maria Silva", points:7200, role:"Líder de Comunidade" },
  { id:"3", name:"João Manuel", points:5400, role:"Membro Activo" }
];

export default function Leaderboard(){
  return (
    <div className="rounded-3xl border border-[var(--zion-border)] bg-white p-6 shadow-[var(--zion-shadow-sm)]">
      <div className="h-1 w-12 rounded-full bg-[var(--zion-gold)]" />
      <h2 className="mt-5 text-xl font-bold tracking-tight text-[var(--zion-primary)]">Ranking ZION</h2>
      <div className="mt-5 space-y-3">
        {ranking.map((user,index)=>(
          <div key={user.id} className="flex items-center justify-between rounded-xl border border-[var(--zion-border)] bg-[var(--zion-light)] p-4 transition hover:border-[var(--zion-sky)] hover:bg-white">
            <div className="flex gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--zion-primary)] text-xs font-bold text-white">
                #{index+1}
              </span>
              <div>
                <p className="font-semibold text-[var(--zion-dark)]">{user.name}</p>
                <p className="text-sm text-[var(--zion-muted)]">{user.role}</p>
              </div>
            </div>
            <span className="font-bold text-[var(--zion-primary)]">{user.points}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
