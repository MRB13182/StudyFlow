import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  Activity, AlertCircle, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2,
  ChevronDown, Clock3, Flame, GraduationCap, Home, KeyRound, LoaderCircle, LogOut,
  Menu, Plus, Settings as SettingsIcon, ShieldCheck, Sparkles, Trash2, UserRound,
  X, Zap, Eye, EyeOff, CalendarClock, ListChecks
} from 'lucide-react'
import { supabase } from './lib/supabase'
import type { User } from '@supabase/supabase-js'

type Profile = { id: string; full_name: string; class_name: string; school: string; exam_year: string; username: string; about: string }
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
const errorText = (e: unknown) => e instanceof Error ? e.message : 'Something went wrong. Please try again.'

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

export default function App() {
  const [user,setUser] = useState<User|null>(null)
  const [authReady,setAuthReady] = useState(false)
  const [authMode,setAuthMode] = useState<'login'|'register'|'reset'>('login')
  const [authBusy,setAuthBusy] = useState(false)
  const [showPassword,setShowPassword] = useState(false)
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [confirmPassword,setConfirmPassword] = useState('')
  const [fullName,setFullName] = useState('')
  const [className,setClassName] = useState('')
  const [school,setSchool] = useState('')
  const [username,setUsername] = useState('')
  const [notice,setNotice] = useState<Notice|null>(null)
  const [view,setView] = useState<View>('Home')
  const [mobileNav,setMobileNav] = useState(false)
  const [loadingData,setLoadingData] = useState(false)
  const [profile,setProfile] = useState<Profile|null>(null)
  const [subjects,setSubjects] = useState<Subject[]>([])
  const [slots,setSlots] = useState<TimeSlot[]>([])
  const [sessions,setSessions] = useState<StudySession[]>([])
  const [subjectName,setSubjectName] = useState('')
  const [units,setUnits] = useState('1')
  const [topics,setTopics] = useState('')
  const [duration,setDuration] = useState('60')
  const [slotKind,setSlotKind] = useState<'available'|'blocked'>('available')
  const [slotDay,setSlotDay] = useState('0')
  const [slotStart,setSlotStart] = useState('09:00')
  const [slotEnd,setSlotEnd] = useState('11:00')
  const [editingProfile,setEditingProfile] = useState(false)
  const [planBusy,setPlanBusy] = useState(false)
  const [passwordRecovery,setPasswordRecovery] = useState(() => window.location.hash.includes('type=recovery') || new URLSearchParams(window.location.search).get('flow') === 'password-reset')
  const [newPassword,setNewPassword] = useState('')
  const [confirmNewPassword,setConfirmNewPassword] = useState('')

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return
      if (error) setNotice({type:'error',text:'Could not restore your session. Please sign in again.'})
      setUser((data.session?.user as User | undefined) ?? null)
      setAuthReady(true)
    }).catch(() => {
      if (!alive) return
      setAuthReady(true)
      setNotice({type:'error',text:'Could not connect to Supabase. Check your connection and configuration.'})
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser((session?.user as User | undefined) ?? null)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      setAuthReady(true)
    })
    if (window.location.hash.includes('type=recovery')) setPasswordRecovery(true)
    return () => { alive = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadUserData() {
      if (!user) {
        setProfile(null); setSubjects([]); setSlots([]); setSessions([])
        setLoadingData(false)
        return
      }
      setLoadingData(true)
      try {
        const [pr,sr,tr,rr] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
          supabase.from('subjects').select('*').eq('user_id', user.id).order('created_at', {ascending:true}),
          supabase.from('time_slots').select('*').eq('user_id', user.id).order('day_of_week').order('start_time'),
          supabase.from('study_sessions').select('*').eq('user_id', user.id).order('day_of_week').order('start_time'),
        ])
        if (pr.error) throw pr.error
        if (sr.error) throw sr.error
        if (tr.error) throw tr.error
        if (rr.error) throw rr.error
        if (cancelled) return
        const p=pr.data
        setProfile(p ? {id:p.id,full_name:p.full_name||'',class_name:p.class_name||'',school:p.school||'',exam_year:p.exam_year?String(p.exam_year):'',username:p.username||'',about:p.about||''} : {
          id:user.id,full_name:user.user_metadata?.full_name||'',class_name:'',school:'',exam_year:'',username:user.user_metadata?.username||'',about:''
        })
        setSubjects((sr.data||[]).map((s:any)=>({id:s.id,name:s.name,units:s.units,topics:s.topics,duration_minutes:s.duration_minutes,created_at:s.created_at})))
        setSlots((tr.data||[]).map((s:any)=>({id:s.id,day_of_week:s.day_of_week,start_time:String(s.start_time).slice(0,5),end_time:String(s.end_time).slice(0,5),kind:s.kind,label:s.label})))
        setSessions((rr.data||[]).map((s:any)=>({id:s.id,subject_id:s.subject_id,subject_name:s.subject_name,day_of_week:s.day_of_week,start_time:String(s.start_time).slice(0,5),end_time:String(s.end_time).slice(0,5),status:s.status})))
      } catch {
        if (!cancelled) setNotice({type:'error',text:'Could not load your saved Study Flow data. Refresh and try again.'})
      } finally { if (!cancelled) setLoadingData(false) }
    }
    void loadUserData()
    return () => { cancelled = true }
  }, [user?.id])

  const greetingName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student'
  const completed = sessions.filter(s=>s.status==='completed').length
  const studyMinutes = sessions.filter(s=>s.status==='completed').reduce((sum,s)=>sum+Math.max(0,mins(s.end_time)-mins(s.start_time)),0)
  const today = (new Date().getDay()+6)%7
  const todaySessions = sessions.filter(s=>s.day_of_week===today).sort((a,b)=>a.start_time.localeCompare(b.start_time))
  const noticeDismiss = () => setNotice(null)

  function authErrorMessage(error: unknown, mode: 'login'|'register'|'reset') {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as {code?: unknown}).code || '') : ''
    const message = errorText(error).toLowerCase()
    if (mode === 'register' && (code === 'user_already_exists' || message.includes('already registered'))) return 'An account with this email already exists. Please sign in.'
    if (mode === 'login' && (code === 'invalid_credentials' || message.includes('invalid login credentials'))) return 'Email or password is incorrect.'
    if (mode === 'reset' && (code === 'validation_failed' || code === 'email_address_invalid')) return 'Enter a valid email address.'
    if (code === 'weak_password' || message.includes('password should be')) return 'Use a stronger password with at least 8 characters.'
    if (code === 'over_request_rate_limit' || code === 'too_many_requests') return 'Too many attempts. Please wait and try again.'
    if (message.includes('fetch') || message.includes('network')) return 'Network error. Check your connection and try again.'
    return 'Something went wrong. Please try again.'
  }

  async function handleAuth(e: FormEvent) {
    e.preventDefault()
    if (authMode==='register' && password!==confirmPassword) { setNotice({type:'error',text:'Passwords do not match.'}); return }
    if (authMode==='register' && username.trim() && (username.trim().length<3 || username.trim().length>32)) { setNotice({type:'error',text:'Username must be 3–32 characters, or leave it blank.'}); return }
    if (authMode==='register' && password.length<8) { setNotice({type:'error',text:'Use a password with at least 8 characters.'}); return }
    setAuthBusy(true); setNotice(null)
    try {
      if (authMode==='register') {
        const {data,error} = await supabase.auth.signUp({
          email:email.trim(),password,
          options:{data:{full_name:fullName.trim(),class_name:className.trim(),school:school.trim(),username:username.trim()||null},emailRedirectTo:window.location.origin}
        })
        if(error) throw error
        setNotice({type:'success',text:data.session?'Your account was created. Welcome to Study Flow!':'Account created. Check your email to confirm your address before logging in.'})
      } else if (authMode==='login') {
        const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password})
        if(error) throw error
        setNotice({type:'success',text:'You are signed in.'})
      } else {
        const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin})
        if(error) throw error
        setNotice({type:'success',text:'If the address belongs to an account, a password reset email will arrive shortly.'})
      }
    } catch(error) { setNotice({type:'error',text:authErrorMessage(error,authMode)}) }
    finally { setAuthBusy(false) }
  }

  async function signOut() {
    try {
      const {error}=await supabase.auth.signOut()
      if(error) throw error
      setPasswordRecovery(false);setAuthMode('login');setView('Home')
      setNotice({type:'success',text:'You have been signed out.'})
    } catch(error) { setNotice({type:'error',text:errorText(error)}) }
  }

  async function updatePassword(e:FormEvent) {
    e.preventDefault()
    if(!passwordRecovery){setNotice({type:'error',text:'Open the password reset link sent to your email first.'});return}
    if(newPassword.length<8){setNotice({type:'error',text:'Use a password with at least 8 characters.'});return}
    if(newPassword!==confirmNewPassword){setNotice({type:'error',text:'The passwords do not match.'});return}
    setAuthBusy(true);setNotice(null)
    try {
      const {error}=await supabase.auth.updateUser({password:newPassword})
      if(error)throw error
      window.history.replaceState({},document.title,window.location.pathname)
      setPasswordRecovery(false);setNewPassword('');setConfirmNewPassword('');setAuthMode('login')
      await supabase.auth.signOut()
      setNotice({type:'success',text:'Your password has been updated. Please sign in again.'})
    } catch(error) { setNotice({type:'error',text:authErrorMessage(error,'reset')}) }
    finally { setAuthBusy(false) }
  }

  async function saveProfile(e:FormEvent) {
    e.preventDefault()
    if(!user)return
    setLoadingData(true)
    try {
      const {error}=await supabase.from('profiles').update({full_name:fullName.trim(),class_name:className.trim(),school:school.trim(),username:username.trim()||null}).eq('id',user.id)
      if(error)throw error
      const {data,error:readError}=await supabase.from('profiles').select('*').eq('id',user.id).single()
      if(readError)throw readError
      setProfile({id:data.id,full_name:data.full_name,class_name:data.class_name,school:data.school,exam_year:data.exam_year?String(data.exam_year):'',username:data.username||'',about:data.about||''})
      setEditingProfile(false);setNotice({type:'success',text:'Profile saved.'})
    } catch {setNotice({type:'error',text:'Could not save the profile. The username may already be taken.'})}
    finally {setLoadingData(false)}
  }

  async function addSubject(e:FormEvent) {
    e.preventDefault()
    const name=subjectName.trim()
    if(!name){setNotice({type:'error',text:'Enter a subject name.'});return}
    if(!user)return
    const {data,error}=await supabase.from('subjects').insert({user_id:user.id,name,units:Math.min(500,Math.max(1,Number(units)||1)),topics,duration_minutes:Math.min(480,Math.max(15,Number(duration)||60))}).select('*').single()
    if(error){setNotice({type:'error',text:error.code==='23505'?'A subject with this name already exists.':'Could not save this subject. Please try again.'});return}
    setSubjects(prev=>[...prev,data as Subject]);setSubjectName('');setUnits('1');setTopics('');setDuration('60')
    setNotice({type:'success',text:'Subject saved to your account.'})
  }

  async function deleteSubject(id:string) {
    if(!user)return
    const {error}=await supabase.from('subjects').delete().eq('id',id).eq('user_id',user.id)
    if(error){setNotice({type:'error',text:'Could not delete this subject.'});return}
    setSubjects(prev=>prev.filter(s=>s.id!==id));setSessions(prev=>prev.map(s=>s.subject_id===id?{...s,subject_id:null}:s))
    setNotice({type:'success',text:'Subject deleted.'})
  }

  async function addSlot(e:FormEvent) {
    e.preventDefault()
    if(mins(slotEnd)<=mins(slotStart)){setNotice({type:'error',text:'End time must be later than start time.'});return}
    const overlap=slots.some(s=>s.day_of_week===Number(slotDay)&&mins(slotStart)<mins(s.end_time)&&mins(slotEnd)>mins(s.start_time)&&s.kind===slotKind)
    if(overlap){setNotice({type:'error',text:`This time overlaps an existing ${slotKind} period for that day.`});return}
    if(!user)return
    const {data,error}=await supabase.from('time_slots').insert({user_id:user.id,day_of_week:Number(slotDay),start_time:slotStart,end_time:slotEnd,kind:slotKind}).select('*').single()
    if(error){setNotice({type:'error',text:'Could not save this time period.'});return}
    const item:TimeSlot={id:data.id,day_of_week:data.day_of_week,start_time:String(data.start_time).slice(0,5),end_time:String(data.end_time).slice(0,5),kind:data.kind}
    setSlots(prev=>[...prev,item].sort((a,b)=>a.day_of_week-b.day_of_week||a.start_time.localeCompare(b.start_time)))
    setNotice({type:'success',text:`${slotKind==='blocked'?'Blocked time':'Available time'} saved.`})
  }

  async function deleteSlot(id:string) {
    if(!user)return
    const {error}=await supabase.from('time_slots').delete().eq('id',id).eq('user_id',user.id)
    if(error){setNotice({type:'error',text:'Could not delete this time period.'});return}
    setSlots(prev=>prev.filter(s=>s.id!==id));setNotice({type:'success',text:'Time period removed.'})
  }

  async function toggleSession(item:StudySession) {
    if(!user)return
    const status=item.status==='completed'?'planned':'completed'
    const {error}=await supabase.from('study_sessions').update({status}).eq('id',item.id).eq('user_id',user.id)
    if(error){setNotice({type:'error',text:'Could not update this session.'});return}
    setSessions(prev=>prev.map(s=>s.id===item.id?{...s,status}:s))
  }

  async function generatePlan() {
    if(!subjects.length){setNotice({type:'info',text:'Add at least one subject before creating a study plan.'});setView('Subjects');return}
    const available=slots.filter(s=>s.kind==='available')
    if(!available.length){setNotice({type:'info',text:'Add the times when you can study before generating a routine.'});setView('Block Time');return}
    setPlanBusy(true);setNotice(null)
    const blocks=slots.filter(s=>s.kind==='blocked'),planned:StudySession[]=[]
    const sortedSubjects=[...subjects].sort((a,b)=>b.duration_minutes-a.duration_minutes)
    for(const day of DAYS.map((_,i)=>i)) for(const win of available.filter(s=>s.day_of_week===day).sort((a,b)=>a.start_time.localeCompare(b.start_time))){
      let cursor=mins(win.start_time);const limit=mins(win.end_time)
      while(cursor+15<=limit&&planned.filter(p=>p.day_of_week===day).length<5){
        const blocked=blocks.filter(b=>b.day_of_week===day&&cursor<mins(b.end_time)&&cursor+Math.min(60,limit-cursor)>mins(b.start_time)).sort((a,b)=>mins(a.start_time)-mins(b.start_time))[0]
        if(blocked){cursor=Math.max(cursor,mins(blocked.end_time));continue}
        const chosen=sortedSubjects[(planned.length+day)%sortedSubjects.length],length=Math.min(60,chosen.duration_minutes,limit-cursor)
        if(length<15)break
        if(planned.some(p=>p.day_of_week===day&&cursor<mins(p.end_time)&&cursor+length>mins(p.start_time))){cursor+=15;continue}
        planned.push({id:crypto.randomUUID(),subject_id:chosen.id,subject_name:chosen.name,day_of_week:day,start_time:toHHMM(cursor),end_time:toHHMM(cursor+length),status:'planned'})
        cursor+=length+15
      }
    }
    if(!planned.length){setPlanBusy(false);setNotice({type:'error',text:'No suitable study sessions fit your available time and blocked periods. Adjust your time slots and try again.'});return}
    if(!user){setPlanBusy(false);return}
    const routinePayload=planned.map(p=>({subject_id:p.subject_id,subject_name:p.subject_name,day_of_week:p.day_of_week,start_time:p.start_time,end_time:p.end_time}))
    const {error:saveError}=await supabase.rpc('replace_planned_study_sessions',{p_sessions:routinePayload})
    if(saveError){setPlanBusy(false);setNotice({type:'error',text:'Could not save the generated routine. Your previous routine has been preserved.'});return}
    const {data,error}=await supabase.from('study_sessions').select('*').eq('user_id',user.id).order('day_of_week').order('start_time')
    if(error){setPlanBusy(false);setNotice({type:'error',text:'Routine saved, but it could not be refreshed. Reload the page to see it.'});return}
    setSessions((data||[]).map((s:any)=>({id:s.id,subject_id:s.subject_id,subject_name:s.subject_name,day_of_week:s.day_of_week,start_time:String(s.start_time).slice(0,5),end_time:String(s.end_time).slice(0,5),status:s.status})))
    setPlanBusy(false);setNotice({type:'success',text:`Saved ${planned.length} study sessions to your account.`});setView('Routine')
  }

  const navItems:{label:View;icon:ReactNode}[]=[
    {label:'Home',icon:<Home size={18}/>},{label:'Profile',icon:<UserRound size={18}/>},
    {label:'Subjects',icon:<BookOpen size={18}/>},{label:'Block Time',icon:<CalendarClock size={18}/>},
    {label:'Routine',icon:<CalendarDays size={18}/>},{label:'Settings',icon:<SettingsIcon size={18}/>}
  ]
  const slotsByDay=useMemo(()=>DAYS.map((_,day)=>slots.filter(s=>s.day_of_week===day)),[slots])
  const sessionsByDay=useMemo(()=>DAYS.map((_,day)=>sessions.filter(s=>s.day_of_week===day).sort((a,b)=>a.start_time.localeCompare(b.start_time))),[sessions])

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
          {authMode==='register' && <><Field label="Full name" value={fullName} onChange={setFullName} placeholder="Your name" required/><div className="form-row"><Field label="Class" value={className} onChange={setClassName} placeholder="e.g. HSC 1st Year"/><Field label="School / College" value={school} onChange={setSchool} placeholder="Institution name"/></div><Field label="Username" value={username} onChange={setUsername} placeholder="Choose a username"/></>}
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

  if (passwordRecovery && user) return <div className="recovery-shell"><form className="panel recovery-card" onSubmit={updatePassword}><Brand/><span className="icon-tile recovery-icon"><KeyRound size={23}/></span><h1>Choose a new password</h1><p>Create a new password for your Study Flow account.</p><Field label="New password" value={newPassword} onChange={setNewPassword} type="password" placeholder="At least 8 characters" required/><Field label="Confirm new password" value={confirmNewPassword} onChange={setConfirmNewPassword} type="password" placeholder="Enter it again" required/><Button type="submit" disabled={authBusy}>{authBusy?<><LoaderCircle size={16} className="spin"/> Updating…</>:'Update password'} {!authBusy&&<ArrowRight size={16}/>}</Button>{notice&&<div className={`notice notice-${notice.type}`}>{notice.text}</div>}</form></div>

  return <div className="dashboard-shell">
    <aside className={`sidebar ${mobileNav?'sidebar-open':''}`}><div className="sidebar-brand"><Brand small/><button className="mobile-close" onClick={()=>setMobileNav(false)}><X size={18}/></button></div><div className="sidebar-label">WORKSPACE</div><nav>{navItems.map(item=><button key={item.label} className={view===item.label?'nav-item active':'nav-item'} onClick={()=>{setView(item.label);setMobileNav(false)}}>{item.icon}<span>{item.label}</span>{view===item.label&&<span className="nav-dot"/>}</button>)}</nav><div className="sidebar-bottom"><div className="sidebar-motivation"><div className="motivation-icon"><Sparkles size={22}/></div><strong>Keep going!</strong><span>Small steps build big progress.</span></div><button className="nav-item signout" onClick={signOut}><LogOut size={18}/><span>Sign out</span></button></div></aside>
    {mobileNav&&<button className="mobile-overlay" aria-label="Close menu" onClick={()=>setMobileNav(false)}/>}
    <main className="workspace"><header className="dashboard-topbar"><button className="mobile-menu" onClick={()=>setMobileNav(true)}><Menu size={21}/></button><div><span className="topbar-kicker">YOUR PERSONAL PLANNER</span><strong>{view==='Home'?'Your study overview':view}</strong></div><div className="topbar-right"><span className="today-chip"><CalendarDays size={15}/>{new Date().toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}</span><div className="user-avatar">{greetingName.slice(0,1).toUpperCase()}</div></div></header>
      {notice&&<div className={`notice notice-${notice.type}`}><span>{notice.type==='error'?<AlertCircle size={18}/>:notice.type==='success'?<CheckCircle2 size={18}/>:<Activity size={18}/>} {notice.text}</span><button onClick={noticeDismiss} aria-label="Dismiss"><X size={17}/></button></div>}
      {loadingData?<div className="loading-panel"><LoaderCircle className="spin" size={25}/> Loading your saved study data…</div>:<>
      {view==='Home'&&<><section className="welcome-row"><div><span className="eyebrow"><Sparkles size={15}/> YOUR STUDY SPACE</span><h1>Good {new Date().getHours()<12?'morning':new Date().getHours()<18?'afternoon':'evening'}, {greetingName.split(' ')[0]}.</h1><p>One focused session at a time. You’re building something good.</p></div><Button onClick={generatePlan} disabled={planBusy}>{planBusy?<LoaderCircle size={17} className="spin"/>:<Sparkles size={17}/>} Generate routine <ArrowRight size={16}/></Button></section>
        <section className="stats-grid"><div className="stat-card"><span className="stat-icon stat-violet"><BookOpen size={19}/></span><div><small>Total subjects</small><strong>{subjects.length}</strong><span className="stat-sub">{subjects.length===1?'subject saved':'subjects saved'}</span></div></div><div className="stat-card"><span className="stat-icon stat-blue"><Clock3 size={19}/></span><div><small>Completed study time</small><strong>{Math.floor(studyMinutes/60)}h {studyMinutes%60}m</strong><span className="stat-sub">Based on completed sessions</span></div></div><div className="stat-card"><span className="stat-icon stat-mint"><Check size={19}/></span><div><small>Sessions completed</small><strong>{completed}</strong><span className="stat-sub">Keep your momentum</span></div></div><div className="stat-card"><span className="stat-icon stat-peach"><Flame size={19}/></span><div><small>Planned this week</small><strong>{sessions.filter(s=>s.status==='planned').length}</strong><span className="stat-sub">Saved sessions</span></div></div></section>
        <div className="content-grid"><section className="panel content-panel"><div className="panel-title-row"><div><h2>Today's study flow</h2><p>Your scheduled sessions for {DAYS[today]}.</p></div><button className="subtle-link" onClick={()=>setView('Routine')}>View routine <ArrowRight size={15}/></button></div>{todaySessions.length===0?<EmptyState title="Your day is open" description="Create a routine to see your study sessions here." icon={<CalendarDays size={22}/>}/>:<div className="today-list">{todaySessions.map((s,i)=><div className="today-session" key={s.id}><div className={`timeline-marker marker-${i%4}`}/><div className="session-time">{fmtTime(s.start_time)}<small>{fmtTime(s.end_time)}</small></div><div className="session-subject"><strong>{s.subject_name}</strong><small>{s.status==='completed'?'Completed':'Planned session'}</small></div><button title={s.status==='completed'?'Mark as planned':'Mark as completed'} className={s.status==='completed'?'complete-toggle is-complete':'complete-toggle'} onClick={()=>toggleSession(s)}>{s.status==='completed'?<Check size={17}/>:<CheckCircle2 size={17}/>}</button></div>)}</div>}</section>
        <section className="panel content-panel"><div className="panel-title-row"><div><h2>Quick actions</h2><p>Pick up where you left off.</p></div><span className="soft-badge">Workspace</span></div><div className="quick-actions"><button onClick={()=>setView('Subjects')}><span className="quick-icon q-violet"><BookOpen size={18}/></span><span><strong>Add a subject</strong><small>Organize a class or topic</small></span><ArrowRight size={16}/></button><button onClick={()=>setView('Block Time')}><span className="quick-icon q-blue"><Clock3 size={18}/></span><span><strong>Set your time</strong><small>Add available or blocked hours</small></span><ArrowRight size={16}/></button><button onClick={()=>setView('Routine')}><span className="quick-icon q-mint"><CalendarDays size={18}/></span><span><strong>Review routine</strong><small>See your weekly plan</small></span><ArrowRight size={16}/></button></div></section></div>
        <section className="panel content-panel"><div className="panel-title-row"><div><h2>Your subjects</h2><p>Only subjects you have added appear here.</p></div><Button variant="secondary" onClick={()=>setView('Subjects')}><Plus size={16}/> Add subject</Button></div>{subjects.length===0?<EmptyState title="No subjects yet" description="Add your first subject to start organizing your study plan." icon={<BookOpen size={22}/>}/>:<div className="subject-mini-grid">{subjects.slice(0,4).map((s,i)=><div className="subject-mini" key={s.id}><span className={`subject-bullet bullet-${i%4}`}>{s.name.slice(0,1).toUpperCase()}</span><div><strong>{s.name}</strong><small>{s.units} {s.units===1?'unit':'units'} · {s.duration_minutes} min/session</small></div><ArrowRight size={15}/></div>)}</div>}</section>
      </>}
      {view==='Profile'&&<section className="panel page-panel"><div className="page-heading"><span className="icon-tile"><UserRound size={23}/></span><div><h1>Your profile</h1><p>Manage the information connected to your account.</p></div><div className="heading-spacer"/><Button variant="secondary" onClick={()=>{setFullName(profile?.full_name||'');setClassName(profile?.class_name||'');setSchool(profile?.school||'');setUsername(profile?.username||'');setEditingProfile(!editingProfile)}}>{editingProfile?'Cancel':'Edit profile'}</Button></div>{!editingProfile?<div className="profile-overview"><div className="profile-avatar">{greetingName.slice(0,1).toUpperCase()}</div><div className="profile-info"><h2>{profile?.full_name||greetingName}</h2><p>{user?.email}</p><div className="profile-tags"><span>{profile?.class_name||'Class not set'}</span><span>{profile?.school||'School / college not set'}</span></div><p className="muted">{profile?.about||'Add information about yourself to personalize your study space.'}</p></div></div>:<form className="form-grid" onSubmit={saveProfile}><Field label="Full name" value={fullName} onChange={setFullName} required/><Field label="Class" value={className} onChange={setClassName}/><Field label="School / College" value={school} onChange={setSchool}/><Field label="Username" value={username} onChange={setUsername}/><div className="form-actions"><Button type="submit">Save changes</Button></div></form>}</section>}
      {view==='Subjects'&&<div className="page-stack"><section className="panel page-panel"><div className="page-heading"><span className="icon-tile"><BookOpen size={23}/></span><div><h1>Subject library</h1><p>Keep your subjects and topics ready for planning.</p></div></div><form className="subject-form" onSubmit={addSubject}><Field label="Subject name" value={subjectName} onChange={setSubjectName} placeholder="e.g. Mathematics" required/><Field label="Units" value={units} onChange={setUnits} type="number" required/><Field label="Preferred session (minutes)" value={duration} onChange={setDuration} type="number" required/><label className="field field-wide"><span>Chapters / topics</span><textarea value={topics} onChange={e=>setTopics(e.target.value)} placeholder="Add chapter names or topics…" rows={3}/></label><div className="form-actions"><Button type="submit"><Plus size={17}/> Save subject</Button></div></form></section><section className="panel page-panel"><div className="panel-title-row"><div><h2>Your subjects ({subjects.length})</h2><p>Saved securely to your account.</p></div></div>{subjects.length===0?<EmptyState title="Your subject list is empty" description="Add a subject above. No sample subjects are preloaded."/>:<div className="saved-subjects">{subjects.map((s,i)=><div className="saved-subject" key={s.id}><span className={`subject-bullet bullet-${i%4}`}>{s.name.slice(0,1).toUpperCase()}</span><div className="saved-subject-main"><strong>{s.name}</strong><span>{s.units} {s.units===1?'unit':'units'} · {s.duration_minutes} minutes per session</span>{s.topics&&<p>{s.topics}</p>}</div><button className="icon-button danger-icon" aria-label={`Delete ${s.name}`} onClick={()=>deleteSubject(s.id)}><Trash2 size={17}/></button></div>)}</div>}</section></div>}
      {view==='Block Time'&&<div className="page-stack"><section className="panel page-panel"><div className="page-heading"><span className="icon-tile"><CalendarClock size={23}/></span><div><h1>Time availability</h1><p>Tell Study Flow when you can — and cannot — study.</p></div></div><form className="time-form" onSubmit={addSlot}><label className="field"><span>Time type</span><select value={slotKind} onChange={e=>setSlotKind(e.target.value as 'available'|'blocked')}><option value="available">Available time — can study</option><option value="blocked">Block time — can't study</option></select></label><label className="field"><span>Day of the week</span><select value={slotDay} onChange={e=>setSlotDay(e.target.value)}>{DAYS.map((d,i)=><option key={d} value={i}>{d}</option>)}</select></label><Field label="Start time" value={slotStart} onChange={setSlotStart} type="time" required/><Field label="End time" value={slotEnd} onChange={setSlotEnd} type="time" required/><div className="form-actions"><Button type="submit"><Plus size={17}/> Add {slotKind==='blocked'?'blocked time':'available time'}</Button></div></form></section><div className="time-cards"><section className="panel page-panel"><div className="panel-title-row"><div><h2><span className="status-dot dot-available"/> Available time</h2><p>Periods when you can study.</p></div><span className="count-pill">{slots.filter(s=>s.kind==='available').length}</span></div><SlotList slots={slots.filter(s=>s.kind==='available')} onDelete={deleteSlot}/></section><section className="panel page-panel blocked-panel"><div className="panel-title-row"><div><h2><span className="status-dot dot-blocked"/> Block time</h2><p>Protected periods when you cannot study.</p></div><span className="count-pill">{slots.filter(s=>s.kind==='blocked').length}</span></div><SlotList slots={slots.filter(s=>s.kind==='blocked')} onDelete={deleteSlot}/></section></div></div>}
      {view==='Routine'&&<section className="panel page-panel"><div className="page-heading"><span className="icon-tile"><CalendarDays size={23}/></span><div><h1>Weekly study routine</h1><p>Built from your saved subjects and availability.</p></div><div className="heading-spacer"/><Button onClick={generatePlan} disabled={planBusy}>{planBusy?<LoaderCircle size={16} className="spin"/>:<Sparkles size={16}/>} Generate again</Button></div>{sessions.length===0?<EmptyState title="Your routine is ready to be created" description="Add subjects and available time, then generate your first study plan." icon={<CalendarDays size={22}/>}/>:<div className="calendar-wrap"><div className="week-grid"><div className="week-label">TIME</div>{DAY_SHORT.map((d,i)=><div className={i===today?'week-day today-day':'week-day'} key={d}>{d}</div>)}{['08:00','10:00','12:00','14:00','16:00','18:00','20:00'].map((t,ri)=><><div className="time-label" key={'t'+t}>{fmtTime(t)}</div>{DAY_SHORT.map((d,di)=>{const matches=sessionsByDay[di].filter(s=>mins(s.start_time)>=mins(t)&&mins(s.start_time)<mins(t)+120);return <div className="calendar-cell" key={d+t}>{matches.map(s=><button key={s.id} className={`calendar-session ${s.status==='completed'?'session-done':''} color-${subjects.findIndex(sb=>sb.id===s.subject_id)%4}`} title={`${s.subject_name}, ${fmtTime(s.start_time)}–${fmtTime(s.end_time)}`} onClick={()=>toggleSession(s)}><strong>{s.subject_name}</strong><small>{fmtTime(s.start_time)}–{fmtTime(s.end_time)}</small><span>{s.status==='completed'?'Completed':'Mark complete'}</span></button>)}</div>})}</>)}</div><p className="calendar-hint"><CheckCircle2 size={15}/> Click a session to toggle its completion status.</p></div>}</section>}
      {view==='Settings'&&<div className="page-stack"><section className="panel page-panel"><div className="page-heading"><span className="icon-tile"><SettingsIcon size={23}/></span><div><h1>Settings</h1><p>Account and study planner preferences.</p></div></div><div className="settings-list"><div className="settings-item"><span className="settings-icon"><ShieldCheck size={19}/></span><div><strong>Account security</strong><p>Signed in as {user.email}. Password recovery is handled by Supabase Auth.</p></div><button className="subtle-link" onClick={()=>{setEmail(user.email||'');setAuthMode('reset');void supabase.auth.resetPasswordForEmail(user.email||'',{redirectTo:window.location.origin}).then(({error})=>setNotice({type:error?'error':'success',text:error?'Could not send a reset link. Please try again.':'If your account is eligible, a reset email will arrive shortly.'}))}}>Send reset email <ArrowRight size={15}/></button></div><div className="settings-item"><span className="settings-icon"><UserRound size={19}/></span><div><strong>Profile settings</strong><p>Update your name, class, school, and username.</p></div><button className="subtle-link" onClick={()=>setView('Profile')}>Manage <ArrowRight size={15}/></button></div><div className="settings-item"><span className="settings-icon"><CalendarDays size={19}/></span><div><strong>Routine and study plan</strong><p>Manage your saved subjects and time rules.</p></div><button className="subtle-link" onClick={()=>setView('Routine')}>Open routine <ArrowRight size={15}/></button></div></div></section><section className="panel page-panel account-warning"><h2>Sign out</h2><p>Sign out from this device. Your saved subjects, profile, time slots, and sessions are stored in your account.</p><Button variant="secondary" onClick={signOut}><LogOut size={17}/> Sign out</Button></section></div>}
      </>}
      <footer className="workspace-footer"><Brand small/><span>Make room for focused learning.</span><span>© {new Date().getFullYear()} Study Flow</span></footer>
    </main>
    {notice&&<div className={`toast toast-${notice.type}`}><span>{notice.text}</span><button onClick={noticeDismiss} aria-label="Dismiss message"><X size={16}/></button></div>}
  </div>
}

function SlotList({slots,onDelete}:{slots:TimeSlot[];onDelete:(id:string)=>void}) {
  if(!slots.length) return <EmptyState title="Nothing added yet" description="Use the form above to add a time period." icon={<Clock3 size={22}/>}/>
  return <div className="slot-list">{slots.sort((a,b)=>a.day_of_week-b.day_of_week||a.start_time.localeCompare(b.start_time)).map(s=><div className="slot-row" key={s.id}><div className={s.kind==='blocked'?'slot-icon slot-icon-blocked':'slot-icon'}>{s.kind==='blocked'?<X size={17}/>:<Clock3 size={17}/>}</div><div className="slot-info"><strong>{DAYS[s.day_of_week]}</strong><span>{fmtTime(s.start_time)} — {fmtTime(s.end_time)}</span></div><button className="icon-button danger-icon" onClick={()=>onDelete(s.id)} aria-label="Remove time period"><Trash2 size={16}/></button></div>)}</div>
}
