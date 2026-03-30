"use client";

import Link from "next/link";
import {
  Anchor,
  Box,
  Container,
  Group,
  Title,
} from "@mantine/core";
import { AuthBar } from "@/components/AuthBar";
import { MashreqLanding } from "@/components/landing/MashreqLanding";

export default function HomePage() {
  return (
    <Box bg="#ffffff" mih="100vh">
      <Box
        component="header"
        py="md"
        style={{
          borderBottom: "1px solid var(--mantine-color-gray-3)",
        }}
      >
        <Container size="lg">
          <Group justify="space-between" align="center" wrap="wrap" gap="md">
            <Title order={3} size="h4" fw={700} c="dark.9">
              مشرق
            </Title>
            <Group gap="lg" wrap="wrap">
              <Anchor component={Link} href="/" size="sm" c="dimmed" underline="never">
                الرئيسية
              </Anchor>
              <Anchor
                component={Link}
                href="/#about"
                size="sm"
                c="dimmed"
                underline="never"
              >
                حول
              </Anchor>
              <Anchor
                component={Link}
                href="/feedback"
                size="sm"
                c="dimmed"
                underline="never"
              >
                اتصل بنا
              </Anchor>
              <AuthBar />
            </Group>
          </Group>
        </Container>
      </Box>

      <Container size="lg" py={{ base: "lg", md: "xl" }} px="md">
        <MashreqLanding />
      </Container>
    </Box>
  );
}
