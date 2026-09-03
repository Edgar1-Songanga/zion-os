"use client";


interface SharePostProps {

postId:string;

title?:string;

}



export default function SharePost({

postId,

title="Publicação ZION"

}:SharePostProps){



function sharePost(){


console.log({

action:"share",

postId

});


}



return (

<button

onClick={sharePost}

className="
px-5
py-2
rounded-full
border
border-slate-300
text-slate-700
hover:bg-slate-100
"

>

↗ Partilhar {title}

</button>

);

}
