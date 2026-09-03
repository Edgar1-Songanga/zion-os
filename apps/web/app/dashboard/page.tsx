import HeroCard from "@/components/dashboard/HeroCard";
import StatsGrid from "@/components/dashboard/StatsGrid";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import ReputationCard from "@/components/dashboard/ReputationCard";
import DashboardExperience from "@/components/dashboard/DashboardExperience";


export default function Dashboard(){


return (

<DashboardExperience>


<HeroCard />


<StatsGrid />


<div
className="
grid
grid-cols-2
gap-8
mt-8
"
>

<ActivityFeed />

<ReputationCard />

</div>


</DashboardExperience>

);

}
