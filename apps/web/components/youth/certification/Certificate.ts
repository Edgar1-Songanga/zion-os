export type CertificateType =


"class_completion"

|

"specialty"

|

"leadership"

|

"service"

|

"training";





export interface Certificate {


id:string;


memberId:string;


type:CertificateType;


title:string;


description:string;


issuedDate:string;


issuedBy:string;


verificationCode:string;


status:

"valid"

|

"revoked";


}
