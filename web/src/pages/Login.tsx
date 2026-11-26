import {
  Alert,
  Box,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Image,
  PasswordInput,
  Select,
  Stack,
  Text,
  ThemeIcon,
  Title
} from "@mantine/core";
import {
  IconAlertCircle,
  IconBellRinging,
  IconBuilding,
  IconChartHistogram,
  IconFileInvoice,
  IconGauge,
  IconSearch,
  IconShieldLock,
  IconTools,
  IconUser,
  IconUsers
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import logoUrl from "../assets/souvannahvong-logo.webp";
import illustrationUrl from "../assets/apartment-illustration.png";
import { useAuth } from "../auth/auth";
import { useStore } from "../data/store";

const FEATURES = [
  { icon: IconBuilding, label: "ຈັດການຫ້ອງພັກ" },
  { icon: IconUsers, label: "ຈັດການຜູ້ເຊົ່າ" },
  { icon: IconGauge, label: "ຈົດມິເຕີໄຟ-ນ້ຳ" },
  { icon: IconFileInvoice, label: "ໃບບີນເກັບເງິນ & ການຊຳລະ" },
  { icon: IconBellRinging, label: "ຕິດຕາມຍອດຄ້າງຊຳລະ" },
  { icon: IconTools, label: "ແຈ້ງຊ່ອມ & ບຳລຸງຮັກສາ" },
  { icon: IconChartHistogram, label: "ລາຍງານ & ກຣາຟສະຫຼຸບ" },
  { icon: IconShieldLock, label: "ຜູ້ໃຊ້ & ສິດເຂົ້າເຖິງ" },
  { icon: IconSearch, label: "ຄົ້ນຫາແບບທັນທີ" }
];

export default function Login() {
  const { data } = useStore();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const activeUsers = (data.settings.users || []).filter((item) => item.active !== false);

  useEffect(() => {
    if (!userId && activeUsers.length) setUserId(activeUsers[0].id);
  }, [activeUsers, userId]);

  if (user) return <Navigate to="/" replace />;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const message = login(userId, pin);
    if (message) {
      setError(message);
      setPin("");
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <Box mih="100vh" p={{ base: "md", sm: 28 }} style={{ display: "flex", alignItems: "stretch" }}>
      <Grid maw={1180} w="100%" mx="auto" gutter={{ base: "md", md: 28 }} align="stretch">
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Card
            radius="xl"
            padding="xl"
            style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}
          >
            <Stack gap="lg">
              <Box>
                <Title order={2} fw={600} c="#0B2545">
                  ເຂົ້າສູ່ລະບົບ
                </Title>
                <Text size="sm" c="#5A7391" mt={6}>
                  ເລືອກຊື່ຜູ້ໃຊ້ ແລ້ວໃສ່ PIN ເພື່ອເຂົ້າໃຊ້ງານ
                </Text>
              </Box>

              <Button
                variant="light"
                color="brand"
                radius="md"
                leftSection={<IconFileInvoice size={16} />}
                onClick={() => navigate("/bill-check")}
                fullWidth
              >
                ກວດໃບບີນເກັບເງິນ
              </Button>

              <Divider label="ຫຼື" labelPosition="center" color="#E2ECF9" />

              <form onSubmit={submit}>
                <Stack gap="md">
                  <Select
                    label="ຜູ້ໃຊ້"
                    placeholder="ເລືອກຜູ້ໃຊ້"
                    leftSection={<IconUser size={16} />}
                    data={activeUsers.map((item) => ({
                      value: item.id,
                      label: item.role === "manager" ? `${item.name} · ຜູ້ຈັດການ` : item.name
                    }))}
                    value={userId || null}
                    onChange={(value) => setUserId(value || "")}
                    disabled={!activeUsers.length}
                    allowDeselect={false}
                    radius="md"
                  />
                  <PasswordInput
                    label="PIN"
                    placeholder="••••"
                    value={pin}
                    onChange={(event) => {
                      setPin(event.currentTarget.value);
                      setError("");
                    }}
                    inputMode="numeric"
                    maxLength={6}
                    radius="md"
                    disabled={!activeUsers.length}
                    autoFocus
                  />
                  {error ? (
                    <Alert color="red" variant="light" radius="md" icon={<IconAlertCircle size={16} />}>
                      {error}
                    </Alert>
                  ) : null}
                  {!activeUsers.length ? (
                    <Alert color="amber" variant="light" radius="md" icon={<IconAlertCircle size={16} />}>
                      ຕ້ອງເພີ່ມຜູ້ໃຊ້ກ່ອນ — ເປີດໜ້າ ຜູ້ໃຊ້ ຖ້າເຂົ້າລະບົບໄດ້ແລ້ວ
                    </Alert>
                  ) : null}
                  <Button type="submit" size="md" radius="md" fullWidth disabled={!activeUsers.length}>
                    ເຂົ້າສູ່ລະບົບ
                  </Button>
                </Stack>
              </form>

              <Text size="xs" c="#7C93B0" ta="center">
                © 2026 ເຮືອນພັກ ສຸວັນນະວົງ · ຂໍ້ມູນທັງໝົດເກັບໄວ້ພາຍໃນລະບົບ
              </Text>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 7 }} visibleFrom="md">
          <Card
            radius="xl"
            padding={34}
            style={{
              height: "100%",
              border: "1px solid #DCE8FA",
              background:
                "radial-gradient(120% 90% at 85% 0%, #DCEBFF 0%, #EFF6FF 42%, #FFFFFF 100%)",
              display: "flex",
              flexDirection: "column",
              gap: 18
            }}
          >
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Box>
                <Text size="xs" fw={600} tt="uppercase" c="#3B7CEA" style={{ letterSpacing: "0.14em" }}>
                  Apartment Manager
                </Text>
                <Title order={2} mt={6} c="#0B2545" maw={420}>
                  ລະບົບຈັດການ ອາພາດເມັນ ສຸວັນນະວົງ
                </Title>
                <Text size="sm" c="#5A7391" mt={8} maw={460}>
                  ລວມຫ້ອງພັກ ຜູ້ເຊົ່າ ໃບບີນເກັບເງິນ ຈົດມິເຕີ ແລະ ວຽກສ້ອມແປງ ໄວ້ໃນບ່ອນດຽວ.
                </Text>
              </Box>
              <Image src={logoUrl} alt="ໂລໂກ້ ເຮືອນພັກ ສຸວັນນະວົງ" h={64} w="auto" fit="contain" />
            </Group>

            <Box
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 8
              }}
            >
              {FEATURES.map(({ icon: Icon, label }) => (
                <Group
                  key={label}
                  gap={8}
                  wrap="nowrap"
                  p="8px 10px"
                  style={{
                    background: "rgba(255,255,255,0.78)",
                    border: "1px solid #DCE8FA",
                    borderRadius: 10,
                    minHeight: 46
                  }}
                >
                  <ThemeIcon variant="light" color="brand" size={26} radius="md">
                    <Icon size={14} />
                  </ThemeIcon>
                  <Text size="xs" fw={500} c="#2C4262" lh={1.25}>
                    {label}
                  </Text>
                </Group>
              ))}
            </Box>

            <Box style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              <Image
                src={illustrationUrl}
                alt="ພາບປະກອບຕຶກອາພາດເມັນ"
                maw={520}
                w="100%"
                fit="contain"
                style={{ marginBottom: -6 }}
              />
            </Box>
          </Card>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
