import PrayerRequestForm 
from "@/components/resa/prayer/PrayerRequestForm";


import PrayerFeed 
from "@/components/resa/prayer/PrayerFeed";


import PrayerActions 
from "@/components/resa/prayer/PrayerActions";



export default function PrayerCenter(){


return (

<main
className="
min-h-screen
bg-slate-100
p-8
"
>


<h1
className="
text-4xl
font-bold
text-[#0C1A3D]
"
>
Prayer Center
</h1>


<p
className="
mt-3
text-slate-500
"
>
A global community united in prayer.
</p>



<div
className="
grid
grid-cols-3
gap-8
mt-10
"
>


<PrayerRequestForm />


<PrayerFeed />


<PrayerActions />


</div>


</main>

)

}
