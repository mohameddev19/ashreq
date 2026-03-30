"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function RegisterPage() {
  const router = useRouter();

  const form = useForm({
    initialValues: {
      phone: "",
      password: "",
      confirm: "",
    },
    validate: {
      phone: (v) => (v.trim().length < 8 ? "أدخل رقم الهاتف" : null),
      password: (v) =>
        v.length < 8 ? "كلمة المرور 8 أحرف على الأقل" : null,
      confirm: (v, values) =>
        v !== values.password ? "غير متطابقة مع كلمة المرور" : null,
    },
  });

  const submit = form.onSubmit(async (values) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: values.phone.trim(),
          password: values.password,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        notifications.show({
          color: "red",
          title: "فشل التسجيل",
          message: data.error ?? "خطأ",
        });
        return;
      }
      notifications.show({ color: "green", message: "تم إنشاء الحساب" });
      router.push("/");
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
        إنشاء حساب
      </Title>
      <Paper withBorder p="lg" radius="md">
        <form onSubmit={submit}>
          <Stack>
            <TextInput
              label="رقم الهاتف"
              placeholder="أرقام فقط، بدون مسافات"
              dir="ltr"
              {...form.getInputProps("phone")}
            />
            <PasswordInput
              label="كلمة المرور"
              {...form.getInputProps("password")}
            />
            <PasswordInput
              label="تأكيد كلمة المرور"
              {...form.getInputProps("confirm")}
            />
            <Button type="submit" fullWidth>
              تسجيل
            </Button>
            <Anchor component={Link} href="/login" size="sm" ta="center">
              لديك حساب؟ تسجيل الدخول
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
