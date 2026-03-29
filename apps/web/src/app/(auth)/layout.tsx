// Layout exclusivo para páginas de autenticação.
// Não tem Navbar nem Sidebar — o utilizador ainda não está autenticado.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center overflow-hidden">
      {children}
    </main>
  );
}
