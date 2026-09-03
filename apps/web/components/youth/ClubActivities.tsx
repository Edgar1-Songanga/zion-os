"use client";


import ActivityCard from "../ministry/ActivityCard";



interface Activity {


title:string;

type:string;

date:string;

location:string;

participants:number;

}



interface ClubActivitiesProps {


activities:Activity[];

}



export default function ClubActivities({

activities

}:ClubActivitiesProps){



return (

<div className="
space-y-6
">


{activities.map((activity,index)=>(


<ActivityCard

key={index}

title={activity.title}

type={activity.type}

date={activity.date}

location={activity.location}

participants={activity.participants}

/>


))}


</div>

);

}
