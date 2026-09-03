"use client";

interface Badge {
  name: string;
  type: string;
}


const badges: Badge[] = [
  {
    name: "Community Builder",
    type: "community",
  },
  {
    name: "Bible Explorer",
    type: "spiritual",
  },
  {
    name: "Global Connector",
    type: "global",
  },
];


export default function ReputationCard() {

  return (

    <section
      className="
      relative
      overflow-hidden
      rounded-[32px]
      p-8
      bg-white/10
      backdrop-blur-2xl
      border border-white/20
      shadow-2xl
      "
    >

      <div
        className="
        absolute
        inset-0
        bg-gradient-to-br
        from-[#D4AF37]/20
        via-transparent
        to-transparent
        "
      />


      <div className="relative z-10">


        <h2
          className="
          text-2xl
          font-semibold
          text-white
          "
        >
          ZION Reputation
        </h2>


        <p
          className="
          mt-2
          text-white/60
          "
        >
          Community impact and spiritual contribution
        </p>



        <div className="mt-8">


          <p
            className="
            uppercase
            tracking-[0.25em]
            text-xs
            text-white/50
            "
          >
            Global Impact Points
          </p>


          <h3
            className="
            mt-3
            text-6xl
            font-bold
            text-[#D4AF37]
            "
          >
            84,500
          </h3>



          <div className="mt-6">


            <div
              className="
              flex
              justify-between
              text-sm
              text-white/70
              "
            >
              <span>
                Level 08
              </span>

              <span>
                80%
              </span>

            </div>



            <div
              className="
              mt-3
              h-3
              rounded-full
              bg-white/20
              overflow-hidden
              "
            >

              <div
                className="
                h-full
                w-[80%]
                rounded-full
                bg-[#D4AF37]
                "
              />

            </div>


          </div>



          <div
            className="
            mt-8
            space-y-3
            "
          >

            {badges.map((badge)=>(

              <div
                key={badge.type}
                className="
                flex
                items-center
                gap-4
                rounded-2xl
                bg-white/10
                border
                border-white/20
                px-5
                py-4
                "
              >

                <div
                  className="
                  h-3
                  w-3
                  rounded-full
                  bg-[#D4AF37]
                  "
                />


                <div>

                  <p
                    className="
                    text-white
                    font-medium
                    "
                  >
                    {badge.name}
                  </p>


                  <p
                    className="
                    text-xs
                    text-white/50
                    "
                  >
                    Verified contribution
                  </p>

                </div>


              </div>

            ))}


          </div>


        </div>


      </div>


    </section>

  );

}
