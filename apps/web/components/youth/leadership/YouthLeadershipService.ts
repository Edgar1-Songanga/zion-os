import {

YouthLeader

} from "./YouthLeader";



class YouthLeadershipService {



private leaders:YouthLeader[]=[];



assignLeader(

leader:YouthLeader

){


this.leaders.push(leader);


return leader;

}



getAll(){

return this.leaders;

}



getClubLeaders(

clubId:string

){


return this.leaders.filter(

(leader)=>

leader.clubId === clubId

);

}



getMemberLeadership(

memberId:string

){


return this.leaders.filter(

(leader)=>

leader.memberId === memberId

);

}



updateStatus(

id:string,

status:"active"|"inactive"

){



const leader =

this.leaders.find(

(item)=>

item.id === id

);



if(!leader){

return null;

}



leader.status=status;


return leader;

}



}



export default new YouthLeadershipService();
