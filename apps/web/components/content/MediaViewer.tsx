"use client";


interface MediaViewerProps {

type:string;

url:string;

}



export default function MediaViewer({

type,

url

}:MediaViewerProps){



return (

<div

className="
bg-black
rounded-3xl
overflow-hidden
min-h-[250px]
flex
items-center
justify-center
"

>


{

type==="video" && (

<video

src={url}

controls

className="w-full"

/>

)


}



{

type==="image" && (

<img

src={url}

alt="media"

className="w-full"

/>

)


}



{

type==="audio" && (

<audio

src={url}

controls

/>

)


}



{

type==="document" && (

<div

className="
text-white
"

>

Documento

</div>

)


}



</div>

);

}
