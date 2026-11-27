import {
  ActionIcon,
  AppShell,
  Avatar,
  Box,
  Burger,
  Button,
  Divider,
  Group,
  Menu,
  Modal,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
  useMantineColorScheme,
  useMantineTheme
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconArrowRight,
  IconBuildingSkyscraper,
  IconChevronDown,
  IconDatabase,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconLogout,
  IconMoon,
  IconPlus,
  IconSearch,
  IconSun,
  IconUserCircle
} from "@tabler/icons-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth";
import { ctxOf, openRepairs } from "../lib/compute";
import { NAV_GROUPS, NAV_ITEMS } from "../lib/nav";
import { useStore } from "../data/store";

const MODE_LABEL: Record<string, string> = {
  supabase: "Supabase",
  server: "SQLite",
  local: "ບໍ່ເຊື່ອມຕໍ່"
};

const RAIL_KEY = "apt.nav.rail";

interface Command {
  id: string;
  label: string;
  hint: string;
  path: string;
  icon: ReactNode;
}

function readRail(): boolean {
  try {
    return localStorage.getItem(RAIL_KEY) === "1";
  } catch {
    return false;
  }
}

export default function AppFrame({ children }: { children: ReactNode }) {
  const theme = useMantineTheme();
  const [opened, { toggle, close }] = useDisclosure(false);
  const { data, mode, error, saving } = useStore();
  const { user, roleLabel, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const ctx = ctxOf(data);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isMobile = useMediaQuery("(max-width: 62em)");

  const [rail, setRail] = useState(readRail);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");

  const badges: Record<string, number> = {
    // ນັບໃບບີນທີ່ຍັງບໍ່ໄດ້ເກັບເງິນທຸກເດືອນ (ບໍ່ຈຳກັດພຽງເດືອນປັດຈຸບັນ)
    invoices: ctx.invoices.filter((invoice) => !invoice.paid).length,
    repairs: openRepairs(ctx).length
  };

  const connected = mode !== "local";
  const compact = rail && !isMobile;

  const toggleRail = () => {
    setRail((value) => {
      const next = !value;
      try {
        localStorage.setItem(RAIL_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const commands = useMemo<Command[]>(() => {
    const navCommands = NAV_ITEMS.map((item) => {
      const Icon = item.icon;
      return { id: item.key, label: item.label, hint: "ໜ້າ", path: item.path, icon: <Icon size={16} /> };
    });
    const roomCommands = data.rooms.map((room) => ({
      id: `room-${room.no}`,
      label: `ຫ້ອງ ${room.no}`,
      hint: room.tenant ? `ຜູ້ເຊົ່າ ${room.tenant}` : "ຫ້ອງຫວ່າງ",
      path: "/rooms",
      icon: <IconBuildingSkyscraper size={16} />
    }));
    const tenantCommands = data.tenants.map((tenant) => ({
      id: `tenant-${tenant.name}`,
      label: tenant.name,
      hint: `ຫ້ອງ ${tenant.room}`,
      path: "/tenants",
      icon: <IconUserCircle size={16} />
    }));
    const invoiceCommands = data.invoices.slice(0, 40).map((invoice) => ({
      id: `invoice-${invoice.no}`,
      label: `ໃບບີນ ${invoice.no}`,
      hint: `ຫ້ອງ ${invoice.room} · ${invoice.month}/${invoice.year}`,
      path: "/invoices",
      icon: <IconDatabase size={16} />
    }));
    return [...navCommands, ...roomCommands, ...tenantCommands, ...invoiceCommands];
  }, [data.rooms, data.tenants, data.invoices]);

  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const source = keyword
      ? commands.filter((command) => `${command.label} ${command.hint}`.toLowerCase().includes(keyword))
      : commands.slice(0, 8);
    return source.slice(0, 10);
  }, [commands, query]);

  const go = (path: string) => {
    setPaletteOpen(false);
    setQuery("");
    navigate(path);
  };

  const isActive = (path: string) => (path === "/" ? location.pathname === "/" : location.pathname.startsWith(path));
  const primaryItems = NAV_ITEMS.filter((item) => item.primary);

  const renderNavItem = (key: string) => {
    const item = NAV_ITEMS.find((entry) => entry.key === key);
    if (!item) return null;
    const Icon = item.icon;
    const count = item.badge ? badges[item.badge] : 0;
    const active = isActive(item.path);

    const button = (
      <button
        key={item.key}
        type="button"
        className="nav-item"
        data-active={active || undefined}
        onClick={() => {
          navigate(item.path);
          close();
        }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          justifyContent: compact ? "center" : "flex-start",
          fontFamily: "inherit"
        }}
      >
        <Icon size={18} stroke={1.7} />
        {!compact ? (
          <span style={{ flex: 1, textAlign: "left", lineHeight: 1.35 }}>{item.label}</span>
        ) : null}
        {!compact && count ? (
          <Box
            style={{
              minWidth: 20,
              height: 20,
              paddingInline: 6,
              borderRadius: 99,
              background: active ? "var(--brand)" : "var(--hairline)",
              color: active ? "#fff" : "var(--text-muted)",
              fontSize: 11,
              fontWeight: 600,
              display: "grid",
              placeItems: "center"
            }}
          >
            {count}
          </Box>
        ) : null}
      </button>
    );

    return compact ? (
      <Tooltip key={item.key} label={item.label} position="right" withArrow>
        {button}
      </Tooltip>
    ) : (
      button
    );
  };

  return (
    <AppShell
      header={{ height: 66 }}
      navbar={{ width: isMobile ? 264 : compact ? 80 : 254, breakpoint: "md", collapsed: { mobile: !opened } }}
      padding={{ base: "md", sm: "lg" }}
      styles={{ main: { background: "var(--canvas)" } }}
    >
      <AppShell.Header
        style={{
          background: "color-mix(in srgb, var(--surface) 92%, transparent)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--hairline)"
        }}
      >
        <Group h="100%" px={{ base: "md", sm: "lg" }} justify="space-between" wrap="nowrap" gap="sm">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" color="var(--brand)" />
            <Group gap="sm" wrap="nowrap" style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
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
              <Box visibleFrom="xs">
                <Text fw={600} size="sm" c="var(--text-strong)" lineClamp={1}>
                  {data.settings.name}
                </Text>
                <Text size="xs" c="var(--text-muted)">
                  ລະບົບຈັດການອາພາດເມັນ
                </Text>
              </Box>
            </Group>
          </Group>

          <Group gap={8} wrap="nowrap">
            <UnstyledButton className="cmdk-trigger" visibleFrom="md" onClick={() => setPaletteOpen(true)}>
              <IconSearch size={15} />
              <span>ຄົ້ນຫາ ຫ້ອງ / ຜູ້ເຊົ່າ / ໃບບີນ</span>
              <span className="cmdk-kbd">Ctrl K</span>
            </UnstyledButton>

            <Tooltip label="ຄົ້ນຫາ" withArrow>
              <ActionIcon
                variant="default"
                size={36}
                radius="md"
                hiddenFrom="md"
                onClick={() => setPaletteOpen(true)}
                aria-label="ຄົ້ນຫາ"
              >
                <IconSearch size={16} />
              </ActionIcon>
            </Tooltip>

            <Tooltip
              label={error || (connected ? `ເຊື່ອມຕໍ່ ${MODE_LABEL[mode]}` : "ຍັງບໍ່ເຊື່ອມຕໍ່ຖານຂໍ້ມູນ")}
              withArrow
            >
              <Group gap={6} wrap="nowrap" px={8} visibleFrom="md">
                <Box
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 99,
                    background: connected ? "#12A06A" : "#93AACB",
                    boxShadow: connected ? "0 0 0 3px rgba(18,160,106,0.14)" : "none"
                  }}
                />
                <Text size="xs" c="var(--text-muted)" fw={500}>
                  {MODE_LABEL[mode]}
                </Text>
              </Group>
            </Tooltip>

            <Tooltip label={colorScheme === "dark" ? "ໂໝດແສງ" : "ໂໝດມືດ"} withArrow>
              <ActionIcon
                variant="default"
                size={36}
                radius="md"
                onClick={toggleColorScheme}
                aria-label="ສະຫຼັບໂໝດສີ"
              >
                {colorScheme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
              </ActionIcon>
            </Tooltip>

            <Menu shadow="md" width={214} position="bottom-end" radius="md">
              <Menu.Target>
                <Button
                  variant="subtle"
                  color="brand"
                  px={6}
                  rightSection={<IconChevronDown size={14} />}
                  leftSection={
                    <Avatar size={30} radius="xl" color="brand">
                      <IconUserCircle size={20} />
                    </Avatar>
                  }
                >
                  <Box ta="left" visibleFrom="sm">
                    <Text size="sm" fw={500} lh={1.2}>
                      {user?.name}
                    </Text>
                    <Text size="xs" c="var(--text-muted)" lh={1.2}>
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

      <AppShell.Navbar
        p="sm"
        className={compact ? "rail" : undefined}
        style={{ background: "var(--surface)", borderRight: "1px solid var(--hairline)" }}
      >
        <AppShell.Section grow component={ScrollArea} type="hover">
          <Stack gap={2}>
            {NAV_GROUPS.map((group) => (
              <Box key={group.key}>
                <Text className="nav-group-label">{group.label}</Text>
                <Stack gap={2}>
                  {NAV_ITEMS.filter((item) => item.group === group.key).map((item) => renderNavItem(item.key))}
                </Stack>
              </Box>
            ))}
          </Stack>
        </AppShell.Section>

        <AppShell.Section>
          <Divider my="sm" color="var(--hairline)" />
          <Group justify="space-between" px={compact ? 0 : 6} pb={4} wrap="nowrap" gap={6}>
            {!compact ? (
              <Text size="xs" c="var(--text-muted)" lineClamp={1}>
                {data.settings.address}
              </Text>
            ) : null}
            <Group gap={4} wrap="nowrap" mx={compact ? "auto" : undefined}>
              <Tooltip label={compact ? "ຂະຫຍາຍເມນູ" : "ຫຍໍ້ເມນູ"} withArrow>
                <ActionIcon
                  variant="subtle"
                  color="brand"
                  onClick={toggleRail}
                  visibleFrom="md"
                  aria-label="ຫຍໍ້ ຫຼື ຂະຫຍາຍເມນູ"
                >
                  {compact ? <IconLayoutSidebarLeftExpand size={17} /> : <IconLayoutSidebarLeftCollapse size={17} />}
                </ActionIcon>
              </Tooltip>
              <Tooltip label="ຖານຂໍ້ມູນ" withArrow>
                <ActionIcon
                  variant="subtle"
                  color="brand"
                  onClick={() => navigate("/database")}
                  aria-label="ຖານຂໍ້ມູນ"
                >
                  <IconDatabase size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main className="app-main-pad">
        {saving ? <Box className="save-line" role="status" aria-label="ກຳລັງບັນທຶກ" /> : null}
        <Box maw={1440} mx="auto" pt={{ base: 4, sm: 8 }}>
          {children}
        </Box>
      </AppShell.Main>

      <Box className="mobile-tabs" hiddenFrom="md">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <UnstyledButton
              key={item.key}
              className="mobile-tab"
              data-active={isActive(item.path) || undefined}
              onClick={() => navigate(item.path)}
            >
              <Icon size={19} stroke={1.7} />
              <span>{item.label}</span>
            </UnstyledButton>
          );
        })}
      </Box>

      <Tooltip label="ຈົດມິເຕີ" withArrow>
        <ActionIcon
          hiddenFrom="md"
          size={52}
          radius="xl"
          color="brand"
          onClick={() => navigate("/meter")}
          aria-label="ຈົດມິເຕີ"
          style={{
            position: "fixed",
            right: 16,
            bottom: 88,
            zIndex: 200,
            boxShadow: "0 16px 30px -12px rgba(27,111,214,0.65)"
          }}
        >
          <IconPlus size={22} />
        </ActionIcon>
      </Tooltip>

      <Modal
        opened={paletteOpen}
        onClose={() => {
          setPaletteOpen(false);
          setQuery("");
        }}
        withCloseButton={false}
        size={560}
        padding={0}
        radius="lg"
        overlayProps={{ backgroundOpacity: 0.4, blur: 3 }}
      >
        <Box p="xs">
          <TextInput
            autoFocus
            variant="unstyled"
            size="md"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="ຄົ້ນຫາ ໜ້າ, ຫ້ອງ, ຜູ້ເຊົ່າ, ໃບບີນ…"
            leftSection={<IconSearch size={16} />}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) go(results[0].path);
              if (event.key === "Escape") {
                setPaletteOpen(false);
                setQuery("");
              }
            }}
          />
        </Box>
        <Divider color="var(--hairline)" />
        <ScrollArea.Autosize mah={360} p="xs">
          {results.length ? (
            <Stack gap={2}>
              {results.map((command) => (
                <UnstyledButton key={command.id} className="cmdk-row" onClick={() => go(command.path)}>
                  <Box style={{ color: "var(--text-muted)", display: "grid", placeItems: "center" }}>{command.icon}</Box>
                  <Text size="sm" fw={500} style={{ flex: 1, minWidth: 0 }} truncate>
                    {command.label}
                  </Text>
                  <Text size="xs" c="var(--text-muted)" truncate>
                    {command.hint}
                  </Text>
                  <IconArrowRight size={14} />
                </UnstyledButton>
              ))}
            </Stack>
          ) : (
            <Text size="sm" c="var(--text-muted)" ta="center" py="md">
              ບໍ່ພົບຜົນຄົ້ນຫາ
            </Text>
          )}
        </ScrollArea.Autosize>
        <Divider color="var(--hairline)" />
        <Group justify="space-between" px="md" py={8}>
          <Text size="xs" c="var(--text-muted)">
            Enter ເພື່ອໄປຕໍ່ · Esc ປິດ
          </Text>
          <span className="cmdk-kbd">Ctrl K</span>
        </Group>
      </Modal>
    </AppShell>
  );
}
