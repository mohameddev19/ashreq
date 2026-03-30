"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Anchor,
  Button,
  Container,
  Paper,
  Stack,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";

type Me = { id: string; phone: string; isAdmin: boolean } | null;

export default function FeedbackPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | undefined>(undefined);

  useEffect(() => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { user: Me }) => {
        setMe(d.user);
        if (!d.user) router.replace("/login?next=/feedback");
      })
      .catch(() => setMe(null));
  }, [router]);

  const form = useForm({
    initialValues: { body: "" },
    validate: {
      body: (v) =>
        v.trim().length < 3 ? "اكتب ملاحظة على الأقل 3 أحرف" : null,
    },
  });

  const submit = form.onSubmit(async (values) => {
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: values.body.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        notifications.show({
          color: "red",
          title: "لم يُحفظ",
          message: data.error ?? "خطأ",
        });
        return;
      }
      notifications.show({ color: "green", message: "شكراً لملاحظتك" });
      form.reset();
    } catch {
      notifications.show({
        color: "red",
        message: "تعذر الاتصال بالخادم",
      });
    }
  });

  if (me === undefined) {
    return (
      <Container size="xs" py="xl">
        <Title order={4} ta="center">
          جاري التحميل…
        </Title>
      </Container>
    );
  }

  if (!me) return null;

  return (
    <Container size="sm" py="xl">
      <Title order={2} ta="center" mb="md">
        ملاحظات واقتراحات
      </Title>
      <Paper withBorder p="lg" radius="md">
        <form onSubmit={submit}>
          <Stack>
            <TextInput
              label="رقمك"
              value={me.phone}
              disabled
              dir="ltr"
            />
            <Textarea
              label="الملاحظة"
              placeholder="اكتب اقتراحاً أو تقريراً عن مشكلة…"
              minRows={4}
              {...form.getInputProps("body")}
            />
            <Button type="submit" fullWidth>
              إرسال
            </Button>
            <Anchor component={Link} href="/" ta="center" size="sm">
              العودة للرئيسية
            </Anchor>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
