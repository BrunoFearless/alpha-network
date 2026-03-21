import { redirect } from 'next/navigation';

// Redireciona para o main ou login consoante o estado de autenticação
// A lógica real de autenticação será feita no middleware
export default function Home() {
  redirect('/main');
}
