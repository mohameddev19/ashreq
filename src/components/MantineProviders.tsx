"use client";

import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

const theme = createTheme({
  fontFamily: "inherit",
});

export function MantineProviders({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Notifications position="top-center" zIndex={10000} />
      {children}
    </MantineProvider>
  );
}
