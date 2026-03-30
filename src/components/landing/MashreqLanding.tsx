"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import {
  Anchor,
  Box,
  Button,
  Group,
  Paper,
  rem,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { WarningGraphic } from "@/components/landing/WarningGraphic";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" as const },
  },
};

export type MashreqLandingProps = {
  title?: string;
  subtitle?: string;
  warningTitle?: string;
  warningText?: string;
  buttonText?: string;
  buttonHref?: string;
};

export function MashreqLanding({
  title = "مرحباً بك في منصتنا",
  subtitle = "نقدم لك أفضل الحلول التقنية المبتكرة لتحقيق أهدافك بكفاءة وسهولة",
  warningTitle = "تنبيه مهم",
  warningText = "تنبيه: هذه الخدمة في مرحلة تجريبية. قد تواجه بعض المشكلات أثناء الاستخدام.",
  buttonText = "ابدأ المحادثة",
  buttonHref = "/chat",
}: MashreqLandingProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Stack gap="xl" pt={{ base: "xl", sm: "xl" }} pb="xl">
        <motion.div variants={itemVariants}>
          <Stack gap="md" align="center" ta="center">
            <Title
              order={1}
              fz={{ base: rem(28), sm: rem(40), md: rem(48) }}
              fw={700}
              c="dark.9"
              lh={1.25}
            >
              {title}
            </Title>
            <Text c="dimmed" maw={640} mx="auto" size="lg" lh={1.75}>
              {subtitle}
            </Text>
          </Stack>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Box style={{ display: "flex", justifyContent: "center" }}>
            <WarningGraphic
              width={300}
              height={100}
              enableAnimations
              animationSpeed={1}
              color="#f59e0b"
            />
          </Box>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Paper
            p={{ base: "md", sm: "lg" }}
            radius="lg"
            withBorder
            maw={720}
            mx="auto"
            style={{
              borderColor: "rgba(251, 191, 36, 0.55)",
              background: "#fff",
            }}
          >
            <Group align="flex-start" wrap="nowrap" gap="md">
              <ThemeIcon
                size={44}
                radius="md"
                variant="light"
                color="yellow"
                style={{ flexShrink: 0 }}
              >
                <AlertTriangle size={24} strokeWidth={2} />
              </ThemeIcon>
              <Box style={{ flex: 1 }}>
                <Text fw={700} size="lg" mb="xs" c="dark.8">
                  {warningTitle}
                </Text>
                <Text size="sm" c="dimmed" lh={1.7}>
                  {warningText}
                </Text>
                <Text size="xs" c="dimmed" mt="sm" lh={1.5} dir="ltr">
                  Mashreq is educational software; not professional legal
                  advice.
                </Text>
              </Box>
            </Group>
          </Paper>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Stack align="center" gap="lg">
            <Button
              component={Link}
              href={buttonHref}
              size="lg"
              radius="md"
              px={48}
              styles={{
                root: {
                  backgroundColor: "#000",
                  color: "#fff",
                  "&:hover": { backgroundColor: "#1a1a1a" },
                },
              }}
            >
              {buttonText}
            </Button>
            <Text size="sm" c="dimmed" ta="center">
              تحتاج حساباً للمحادثة.{" "}
              <Anchor component={Link} href="/register" size="sm" fw={600}>
                إنشاء حساب
              </Anchor>{" "}
              أو{" "}
              <Anchor component={Link} href="/login" size="sm" fw={600}>
                تسجيل الدخول
              </Anchor>
            </Text>
          </Stack>
        </motion.div>

        <motion.div variants={itemVariants} id="about">
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mt="md">
            <Paper
              withBorder
              p="xl"
              radius="md"
              ta="center"
              style={{ borderColor: "var(--mantine-color-gray-3)" }}
            >
              <Text fz={rem(32)} fw={800} c="dark.9" mb="xs">
                +100
              </Text>
              <Text size="sm" c="dimmed">
                عميل راضٍ
              </Text>
            </Paper>
            <Paper
              withBorder
              p="xl"
              radius="md"
              ta="center"
              style={{ borderColor: "var(--mantine-color-gray-3)" }}
            >
              <Text fz={rem(32)} fw={800} c="dark.9" mb="xs">
                24/7
              </Text>
              <Text size="sm" c="dimmed">
                دعم متواصل
              </Text>
            </Paper>
            <Paper
              withBorder
              p="xl"
              radius="md"
              ta="center"
              style={{ borderColor: "var(--mantine-color-gray-3)" }}
            >
              <Text fz={rem(32)} fw={800} c="dark.9" mb="xs">
                99%
              </Text>
              <Text size="sm" c="dimmed">
                نسبة الرضا
              </Text>
            </Paper>
          </SimpleGrid>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Text size="sm" c="dimmed" ta="center" pt="xl">
            © {new Date().getFullYear()} جميع الحقوق محفوظة
          </Text>
        </motion.div>
      </Stack>
    </motion.div>
  );
}
