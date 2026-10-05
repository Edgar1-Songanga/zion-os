"use client";

interface SharePostProps { postId:string; title?:string; }
export default function SharePost({postId,title="Publicação ZION"}:SharePostProps){
  async function sharePost(){
    const url=`${window.location.origin}/resa?post=${encodeURIComponent(postId)}`;
    try { if(navigator.share){await navigator.share({title, text:title, url});} else {await navigator.clipboard.writeText(url);} } catch {}
  }
  return <button onClick={()=>void sharePost()} className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">↗ Partilhar {title}</button>;
}