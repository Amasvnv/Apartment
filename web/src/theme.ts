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

export const theme = createTheme({
  primaryColor: "brand",
  primaryShade: { light: 6, dark: 6 },
  colors: { brand, neutral },
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
  defaultRadius: "md",
  black: "#0B2545",
  components: {
    Card: { defaultProps: { withBorder: true, radius: "lg", shadow: "xs", padding: "lg" } },
    Paper: { defaultProps: { radius: "lg" } },
    Table: { defaultProps: { striped: true, highlightOnHover: true, verticalSpacing: "sm", horizontalSpacing: "md" } },
    Button: { defaultProps: { radius: "md" } },
    Badge: { defaultProps: { radius: "sm" } },
    Modal: { defaultProps: { radius: "lg", centered: true } }
  }
});
