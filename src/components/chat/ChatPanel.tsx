"use client";

import { useEffect, useRef } from "react";
import { Send } from "lucide-react";
import {
  ActionIcon,
  Avatar,
  Box,
  Group,
  Paper,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";

export type ChatPanelMessage = {
  role: "user" | "assistant";
  content: string;
  at?: number;
};

export type ChatPanelProps = {
  messages: ChatPanelMessage[];
  loading?: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
};

function initials(role: ChatPanelMessage["role"]) {
  return role === "user" ? "أ" : "م";
}

export function ChatPanel({
  messages,
  loading = false,
  inputValue,
  onInputChange,
  onSend,
  disabled = false,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = disabled || loading;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const handleSend = () => {
    if (!inputValue.trim() || busy) return;
    onSend();
  };

  return (
    <Box
      component="section"
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Scrollable transcript — native overflow so flex height always works */}
      <Box
        ref={scrollRef}
        flex={1}
        style={{
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}
        bg="gray.0"
        px={{ base: "sm", sm: "md" }}
        py="md"
      >
        <Stack gap="md" maw={720} mx="auto" w="100%">
          {messages.length === 0 && !loading && (
            <Text size="sm" c="dimmed" ta="center" py="xl" px="md">
              اطرح سؤالاً بالعربية. مثال: كيف أفتح سجلاً تجارياً في السودان؟
            </Text>
          )}

          {messages.map((message, index) => (
            <Box
              key={`${message.role}-${message.at ?? index}-${index}`}
              w="100%"
              style={{
                display: "flex",
                justifyContent: message.role === "user" ? "flex-start" : "flex-end",
              }}
            >
              <Group
                justify={message.role === "user" ? "flex-start" : "flex-start"}
                align="flex-start"
                wrap="nowrap"
                gap="sm"
                dir={message.role === "assistant" ? "ltr" : "rtl"}
                style={{ maxWidth: "min(100%, 44rem)" }}
              >
                <Avatar
                  radius="xl"
                  size="md"
                  color={message.role === "user" ? "blue" : "gray"}
                  variant={message.role === "user" ? "light" : "filled"}
                >
                  {initials(message.role)}
                </Avatar>
                <Paper
                  p="md"
                  radius="lg"
                  shadow="xs"
                  style={{
                    maxWidth: "min(85%, 36rem)",
                    background:
                      message.role === "user"
                        ? "var(--mantine-color-blue-0)"
                        : "var(--mantine-color-body)",
                    border:
                      message.role === "assistant"
                        ? "1px solid var(--mantine-color-gray-3)"
                        : undefined,
                  }}
                >
                  <Text
                    size="sm"
                    lh={1.65}
                    style={{ whiteSpace: "pre-wrap" }}
                    dir={message.role === "assistant" ? "ltr" : "rtl"}
                  >
                    {message.content}
                  </Text>
                  {message.at != null && (
                    <Text
                      size="xs"
                      c="dimmed"
                      mt="xs"
                      dir="ltr"
                      style={{
                        textAlign: message.role === "assistant" ? "left" : "right",
                      }}
                    >
                      {new Date(message.at).toLocaleTimeString("ar-SA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  )}
                </Paper>
              </Group>
            </Box>
          ))}

          {loading && (
            <Box w="100%" style={{ display: "flex", justifyContent: "flex-start" }}>
              <Group
                justify="flex-start"
                align="flex-start"
                wrap="nowrap"
                gap="sm"
                dir="ltr"
                style={{ maxWidth: "min(100%, 44rem)" }}
              >
                <Avatar radius="xl" size="md" color="gray" variant="filled">
                  م
                </Avatar>
                <Paper
                  p="md"
                  radius="lg"
                  shadow="xs"
                  style={{ maxWidth: "min(85%, 36rem)" }}
                >
                  <Stack gap="xs">
                    <Box h={8} bg="gray.3" style={{ borderRadius: 999 }} w="40%" />
                    <Box h={8} bg="gray.3" style={{ borderRadius: 999 }} w="70%" />
                    <Box h={8} bg="gray.3" style={{ borderRadius: 999 }} w="35%" />
                  </Stack>
                </Paper>
              </Group>
            </Box>
          )}
        </Stack>
      </Box>

      {/* Sticky composer */}
      <Paper
        component="footer"
        p="md"
        radius={0}
        withBorder
        style={{
          flexShrink: 0,
          borderLeft: 0,
          borderRight: 0,
          borderBottom: 0,
        }}
      >
        <Group
          align="flex-end"
          gap="sm"
          wrap="nowrap"
          maw={720}
          mx="auto"
          w="100%"
        >
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Textarea
              placeholder="اكتب رسالتك هنا..."
              value={inputValue}
              onChange={(e) => onInputChange(e.currentTarget.value)}
              disabled={busy}
              minRows={2}
              maxRows={6}
              autosize
              radius="xl"
              size="md"
              w="100%"
              styles={{
                input: {
                  textAlign: "right",
                },
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </Box>
          <ActionIcon
            type="button"
            size={48}
            radius="xl"
            variant="filled"
            color="dark"
            loading={busy}
            disabled={busy || !inputValue.trim()}
            onClick={handleSend}
            aria-label="إرسال"
          >
            <Send size={22} strokeWidth={2} />
          </ActionIcon>
        </Group>
      </Paper>
    </Box>
  );
}
