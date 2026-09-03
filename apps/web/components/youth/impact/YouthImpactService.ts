import {

YouthImpactRecord

} from "./YouthImpactRecord";


import {

YouthReport,

YouthReportMetrics

} from "./YouthReport";


import {

YouthRecommendation

} from "./YouthRecommendation";



class YouthImpactService {



private impactRecords:YouthImpactRecord[]=[];



addImpactRecord(

record:YouthImpactRecord

){


this.impactRecords.push(record);


return record;

}




getClubImpact(

clubId:string

){


return this.impactRecords.filter(

(record)=>

record.clubId === clubId

);

}





calculateMetrics(

clubId:string

):YouthReportMetrics {



const records =

this.getClubImpact(clubId);



return {


participation:

records.reduce(

(total,item)=>

total + item.participantsCount,

0

),



serviceHours:

records.reduce(

(total,item)=>

total + item.serviceHours,

0

),



skillsCompleted:

records.reduce(

(total,item)=>

total + item.skillsCompleted,

0

),



spiritualActions:

records.reduce(

(total,item)=>

total + item.spiritualActions,

0

),



activitiesCompleted:

records.length,



membersEngaged:

new Set(

records.flatMap(

(item)=>

[item.clubId]

)

).size


};



}





generateRecommendations(

metrics:YouthReportMetrics

):YouthRecommendation[] {



const recommendations:YouthRecommendation[]=[];



if(metrics.participation < 20){


recommendations.push({


id:"rec-participation",


type:"participation",


message:

"Aumentar estratégias de envolvimento dos jovens nas actividades.",


priority:"high",


generatedBy:"system",


createdAt:new Date().toISOString()


});

}



if(metrics.serviceHours > 50){


recommendations.push({


id:"rec-service",


type:"service",


message:

"Reconhecer o impacto de serviço comunitário desenvolvido pelo clube.",


priority:"medium",


generatedBy:"system",


createdAt:new Date().toISOString()


});

}



if(metrics.spiritualActions < 10){


recommendations.push({


id:"rec-spiritual",


type:"spiritual",


message:

"Fortalecer iniciativas de crescimento espiritual e discipulado.",


priority:"high",


generatedBy:"system",


createdAt:new Date().toISOString()


});

}



return recommendations;

}





generateReport(

clubId:string,

organizationId:string

):YouthReport {



const metrics =

this.calculateMetrics(clubId);



return {


id:

`report-${Date.now()}`,



clubId,


organizationId,


periodStart:

new Date().toISOString(),



periodEnd:

new Date().toISOString(),



metrics,


impactRecords:

this.getClubImpact(clubId)

.map(

(item)=>

item.id

),



recommendations:

this.generateRecommendations(metrics),



status:"draft",



generatedBy:"system",



createdAt:

new Date().toISOString(),



updatedAt:

new Date().toISOString()


};



}



}



export default new YouthImpactService();
