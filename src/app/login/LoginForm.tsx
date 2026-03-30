"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const form = useForm({
    initialValues: {
      phone: "",
      password: "",
    },
    validate: {
      phone: (v) => (v.trim().length < 8 ? "أدخل رقم الهاتف" : null),
      password: (v) => (!v ? "أدخل كلمة المرور" : null),
    },
  });

  const submit = form.onSubmit(async (values) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: values.phone.trim(),
          password: values.password,
        }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        notifications.show({
          color: "red",
          title: "فشل تسجيل الدخول",
          message: data.error ?? "خطأ",
        });
        return;
      }
      notifications.show({ color: "green", message: "تم تسجيل الدخول" });
      router.push(next);
      router.refresh();
    } catch {
      notifications.show({
        color: "red",
        message: "تعذر الاتصال بالخادم",
      });
    }
  });

  return (
    <Container size="xs" py="xl">
      <Title order={2} ta="center" mb="md">
        تسجيل الدخول
      </Title>
      <Paper withBorder p="lg" radius="md">
        <form onSubmit={submit}>
          <Stack>
            <TextInput
              label="رقم الهاتف"
              placeholder="مثال: 2499xxxxxxxx"
              dir="ltr"
              {...form.getInputProps("phone")}
            />
            <PasswordInput
              label="كلمة المرور"
              {...form.getInputProps("password")}
            />
            <Button type="submit" fullWidth>
              دخول
            </Button>
            <Anchor component={Link} href="/register" size="sm" ta="center">
              ليس لديك حساب؟ إنشاء حساب
            </Anchor>
            <Anchor component={Link} href="/" size="sm" ta="center">
              العودة للرئيسية
            </Anchor>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
