"use client";

import { useEffect, useRef } from "react";
import {
  Avatar,
  Box,
  Group,
  Paper,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";

export type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  at?: number;
};

type Props = {
  messages: ChatMsg[];
  loading: boolean;
  /** When true, flattens bottom border/radius so a composer can sit flush below. */
  composeBelow?: boolean;
};

export function ChatTranscript({ messages, loading, composeBelow }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = viewportRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading]);

  return (
    <Box
      bg="gray.1"
      style={{
        borderRadius: composeBelow
          ? "var(--mantine-radius-lg) var(--mantine-radius-lg) 0 0"
          : "var(--mantine-radius-lg)",
        border: "1px solid var(--mantine-color-gray-3)",
        borderBottom: composeBelow ? "none" : "1px solid var(--mantine-color-gray-3)",
      }}
    >
      <ScrollArea
        h={{ base: 360, sm: 440 }}
        type="auto"
        offsetScrollbars
        viewportRef={viewportRef}
      >
        <Stack gap="md" p="md">
          {messages.length === 0 && !loading && (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              اطرح سؤالاً بالعربية. مثال: كيف أفتح سجلاً تجارياً في السودان؟
            </Text>
          )}
          {messages.map((m, i) => (
            <Group key={i} align="flex-start" wrap="nowrap" gap="sm">
              <Avatar
                size="md"
                radius="xl"
                color={m.role === "user" ? "blue" : "gray"}
                variant={m.role === "user" ? "light" : "filled"}
              >
                {m.role === "user" ? "أ" : "م"}
              </Avatar>
              <Paper
                p="md"
                radius="lg"
                shadow="xs"
                style={{
                  flex: 1,
                  maxWidth: "min(85%, 36rem)",
                  background:
                    m.role === "user"
                      ? "var(--mantine-color-blue-0)"
                      : "var(--mantine-color-body)",
                  border: "1px solid var(--mantine-color-gray-3)",
                }}
              >
                <Text size="sm" fw={600} mb={6} c="dimmed">
                  {m.role === "user" ? "أنت" : "مشرق"}
                </Text>
                <Text size="sm" style={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
                  {m.content}
                </Text>
                {m.at != null && (
                  <Text size="xs" c="dimmed" mt="xs">
                    {new Date(m.at).toLocaleTimeString("ar", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                )}
              </Paper>
            </Group>
          ))}
          {loading && (
            <Group align="flex-start" wrap="nowrap" gap="sm">
              <Avatar size="md" radius="xl" color="gray">
                م
              </Avatar>
              <Stack gap="xs" p="md" style={{ flex: 1 }}>
                <Skeleton height={12} radius="xl" />
                <Skeleton height={12} width="70%" radius="xl" />
                <Skeleton height={12} width="40%" radius="xl" />
              </Stack>
            </Group>
          )}
        </Stack>
      </ScrollArea>
    </Box>
  );
}
