/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#ff4d8d", // A premium boutique pink
                secondary: "#1a1a1a",
            }
        },
    },
    plugins: [],
}
