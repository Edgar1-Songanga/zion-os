export default function Footer() {

  return (

    <footer
      className="
      border-t
      border-slate-200
      bg-white
      px-8
      py-6
      text-center
      "
    >

      <p className="text-sm text-slate-500">

        © {new Date().getFullYear()} ZION OS

      </p>


      <p
        className="
        mt-2
        text-sm
        text-slate-400
        "
      >

        Powered by{" "}

        <span
          className="
          font-semibold
          text-[#0C1A3D]
          "
        >

          Magestade Pura Digital

        </span>

      </p>


    </footer>

  );

}
