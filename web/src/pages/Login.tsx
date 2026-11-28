import { Alert, Button, Image, PasswordInput, Text, TextInput, UnstyledButton } from "@mantine/core";
import {
  IconAlertCircle,
  IconArrowRight,
  IconBuilding,
  IconChartHistogram,
  IconDatabase,
  IconFileInvoice,
  IconGauge,
  IconHistory,
  IconLayoutDashboard,
  IconReceipt2,
  IconSearch,
  IconSettings,
  IconShieldCheck,
  IconTools,
  IconUser,
  IconUserShield,
  IconUsers
} from "@tabler/icons-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import logoUrl from "../assets/souvannahvong-logo-cut.webp";
import { useAuth } from "../auth/auth";
import { useStore } from "../data/store";

const FEATURES = [
  { icon: IconLayoutDashboard, title: "ພາບລວມ", desc: "ລາຍຮັບ–ລາຍຈ່າຍ ແລະ ກຣາຟລາຍເດືອນ" },
  { icon: IconChartHistogram, title: "ລາຍງານ", desc: "ສະຖິຕິມິເຕີ ແລະ ລາຍຮັບ 6 ເດືອນ" },
  { icon: IconGauge, title: "ຈົດມິເຕີ", desc: "ຈົດເລກໄຟຟ້າ–ນ້ຳ ຄິດໄລ່ອັດຕະໂນມັດ" },
  { icon: IconReceipt2, title: "ໃບບີນເກັບເງິນ", desc: "ອອກໃບບີນ ຕິດຕາມຍອດຄ້າງ ແລະ ພິມ" },
  { icon: IconBuilding, title: "ຫ້ອງພັກ", desc: "ສະຖານະຫ້ອງ ຄ່າເຊົ່າ ແລະ ມິເຕີລ່າສຸດ" },
  { icon: IconUsers, title: "ຜູ້ເຊົ່າ", desc: "ສັນຍາ ເງິນມັດຈຳ ແລະ ສະຖານະພັກ" },
  { icon: IconTools, title: "ສ້ອມແປງ", desc: "ແຈ້ງຊ່ອມ ຄວາມສຳຄັນ ແລະ ຄ່າໃຊ້ຈ່າຍ" },
  { icon: IconSearch, title: "ກວດເບິ່ງບີນ", desc: "ຄົ້ນຫາໃບບີນດ້ວຍລະຫັດ ຫຼື ຫ້ອງ" },
  { icon: IconHistory, title: "ການເຄື່ອນໄຫວ", desc: "ບັນທຶກການແກ້ໄຂຂໍ້ມູນລ່າສຸດ" },
  { icon: IconUserShield, title: "ຜູ້ໃຊ້ ແລະ ສິດ", desc: "ບົດບາດ ແລະ ສິດເຂົ້າເຖິງແຕ່ລະໜ້າ" },
  { icon: IconSettings, title: "ຕັ້ງຄ່າອັດຕາ", desc: "ຄ່າເຊົ່າ ໄຟຟ້າ ນ້ຳ ແລະ ຂີ້ເຫຍື້ອ" },
  { icon: IconDatabase, title: "ຖານຂໍ້ມູນ", desc: "ເຊື່ອມຕໍ່ ແລະ ສຳຮອງຂໍ້ມູນ" }
];

const MAP_URL = `${import.meta.env.BASE_URL}world-map.svg`;

