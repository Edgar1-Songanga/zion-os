export interface YouthEvent {


id:string;


title:string;


description:string;


organizerId:string;


programIds:string[];


clubIds:string[];


startDate:string;


endDate:string;


location:string;


coordinatorId:string;


registrationRequired:boolean;


status:

"draft"

|

"published"

|

"completed";



}
