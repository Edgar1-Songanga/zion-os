"use client";


import React, {
createContext,
useContext
} from "react";


import {
YOUTH_THEMES
} from "./YouthThemeConfig";



interface YouthThemeContextType {


theme:any;

}



const YouthThemeContext =
createContext<YouthThemeContextType | null>(null);



interface YouthThemeProviderProps {


children:React.ReactNode;

themeName:string;

}



export default function YouthThemeProvider({

children,

themeName

}:YouthThemeProviderProps){



const theme =
YOUTH_THEMES.find(

(item)=>

item.name === themeName

);



return (

<YouthThemeContext.Provider

value={{

theme

}}

>


<div

className="
min-h-screen
transition-all
duration-700
"

style={{

backgroundImage:

theme

?

`url(${theme.background})`

:

undefined,

backgroundSize:"cover",

backgroundPosition:"center"

}}

>


{children}


</div>


</YouthThemeContext.Provider>


);

}



export function useYouthTheme(){



const context =
useContext(
YouthThemeContext
);



if(!context){

throw new Error(

"useYouthTheme must be used inside YouthThemeProvider"

);

}



return context;

}
