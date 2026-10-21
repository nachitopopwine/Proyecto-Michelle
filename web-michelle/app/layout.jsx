import '../src/index.css';

export const metadata = {
  title: 'Michelle Palta | Nutricionismo integral',
  description: 'Agenda tu consulta nutricional con Michelle Palta.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}