import ProfileHero from "@/components/profile/ProfileHero";
import ProfileStats from "@/components/profile/ProfileStats";
import Badges from "@/components/profile/Badges";


export default function Profile(){

  return (

    <main
      className="
      min-h-screen
      bg-slate-100
      p-8
      "
    >

      <ProfileHero />


      <ProfileStats />


      <div
        className="
        grid
        grid-cols-2
        gap-8
        mt-8
        "
      >

        <Badges />


        <div
          className="
          bg-white
          rounded-3xl
          p-8
          border
          border-slate-200
          "
        >

          <h2
            className="
            text-xl
            font-bold
            text-[#0C1A3D]
            "
          >
            Spiritual Journey
          </h2>


          <div
            className="
            mt-6
            space-y-4
            text-slate-600
            "
          >

            <p>
              📖 Estudos bíblicos realizados: 245
            </p>

            <p>
              🙏 Orações apoiadas: 890
            </p>

            <p>
              🤝 Pessoas alcançadas: 120
            </p>

            <p>
              🌱 Serviço comunitário: Activo
            </p>

            </div>


        </div>


      </div>


    </main>

  );

}
