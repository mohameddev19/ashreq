import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/chat");
  }
  return <>{children}</>;
}
