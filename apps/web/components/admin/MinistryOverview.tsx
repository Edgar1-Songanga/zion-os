"use client";


const ministries = [

{
name:"Ministry of Youth",
area:"Youth discipleship, clubs, leadership and spiritual development",
status:"Connected",
path:"/youth"
},

{
name:"Sabbath School",
area:"Bible study, classes and discipleship journey",
status:"Connected",
path:"/sabbath-school"
},

{
name:"Women's Ministry",
area:"Women empowerment, fellowship and missions",
status:"Connected",
path:"/women"
},

{
name:"Health Ministry",
area:"Wellness programs, health education and community impact",
status:"Connected",
path:"/health"
},

{
name:"Communication Ministry",
area:"Media, digital evangelism and content management",
status:"Connected",
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
Ministry Ecosystem
</h2>


<p

className="
mt-2
text-slate-500
"

>
Connected ministries operating inside the ZION OS institutional network.
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
rounded-2xl
border
border-slate-100
p-6
bg-slate-50
hover:shadow-md
transition
"

>


<div

className="
flex
justify-between
items-start
"

>


<h3

className="
font-semibold
text-[#0C1A3D]
"

>
{ministry.name}
</h3>


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



<p

className="
mt-3
text-sm
text-slate-500
"

>
{ministry.area}
</p>



<button

className="
mt-5
text-sm
font-semibold
text-[#D4AF37]
"

>
Open Ministry

</button>


</div>


))}


</div>


</section>

);

}
