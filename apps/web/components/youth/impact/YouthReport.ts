import { YouthRecommendation } from "./YouthRecommendation";


export interface YouthReportMetrics {


participation:number;


serviceHours:number;


skillsCompleted:number;


spiritualActions:number;


activitiesCompleted:number;


membersEngaged:number;


}



export interface YouthReport {


id:string;


clubId:string;


organizationId:string;


periodStart:string;


periodEnd:string;



metrics:YouthReportMetrics;



impactRecords:string[];



recommendations:YouthRecommendation[];



status:

"draft"

|

"review"

|

"approved";



generatedBy:

"system"

|

"leader";



createdAt:string;


updatedAt:string;


}
