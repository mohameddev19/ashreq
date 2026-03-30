"use client";

import { MantineProvider, createTheme, rem } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

const theme = createTheme({
  fontFamily: "inherit",
  primaryColor: "blue",
  defaultRadius: "md",
  headings: {
    fontWeight: "700",
  },
  spacing: {
    xs: rem(8),
    sm: rem(12),
    md: rem(16),
    lg: rem(24),
    xl: rem(32),
  },
});

export function MantineProviders({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications position="top-center" zIndex={10000} />
      {children}
    </MantineProvider>
  );
}
