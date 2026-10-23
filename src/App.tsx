import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  Activity, AlertCircle, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2,
  Clock3, GraduationCap, Home, KeyRound, LoaderCircle, LogOut, Menu, Plus,
  Settings as SettingsIcon, ShieldCheck, Sparkles, Trash2, UserRound,
  X, Zap, Eye, EyeOff, CalendarClock
} from 'lucide-react'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from './lib/firebase'

type Subject = { id: string; name: string; units: number; topics: string; duration_minutes: number; created_at?: string }
type TimeSlot = { id: string; day_of_week: number; start_time: string; end_time: string; kind: 'available'|'blocked'; label?: string }
type StudySession = { id: string; subject_id: string | null; subject_name: string; day_of_week: number; start_time: string; end_time: string; status: 'planned'|'completed' }
type View = 'Home'|'Profile'|'Subjects'|'Block Time'|'Routine'|'Settings'
type Notice = { type: 'error'|'success'|'info'; text: string }

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const DAY_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const fmtTime = (t: string) => {
  const [hh, mm] = t.split(':').map(Number)
  const h = hh % 12 || 12
  return `${h}:${String(mm || 0).padStart(2,'0')} ${hh >= 12 ? 'PM' : 'AM'}`
}
const mins = (t: string) => { const [h,m] = t.split(':').map(Number); return h*60+m }
const toHHMM = (m: number) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`

function Brand({ small = false }: { small?: boolean }) {
  return <div className={`brand ${small ? 'brand-small' : ''}`}><span className="brand-mark"><GraduationCap size={small?21:28}/></span><span>Study<span className="brand-purple">Flow</span><small>AI-Powered Student Planner</small></span></div>
}
function Button({ children, onClick, type='button', variant='primary', disabled=false }: {children:ReactNode;onClick?:()=>void;type?:'button'|'submit';variant?:'primary'|'secondary'|'ghost'|'danger';disabled?:boolean}) {
  return <button type={type} onClick={onClick} disabled={disabled} className={`button button-${variant}`}>{children}</button>
}
function Field({ label, value, onChange, placeholder='', type='text', required=false }: {label:string;value:string;onChange:(v:string)=>void;placeholder?:string;type?:string;required?:boolean}) {
  return <label className="field"><span>{label}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required}/></label>
}
function EmptyState({ title, description, icon }: {title:string;description:string;icon?:ReactNode}) {
  return <div className="empty-state"><div className="empty-icon">{icon || <BookOpen size={22}/>}</div><strong>{title}</strong><p>{description}</p></div>
}

function firebaseErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as {code:unknown}).code) : ''
  if (code === 'auth/email-already-in-use') return 'User already exists. Please sign in'
  if (['auth/invalid-credential','auth/wrong-password','auth/user-not-found'].includes(code)) return 'Email or password is incorrect'
  if (code === 'auth/weak-password') return 'Password must be at least 6 characters'
  if (code === 'auth/invalid-email') return 'Enter a valid email address'
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please try again later.'
  return error instanceof Error && error.message ? error.message : 'Authentication failed. Please try again.'
}

export default function App() {
  const [user,setUser] = useState<User|null>(null)
  const [authReady,setAuthReady] = useState(false)
  const [authMode,setAuthMode] = useState<'login'|'register'|'reset'>('login')
  const [authBusy,setAuthBusy] = useState(false)
  const [showPassword,setShowPassword] = useState(false)
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [confirmPassword,setConfirmPassword] = useState('')
  const [recoveryCode,setRecoveryCode] = useState('')
  const [passwordRecovery,setPasswordRecovery] = useState(() => new URLSearchParams(window.location.search).get('mode') === 'resetPassword' && new URLSearchParams(window.location.search).has('oobCode'))
  const [notice,setNotice] = useState<Notice|null>(null)
  const [view,setView] = useState<View>('Home')
  const [mobileNav,setMobileNav] = useState(false)

  const subjects: Subject[] = []
  const slots: TimeSlot[] = []
  const sessions: StudySession[] = []

  useEffect(() => onAuthStateChanged(auth, currentUser => {
    setUser(currentUser)
    setAuthReady(true)
  }), [])

  const greetingName = user?.displayName || user?.email?.split('@')[0] || 'Student'
  const completed = 0
  const studyMinutes = 0
  const today = (new Date().getDay()+6)%7
  const todaySessions: StudySession[] = []
  const noticeDismiss = () => setNotice(null)

  async function handleAuth(e: FormEvent) {
    e.preventDefault()
    setAuthBusy(true); setNotice(null)
    try {
      if (authMode==='register') {
        if (password !== confirmPassword) throw new Error('Passwords do not match')
        if (password.length < 6) throw new Error('Password must be at least 6 characters')
        await createUserWithEmailAndPassword(auth,email.trim(),password)
        setNotice({type:'success',text:'Account created. You are now signed in.'})
        setView('Home')
      } else if (authMode==='login') {
        await signInWithEmailAndPassword(auth,email.trim(),password)
        setNotice({type:'success',text:'Signed in successfully.'})
        setView('Home')
      } else {
        await sendPasswordResetEmail(auth,email.trim())
        setNotice({type:'success',text:'If this email is registered, a password reset email has been sent.'})
      }
    } catch (e) {
      const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as {code:unknown}).code) : ''
      if (authMode==='login' && ['auth/invalid-credential','auth/wrong-password','auth/user-not-found','auth/invalid-email'].includes(code)) {
        setNotice({type:'error',text:'Email or password is incorrect'})
      } else if (authMode==='register' && ['auth/email-already-in-use','auth/account-exists-with-different-credential'].includes(code)) {
        setNotice({type:'error',text:'User already exists. Please sign in'})
      } else {
        setNotice({type:'error',text:firebaseErrorMessage(e)})
      }
    } finally { setAuthBusy(false) }
  }

  async function signOutUser() {
    try {
      await signOut(auth)
      setView('Home')
      setNotice(null)
      setAuthMode('login')
      setPassword('')
    } catch (e) { setNotice({type:'error',text:firebaseErrorMessage(e)}) }
  }

  async function updateRecoveredPassword(e: FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) { setNotice({type:'error',text:'Password must be at least 6 characters'}); return }
    if (newPassword !== confirmNewPassword) { setNotice({type:'error',text:'Passwords do not match'}); return }
    const code = new URLSearchParams(window.location.search).get('oobCode') || recoveryCode
    if (!code) { setNotice({type:'error',text:'Open the password reset link from your email to choose a new password.'}); return }
    setAuthBusy(true); setNotice(null)
    try {
      // Firebase password reset codes come from the email action link.
      await verifyPasswordResetCode(auth, code)
      await confirmPasswordReset(auth, code, newPassword)
      window.history.replaceState({},document.title,window.location.pathname)
      setPasswordRecovery(false); setNewPassword(''); setConfirmNewPassword(''); setRecoveryCode('')
      setAuthMode('login')
      setNotice({type:'success',text:'Password updated. Please sign in with your new password.'})
    } catch (e) {
      setNotice({type:'error',text:firebaseErrorMessage(e)})
    } finally { setAuthBusy(false) }
  }
  const greetingName = user?.displayName || user?.email?.split('@')[0] || 'Student'
  const completed = 0
  const studyMinutes = 0
  const today = (new Date().getDay()+6)%7
  const todaySessions: StudySession[] = []
  const noticeDismiss = () => setNotice(null)

  const navItems:{label:View;icon:ReactNode}[]=[
    {label:'Home',icon:<Home size={18}/>},{label:'Profile',icon:<UserRound size={18}/>},
    {label:'Subjects',icon:<BookOpen size={18}/>},{label:'Block Time',icon:<CalendarClock size={18}/>},
    {label:'Routine',icon:<CalendarDays size={18}/>},{label:'Settings',icon:<SettingsIcon size={18}/>}
  ]
  const sessionsByDay=DAYS.map((_,day)=>sessions.filter(s=>s.day_of_week===day).sort((a,b)=>a.start_time.localeCompare(b.start_time)))

  if(!authReady) return <div className="app-loading"><LoaderCircle className="spin" size={28}/><p>Opening your study space…</p></div>

  if(!user) return <div className="auth-shell">
    <div className="auth-top"><Brand/><div className="top-links"><a href="#features">Features</a><a href="#how">How it works</a><a href="#about">About</a></div><button className="button button-primary top-login" onClick={()=>{setAuthMode('login');window.scrollTo({top:0,behavior:'smooth'})}}>Log in</button></div>
    <main className="auth-main">
      <section className="hero-block">
        <div className="hero-copy"><span className="eyebrow"><Sparkles size={15}/> YOUR PERSONAL STUDY SPACE</span><h1>Plan Smarter.<br/><span>Study Better.</span><br/>Achieve More.</h1><p>Organize your subjects, make time for what matters, and build a study routine that works for you.</p><div className="hero-actions"><Button onClick={()=>{setAuthMode('register');document.getElementById('account-card')?.scrollIntoView({behavior:'smooth'})}}>Get Started <ArrowRight size={16}/></Button><a className="text-link" href="#features">Explore features</a></div><div className="hero-perks"><span><BookOpen size={16}/> Organize subjects</span><span><Clock3 size={16}/> Manage your time</span><span><CalendarDays size={16}/> Plan a routine</span></div></div>
        <div className="hero-art" aria-label="Books and study calendar illustration"><div className="orb orb-one"/><div className="orb orb-two"/><div className="art-calendar"><CalendarDays size={54}/><span>PLAN</span></div><div className="art-clock"><Clock3 size={64}/></div><div className="book-stack"><div/><div/><div/></div><GraduationCap className="art-cap" size={106}/><div className="art-caption">Small steps. Brighter future.</div></div>
      </section>
      <section className="auth-grid" id="account-card">
        <form className="panel auth-card" onSubmit={handleAuth}>
          <div className="panel-heading"><span className="icon-tile"><UserRound size={23}/></span><div><h2>{authMode==='register'?'Create your account':authMode==='reset'?'Reset your password':'Welcome back'}</h2><p>{authMode==='register'?'Start building better study habits.':authMode==='reset'?'We will email you a secure reset link.':'Log in to continue your study journey.'}</p></div></div>

          <Field label="Email address" value={email} onChange={setEmail} placeholder="you@example.com" type="email" required/>
          {authMode!=='reset' && <label className="field"><span>Password</span><div className="password-wrap"><input value={password} onChange={e=>setPassword(e.target.value)} type={showPassword?'text':'password'} placeholder={authMode==='register'?'At least 8 characters':'Enter your password'} required/><button type="button" className="reveal" aria-label="Toggle password visibility" onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>}
          {authMode==='register' && <Field label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Enter password again" type={showPassword?'text':'password'} required/>}
          {authMode==='login' && <div className="forgot-row"><button type="button" className="inline-link" onClick={()=>setAuthMode('reset')}>Forgot password?</button></div>}
          <Button type="submit" disabled={authBusy}>{authBusy?<><LoaderCircle size={16} className="spin"/> Please wait…</>:authMode==='register'?'Create account':authMode==='reset'?'Send reset link':'Log in'} {!authBusy&&<ArrowRight size={17}/>}</Button>
          <div className="auth-switch">{authMode==='login'?<>New to Study Flow? <button type="button" onClick={()=>setAuthMode('register')}>Create an account</button></>:authMode==='register'?<>Already registered? <button type="button" onClick={()=>setAuthMode('login')}>Log in</button></>:<>Remembered it? <button type="button" onClick={()=>setAuthMode('login')}>Back to login</button></>}</div>

        </form>
        <aside className="panel auth-aside"><div className="aside-art"><div className="book book-a"/><div className="book book-b"/><div className="book book-c"/><Sparkles size={26} className="aside-spark"/></div><h3>A calmer way to study</h3><p>Your subjects, your schedule, and your goals — organized in one place you control.</p><div className="aside-feature"><span><CheckCircle2 size={18}/></span><div><strong>Your own account</strong><small>Private data and a personal study space.</small></div></div><div className="aside-feature"><span><CheckCircle2 size={18}/></span><div><strong>Time that works for you</strong><small>Keep your unavailable periods protected.</small></div></div><div className="aside-feature"><span><CheckCircle2 size={18}/></span><div><strong>Flexible routines</strong><small>Adjust the plan as your week changes.</small></div></div></aside>
      </section>
      <section className="feature-section" id="features"><div className="section-intro"><span className="eyebrow"><Zap size={15}/> EVERYTHING IN ONE PLACE</span><h2>Make every study session count.</h2><p>Built around your real subjects, time, and priorities.</p></div><div className="feature-grid"><article className="feature-card"><span className="feature-icon violet"><BookOpen/></span><h3>Organize subjects</h3><p>Keep units, topics, and preferred session lengths together.</p></article><article className="feature-card"><span className="feature-icon blue"><Clock3/></span><h3>Own your time</h3><p>Set when you can study and block the times you cannot.</p></article><article className="feature-card"><span className="feature-icon mint"><CalendarDays/></span><h3>Build a routine</h3><p>Create a weekly plan from your saved subjects and time slots.</p></article><article className="feature-card"><span className="feature-icon peach"><Activity/></span><h3>Track progress</h3><p>Mark real sessions complete and see your progress grow.</p></article></div></section>
    </main><footer className="public-footer" id="about"><Brand small/><span>Make room for focused learning.</span><span>© {new Date().getFullYear()} Study Flow</span></footer>
    {notice && <div className={`toast toast-${notice.type}`}><span>{notice.text}</span><button onClick={noticeDismiss} aria-label="Dismiss message"><X size={16}/></button></div>}
  </div>

  return <div className="dashboard-shell">
    <aside className={`sidebar ${mobileNav?'sidebar-open':''}`}><div className="sidebar-brand"><Brand small/><button className="mobile-close" onClick={()=>setMobileNav(false)}><X size={18}/></button></div><div className="sidebar-label">WORKSPACE</div><nav>{navItems.map(item=><button key={item.label} className={view===item.label?'nav-item active':'nav-item'} onClick={()=>{setView(item.label);setMobileNav(false)}}>{item.icon}<span>{item.label}</span>{view===item.label&&<span className="nav-dot"/>}</button>)}</nav><div className="sidebar-bottom"><div className="sidebar-motivation"><div className="motivation-icon"><Sparkles size={22}/></div><strong>Keep going!</strong><span>Small steps build big progress.</span></div><button className="nav-item signout" onClick={signOutUser}><LogOut size={18}/><span>Sign out</span></button></div></aside>
    {mobileNav&&<button className="mobile-overlay" aria-label="Close menu" onClick={()=>setMobileNav(false)}/>}
    <main className="workspace"><header className="dashboard-topbar"><button className="mobile-menu" onClick={()=>setMobileNav(true)}><Menu size={21}/></button><div><span className="topbar-kicker">YOUR PERSONAL PLANNER</span><strong>{view==='Home'?'Your study overview':view}</strong></div><div className="topbar-right"><span className="today-chip"><CalendarDays size={15}/>{new Date().toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}</span><div className="user-avatar">{greetingName.slice(0,1).toUpperCase()}</div></div></header>
      {notice&&<div className={`notice notice-${notice.type}`}><span>{notice.type==='error'?<AlertCircle size={18}/>:notice.type==='success'?<CheckCircle2 size={18}/>:<Activity size={18}/>} {notice.text}</span><button onClick={noticeDismiss} aria-label="Dismiss"><X size={17}/></button></div>}
      {false?<div className="loading-panel"><LoaderCircle className="spin" size={25}/> Loading…</div>:<>
      {view==='Home'&&<><section className="welcome-row"><div><span className="eyebrow"><Sparkles size={15}/> YOUR STUDY SPACE</span><h1>Good {new Date().getHours()<12?'morning':new Date().getHours()<18?'afternoon':'evening'}, {greetingName.split(' ')[0]}.</h1><p>One focused session at a time. You’re building something good.</p></div><Button onClick={()=>setNotice({type:'info',text:'Study plans are not persisted in Firebase Authentication-only mode.'})}><Sparkles size={17}/> Generate routine <ArrowRight size={16}/></Button></section>
        <section className="stats-grid"><div className="stat-card"><span className="stat-icon stat-violet"><BookOpen size={19}/></span><div><small>Total subjects</small><strong>{subjects.length}</strong><span className="stat-sub">{subjects.length===1?'subject saved':'subjects saved'}</span></div></div><div className="stat-card"><span className="stat-icon stat-blue"><Clock3 size={19}/></span><div><small>Completed study time</small><strong>{Math.floor(studyMinutes/60)}h {studyMinutes%60}m</strong><span className="stat-sub">Based on completed sessions</span></div></div><div className="stat-card"><span className="stat-icon stat-mint"><Check size={19}/></span><div><small>Sessions completed</small><strong>{completed}</strong><span className="stat-sub">Keep your momentum</span></div></div><div className="stat-card"><span className="stat-icon stat-peach"><Flame size={19}/></span><div><small>Planned this week</small><strong>{sessions.filter(s=>s.status==='planned').length}</strong><span className="stat-sub">Saved sessions</span></div></div></section>
        <div className="content-grid"><section className="panel content-panel"><div className="panel-title-row"><div><h2>Today's study flow</h2><p>Your scheduled sessions for {DAYS[today]}.</p></div><button className="subtle-link" onClick={()=>setView('Routine')}>View routine <ArrowRight size={15}/></button></div>{todaySessions.length===0?<EmptyState title="Your day is open" description="Create a routine to see your study sessions here." icon={<CalendarDays size={22}/>}/>:<div className="today-list">{todaySessions.map((s,i)=><div className="today-session" key={s.id}><div className={`timeline-marker marker-${i%4}`}/><div className="session-time">{fmtTime(s.start_time)}<small>{fmtTime(s.end_time)}</small></div><div className="session-subject"><strong>{s.subject_name}</strong><small>{s.status==='completed'?'Completed':'Planned session'}</small></div><button title={s.status==='completed'?'Mark as planned':'Mark as completed'} className={s.status==='completed'?'complete-toggle is-complete':'complete-toggle'} onClick={()=>setNotice({type:'info',text:'Study sessions are not persisted in Firebase Authentication-only mode.'})}>{s.status==='completed'?<Check size={17}/>:<CheckCircle2 size={17}/>}</button></div>)}</div>}</section>
        <section className="panel content-panel"><div className="panel-title-row"><div><h2>Quick actions</h2><p>Pick up where you left off.</p></div><span className="soft-badge">Workspace</span></div><div className="quick-actions"><button onClick={()=>setView('Subjects')}><span className="quick-icon q-violet"><BookOpen size={18}/></span><span><strong>Add a subject</strong><small>Organize a class or topic</small></span><ArrowRight size={16}/></button><button onClick={()=>setView('Block Time')}><span className="quick-icon q-blue"><Clock3 size={18}/></span><span><strong>Set your time</strong><small>Add available or blocked hours</small></span><ArrowRight size={16}/></button><button onClick={()=>setView('Routine')}><span className="quick-icon q-mint"><CalendarDays size={18}/></span><span><strong>Review routine</strong><small>See your weekly plan</small></span><ArrowRight size={16}/></button></div></section></div>
        <section className="panel content-panel"><div className="panel-title-row"><div><h2>Your subjects</h2><p>Only subjects you have added appear here.</p></div><Button variant="secondary" onClick={()=>setView('Subjects')}><Plus size={16}/> Add subject</Button></div>{subjects.length===0?<EmptyState title="No subjects yet" description="Add your first subject to start organizing your study plan." icon={<BookOpen size={22}/>}/>:<div className="subject-mini-grid">{subjects.slice(0,4).map((s,i)=><div className="subject-mini" key={s.id}><span className={`subject-bullet bullet-${i%4}`}>{s.name.slice(0,1).toUpperCase()}</span><div><strong>{s.name}</strong><small>{s.units} {s.units===1?'unit':'units'} · {s.duration_minutes} min/session</small></div><ArrowRight size={15}/></div>)}</div>}</section>
      </>}
      {view==='Profile'&&<section className="panel page-panel"><div className="page-heading"><span className="icon-tile"><UserRound size={23}/></span><div><h1>Account</h1><p>Authentication details from Firebase.</p></div></div><div className="profile-overview"><div className="profile-avatar">{greetingName.slice(0,1).toUpperCase()}</div><div className="profile-info"><h2>{greetingName}</h2><p>{user?.email}</p><p className="muted">Only Firebase Authentication is connected. Additional profile information is not saved.</p></div></div></section>}
      {view==='Subjects'&&<section className="panel page-panel"><div className="page-heading"><span className="icon-tile"><BookOpen size={23}/></span><div><h1>Subjects</h1><p>Your subject manager design is preserved.</p></div></div><EmptyState title="Subject storage is not connected" description="Firebase Authentication only is enabled. Subjects are not saved." icon={<BookOpen size={22}/}/></section>}
      {view==='Block Time'&&<section className="panel page-panel"><div className="page-heading"><span className="icon-tile"><CalendarClock size={23}/></span><div><h1>Available Time & Block Time</h1><p>Your time planning design is preserved.</p></div></div><EmptyState title="Time storage is not connected" description="Firebase Authentication only is enabled. Available and blocked time slots are not saved." icon={<CalendarClock size={22}/}/></section>}
      {view==='Routine'&&<section className="panel page-panel"><div className="page-heading"><span className="icon-tile"><CalendarDays size={23}/></span><div><h1>Weekly study routine</h1><p>Your weekly schedule design is preserved.</p></div></div><EmptyState title="No study sessions yet" description="Study sessions are not stored while Firebase Authentication-only mode is enabled." icon={<CalendarDays size={22}/}/></section>}
      {view==='Settings'&&<div className="page-stack"><section className="panel page-panel"><div className="page-heading"><span className="icon-tile"><SettingsIcon size={23}/></span><div><h1>Settings</h1><p>Account and study planner preferences.</p></div></div><div className="settings-list"><div className="settings-item"><span className="settings-icon"><ShieldCheck size={19}/></span><div><strong>Account security</strong><p>Signed in as {user.email}. Password recovery is handled by Firebase Authentication.</p></div><button className="subtle-link" onClick={()=>user?.email&&sendPasswordResetEmail(auth,user.email).then(()=>setNotice({type:'success',text:'If this email is registered, a reset email has been sent.'})).catch(e=>setNotice({type:'error',text:firebaseErrorMessage(e)}))}>Send reset email <ArrowRight size={15}/></button></div><div className="settings-item"><span className="settings-icon"><UserRound size={19}/></span><div><strong>Profile settings</strong><p>Update your name, class, school, and username.</p></div><button className="subtle-link" onClick={()=>setView('Profile')}>Manage <ArrowRight size={15}/></button></div><div className="settings-item"><span className="settings-icon"><CalendarDays size={19}/></span><div><strong>Routine and study plan</strong><p>Manage your saved subjects and time rules.</p></div><button className="subtle-link" onClick={()=>setView('Routine')}>Open routine <ArrowRight size={15}/></button></div></div></section><section className="panel page-panel account-warning"><h2>Sign out</h2><p>Sign out from this device. Only your Firebase Authentication account is connected; study data is not stored yet.</p><Button variant="secondary" onClick={signOutUser}><LogOut size={17}/> Sign out</Button></section></div>}
      </>}
      <footer className="workspace-footer"><Brand small/><span>Make room for focused learning.</span><span>© {new Date().getFullYear()} Study Flow</span></footer>
    </main>
    {notice&&<div className={`toast toast-${notice.type}`}><span>{notice.text}</span><button onClick={noticeDismiss} aria-label="Dismiss message"><X size={16}/></button></div>}
  </div>
}

function SlotList({slots,onDelete}:{slots:TimeSlot[];onDelete:(id:string)=>void}) {
  if(!slots.length) return <EmptyState title="Nothing added yet" description="Firebase Authentication only is connected. Time slots are not saved." icon={<Clock3 size={22}/>}/>
  return <div className="slot-list">{slots.map(s=><div className="slot-row" key={s.id}><div className={s.kind==='blocked'?'slot-icon slot-icon-blocked':'slot-icon'}>{s.kind==='blocked'?<X size={17}/>:<Clock3 size={17}/>}</div><div className="slot-info"><strong>{DAYS[s.day_of_week]}</strong><span>{fmtTime(s.start_time)} — {fmtTime(s.end_time)}</span></div><button className="icon-button danger-icon" onClick={()=>onDelete(s.id)} aria-label="Remove time period"><Trash2 size={16}/></button></div>)}</div>
}