export default function Login() {
  const { data } = useStore();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const brandName = data.settings.name || "ອາພາດເມັນ ສຸວັນນະວົງ";

  if (user) return <Navigate to="/" replace />;

  // apt-api ເປັນຜູ້ກວດຊື່ ແລະ PIN ຝ່າຍ server (ບໍ່ມີລາຍຊື່ຜູ້ໃຊ້ໃຫ້ເບິ່ງກ່ອນ login)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const message = await login(userId, pin);
    setBusy(false);
    if (message) {
      setError(message);
      setPin("");
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <div className="lg-page">
      <section className="lg-showcase">
        <img className="lg-map" src={MAP_URL} alt="" aria-hidden />

        <div className="lg-showcase-inner">
          <div className="lg-brand">
            <span className="lg-mark">
              <Image className="lg-mark-img" src={logoUrl} alt="ໂລໂກ້ ອາພາດເມັນ" fit="contain" />
            </span>
            <span>
              <Text className="lg-brand-name">{brandName}</Text>
              <Text className="lg-brand-sub">Apartment Manager</Text>
            </span>
          </div>

          <h1 className="lg-hero">
            <span className="lg-hero-line1">ລະບົບຈັດການອາພາດເມັນ</span>
            <span className="lg-hero-line2">ຄົບຈົບ ໃນບ່ອນດຽວ</span>
          </h1>

          <p className="lg-hero-sub">
            ຫ້ອງພັກ ຜູ້ເຊົ່າ ໃບບີນເກັບເງິນ ມິເຕີ ແລະ ວຽກສ້ອມແປງ — ເບິ່ງເຫັນ ແລະ ຈັດການໄດ້ໃນບ່ອນດຽວ.
          </p>

          <ul className="lg-feats">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <li className="lg-feat" key={title}>
                <span className="lg-feat-ico">
                  <Icon size={17} stroke={1.7} />
                </span>
                <span>
                  <Text className="lg-feat-title">{title}</Text>
                  <Text className="lg-feat-desc">{desc}</Text>
                </span>
              </li>
            ))}
          </ul>

          <div className="lg-stats">
            <div>
              <Text className="lg-stat-value">{data.rooms.length}</Text>
              <Text className="lg-stat-label">ຫ້ອງພັກໃນລະບົບ</Text>
            </div>
            <div>
              <Text className="lg-stat-value">12</Text>
              <Text className="lg-stat-label">ເດືອນ ຂໍ້ມູນຕໍ່ປີ</Text>
            </div>
            <div>
              <Text className="lg-stat-value">24/7</Text>
              <Text className="lg-stat-label">ເຂົ້າເຖິງຂໍ້ມູນ</Text>
            </div>
          </div>
        </div>

        <p className="lg-copy">© 2026 {brandName} · ຂໍ້ມູນເກັບໄວ້ພາຍໃນລະບົບ</p>
      </section>

      <section className="lg-panel">
        <div className="lg-form-wrap">
          <div className="lg-panel-brand">
            <img className="lg-panel-logo" src={logoUrl} alt="ໂລໂກ້ ອາພາດເມັນ" />
            <Text className="lg-panel-name">{brandName}</Text>
            <Text className="lg-panel-sub">Apartment Manager</Text>
          </div>

          <h2 className="lg-title">ຍິນດີຕ້ອນຮັບ</h2>
          <p className="lg-sub">ໃສ່ຊື່ຜູ້ໃຊ້ ແລະ PIN ເພື່ອເຂົ້າສູ່ລະບົບ</p>

          <form onSubmit={submit} className="lg-fields">
            <TextInput
              label="ຊື່ຜູ້ໃຊ້"
              placeholder="ຊື່ ຫຼື id ຜູ້ໃຊ້"
              leftSection={<IconUser size={16} />}
              value={userId}
              onChange={(event) => {
                setUserId(event.currentTarget.value);
                setError("");
              }}
              radius="md"
              autoComplete="username"
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
              autoFocus
            />
            {error ? (
              <Alert color="red" variant="light" radius="md" icon={<IconAlertCircle size={16} />}>
                {error}
              </Alert>
            ) : null}

            <Button
              type="submit"
              fullWidth
              radius="md"
              rightSection={<IconArrowRight size={17} />}
              loading={busy}
              disabled={!userId.trim() || pin.replace(/\D/g, "").length < 4}
              className="lg-submit"
            >
              ເຂົ້າສູ່ລະບົບ
            </Button>
          </form>

          <UnstyledButton className="lg-ghost" onClick={() => navigate("/bill-check")}>
            <IconFileInvoice size={15} />
            <span>ກວດໃບບີນເກັບເງິນ</span>
            <IconArrowRight size={13} />
          </UnstyledButton>

          <p className="lg-panel-foot">
            <IconShieldCheck size={14} />
            <span>ຂໍ້ມູນຖືກເກັບຮັກສາໄວ້ພາຍໃນລະບົບ</span>
          </p>
        </div>
      </section>
    </div>
  );
}
