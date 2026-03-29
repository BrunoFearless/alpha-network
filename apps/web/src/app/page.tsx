import { redirect } from 'next/navigation';

// Redireciona para /main — o layout de (main) trata da verificação de auth
export default function RootPage() {
  redirect('/main');
}
