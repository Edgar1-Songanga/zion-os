export type AchievementType =


"class"

|

"specialty"

|

"service"

|

"event"

|

"investiture"

|

"leadership";





export interface YouthAchievement {


id:string;


memberId:string;


programId:string;


type:AchievementType;


title:string;


description:string;


date:string;


verified:boolean;


verifiedBy?:string;


}
