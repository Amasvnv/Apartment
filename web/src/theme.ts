import { createTheme, type MantineColorsTuple } from "@mantine/core";

const brand: MantineColorsTuple = [
  "#EAF2FE",
  "#D6E5FC",
  "#AECBFA",
  "#84AFF6",
  "#5C93F2",
  "#3B7CEA",
  "#1B6FD6",
  "#155CB4",
  "#0F4A93",
  "#0A3A75"
];

const neutral: MantineColorsTuple = [
  "#F7FAFF",
  "#EEF4FD",
  "#E2ECF9",
  "#D3E1F3",
  "#BACEE8",
  "#93AACB",
  "#6B84A6",
  "#4C6484",
  "#2C4262",
  "#0B2545"
];

const navy: MantineColorsTuple = [
  "#EAF2FE",
  "#C7DAF2",
  "#A3BCDC",
  "#7F9CBE",
  "#5E7DA4",
  "#425F84",
  "#28425F",
  "#172D47",
  "#0F2138",
  "#08172B"
];

export const theme = createTheme({
  primaryColor: "brand",
  primaryShade: { light: 6, dark: 5 },
  colors: { brand, neutral, dark: navy },
  fontFamily: "'Noto Sans Lao', 'Segoe UI', system-ui, -apple-system, sans-serif",
  headings: {
    fontFamily: "'Noto Sans Lao', 'Segoe UI', system-ui, sans-serif",
    fontWeight: "600",
    sizes: {
      h1: { fontSize: "1.65rem", lineHeight: "1.35" },
      h2: { fontSize: "1.15rem", lineHeight: "1.4" },
      h3: { fontSize: "1rem", lineHeight: "1.45" }
    }
  },
  defaultRadius: "lg",
  radius: {
    xs: "6px",
    sm: "8px",
    md: "10px",
    lg: "14px",
    xl: "20px"
  },
  shadows: {
    xs: "0 1px 2px rgba(11,37,69,0.05)",
    sm: "0 2px 4px rgba(11,37,69,0.06)",
    md: "0 12px 28px -18px rgba(11,37,69,0.4)",
    lg: "0 20px 40px -24px rgba(11,37,69,0.42)",
    xl: "0 28px 60px -30px rgba(11,37,69,0.48)",
    card: "0 1px 2px rgba(11,37,69,0.04), 0 10px 24px -20px rgba(11,37,69,0.45)",
    lift: "0 16px 36px -22px rgba(11,37,69,0.42), 0 2px 6px rgba(11,37,69,0.05)"
  },
  black: "var(--text-strong)",
  other: {
    text: {
      strong: "var(--text-strong)",
      body: "var(--text-body)",
      muted: "var(--text-muted)"
    },
    surface: "var(--surface)",
    canvas: "var(--canvas)"
  },
  components: {
    Card: {
      defaultProps: { radius: "lg", padding: "lg", shadow: "card", withBorder: false }
    },
    Paper: { defaultProps: { radius: "lg", shadow: "card" } },
    Table: {
      defaultProps: { striped: true, highlightOnHover: true, verticalSpacing: "sm", horizontalSpacing: "md" }
    },
    Button: { defaultProps: { radius: "md" } },
    TextInput: { defaultProps: { radius: "md" } },
    Select: { defaultProps: { radius: "md" } },
    Badge: { defaultProps: { radius: "sm" } },
    Modal: { defaultProps: { radius: "lg", centered: true } }
  }
});
