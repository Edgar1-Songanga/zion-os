"use client";


export type ZionIdentity =

| "core"
| "health"
| "youth"
| "family"
| "worship"
| "leadership"
| "community";



interface IdentityConfig {

name:string;

description:string;

images:string[];

}



export const identityLibrary:Record<ZionIdentity,IdentityConfig>={


core:{

name:"ZION Core",

description:"Identidade central do ecossistema ZION.",

images:[

"https://images.unsplash.com/photo-1529156069898-49953e39b3ac",

"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee"

]

},



health:{

name:"ZION Health",

description:"Saúde integral, bem-estar e os oito remédios naturais.",

images:[

"https://images.unsplash.com/photo-1505751172876-fa1923c5c528",

"https://images.unsplash.com/photo-1498837167922-ddd27525d352"

]

},



youth:{

name:"ZION Youth",

description:"Juventude, liderança, crescimento e missão.",

images:[

"https://images.unsplash.com/photo-1529156069898-49953e39b3ac",

"https://images.unsplash.com/photo-1529390079861-591de354faf5"

]

},



family:{

name:"ZION Family",

description:"Família, relacionamento e cuidado.",

images:[

"https://images.unsplash.com/photo-1511895426328-dc8714191300"

]

},



worship:{

name:"ZION Worship",

description:"Adoração, espiritualidade e conexão com Deus.",

images:[

"https://images.unsplash.com/photo-1507692049790-de58290a4334"

]

},



leadership:{

name:"ZION Leadership",

description:"Liderança, visão e missão.",

images:[

"https://images.unsplash.com/photo-1556761175-b413da4baf72"

]

},



community:{

name:"ZION Community",

description:"Comunidade, serviço e conexão humana.",

images:[

"https://images.unsplash.com/photo-1511632765486-a01980e01a18"

]

}


};



export function getIdentity(identity:ZionIdentity){

return identityLibrary[identity];

}
