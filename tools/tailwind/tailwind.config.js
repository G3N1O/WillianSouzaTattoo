/* Tema do site — espelho exato do bloco que existia no <head>:
     tailwind = { config: { theme: { extend: { colors: {...}, fontFamily: {...} } } } }

   Regenerar assets/css/tailwind.css a partir da raiz do repositório:
     npx tailwindcss@3.4.17 -c tools/tailwind/tailwind.config.js ^
         -i tools/tailwind/input.css -o assets/css/tailwind.css        */

module.exports = {
  content: ["./index.html", "./assets/js/main.js"],
  theme: {
    extend: {
      colors: {
        paper: "#f8f9fa",
        silver: "#adb5bd",
        steel: "#6c757d",
        coal: "#343a40",
        ink: "#212529",
        abyss: "#131518"
      },
      fontFamily: {
        head: ['"Barlow Condensed"', "sans-serif"]
      }
    }
  },
  plugins: []
};
