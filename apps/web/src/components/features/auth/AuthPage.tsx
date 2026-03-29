'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import s from './AuthPage.module.css';

type Mode = 'login' | 'register';
interface Props { initialMode?: Mode; }

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AuthPage({ initialMode = 'login' }: Props) {
  const router   = useRouter();
  const login    = useAuthStore(st => st.login);
  const register = useAuthStore(st => st.register);
  const loading  = useAuthStore(st => st.isLoading);

  const [mode,      setMode]      = useState<Mode>(initialMode);
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [username,  setUsername]  = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [remember,  setRemember]  = useState(true);
  const [error,     setError]     = useState('');

  const pcLoginRef    = useRef<HTMLDivElement>(null);
  const pcRegisterRef = useRef<HTMLDivElement>(null);
  const busyRef       = useRef(false);
  const isRegister    = mode === 'register';

  useEffect(() => { setMode(initialMode); }, [initialMode]);

  useEffect(() => {
    const pcL = pcLoginRef.current;
    const pcR = pcRegisterRef.current;
    if (!pcL || !pcR) return;
    if (initialMode === 'register') {
      pcL.style.transition = 'none'; pcL.style.opacity = '0';
      pcL.style.transform = 'translateX(-22px)'; pcL.style.pointerEvents = 'none';
      pcR.style.transition = 'none'; pcR.style.opacity = '1';
      pcR.style.transform = 'translateX(0)'; pcR.style.pointerEvents = 'all';
    } else {
      pcL.style.opacity = '1'; pcL.style.transform = 'translateX(0)'; pcL.style.pointerEvents = 'all';
      pcR.style.opacity = '0'; pcR.style.transform = 'translateX(20px)'; pcR.style.pointerEvents = 'none';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Google OAuth ──────────────────────────────────────────────────
  // Redireciona para o backend que trata todo o fluxo OAuth
  function handleGoogleLogin() {
    window.location.href = `${API}/api/v1/auth/google`;
  }

  // ── Painel deslizante ─────────────────────────────────────────────
  function goRegister() {
    if (isRegister || busyRef.current) return;
    busyRef.current = true; setError(''); setMode('register');
    const pcL = pcLoginRef.current; const pcR = pcRegisterRef.current;
    if (!pcL || !pcR) { busyRef.current = false; return; }
    pcL.style.transition = 'opacity 0.3s, transform 0.3s';
    pcL.style.opacity = '0'; pcL.style.transform = 'translateX(-22px)'; pcL.style.pointerEvents = 'none';
    setTimeout(() => {
      pcR!.style.transition = 'opacity 0.35s 0.05s, transform 0.35s 0.05s';
      pcR!.style.opacity = '1'; pcR!.style.transform = 'translateX(0)'; pcR!.style.pointerEvents = 'all';
      setTimeout(() => { busyRef.current = false; }, 400);
    }, 260);
  }

  function goLogin() {
    if (!isRegister || busyRef.current) return;
    busyRef.current = true; setError(''); setMode('login');
    const pcL = pcLoginRef.current; const pcR = pcRegisterRef.current;
    if (!pcL || !pcR) { busyRef.current = false; return; }
    pcR.style.transition = 'opacity 0.3s, transform 0.3s';
    pcR.style.opacity = '0'; pcR.style.transform = 'translateX(22px)'; pcR.style.pointerEvents = 'none';
    setTimeout(() => {
      pcL!.style.transition = 'opacity 0.35s 0.05s, transform 0.35s 0.05s';
      pcL!.style.opacity = '1'; pcL!.style.transform = 'translateX(0)'; pcL!.style.pointerEvents = 'all';
      setTimeout(() => { busyRef.current = false; }, 400);
    }, 260);
  }

  // ── Submissões ────────────────────────────────────────────────────
  async function handleLogin(e: FormEvent) {
    e.preventDefault(); setError('');
    try {
      await login(email, password);
      router.push('/main');
    } catch (err: any) {
      setError(err.message ?? 'Erro ao iniciar sessão.');
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault(); setError('');
    const finalUsername = username || `${firstName}${lastName}`.toLowerCase().replace(/\s+/g, '');
    if (!finalUsername) { setError('Preenche o username.'); return; }
    try {
      await register(email, password, finalUsername);
      router.push('/main');
    } catch (err: any) {
      setError(err.message ?? 'Erro ao criar conta.');
    }
  }

  // ── Partículas ────────────────────────────────────────────────────
  useEffect(() => {
    const el = document.getElementById('auth-particles');
    if (!el) return;
    function mk(target: HTMLElement) {
      const p = document.createElement('div');
      const size = Math.random() * 3 + 1;
      const colors = ['rgba(201,168,76,0.5)','rgba(139,105,20,0.4)','rgba(232,201,122,0.45)','rgba(130,80,220,0.3)','rgba(80,170,220,0.3)'];
      p.style.cssText = `position:absolute;border-radius:50%;pointer-events:none;width:${size}px;height:${size}px;background:${colors[Math.floor(Math.random()*colors.length)]};left:${Math.random()*100}%;bottom:-5px;--dx:${(Math.random()-0.5)*70}px;animation:rise ${Math.random()*7+5}s ${Math.random()*3}s linear both`;
      target.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }
    const iv = setInterval(() => mk(el), 380);
    for (let i = 0; i < 10; i++) mk(el);
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      <style>{`@keyframes rise{0%{transform:translateY(0) translateX(0);opacity:0}8%{opacity:.55}92%{opacity:.15}100%{transform:translateY(-140px) translateX(var(--dx));opacity:0}}`}</style>
      <div className={s.bg} />
      <div className={s.bgGrid} />
      <div id="auth-particles" style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:1,overflow:'hidden'}} />

      <div className={`${s.card} ${isRegister ? s.isRegister : ''}`}>
        <div className={s.forms}>

          {/* ══ LOGIN ══ */}
          <div className={`${s.formSide} ${s.formLogin}`}>
            <div>
              <p className={s.fieldLabel} style={{fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',color:'#C9A84C',marginBottom:7}}>Bem-vindo de volta</p>
              <h1 style={{fontFamily:'Cinzel,serif',fontSize:26,fontWeight:700,color:'#FEFCFF',marginBottom:4,lineHeight:1.15}}>Inicia sessão</h1>
              <p style={{fontSize:12,color:'#605A78',fontWeight:300,marginBottom:28}}>A tua identidade digital aguarda</p>

              {error && mode === 'login' && <div className={s.errorMsg}>{error}</div>}

              <form onSubmit={handleLogin} noValidate>
                <div className={s.field}>
                  <label className={s.fieldLabel}>Email</label>
                  <div className={s.fieldWrap}>
                    <input className={s.inp} type="email" placeholder="o-teu@email.com" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
                    <MailIcon className={s.fieldIcon} />
                  </div>
                </div>
                <div className={s.field}>
                  <label className={s.fieldLabel}>Password</label>
                  <div className={s.fieldWrap}>
                    <input className={s.inp} type="password" placeholder="••••••••" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
                    <LockIcon className={s.fieldIcon} />
                  </div>
                </div>
                <div className={s.rowSmall}>
                  <label className={s.checkLabel}>
                    <div className={s.checkBox}>{remember && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}</div>
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{display:'none'}} />
                    <span className={s.checkText}>Lembrar sessão</span>
                  </label>
                  <button type="button" className={s.forgotBtn}>Esqueci a password</button>
                </div>
                <button type="submit" className={s.btnMain} disabled={loading && mode === 'login'}>
                  <div className={s.shineWrap}><span className={s.shine} /></div>
                  {loading && mode === 'login' ? <><span className={s.btnSpinner}/>A entrar…</> : 'Entrar na Alpha Network'}
                </button>
              </form>

              <div className={s.socialSep}><span className={s.socialSepText}>ou entra com</span></div>
              <div className={s.socialRow}>
                {/* ↓ Google agora faz redirect real */}
                <SocialBtn title="Google" onClick={handleGoogleLogin}><GoogleIcon /></SocialBtn>
                <SocialBtn title="Facebook"><FacebookIcon /></SocialBtn>
                <SocialBtn title="GitHub"><GitHubIcon /></SocialBtn>
                <SocialBtn title="LinkedIn"><LinkedInIcon /></SocialBtn>
              </div>
            </div>
          </div>

          {/* ══ REGISTO ══ */}
          <div className={`${s.formSide} ${s.formRegister}`}>
            <div>
              <p className={s.fieldLabel} style={{fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',color:'#C9A84C',marginBottom:7}}>Junta-te à Alpha</p>
              <h1 style={{fontFamily:'Cinzel,serif',fontSize:26,fontWeight:700,color:'#FEFCFF',marginBottom:4,lineHeight:1.15}}>Cria a tua conta</h1>
              <p style={{fontSize:12,color:'#605A78',fontWeight:300,marginBottom:20}}>Grátis. Sem cartão de crédito.</p>

              {error && mode === 'register' && <div className={s.errorMsg}>{error}</div>}

              <form onSubmit={handleRegister} noValidate>
                <div className={s.fields2}>
                  <div className={s.field} style={{marginBottom:0}}>
                    <label className={s.fieldLabel}>Primeiro nome</label>
                    <input className={s.inp} type="text" placeholder="Bruno" value={firstName} onChange={e => setFirstName(e.target.value)} />
                  </div>
                  <div className={s.field} style={{marginBottom:0}}>
                    <label className={s.fieldLabel}>Apelido</label>
                    <input className={s.inp} type="text" placeholder="Fearless" value={lastName} onChange={e => setLastName(e.target.value)} />
                  </div>
                </div>
                <div style={{marginBottom:14}}/>
                <div className={s.field}>
                  <label className={s.fieldLabel}>Username</label>
                  <input className={s.inp} type="text" placeholder="brunoFearless" autoComplete="username" required value={username} onChange={e => setUsername(e.target.value.toLowerCase())} />
                  <p className={s.fieldHint}>Só letras, números e _. Não pode ser alterado depois.</p>
                </div>
                <div className={s.field}>
                  <label className={s.fieldLabel}>Email</label>
                  <input className={s.inp} type="email" placeholder="email@dominio.com" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className={s.field}>
                  <label className={s.fieldLabel}>Password</label>
                  <input className={s.inp} type="password" placeholder="Mínimo 8 caracteres" autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <button type="submit" className={s.btnMain} disabled={loading && mode === 'register'} style={{marginTop:4}}>
                  <div className={s.shineWrap}><span className={s.shine}/></div>
                  {loading && mode === 'register' ? <><span className={s.btnSpinner}/>A criar conta…</> : 'Criar conta gratuita'}
                </button>
              </form>

              <div className={s.socialSep}><span className={s.socialSepText}>ou regista-te com</span></div>
              <div className={s.socialRow}>
                {/* ↓ Google também faz redirect real no registo */}
                <SocialBtn title="Google" onClick={handleGoogleLogin}><GoogleIcon /></SocialBtn>
                <SocialBtn title="Facebook"><FacebookIcon /></SocialBtn>
                <SocialBtn title="GitHub"><GitHubIcon /></SocialBtn>
                <SocialBtn title="LinkedIn"><LinkedInIcon /></SocialBtn>
              </div>
            </div>
          </div>

          {/* ══ PAINEL DESLIZANTE ══ */}
          <div className={s.panel}>
            <div className={s.panelInner}>
              <div className={s.panelBlob} />
              <div className={s.panelContent} ref={pcLoginRef}>
                <div className={s.panelLogo}>α</div>
                <div className={s.panelTagline}>Alpha Network</div>
                <h2 className={s.panelHeading}>Olá,<br/>Bem-vindo!</h2>
                <p className={s.panelSub}>Ainda não és membro? Regista-te e entra num mundo de possibilidades.</p>
                <button type="button" className={s.panelBtn} onClick={goRegister}>Registar</button>
                <div className={s.modeDots}>
                  {['#E040FB','#FF7043','#00BCD4','#FFD700','#76FF03'].map((c,i) => <div key={i} className={s.modeDot} style={{background:c}}/>)}
                </div>
              </div>
              <div className={s.panelContentRegister} ref={pcRegisterRef}>
                <div className={s.panelLogo}>α</div>
                <div className={s.panelTagline}>Alpha Network</div>
                <h2 className={s.panelHeading}>Bem-vindo<br/>de volta!</h2>
                <p className={s.panelSub}>Já tens conta? Inicia sessão e volta ao teu espaço.</p>
                <button type="button" className={s.panelBtn} onClick={goLogin}>Iniciar sessão</button>
                <div className={s.modeDots}>
                  {['#E040FB','#FF7043','#00BCD4','#FFD700','#76FF03'].map((c,i) => <div key={i} className={s.modeDot} style={{background:c}}/>)}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────
function SocialBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick?: () => void }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick}
      style={{aspectRatio:'1',borderRadius:10,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'background 0.18s,border-color 0.18s'}}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.12)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.07)'; }}
    >{children}</button>
  );
}

function MailIcon({ className }: { className?: string }) {
  return <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
}
function LockIcon({ className }: { className?: string }) {
  return <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
}
function GoogleIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>;
}
function FacebookIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
}
function GitHubIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="#EDE9F5"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>;
}
function LinkedInIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>;
}
