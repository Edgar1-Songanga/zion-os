import {

YouthClub,

SAMPLE_YOUTH_CLUBS

} from "./YouthClub";



class YouthClubService {



private clubs:YouthClub[] =
[...SAMPLE_YOUTH_CLUBS];



getAll(){

return this.clubs;

}



getById(id:string){

return this.clubs.find(

(club)=>

club.id === id

);

}



create(club:YouthClub){

this.clubs.push(club);

return club;

}



update(

id:string,

data:Partial<YouthClub>

){


const index =

this.clubs.findIndex(

(club)=>

club.id === id

);



if(index === -1){

return null;

}



this.clubs[index]={

...this.clubs[index],

...data

};



return this.clubs[index];

}



addMember(

clubId:string,

memberId:string

){


const club =

this.getById(clubId);



if(!club){

return null;

}



club.members.push(memberId);


return club;

}



addLeader(

clubId:string,

leaderId:string

){


const club =

this.getById(clubId);



if(!club){

return null;

}



club.leaders.push(leaderId);


return club;

}



}



export default new YouthClubService();
