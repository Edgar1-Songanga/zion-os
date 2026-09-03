import { Comment } from "@/types/resa";


interface ReplyThreadProps {

comment: Comment;

}



export default function ReplyThread({

comment

}:ReplyThreadProps){


return (

<div className="
ml-6
border-l
pl-4
mt-3
">


<div className="font-medium">

{comment.author.name}

</div>


<p className="text-sm">

{comment.content}

</p>


</div>

);


}
