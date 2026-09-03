"use client";


import {

YOUTH_THEMES

} from "./YouthThemeConfig";



interface YouthThemePreviewProps {


themeName:string;

}



export default function YouthThemePreview({

themeName

}:YouthThemePreviewProps){



const theme =

YOUTH_THEMES.find(

(item)=>

item.name === themeName

);



if(!theme){

return null;

}



return (

<div

className="
relative
h-96
rounded-3xl
overflow-hidden
border
border-white/20
"

style={{

backgroundImage:

`url(${theme.background})`,

backgroundSize:"cover",

backgroundPosition:"center"

}}

>


<div className="
absolute
inset-0
bg-black/40
"/>



<div className="
relative
z-10
h-full
flex
flex-col
justify-center
items-center
text-center
px-8
">


<h1 className="
text-4xl
font-bold
text-white
">

{theme.name}

</h1>



<p className="
mt-4
text-xl
text-white/80
">

{theme.description}

</p>



<p className="
mt-3
italic
text-white/70
">

{theme.mood}

</p>


</div>


</div>

);

}
