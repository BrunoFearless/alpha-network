// Este ficheiro mostra apenas a alteração ao botão Google no AuthPage.tsx.
// Substituir o onClick dos dois botões Google (login e registo) por:

// ANTES (com alert):
// onClick={() => alert('Google OAuth ainda não está configurado...')}

// DEPOIS (redirect real para o backend):
// onClick={handleGoogleLogin}

// Adicionar esta função dentro do componente AuthPage, antes do return:

/*
function handleGoogleLogin() {
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  // Redireciona directamente para o backend — o NestJS trata o resto
  window.location.href = `${API}/api/v1/auth/google`;
}
*/

// Os dois SocialBtn de Google ficam assim:
// <SocialBtn title="Google" onClick={handleGoogleLogin}><GoogleIcon /></SocialBtn>

export {};
