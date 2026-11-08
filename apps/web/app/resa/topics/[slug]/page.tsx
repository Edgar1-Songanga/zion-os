import ResaTopicFeed from "@/components/resa/ResaTopicFeed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ResaTopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ResaTopicFeed slug={slug} />;
}
