import {

Certificate

} from "./Certificate";



class CertificationService {



private certificates:Certificate[]=[];



issueCertificate(

certificate:Certificate

){


this.certificates.push(certificate);


return certificate;

}



getMemberCertificates(

memberId:string

){


return this.certificates.filter(

(certificate)=>

certificate.memberId === memberId

);

}



getCertificateByCode(

code:string

){


return this.certificates.find(

(certificate)=>

certificate.verificationCode === code

);

}



revokeCertificate(

id:string

){


const certificate =

this.certificates.find(

(item)=>

item.id === id

);



if(!certificate){

return null;

}



certificate.status="revoked";


return certificate;

}



validateCertificate(

code:string

){


const certificate =

this.getCertificateByCode(code);



return certificate

?

certificate.status === "valid"

:

false;

}



}



export default new CertificationService();
