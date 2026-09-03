import ResaHero from "@/components/resa/ResaHero";
import CreatePost from "@/components/resa/CreatePost";
import FeedCard from "@/components/resa/FeedCard";
import CommunityCard from "@/components/resa/CommunityCard";
import ZionPoints from "@/components/resa/ZionPoints";


export default function RESA(){

  return (

    <main className="
      p-8
      bg-slate-100
      min-h-screen
    ">


      <ResaHero />


      <div className="
        grid
        grid-cols-3
        gap-8
        mt-8
      ">


        <div className="
          col-span-2
          space-y-8
        ">

          <CreatePost />

          <FeedCard />

        </div>



        <div className="
          space-y-8
        ">

          <ZionPoints />

          <CommunityCard />

        </div>


      </div>


    </main>

  );

}
