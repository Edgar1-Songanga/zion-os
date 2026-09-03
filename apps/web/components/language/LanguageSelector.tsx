"use client";


import { useState } from "react";


export default function LanguageSelector(){


const [language,setLanguage]=useState("pt");


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
}

];


return (

<select

value={language}

onChange={
e=>setLanguage(e.target.value)
}

className="
border
rounded-xl
px-4
py-2
bg-white
"

>


{

languages.map(lang=>(

<option
key={lang.code}
value={lang.code}
>

{lang.name}

</option>

))

}


</select>

)

}
