import Link from "next/link";

export default function Sidebar() {

  const sections = [
    {
      title: "Core",
      items: [
        {
          name: "Dashboard",
          path: "/dashboard",
        },
        {
          name: "RESA",
          path: "/resa",
        },
      ],
    },

    {
      title: "Spiritual",
      items: [
        {
          name: "Bible Engine",
          path: "/bible-engine",
        },
        {
          name: "Communities",
          path: "/communities",
        },
      ],
    },

    {
      title: "Management",
      items: [
        {
          name: "Finance",
          path: "/finance",
        },
        {
          name: "Administration",
          path: "/admin",
        },
        {
          name: "Reports",
          path: "/reports",
        },
      ],
    },
  ];


  return (

    <aside
      className="
      min-h-screen
      w-72
      bg-[#0C1A3D]
      text-white
      p-6
      "
    >


      {/* Logo */}

      <div>

        <h1
          className="
          text-3xl
          font-bold
          tracking-wide
          "
        >
          ZION
          <span className="text-[#D4AF37]">
            OS
          </span>

        </h1>


        <p className="text-sm text-slate-300 mt-1">
          Global Digital Ecosystem
        </p>


      </div>



      {/* Profile */}

      <div
        className="
        mt-8
        bg-white/10
        rounded-2xl
        p-4
        "
      >

        <p className="font-semibold">
          Edgar
        </p>

        <p className="text-xs text-slate-300">
          Global Administrator
        </p>

      </div>



      {/* Menu */}

      <nav className="mt-8">


      {sections.map(section => (

        <div
        key={section.title}
        className="mb-6"
        >


          <p
          className="
          text-xs
          uppercase
          text-slate-400
          mb-3
          "
          >
            {section.title}
          </p>



          {section.items.map(item => (

            <Link

            key={item.name}

            href={item.path}

            className="
            block
            rounded-xl
            px-4
            py-3
            mb-2
            text-sm
            hover:bg-white/10
            transition
            "

            >

            {item.name}

            </Link>


          ))}



        </div>


      ))}


      </nav>


    </aside>

  );

}
