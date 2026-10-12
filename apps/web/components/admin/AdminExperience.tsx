"use client";


import AdministrationHero from "./AdministrationHero";
import OrganizationOverview from "./OrganizationOverview";
import DepartmentsGrid from "./DepartmentsGrid";
import MinistryOverview from "./MinistryOverview";
import MembershipsOverview from "./MembershipsOverview";


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


<div id="organization-overview" className="scroll-mt-6"><OrganizationOverview /></div>


<MembershipsOverview />


<div id="department-overview" className="scroll-mt-6"><DepartmentsGrid /></div>


<MinistryOverview />


</div>


</main>

);

}
