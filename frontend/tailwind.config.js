/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Nova Identidade Cyrius baseada na imagem
        cyrius: {
          dark: '#302464',    // Roxo Profundo (Base do Menu e Ondas)
          primary: '#7C69AF', // Violeta Vibrante (Destaque e Botões)
          light: '#A696D1',   // Lavanda Suave (Ícones e Detalhes)
        },
        // Mantemos cores semânticas de status ajustadas ao tom do sistema
        status: {
          green: '#10B981', // Emerald para Sucesso
          orange: '#F59E0B', // Amber para Alertas
          red: '#EF4444',    // Red para Erros/Críticos
        }
      },
      // Opcional: Adicionar fontes arredondadas para combinar com o design
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
}