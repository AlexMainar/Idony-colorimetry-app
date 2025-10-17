// tailwind.config.js
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Inter', 'sans-serif'], // 👈 override the default mono
      },
    },
  },
  plugins: [],
};