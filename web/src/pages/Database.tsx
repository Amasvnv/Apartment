import { Alert, Badge, Button, Card, Group, PasswordInput, SimpleGrid, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconAlertCircle, IconCheck, IconDatabase, IconPlugConnected, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { useStore } from "../data/store";
import { defaultSettings } from "../data/seed";
import { readConfig, saveConfig } from "../data/storage";

const MODE_LABEL: Record<string, string> = {
  supabase: "Supabase (PostgreSQL)",
  server: "SQLite ຜ່ານ server.py",
  local: "ເບົາຣ໌ເຊີ (localStorage)"
};

export default function Database() {
  const { data, mode, rev, error, reload } = useStore();
  const config = readConfig();
  const [url, setUrl] = useState(config?.url || "");
  const [token, setToken] = useState(config?.token || "");

  const save = () => {
    saveConfig({ url: url.trim(), token: token.trim(), provider: "supabase" });
    window.location.reload();
  };

  const clear = () => {
    saveConfig(null);
    localStorage.removeItem("db.cache");
    window.location.reload();
  };

  return (
    <Stack gap="lg" pb="xl">
      <PageHeader
        title="ເຊື່ອມຕໍ່ຖານຂໍ້ມູນ"
        subtitle={`ໂໝດປັດຈຸບັນ: ${MODE_LABEL[mode] || mode}`}
        actions={
          <Button variant="light" leftSection={<IconPlugConnected size={15} />} onClick={() => void reload()}>
            ກວດຂໍ້ມູນໃໝ່
          </Button>
        }
      />

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        <Card padding="md">
          <Text size="xs" c="#5A7391">
            ສະຖານະ
          </Text>
          <Badge mt={6} color={mode === "local" ? "gray" : "green"} variant="light">
            {mode === "local" ? "ບໍ່ເຊື່ອມຕໍ່" : "ເຊື່ອມຕໍ່ແລ້ວ"}
          </Badge>
        </Card>
        <Card padding="md">
          <Text size="xs" c="#5A7391">
            ຫ້ອງ / ຜູ້ເຊົ່າ
          </Text>
          <Text fw={600}>
            {data.rooms.length} / {data.tenants.length}
          </Text>
        </Card>
        <Card padding="md">
          <Text size="xs" c="#5A7391">
            ໃບບີນ / ວຽກສ້ອມ
          </Text>
          <Text fw={600}>
            {data.invoices.length} / {data.repairs.length}
          </Text>
        </Card>
        <Card padding="md">
          <Text size="xs" c="#5A7391">
            ຮຸ່ນຂໍ້ມູນ (rev)
          </Text>
          <Text fw={600}>{rev}</Text>
        </Card>
      </SimpleGrid>

      {error ? (
        <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>
          {error}
        </Alert>
      ) : null}

      <Card padding="lg">
        <Title order={3} mb={4}>
          Supabase (PostgreSQL)
        </Title>
        <Text size="sm" c="#5A7391" mb="md">
          ໃສ່ Project URL ແລະ anon (publishable) key. ຄ່າຈະຖືກເກັບໃນ browser ຂອງເຄື່ອງນີ້.
          ຕາຕະລາງເປີດ RLS ແລະ ເຂົ້າເຖິງຜ່ານຟັງຊັນ RPC ເທົ່ານັ້ນ — ຢ່າໃຊ້ service_role key.
        </Text>
        <Stack gap="sm" maw={560}>
          <TextInput
            label="Project URL"
            placeholder="https://xxxxxxx.supabase.co"
            value={url}
            onChange={(event) => setUrl(event.currentTarget.value)}
            leftSection={<IconDatabase size={15} />}
          />
          <PasswordInput
            label="anon key"
            placeholder="eyJhbGciOi…"
            value={token}
            onChange={(event) => setToken(event.currentTarget.value)}
          />
          <Group justify="space-between">
            <Button variant="subtle" color="red" leftSection={<IconTrash size={15} />} onClick={clear}>
              ລຶບການຕັ້ງຄ່າ
            </Button>
            <Button leftSection={<IconCheck size={15} />} onClick={save} disabled={!url.trim() || !token.trim()}>
              ບັນທຶກ ແລະ ເຊື່ອມຕໍ່
            </Button>
          </Group>
        </Stack>
      </Card>

      <Card padding="lg">
        <Title order={3} mb={4}>
          ຖານຂໍ້ມູນ SQLite ທ້ອງຖິ່ນ
        </Title>
        <Text size="sm" c="#5A7391">
          ຖ້າບໍ່ຕັ້ງຄ່າ Supabase, ແອັບຈະໃຊ້ <code>/api/state</code> ຈາກ <code>server.py</code> ເຊິ່ງອ່ານ/ຂຽນ
          <code> data/apartment.db</code>. ຖ້າເປີດແບບໄຟລ໌ສະຖິຕິ ຈະໃຊ້ localStorage ແທນ.
        </Text>
        <Text size="xs" c="#8AA0BB" mt="xs">
          ບໍລິການ: {defaultSettings().name} · ສະກຸນເງິນ {data.settings.currency}
        </Text>
      </Card>
    </Stack>
  );
}
