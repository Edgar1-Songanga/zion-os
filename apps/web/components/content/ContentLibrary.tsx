"use client";


import ContentFeed from "./ContentFeed";


export default function ContentLibrary(){


return (

<div

className="
bg-slate-50
min-h-screen
p-6
"

>


<div className="max-w-4xl mx-auto">


<h1 className="text-3xl font-bold">

Biblioteca ZION

</h1>



<p className="mt-2 text-slate-500">

Conteúdos para crescimento espiritual e aprendizagem.

</p>



<div className="mt-8">


<ContentFeed />


</div>


</div>


</div>

);

}
