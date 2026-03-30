"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Anchor, Box, Group, Text, Title } from "@mantine/core";
import { AuthBar } from "@/components/AuthBar";
import { ChatPanel } from "@/components/chat/ChatPanel";

type Role = "user" | "assistant";

type Msg = { role: Role; content: string; at?: number };

export default function ChatPage() {
  const [namespaceId, setNamespaceId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Stable id for API body; if MASHREQ_RAG_NAMESPACE is set on the server,
    // retrieval uses that shared namespace instead (one ingest for all accounts).
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { user: { id: string } | null }) => {
        if (d.user?.id) setNamespaceId(d.user.id);
      })
      .catch(() => {
        setNamespaceId(null);
      });
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || !namespaceId || loading) return;

    const now = Date.now();
    const next: Msg[] = [
      ...messages,
      { role: "user", content: text, at: now },
    ];
    setMessages(next);
    setInput("");
    setLoading(true);

    const apiMessages = next.map(({ role, content }) => ({ role, content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ namespaceId, messages: apiMessages }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.reply ?? "",
          at: Date.now(),
        },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطأ";
      setMessages([
        ...next,
        {
          role: "assistant",
          content: `عذراً، حدث خطأ: ${msg}`,
          at: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!namespaceId) {
    return (
      <Box p="xl">
        <Text c="dimmed">جاري التحميل…</Text>
      </Box>
    );
  }

  return (
    <Box
      component="div"
      bg="white"
      style={{
        height: "100dvh",
        maxHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box
        component="header"
        py="sm"
        px="md"
        style={{
          flexShrink: 0,
          borderBottom: "1px solid var(--mantine-color-gray-3)",
        }}
      >
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Anchor component={Link} href="/" size="sm" c="dimmed">
              ← الرئيسية
            </Anchor>
          </Box>
          <Title order={4} size="h4" ta="center" style={{ flexShrink: 0 }}>
            محادثة
          </Title>
          <Box
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <AuthBar />
          </Box>
        </Group>
      </Box>

      <ChatPanel
        messages={messages}
        loading={loading}
        inputValue={input}
        onInputChange={setInput}
        onSend={() => void send()}
        disabled={loading}
      />
    </Box>
  );
}
