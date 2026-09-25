import '../src/index.css';

export const metadata = {
  title: 'Michelle Morales | Nutricionismo integral',
  description: 'Agenda tu consulta nutricional con Michelle Morales.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}