"use client";

import { Button, Group, Paper, Textarea } from "@mantine/core";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  placeholder?: string;
};

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  loading,
  placeholder = "اكتب سؤالك هنا…",
}: Props) {
  return (
    <Paper
      p="md"
      radius="lg"
      bg="var(--mantine-color-body)"
      withBorder
      style={{
        borderColor: "var(--mantine-color-gray-3)",
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit();
        }}
      >
        <Group align="flex-end" gap="sm" wrap="nowrap">
          <Textarea
            style={{ flex: 1 }}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.currentTarget.value)}
            disabled={loading}
            minRows={2}
            autosize
            maxRows={8}
          />
          <Button type="submit" loading={loading}>
            إرسال
          </Button>
        </Group>
      </form>
    </Paper>
  );
}
