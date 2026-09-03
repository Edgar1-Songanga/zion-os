export default function Footer() {

return (

<footer

className="
border-t
border-slate-200
bg-white
px-10
py-8
"

>


<div

className="
flex
items-center
justify-between
"

>


<div>

<p

className="
text-sm
font-semibold
text-[#0C1A3D]
"

>
ZION OS
</p>


<p

className="
text-xs
text-slate-500
mt-1
"

>
Global Adventist Digital Ecosystem
</p>


</div>



<div>

<p

className="
text-sm
text-slate-500
"

>
© {new Date().getFullYear()} ZION OS
</p>


<p

className="
text-xs
text-slate-400
mt-1
text-right
"

>
Powered by Magestade Pura Digital
</p>


</div>



</div>


</footer>

)

}
