import Link from "next/link";
import {
  Anchor,
  Container,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { desc, eq } from "drizzle-orm";
import { getDb, feedback, users } from "@/db";

export const runtime = "nodejs";

export default async function AdminDashboardPage() {
  const db = getDb();
  const rows = await db
    .select({
      id: feedback.id,
      body: feedback.body,
      createdAt: feedback.createdAt,
      phone: users.phone,
    })
    .from(feedback)
    .innerJoin(users, eq(feedback.userId, users.id))
    .orderBy(desc(feedback.createdAt))
    .limit(200);

  return (
    <Container size="md" py="xl">
      <Stack gap="md">
        <Title order={1} ta="center">
          لوحة المشرف
        </Title>
        <Text c="dimmed" ta="center" size="sm">
          الملاحظات الواردة من المستخدمين (آخر 200).
        </Text>
        <Anchor component={Link} href="/" ta="center" display="block">
          العودة للرئيسية
        </Anchor>

        <Paper withBorder p="md" radius="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>التاريخ</Table.Th>
                <Table.Th>الهاتف</Table.Th>
                <Table.Th>النص</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={3}>
                    <Text ta="center" c="dimmed">
                      لا توجد ملاحظات بعد.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                rows.map((r) => (
                  <Table.Tr key={r.id}>
                    <Table.Td>
                      {r.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                    </Table.Td>
                    <Table.Td>{r.phone}</Table.Td>
                    <Table.Td style={{ maxWidth: 360, whiteSpace: "pre-wrap" }}>
                      {r.body}
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>
    </Container>
  );
}
