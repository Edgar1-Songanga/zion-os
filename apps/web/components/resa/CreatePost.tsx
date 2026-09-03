export default function CreatePost(){

return (

<div
className="
bg-white
rounded-3xl
p-6
border
border-slate-200
shadow-sm
"
>

<h2 className="text-xl font-bold text-[#0C1A3D]">
Criar publicação
</h2>


<textarea

placeholder="Partilhe uma mensagem, testemunho ou reflexão..."

className="
mt-5
w-full
h-32
rounded-2xl
border
border-slate-200
p-4
resize-none
outline-none
"

/>


<div className="flex justify-between mt-4">


<div className="flex gap-3">


<button
className="
px-4
py-2
rounded-xl
bg-slate-100
"
>
🙏 Oração
</button>


<button
className="
px-4
py-2
rounded-xl
bg-slate-100
"
>
📖 Estudo
</button>


</div>



<button
className="
px-6
py-2
rounded-xl
bg-[#0C1A3D]
text-white
"
>
Publicar
</button>


</div>


</div>

)

}
