import { Comment } from "@/types/resa";


interface CommentListProps {

comments: Comment[];

}



export default function CommentList({

comments

}:CommentListProps){


return (

<div className="space-y-3">


{comments.map((comment)=>(


<div

key={comment.id}

className="
bg-gray-50
rounded-xl
p-3
"

>


<div className="font-semibold">

{comment.author.name}

</div>


<p className="text-sm">

{comment.content}

</p>


<div className="text-xs text-gray-400 mt-1">

{comment.createdAt.toString()}

</div>


</div>


))}


</div>

);


}
