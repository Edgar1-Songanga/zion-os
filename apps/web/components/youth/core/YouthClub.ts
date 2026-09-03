export interface YouthClub {


id:string;


name:string;


programId:string;


churchId:string;


logo?:string;


banner?:string;


motto?:string;


leaders:string[];


members:string[];


status:
"active"
|
"inactive";



createdAt:string;


}



export const SAMPLE_YOUTH_CLUBS:YouthClub[]=[



{


id:"club-001",


name:
"Clube Monte Sinai",


programId:
"pathfinders",


churchId:
"church-001",


motto:
"Salvar do pecado e guiar no serviço",


leaders:[

"leader-001"

],


members:[

"member-001",

"member-002"

],


status:
"active",


createdAt:
"2026-01-01"


}


];
