import {

LeadershipRole

} from "./LeadershipRole";



export interface YouthLeader {


id:string;


memberId:string;


clubId?:string;


role:LeadershipRole;


startDate:string;


endDate?:string;


certifications:string[];


status:

"active"

|

"inactive";



}
