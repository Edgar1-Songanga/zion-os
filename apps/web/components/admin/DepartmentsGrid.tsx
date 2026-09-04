"use client";


const departments = [

{
name:"Ministry of Youth",
description:"Youth programs, clubs, leadership and spiritual growth",
members:"250K+"
},

{
name:"Sabbath School",
description:"Bible study, classes and discipleship management",
members:"500K+"
},

{
name:"Women's Ministry",
description:"Women empowerment, fellowship and missions",
members:"180K+"
},

{
name:"Communication",
description:"Media, digital content and evangelism communication",
members:"90K+"
},

{
name:"Health Ministry",
description:"Health programs, wellness and community services",
members:"120K+"
},

{
name:"Evangelism",
description:"Mission projects, outreach and baptisms",
members:"300K+"
}

];


export default function DepartmentsGrid(){


return (

<section

className="
bg-white
rounded-3xl
border
border-slate-200
p-8
shadow-sm
"

>


<div
className="
mb-8
"
>

<h2
className="
text-2xl
font-semibold
text-[#0C1A3D]
"
>
Departments & Ministries
</h2>


<p
className="
mt-2
text-slate-500
"
>
Institutional departments connected to the ZION OS ecosystem.
</p>


</div>



<div

className="
grid
md:grid-cols-3
gap-6
"

>


{departments.map((department)=>(


<div

key={department.name}

className="
rounded-2xl
bg-slate-50
border
border-slate-100
p-6
hover:shadow-md
transition
"

>


<h3

className="
font-semibold
text-[#0C1A3D]
"

>
{department.name}
</h3>


<p

className="
mt-3
text-sm
text-slate-500
"

>
{department.description}
</p>


<div

className="
mt-5
text-sm
font-semibold
text-[#D4AF37]
"

>
{department.members} members

</div>


</div>


))}


</div>


</section>

);

}
