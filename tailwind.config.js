/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      backgroundImage: {
        "custom-radial":
          "radial-gradient(circle at top center, #BB4938, black 24%)",
      },
      backgroundClip: {
        text: "text",
      },
      textFillColor: {
        transparent: "transparent",
      },
    },
  },
  variants: {
    backgroundImage: ["responsive"],
    backgroundClip: ["responsive"],
    textFillColor: ["responsive"],
  },
  plugins: [require("@tailwindcss/typography")],
};
