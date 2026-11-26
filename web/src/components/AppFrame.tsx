import {
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Box,
  Burger,
  Button,
  Divider,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
  useMantineTheme
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBuildingSkyscraper,
  IconChevronDown,
  IconDatabase,
  IconLogout,
  IconUserCircle
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth";
import { ctxOf, openInvoices, openRepairs } from "../lib/compute";
import { NAV_ITEMS } from "../lib/nav";
import { useStore } from "../data/store";

const MODE_LABEL: Record<string, string> = {
  supabase: "Supabase",
  server: "SQLite",
  local: "ບໍ່ເຊື່ອມຕໍ່"
};

export default function AppFrame({ children }: { children: ReactNode }) {
  const theme = useMantineTheme();
  const [opened, { toggle, close }] = useDisclosure(false);
  const { data, mode, error } = useStore();
  const { user, roleLabel, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const ctx = ctxOf(data);

  const badges: Record<string, number> = {
    invoices: openInvoices(ctx).length,
    repairs: openRepairs(ctx).length
  };

  const connected = mode !== "local";

  return (
    <AppShell
      header={{ height: 66 }}
      navbar={{ width: 252, breakpoint: "md", collapsed: { mobile: !opened } }}
      padding={{ base: "md", sm: "lg" }}
      styles={{ main: { background: "#F4F8FF" } }}
    >
      <AppShell.Header
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid #E2ECF9"
        }}
      >
        <Group h="100%" px={{ base: "md", sm: "lg" }} justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" color={theme.colors.brand[7]} />
            <Group
              gap="sm"
              wrap="nowrap"
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/")}
            >
              <Box
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  background: `linear-gradient(140deg, ${theme.colors.brand[6]}, ${theme.colors.brand[7]})`,
                  color: "white",
                  boxShadow: "0 6px 16px rgba(27,111,214,0.28)"
                }}
              >
                <IconBuildingSkyscraper size={21} stroke={1.7} />
              </Box>
              <Box>
                <Text fw={600} size="sm" c="#0B2545" lineClamp={1}>
                  {data.settings.name}
                </Text>
                <Text size="xs" c="#5A7391">
                  ລະບົບຈັດການອາພາດເມັນ
                </Text>
              </Box>
            </Group>
          </Group>

          <Group gap="sm" wrap="nowrap">
            <Tooltip label={error || (connected ? "ເຊື່ອມຕໍ່ຖານຂໍ້ມູນແລ້ວ" : "ຍັງບໍ່ເຊື່ອມຕໍ່ຖານຂໍ້ມູນ")} withArrow>
              <Badge
                visibleFrom="sm"
                variant="light"
                color={connected ? "brand" : "gray"}
                leftSection={<IconDatabase size={13} />}
              >
                {MODE_LABEL[mode]}
              </Badge>
            </Tooltip>

            <Menu shadow="md" width={210} position="bottom-end" radius="md">
              <Menu.Target>
                <Button
                  variant="subtle"
                  color="brand"
                  px={8}
                  rightSection={<IconChevronDown size={14} />}
                  leftSection={
                    <Avatar size={30} radius="xl" color="brand">
                      <IconUserCircle size={20} />
                    </Avatar>
                  }
                >
                  <Box ta="left" visibleFrom="xs">
                    <Text size="sm" fw={500} lh={1.2}>
                      {user?.name}
                    </Text>
                    <Text size="xs" c="#5A7391" lh={1.2}>
                      {roleLabel}
                    </Text>
                  </Box>
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{user?.name}</Menu.Label>
                <Menu.Item leftSection={<IconDatabase size={15} />} onClick={() => navigate("/database")}>
                  ເຊື່ອມຕໍ່ຖານຂໍ້ມູນ
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={15} />}
                  onClick={() => {
                    logout();
                    navigate("/login", { replace: true });
                  }}
                >
                  ອອກຈາກລະບົບ
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm" style={{ background: "#FFFFFF", borderRight: "1px solid #E2ECF9" }}>
        <AppShell.Section grow component={ScrollArea} type="hover">
          <Stack gap={4}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
              const count = item.badge ? badges[item.badge] : 0;
              return (
                <NavLink
                  key={item.key}
                  active={active}
                  onClick={() => {
                    navigate(item.path);
                    close();
                  }}
                  label={item.label}
                  leftSection={<Icon size={18} stroke={1.7} />}
                  rightSection={
                    count ? (
                      <Badge size="sm" circle color={active ? "brand" : "gray"} variant={active ? "filled" : "light"}>
                        {count}
                      </Badge>
                    ) : undefined
                  }
                  styles={{
                    root: {
                      borderRadius: 10,
                      paddingTop: 9,
                      paddingBottom: 9
                    },
                    label: { fontSize: 14 },
                    section: { color: active ? theme.colors.brand[7] : "#6B84A6" }
                  }}
                />
              );
            })}
          </Stack>
        </AppShell.Section>

        <AppShell.Section>
          <Divider my="sm" color="#E2ECF9" />
          <Group justify="space-between" px={6} pb={4} wrap="nowrap">
            <Text size="xs" c="#7C93B0" lineClamp={1}>
              {data.settings.address}
            </Text>
            <ActionIcon variant="subtle" color="brand" onClick={() => navigate("/database")} aria-label="ຖານຂໍ້ມູນ">
              <IconDatabase size={16} />
            </ActionIcon>
          </Group>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box maw={1440} mx="auto">
          {children}
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
