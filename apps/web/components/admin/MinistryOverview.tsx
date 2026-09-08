"use client";

import Link from "next/link";


const ministries = [

{
icon:"YM",
name:"Youth Ministry",
area:"Global youth discipleship, leadership development, club systems and spiritual growth initiatives.",
status:"Operational",
members:"12,540",
activity:"Leadership development programs and youth engagement activities are active.",
leader:"Youth Ministry Director",
permissions:"Administrator • Manager • Coordinator • Viewer",
levels:[
"Local Church",
"District",
"Conference",
"Union",
"Division",
"General Conference"
],
path:"/youth"
},


{
icon:"SS",
name:"Sabbath School Ministry",
area:"Bible study ecosystems, class management, discipleship pathways and spiritual formation.",
status:"Operational",
members:"28,430",
activity:"Weekly study programs and discipleship reporting are active.",
leader:"Sabbath School Director",
permissions:"Administrator • Teacher • Coordinator • Viewer",
levels:[
"Local Church",
"District",
"Conference",
"Union",
"Division",
"General Conference"
],
path:"/sabbath-school"
},


{
icon:"WM",
name:"Women's Ministry",
area:"Women empowerment, fellowship networks, mission initiatives and community impact programs.",
status:"Operational",
members:"18,200",
activity:"Mission projects and community initiatives are currently active.",
leader:"Women's Ministry Director",
permissions:"Administrator • Manager • Coordinator • Viewer",
levels:[
"Local Church",
"District",
"Conference",
"Union",
"Division",
"General Conference"
],
path:"/women"
},


{
icon:"HM",
name:"Health Ministry",
area:"Health education, wellness programs, preventive care initiatives and community transformation.",
status:"Operational",
members:"9,870",
activity:"Health programs and community outreach initiatives are active.",
leader:"Health Ministry Director",
permissions:"Administrator • Health Officer • Coordinator • Viewer",
levels:[
"Local Church",
"District",
"Conference",
"Union",
"Division",
"General Conference"
],
path:"/health"
},


{
icon:"CM",
name:"Communication Ministry",
area:"Digital evangelism, media operations, content management and global communication strategies.",
status:"Operational",
members:"6,450",
activity:"Digital communication campaigns and content operations are active.",
leader:"Communication Director",
permissions:"Administrator • Content Manager • Editor • Viewer",
levels:[
"Local Church",
"District",
"Conference",
"Union",
"Division",
"General Conference"
],
path:"/communication"
}

];



export default function MinistryOverview(){


return (

<section

className="
mt-8
bg-white
rounded-3xl
border
border-slate-200
p-8
shadow-sm
"

>


<div className="mb-8">


<h2

className="
text-2xl
font-semibold
text-[#0C1A3D]
"

>
Ministry Ecosystem Command Center
</h2>


<p

className="
mt-2
text-slate-500
max-w-3xl
"

>
A unified operational environment for managing ministries, leadership structures, member engagement and institutional activities across the global ZION OS network.
</p>


</div>




<div

className="
grid
md:grid-cols-2
gap-6
"

>


{ministries.map((ministry)=>(


<div

key={ministry.name}

className="
rounded-3xl
border
border-slate-200
p-6
bg-slate-50
hover:shadow-lg
transition-all
"

>


<div

className="
flex
justify-between
items-start
"

>


<div

className="
flex
items-center
gap-4
"

>


<div

className="
w-12
h-12
rounded-2xl
bg-[#0C1A3D]
text-white
flex
items-center
justify-center
text-sm
font-bold
"

>
{ministry.icon}
</div>


<div>


<h3

className="
font-semibold
text-[#0C1A3D]
"

>
{ministry.name}
</h3>


<p

className="
text-xs
text-slate-500
mt-1
"

>
{ministry.area}
</p>


</div>


</div>




<span

className="
text-xs
font-semibold
text-green-600
"

>
{ministry.status}
</span>


</div>





<div

className="
mt-6
grid
gap-3
text-sm
text-slate-600
"

>


<div>

<span className="font-semibold text-[#0C1A3D]">
Members:
</span>

{" "}
{ministry.members}

</div>




<div>

<span className="font-semibold text-[#0C1A3D]">
Latest Activity:
</span>

{" "}
{ministry.activity}

</div>




<div>

<span className="font-semibold text-[#0C1A3D]">
Leadership:
</span>

{" "}
{ministry.leader}

</div>




<div>

<span className="font-semibold text-[#0C1A3D]">
Access Control:
</span>

{" "}
{ministry.permissions}

</div>


</div>






<div

className="
mt-6
"

>


<h4

className="
text-xs
font-semibold
text-[#0C1A3D]
mb-3
"

>
Organizational Coverage
</h4>



<div

className="
flex
flex-wrap
gap-2
"

>


{ministry.levels.map(level=>(


<span

key={level}

className="
px-3
py-1
rounded-full
bg-white
border
border-slate-200
text-xs
text-slate-600
"

>
{level}
</span>


))}


</div>


</div>






<Link

href={ministry.path}

className="
mt-6
inline-flex
items-center
text-sm
font-semibold
text-[#D4AF37]
hover:underline
"

>
Access Ministry Command Center →
</Link>





</div>


))}


</div>


</section>


);

  }
