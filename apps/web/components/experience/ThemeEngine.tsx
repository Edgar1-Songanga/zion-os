"use client";


export type ZionTheme =

| "core"
| "health"
| "youth"
| "family"
| "worship"
| "leadership"
| "community";



interface ThemeConfig {

name:string;

primary:string;

secondary:string;

background:string;

}



export const themes:Record<ZionTheme,ThemeConfig>={


core:{

name:"ZION Core",

primary:"#0C1A3D",

secondary:"#D4AF37",

background:"core"

},


health:{

name:"Health & Wellness",

primary:"#166534",

secondary:"#38BDF8",

background:"health"

},


youth:{

name:"Youth Ministry",

primary:"#7C3AED",

secondary:"#F59E0B",

background:"youth"

},


family:{

name:"Family Care",

primary:"#BE123C",

secondary:"#FBCFE8",

background:"family"

},


worship:{

name:"Worship",

primary:"#312E81",

secondary:"#E0E7FF",

background:"worship"

},


leadership:{

name:"Leadership",

primary:"#92400E",

secondary:"#FDE68A",

background:"leadership"

},


community:{

name:"Community",

primary:"#0369A1",

secondary:"#BAE6FD",

background:"community"

}


};



export function getTheme(theme:ZionTheme){

return themes[theme];

}
