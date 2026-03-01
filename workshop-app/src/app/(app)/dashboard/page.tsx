import { auth } from "workshop/server/auth";
import { redirect } from "next/navigation";
import { serverCaller } from "workshop/trpc/server";
import { DashboardContent } from "workshop/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const [myDocs, reviewDocs] = await Promise.all([
    serverCaller.document.listMine(),
    serverCaller.document.listReviewing(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <DashboardContent myDocs={myDocs} reviewDocs={reviewDocs} />
    </div>
  );
}
