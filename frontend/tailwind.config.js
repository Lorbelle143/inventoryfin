/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#4f46e5",
          light:   "#eef2ff",
          dark:    "#3730a3",
        },
        danger: {
          DEFAULT: "#b91c1c",
          light:   "#fee2e2",
        },
        success: {
          DEFAULT: "#166534",
          light:   "#dcfce7",
        },
        sidebar: "#1e2a35",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 4px 20px rgba(15,23,42,0.06)",
        shell: "0 30px 80px rgba(15,23,42,0.18)",
      },
    },
  },
  plugins: [],
};
