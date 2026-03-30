"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Anchor, Button, Group, Text } from "@mantine/core";

export type AuthUser = {
  id: string;
  phone: string;
  isAdmin: boolean;
};

export function AuthBar() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  const refresh = useCallback(() => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { user: AuthUser | null }) => setUser(d.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    router.refresh();
  };

  if (user === undefined) {
    return (
      <Group justify="flex-end" mb="sm">
        <Text size="sm" c="dimmed">
          …
        </Text>
      </Group>
    );
  }

  if (!user) {
    return (
      <Group justify="flex-end" mb="sm" gap="sm">
        <Anchor component={Link} href="/login" size="sm">
          تسجيل الدخول
        </Anchor>
        <Anchor component={Link} href="/register" size="sm">
          حساب جديد
        </Anchor>
      </Group>
    );
  }

  return (
    <Group justify="flex-end" mb="sm" gap="sm" wrap="wrap">
      <Text size="sm" c="dimmed" dir="ltr">
        {user.phone}
      </Text>
      <Anchor component={Link} href="/feedback" size="sm">
        ملاحظات
      </Anchor>
      {user.isAdmin && (
        <Anchor component={Link} href="/admin" size="sm">
          لوحة المشرف
        </Anchor>
      )}
      <Button variant="subtle" size="compact-sm" onClick={() => void logout()}>
        خروج
      </Button>
    </Group>
  );
}
