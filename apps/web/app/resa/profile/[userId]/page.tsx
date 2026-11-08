import ResaMemberProfile from "@/components/resa/ResaMemberProfile";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ResaMemberProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <ResaMemberProfile userId={userId} />;
}
