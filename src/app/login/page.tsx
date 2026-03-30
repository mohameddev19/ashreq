import { Suspense } from "react";
import { Container, Title } from "@mantine/core";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Container size="xs" py="xl">
          <Title order={4} ta="center">
            جاري التحميل…
          </Title>
        </Container>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
