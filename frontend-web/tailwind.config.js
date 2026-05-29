/** @type {import('tailwindcss').Config} */


module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        slideFadeLoop: {
          "0%": { transform: "translateY(5px)", opacity: "0" },
          "15%": { transform: "translateY(0)", opacity: "1" },
          "85%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(-5px)", opacity: "0" },
        },
        waveFlow: {
          "0%": { left: "-100%" },
          "100%": { left: "0%" },
        },
        fadeInScale: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        slideFadeLoop: "slideFadeLoop 5s ease-in-out infinite",
        waveFlow: "waveFlow 18s linear infinite",
        fadeInScale: "fadeInScale 0.6s ease-out both",
      },
    

    zIndex: {
      '999': '999',
      '1000': '1000',
    },

    colors: {
      whitesmoke: '#f5f5f5',
    },
    fontFamily: {
      sans: [
        'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Helvetica Neue"',
        '"Noto Sans"', '"Liberation Sans"', 'Arial', 'sans-serif',
        '"Apple Color Emoji"', '"Segoe UI Emoji"',
      ],
    },
    height: {
      'overlay-section': 'calc(100vh - 18.3125rem - 10.77625rem - 19.5rem - 3.85rem)',
    },
    maxWidth: {
      'aspect-9-16': '56.25vh', // 等同于 9/16 宽高比
    }
  },
},
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-gutter-stable': {
          'scrollbar-gutter': 'stable',
        },
        '.scrollbar-style': {
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },

        },
      });
    },
  ],
};
