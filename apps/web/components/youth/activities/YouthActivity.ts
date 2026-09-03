export type ActivityType =


"meeting"

|

"camp"

|

"congress"

|

"investiture"

|

"training"

|

"mission"

|

"community_service";





export interface YouthActivity {


id:string;


clubId:string;


programId:string;


title:string;


description:string;


type:ActivityType;


date:string;


location:string;


leaderId:string;


participants:string[];


status:

"planned"

|

"ongoing"

|

"completed";


}
