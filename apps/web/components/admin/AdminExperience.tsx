"use client";


import AdministrationHero from "./AdministrationHero";
import OrganizationOverview from "./OrganizationOverview";
import DepartmentsGrid from "./DepartmentsGrid";
import MinistryOverview from "./MinistryOverview";


export default function AdminExperience(){


return (

<main

className="
min-h-screen
bg-slate-100
p-8
"

>


<div

className="
max-w-7xl
mx-auto
"

>


<AdministrationHero />


<OrganizationOverview />


<DepartmentsGrid />


<MinistryOverview />


</div>


</main>

);

}
