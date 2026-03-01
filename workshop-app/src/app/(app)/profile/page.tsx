import { auth } from "workshop/server/auth";
import { redirect } from "next/navigation";
import { db } from "workshop/server/db";
import { ProfileForm } from "workshop/components/profile/profile-form";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      displayName: true,
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Profile
      </h1>

      <ProfileForm
        user={{
          name: user?.name ?? "",
          email: user?.email ?? "",
          image: user?.image ?? null,
          displayName: user?.displayName ?? "",
        }}
      />
    </div>
  );
}
