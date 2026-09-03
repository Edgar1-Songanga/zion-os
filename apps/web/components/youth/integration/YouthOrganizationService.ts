import {

YouthOrganizationLink

} from "./YouthOrganizationLink";



class YouthOrganizationService {



private links:YouthOrganizationLink[] = [];



createLink(

link:YouthOrganizationLink

){


this.links.push(link);


return link;

}



getClubOrganization(

clubId:string

){


return this.links.find(

(link)=>

link.clubId === clubId

);

}



getChurchClubs(

churchId:string

){


return this.links.filter(

(link)=>

link.churchId === churchId

);

}



getDistrictClubs(

districtId:string

){


return this.links.filter(

(link)=>

link.districtId === districtId

);

}



getMissionClubs(

missionId:string

){


return this.links.filter(

(link)=>

link.missionId === missionId

);

}



}



export default new YouthOrganizationService();
