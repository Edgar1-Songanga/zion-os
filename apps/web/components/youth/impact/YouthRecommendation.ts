export type YouthRecommendationType =


"growth"

|

"leadership"

|

"participation"

|

"spiritual"

|

"service";




export interface YouthRecommendation {


id:string;


type:YouthRecommendationType;


message:string;


priority:

"low"

|

"medium"

|

"high";



generatedBy:

"system"

|

"leader";



createdAt:string;


}
