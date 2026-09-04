import Link from "next/link";


export default function Home() {

  return (

    <main
      className="
      min-h-screen
      relative
      flex
      items-center
      justify-center
      overflow-hidden
      "
    >


      <div
        className="
        absolute
        inset-0
        bg-[url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3')]
        bg-cover
        bg-center
        "
      />


      <div
        className="
        absolute
        inset-0
        bg-[#0C1A3D]/80
        "
      />


      <section
        className="
        relative
        z-10
        max-w-5xl
        text-center
        text-white
        px-8
        "
      >


        <h1
          className="
          text-6xl
          md:text-8xl
          font-semibold
          tracking-wide
          "
        >
          ZION
          <span
            className="
            text-[#D4AF37]
            "
          >
            OS
          </span>

        </h1>


        <h2
          className="
          mt-8
          text-3xl
          md:text-5xl
          font-semibold
          "
        >
          The Future of Digital
          <br />
          Community Intelligence

        </h2>


        <p
          className="
          mt-8
          text-xl
          text-slate-300
          "
        >
          One ecosystem.
          <br />
          One platform.
          <br />
          Millions connected.
        </p>



        <Link

          href="/dashboard"

          className="
          inline-flex
          mt-10
          px-10
          py-4
          rounded-full
          bg-[#D4AF37]
          text-[#0C1A3D]
          font-semibold
          tracking-wide
          hover:scale-105
          transition
          "

        >

          ENTER ZION OS

        </Link>



        <div
          className="
          mt-16
          grid
          md:grid-cols-3
          gap-6
          "
        >


          <div>
            <p className="text-3xl font-bold">
              Global
            </p>
            <p className="text-slate-400">
              Digital Network
            </p>
          </div>


          <div>
            <p className="text-3xl font-bold">
              Millions
            </p>
            <p className="text-slate-400">
              Connected People
            </p>
          </div>


          <div>
            <p className="text-3xl font-bold">
              100+
            </p>
            <p className="text-slate-400">
              Languages
            </p>
          </div>


        </div>


      </section>


    </main>

  );

}
