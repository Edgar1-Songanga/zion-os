import type { Metadata } from "next";
import "./globals.css";

import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Footer from "@/components/layout/Footer";


export const metadata: Metadata = {
  title: "ZION OS",
  description: "Global Adventist Digital Ecosystem",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {


return (

<html lang="en">


<body
className="
min-h-screen
bg-slate-100
"
>


<div
className="
flex
min-h-screen
"
>


<Sidebar />


<div
className="
flex-1
flex
flex-col
"
>


<Topbar />


<main
className="
flex-1
"
>

{children}

</main>


<Footer />


</div>


</div>


</body>


</html>

);

}
