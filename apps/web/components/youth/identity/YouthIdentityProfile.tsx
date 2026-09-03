"use client";


import IdentityHero from "./IdentityHero";

import YouthBrandCard from "./YouthBrandCard";

import HeritageTimeline from "./HeritageTimeline";



interface YouthIdentityProfileProps {


name:string;

program:string;

motto:string;

description:string;

logo?:string;

background?:string;

historyItems:any[];

}



export default function YouthIdentityProfile({

name,

program,

motto,

description,

logo,

background,

historyItems

}:YouthIdentityProfileProps){



return (

<div className="
space-y-10
">


<IdentityHero

name={name}

program={program}

motto={motto}

description={description}

logo={logo}

background={background}

/>



<YouthBrandCard

name={name}

program={program}

motto={motto}

philosophy={description}

logo={logo}

/>



<div>


<h2 className="
text-3xl
font-bold
text-[#0C1A3D]
mb-6
">

Nossa História

</h2>



<HeritageTimeline

items={historyItems}

/>


</div>


</div>

);

}
