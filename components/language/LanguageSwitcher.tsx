"use client";

import { useState } from "react";


export default function LanguageSwitcher(){

const [open,setOpen]=useState(false);


const languages=[

{
code:"pt",
name:"Português"
},

{
code:"en",
name:"English"
},

{
code:"es",
name:"Español"
},

{
code:"fr",
name:"Français"
},

{
code:"de",
name:"Deutsch"
},

{
code:"zh",
name:"中文"
},

{
code:"ar",
name:"العربية"
},

{
code:"sw",
name:"Kiswahili"
},

{
code:"os",
name:"Oshiwambo"
},

{
code:"umb",
name:"Umbundu"
},

{
code:"kmb",
name:"Kimbundu"
}

];


return (

<div
className="
relative
"
>


<button

onClick={()=>setOpen(!open)}

className="
bg-white
rounded-xl
px-4
py-2
shadow
flex
items-center
gap-2
"

>

🌐 Português

</button>



{
open && (

<div
className="
absolute
right-0
mt-3
w-52
bg-white
rounded-2xl
shadow-xl
border
p-3
z-50
"
>


{
languages.map(language=>(

<button

key={language.code}

className="
block
w-full
text-left
px-4
py-3
rounded-lg
hover:bg-slate-100
"

>

{language.name}

</button>


))

}


</div>

)

}


</div>

)

}
