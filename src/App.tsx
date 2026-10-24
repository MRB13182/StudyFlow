import { Fragment, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  Activity, AlertCircle, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2,
  ChevronDown, Clock3, Flame, GraduationCap, Home, KeyRound, LoaderCircle, LogOut,
  Pencil, Plus, Save, Settings as SettingsIcon, ShieldCheck, Sparkles, Trash2, UserRound,
  X, Zap, Eye, EyeOff, CalendarClock, ListChecks
} from 'lucide-react'
import { getAuthRedirectUrl, supabase } from './lib/supabase'
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

type SlotGroup = {
  key: string
  ids: string[]
  days: number[]
  start_time: string
  end_time: string
  kind: 'available' | 'blocked'
  label: string
}

const SELECT_DAYS: { day: number; label: string; short: string }[] = [
  { day: 5, label: 'Saturday', short: 'Sat' },
  { day: 6, label: 'Sunday', short: 'Sun' },
  { day: 0, label: 'Monday', short: 'Mon' },
  { day: 1, label: 'Tuesday', short: 'Tue' },
  { day: 2, label: 'Wednesday', short: 'Wed' },
  { day: 3, label: 'Thursday', short: 'Thu' },
  { day: 4, label: 'Friday', short: 'Fri' }
]

function formatDaysList(days: number[]): string {
  if (days.length === 0) return 'No days'
  if (days.length === 7) return 'Every day'
  if (days.length === 5 && [0, 1, 2, 3, 4].every(d => days.includes(d))) return 'Weekdays (Mon–Fri)'
  if (days.length === 2 && days.includes(5) && days.includes(6)) return 'Weekends (Sat, Sun)'
  const order = [5, 6, 0, 1, 2, 3, 4]
  const sorted = [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b))
  return sorted.map(d => DAY_SHORT[d]).join(', ')
}

function groupSlots(slotList: TimeSlot[]): SlotGroup[] {
  const map = new Map<string, SlotGroup>()
  for (const s of slotList) {
    const key = `${s.kind}|${s.start_time}|${s.end_time}|${s.label || ''}`
    const existing = map.get(key)
    if (existing) {
      if (!existing.days.includes(s.day_of_week)) {
        existing.days.push(s.day_of_week)
        const order = [5, 6, 0, 1, 2, 3, 4]
        existing.days.sort((a, b) => order.indexOf(a) - order.indexOf(b))
      }
      existing.ids.push(s.id)
    } else {
      map.set(key, {
        key,
        ids: [s.id],
        days: [s.day_of_week],
        start_time: s.start_time,
        end_time: s.end_time,
        kind: s.kind,
        label: s.label || ''
      })
    }
  }
  return Array.from(map.values())
}

function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? 'brand-small' : ''}`}>
      <img
        src="/logo.png"
        alt="StudyFlow Logo"
        className="brand-logo-img"
        width={small ? 24 : 32}
        height={small ? 24 : 32}
        style={{ objectFit: 'contain', flexShrink: 0 }}
      />
      <span>Study<span className="brand-purple">Flow</span><small>AI-Powered Student Planner</small></span>
    </div>
  )
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
  const [authMode,setAuthMode] = useState<'login'|'register'|'reset'|null>(null)
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
  const [loadingData,setLoadingData] = useState(false)
  const [profile,setProfile] = useState<Profile|null>(null)
  const [subjects,setSubjects] = useState<Subject[]>([])
  const [slots,setSlots] = useState<TimeSlot[]>([])
  const [sessions,setSessions] = useState<StudySession[]>([])
  const [subjectName,setSubjectName] = useState('')
  const [units,setUnits] = useState('1')
  const [topics,setTopics] = useState('')
  const [duration,setDuration] = useState('60')
  const [subjectBusy,setSubjectBusy] = useState(false)
  const [editingSubject,setEditingSubject] = useState<Subject|null>(null)
  const [editSubjectName,setEditSubjectName] = useState('')
  const [editUnits,setEditUnits] = useState('1')
  const [editTopics,setEditTopics] = useState('')
  const [editDuration,setEditDuration] = useState('60')

  const [slotKind,setSlotKind] = useState<'available'|'blocked'>('available')
  const [selectedDays,setSelectedDays] = useState<number[]>([5, 6])
  const [slotStart,setSlotStart] = useState('09:00')
  const [slotEnd,setSlotEnd] = useState('11:00')
  const [slotLabel,setSlotLabel] = useState('')
  const [editingSlotGroup,setEditingSlotGroup] = useState<SlotGroup|null>(null)
  const [editingProfile,setEditingProfile] = useState(false)
  const [planBusy,setPlanBusy] = useState(false)
  const [passwordRecovery,setPasswordRecovery] = useState(() => window.location.hash.includes('type=recovery') || new URLSearchParams(window.location.search).get('flow') === 'password-reset')
  const [newPassword,setNewPassword] = useState('')
  const [confirmNewPassword,setConfirmNewPassword] = useState('')

  useEffect(() => {
    // Surface Auth callback errors so expired links and redirect misconfiguration are diagnosable.
    const callbackQuery = new URLSearchParams(window.location.search)
    const callbackHash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const callbackError = callbackQuery.get('error_description') || callbackHash.get('error_description')
    const callbackCode = callbackQuery.get('error_code') || callbackHash.get('error_code')
    if (callbackError || callbackCode) {
      const readableError = (callbackError || callbackCode || 'Authentication callback failed').replace(/\+/g, ' ')
      setNotice({ type: 'error', text: `Email confirmation/sign-in link failed: ${readableError}. Request a fresh link and check the Supabase Auth URL Configuration.` })
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (callbackQuery.has('code') || callbackHash.has('access_token')) {
      setNotice({ type: 'info', text: 'Authentication link received. Verifying your session…' })
    }
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
    if (window.location.hash.includes('type=recovery') || callbackQuery.get('flow') === 'password-reset') setPasswordRecovery(true)
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
    const message = errorText(error)
    const normalized = message.toLowerCase()
    if (mode === 'register' && (code === 'user_already_exists' || normalized.includes('already registered'))) return 'An account with this email already exists. Please sign in.'
    if (mode === 'login' && (code === 'invalid_credentials' || normalized.includes('invalid login credentials'))) return 'Email or password is incorrect.'
    if (mode === 'reset' && (code === 'validation_failed' || code === 'email_address_invalid')) return 'Enter a valid email address.'
    if (code === 'weak_password' || normalized.includes('password should be')) return 'Use a stronger password with at least 8 characters.'
    if (code === 'over_request_rate_limit' || code === 'too_many_requests') return 'Too many attempts. Please wait and try again.'
    if (normalized.includes('fetch') || normalized.includes('network') || normalized.includes('failed to fetch') || normalized.includes('timeout')) {
      return 'Cannot reach Supabase. Check your internet connection, API URL/key, and whether your network or browser extensions block supabase.co.'
    }
    // Preserve the provider message so configuration and database-trigger failures are diagnosable.
    // Auth responses do not include submitted passwords; never log form fields or tokens here.
    const providerMessage = message.trim()
    return providerMessage ? `Authentication failed (${code || 'unknown error'}): ${providerMessage}` : 'Authentication failed. Please try again.'
  }

  async function handleAuth(e: FormEvent) {
    e.preventDefault()
    if (!authMode) return
    if (!email.trim()) { setNotice({type:'error',text:'Please enter your email address.'}); return }
    if (authMode==='register') {
      if (!fullName.trim()) { setNotice({type:'error',text:'Please enter your full name.'}); return }
      if (password!==confirmPassword) { setNotice({type:'error',text:'Passwords do not match.'}); return }
      if (username.trim() && !/^[a-zA-Z0-9_.-]{3,32}$/.test(username.trim())) { setNotice({type:'error',text:'Username must be 3–32 characters and use only letters, numbers, dots, underscores or hyphens.'}); return }
      if (password.length<8) { setNotice({type:'error',text:'Use a password with at least 8 characters.'}); return }
    }
    setAuthBusy(true); setNotice(null)
    try {
      if (authMode==='register') {
        const {data,error} = await supabase.auth.signUp({
          email:email.trim(),password,
          options:{data:{full_name:fullName.trim(),class_name:className.trim(),school:school.trim(),username:username.trim()||null},emailRedirectTo:getAuthRedirectUrl()}
        })
        if(error) throw error
        setNotice({type:'success',text:data.session?'Your account was created. Welcome to Study Flow!':'Account created. Check your email to confirm your address before logging in.'})
      } else if (authMode==='login') {
        const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password})
        if(error) throw error
        setNotice({type:'success',text:'You are signed in.'})
      } else {
        const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:getAuthRedirectUrl()})
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
      setPasswordRecovery(false);setAuthMode(null);setView('Home')
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
      const profilePayload = {
        id: user.id,
        full_name: fullName.trim(),
        class_name: className.trim(),
        school: school.trim(),
        username: username.trim() || null,
      }
      const {error}=await supabase.from('profiles').upsert(profilePayload)
      if(error)throw error
      const {data,error:readError}=await supabase.from('profiles').select('*').eq('id',user.id).single()
      if(readError)throw readError
      setProfile({id:data.id,full_name:data.full_name,class_name:data.class_name,school:data.school,exam_year:data.exam_year?String(data.exam_year):'',username:data.username||'',about:data.about||''})
      setEditingProfile(false);setNotice({type:'success',text:'Profile saved.'})
    } catch (error) { const message=errorText(error).toLowerCase(); setNotice({type:'error',text:message.includes('duplicate')||message.includes('unique')?'That username is already taken. Choose another one.':message.includes('fetch')?'Cannot connect to Supabase. Check your connection and retry.':'Could not save the profile. Please retry.'}) }
    finally {setLoadingData(false)}
  }

  async function addSubject(e: FormEvent) {
    e.preventDefault()
    const name = subjectName.trim()
    if (!name) {
      setNotice({ type: 'error', text: 'Enter a subject name.' })
      return
    }
    if (!user) return
    setSubjectBusy(true)
    const { data, error } = await supabase
      .from('subjects')
      .insert({
        user_id: user.id,
        name,
        units: Math.min(500, Math.max(1, Number(units) || 1)),
        topics: topics.trim(),
        duration_minutes: Math.min(480, Math.max(15, Number(duration) || 60))
      })
      .select('*')
      .single()
    setSubjectBusy(false)
    if (error) {
      setNotice({
        type: 'error',
        text: error.code === '23505' ? 'A subject with this name already exists.' : 'Could not save this subject. Please try again.'
      })
      return
    }
    setSubjects(prev => [...prev, data as Subject])
    setSubjectName('')
    setUnits('1')
    setTopics('')
    setDuration('60')
    setNotice({ type: 'success', text: 'Subject saved to your account.' })
  }

  function startEditSubject(s: Subject) {
    setEditingSubject(s)
    setEditSubjectName(s.name)
    setEditUnits(String(s.units || 1))
    setEditTopics(s.topics || '')
    setEditDuration(String(s.duration_minutes || 60))
  }

  function cancelEditSubject() {
    setEditingSubject(null)
  }

  async function updateSubject(e: FormEvent) {
    e.preventDefault()
    if (!editingSubject || !user) return
    const name = editSubjectName.trim()
    if (!name) {
      setNotice({ type: 'error', text: 'Enter a subject name.' })
      return
    }
    setSubjectBusy(true)
    const updatedUnits = Math.min(500, Math.max(1, Number(editUnits) || 1))
    const updatedDuration = Math.min(480, Math.max(15, Number(editDuration) || 60))
    const { data, error } = await supabase
      .from('subjects')
      .update({
        name,
        units: updatedUnits,
        topics: editTopics.trim(),
        duration_minutes: updatedDuration
      })
      .eq('id', editingSubject.id)
      .eq('user_id', user.id)
      .select('*')
      .single()
    setSubjectBusy(false)
    if (error) {
      setNotice({
        type: 'error',
        text: error.code === '23505' ? 'A subject with this name already exists.' : 'Could not update this subject. Please try again.'
      })
      return
    }
    setSubjects(prev => prev.map(s => s.id === editingSubject.id ? (data as Subject) : s))
    if (editingSubject.name !== name) {
      setSessions(prev => prev.map(ses => ses.subject_id === editingSubject.id ? { ...ses, subject_name: name } : ses))
    }
    setEditingSubject(null)
    setNotice({ type: 'success', text: 'Subject updated successfully.' })
  }

  async function deleteSubject(id: string) {
    if (!user) return
    const { error } = await supabase.from('subjects').delete().eq('id', id).eq('user_id', user.id)
    if (error) { setNotice({ type: 'error', text: 'Could not delete this subject.' }); return }
    setSubjects(prev => prev.filter(s => s.id !== id))
    setSessions(prev => prev.map(s => s.subject_id === id ? { ...s, subject_id: null } : s))
    setNotice({ type: 'success', text: 'Subject deleted.' })
  }

  function toggleDay(d: number) {
    setSelectedDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    )
  }

  function startEditSlotGroup(group: SlotGroup) {
    setEditingSlotGroup(group)
    setSlotKind(group.kind)
    setSelectedDays(group.days)
    setSlotStart(group.start_time)
    setSlotEnd(group.end_time)
    setSlotLabel(group.label || '')
    document.getElementById('time-form-card')?.scrollIntoView({ behavior: 'smooth' })
  }

  function cancelEditSlot() {
    setEditingSlotGroup(null)
    setSlotLabel('')
    setSelectedDays([5, 6])
    setSlotStart('09:00')
    setSlotEnd('11:00')
  }

  async function saveSlots(e: FormEvent) {
    e.preventDefault()
    if (selectedDays.length === 0) {
      setNotice({ type: 'error', text: 'Select at least one day of the week.' })
      return
    }
    if (mins(slotEnd) <= mins(slotStart)) {
      setNotice({ type: 'error', text: 'End time must be later than start time.' })
      return
    }
    if (!user) return

    const editingIds = editingSlotGroup ? editingSlotGroup.ids : []
    for (const day of selectedDays) {
      const overlap = slots.some(
        s =>
          !editingIds.includes(s.id) &&
          s.day_of_week === day &&
          s.kind === slotKind &&
          mins(slotStart) < mins(s.end_time) &&
          mins(slotEnd) > mins(s.start_time)
      )
      if (overlap) {
        const dayName = DAYS[day]
        setNotice({
          type: 'error',
          text: `This time overlaps an existing ${slotKind === 'blocked' ? 'blocked' : 'available'} period on ${dayName}.`
        })
        return
      }
    }

    if (editingSlotGroup && editingSlotGroup.ids.length > 0) {
      const { error: delError } = await supabase
        .from('time_slots')
        .delete()
        .in('id', editingSlotGroup.ids)
        .eq('user_id', user.id)
      if (delError) {
        setNotice({ type: 'error', text: 'Could not update existing time period.' })
        return
      }
    }

    const rowsToInsert = selectedDays.map(day => ({
      user_id: user.id,
      day_of_week: day,
      start_time: slotStart,
      end_time: slotEnd,
      kind: slotKind,
      label: slotLabel.trim()
    }))

    const { data, error } = await supabase
      .from('time_slots')
      .insert(rowsToInsert)
      .select('*')

    if (error) {
      setNotice({ type: 'error', text: 'Could not save time periods. Please check for conflicts.' })
      return
    }

    const newItems: TimeSlot[] = (data || []).map((s: any) => ({
      id: s.id,
      day_of_week: s.day_of_week,
      start_time: String(s.start_time).slice(0, 5),
      end_time: String(s.end_time).slice(0, 5),
      kind: s.kind,
      label: s.label || ''
    }))

    setSlots(prev => {
      const filtered = editingSlotGroup
        ? prev.filter(s => !editingSlotGroup.ids.includes(s.id))
        : prev
      return [...filtered, ...newItems].sort(
        (a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
      )
    })

    const wasEditing = !!editingSlotGroup
    setEditingSlotGroup(null)
    setSlotLabel('')
    setNotice({
      type: 'success',
      text: `${slotKind === 'blocked' ? 'Blocked time' : 'Available time'} ${wasEditing ? 'updated' : 'saved'} for ${selectedDays.length} ${selectedDays.length === 1 ? 'day' : 'days'}.`
    })
  }

  async function deleteSlotGroup(ids: string[]) {
    if (!user) return
    const { error } = await supabase
      .from('time_slots')
      .delete()
      .in('id', ids)
      .eq('user_id', user.id)
    if (error) {
      setNotice({ type: 'error', text: 'Could not delete this time period.' })
      return
    }
    setSlots(prev => prev.filter(s => !ids.includes(s.id)))
    setNotice({ type: 'success', text: 'Time period removed.' })
  }

  async function toggleSession(item:StudySession) {
    if(!user)return
    const status=item.status==='completed'?'planned':'completed'
    const {error}=await supabase.from('study_sessions').update({status}).eq('id',item.id).eq('user_id',user.id)
    if(error){setNotice({type:'error',text:'Could not update this session.'});return}
    setSessions(prev=>prev.map(s=>s.id===item.id?{...s,status}:s))
  }

  async function generatePlan() {
    if (!subjects.length) {
      setNotice({ type: 'info', text: 'Add at least one subject before creating a study plan.' })
      setView('Subjects')
      return
    }
    const available = slots.filter(s => s.kind === 'available')
    if (!available.length) {
      setNotice({ type: 'info', text: 'Add the times when you can study before generating a routine.' })
      setView('Block Time')
      return
    }

    setPlanBusy(true)
    setNotice(null)

    // Build priority-weighted subject pool so subjects with more units get scheduled proportionally more often
    const subjectPool: Subject[] = []
    const sortedSubjects = [...subjects].sort((a, b) => (b.units || 1) - (a.units || 1))
    for (const subj of sortedSubjects) {
      const weight = Math.min(5, Math.max(1, subj.units || 1))
      for (let w = 0; w < weight; w++) {
        subjectPool.push(subj)
      }
    }
    if (!subjectPool.length) subjectPool.push(...subjects)

    // Prepare busy times per day: blocked time slots + already completed study sessions
    const busyByDay = new Map<number, { start: number; end: number }[]>()
    for (let day = 0; day < 7; day++) {
      const dayBlocks = slots
        .filter(s => s.kind === 'blocked' && s.day_of_week === day)
        .map(s => ({ start: mins(s.start_time), end: mins(s.end_time) }))

      const dayCompleted = sessions
        .filter(s => s.status === 'completed' && s.day_of_week === day)
        .map(s => ({ start: mins(s.start_time), end: mins(s.end_time) }))

      busyByDay.set(day, [...dayBlocks, ...dayCompleted].sort((a, b) => a.start - b.start))
    }

    // Offset starting index with a randomized rotation so each click of "Generate again" produces a newly calculated valid routine
    let poolIdx = Math.floor(Math.random() * subjectPool.length)
    const planned: StudySession[] = []

    for (let day = 0; day < 7; day++) {
      if (planned.length >= 35) break // Hard limit of 35 sessions for weekly routine to fit DB RPC constraint

      const dayAvailable = available
        .filter(s => s.day_of_week === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))

      const dayBusy = busyByDay.get(day) || []

      for (const win of dayAvailable) {
        if (planned.length >= 35) break
        const winStart = mins(win.start_time)
        const winEnd = mins(win.end_time)
        let cursor = winStart

        while (cursor + 15 <= winEnd && planned.length < 35 && planned.filter(p => p.day_of_week === day).length < 5) {
          // If cursor is within any busy block, advance past it
          const currentBusy = dayBusy.find(b => cursor >= b.start && cursor < b.end)
          if (currentBusy) {
            cursor = currentBusy.end
            continue
          }

          // Next busy block after current cursor
          const nextBusy = dayBusy.find(b => b.start > cursor && b.start < winEnd)
          const freeLimit = nextBusy ? Math.min(winEnd, nextBusy.start) : winEnd
          const availableMinutes = freeLimit - cursor

          if (availableMinutes < 15) {
            cursor = nextBusy ? nextBusy.end : winEnd
            continue
          }

          // Pick chosen subject respecting priority
          const chosen = subjectPool[poolIdx % subjectPool.length]
          poolIdx++

          // Respect subject duration up to available window, maximum 120 minutes per session
          const preferredDuration = Math.max(15, chosen.duration_minutes || 60)
          const sessionLength = Math.min(preferredDuration, availableMinutes, 120)

          if (sessionLength < 15) {
            cursor = freeLimit
            continue
          }

          const sessionStart = cursor
          const sessionEnd = cursor + sessionLength

          // Verify no overlap with planned sessions on this day
          const overlapsPlanned = planned.some(
            p => p.day_of_week === day && sessionStart < mins(p.end_time) && sessionEnd > mins(p.start_time)
          )

          if (!overlapsPlanned) {
            planned.push({
              id: crypto.randomUUID(),
              subject_id: chosen.id,
              subject_name: chosen.name,
              day_of_week: day,
              start_time: toHHMM(sessionStart),
              end_time: toHHMM(sessionEnd),
              status: 'planned'
            })
          }

          // Advance cursor with 15-minute break
          cursor = sessionEnd + 15
        }
      }
    }

    if (!planned.length) {
      setPlanBusy(false)
      setNotice({
        type: 'error',
        text: 'No suitable study sessions fit your available time and blocked periods. Adjust your time slots and try again.'
      })
      return
    }
    if (!user) {
      setPlanBusy(false)
      return
    }

    const routinePayload = planned.map(p => ({
      subject_id: p.subject_id,
      subject_name: p.subject_name,
      day_of_week: p.day_of_week,
      start_time: p.start_time,
      end_time: p.end_time
    }))

    const {error:saveError}=await supabase.rpc('replace_planned_study_sessions', { p_sessions: routinePayload })
    if (saveError) {
      // Never delete the user's current routine as a fallback. The RPC replaces sessions
      // atomically; if it fails, leave existing data untouched and surface the real error.
      setPlanBusy(false)
      setNotice({
        type: 'error',
        text: `Could not save the generated routine: ${saveError.message || saveError.code || 'unknown database error'}. Your existing routine was not changed.`
      })
      return
    }

    const {data,error}=await supabase.from('study_sessions').select('*')
      .eq('user_id', user.id)
      .order('day_of_week')
      .order('start_time')

    if (error) {
      setPlanBusy(false)
      setNotice({
        type: 'error',
        text: 'Routine saved, but it could not be refreshed. Reload the page to see it.'
      })
      return
    }

    setSessions(
      (data || []).map((s: any) => ({
        id: s.id,
        subject_id: s.subject_id,
        subject_name: s.subject_name,
        day_of_week: s.day_of_week,
        start_time: String(s.start_time).slice(0, 5),
        end_time: String(s.end_time).slice(0, 5),
        status: s.status
      }))
    )
    setPlanBusy(false)
    setNotice({
      type: 'success',
      text: `Saved ${planned.length} study sessions to your weekly routine.`
    })
    setView('Routine')
  }

  const navItems: { label: View; icon: ReactNode }[] = [
    { label: 'Home', icon: <Home size={19} /> },
    { label: 'Subjects', icon: <BookOpen size={19} /> },
    { label: 'Block Time', icon: <Clock3 size={19} /> },
    { label: 'Routine', icon: <CalendarDays size={19} /> },
    { label: 'Settings', icon: <SettingsIcon size={19} /> }
  ]
  const slotsByDay = useMemo(() => DAYS.map((_, day) => slots.filter(s => s.day_of_week === day)), [slots])
  const sessionsByDay = useMemo(() => DAYS.map((_, day) => sessions.filter(s => s.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time))), [sessions])

  const timeSlots = useMemo(() => {
    const allMins = [
      ...sessions.map(s => mins(s.start_time)),
      ...slots.filter(s => s.kind === 'available').map(s => mins(s.start_time))
    ]
    let minH = 8
    let maxH = 20
    if (allMins.length > 0) {
      minH = Math.min(8, Math.floor(Math.min(...allMins) / 120) * 2)
      maxH = Math.max(20, Math.floor(Math.max(...allMins) / 120) * 2)
    }
    const result: string[] = []
    for (let h = minH; h <= maxH; h += 2) {
      result.push(`${String(h).padStart(2, '0')}:00`)
    }
    return result
  }, [sessions, slots])

  if (!authReady) return <div className="app-loading"><LoaderCircle className="spin" size={28} /><p>Opening your study space…</p></div>
  if (!user) return <div className="auth-shell">
    <div className="auth-top">
      <Brand />
      <div className="top-links">
        <a href="#features">Features</a>
        <a href="#how">How it works</a>
        <a href="#about">About</a>
      </div>
      <div className="top-actions">
        <button
          type="button"
          className="button button-ghost top-login"
          onClick={() => { setAuthMode('login'); setNotice(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        >
          Log in
        </button>
        <button
          type="button"
          className="button button-primary top-register"
          onClick={() => { setAuthMode('register'); setNotice(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        >
          Register
        </button>
      </div>
    </div>
    <main className="auth-main">
      <section className="hero-block">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={15} /> YOUR PERSONAL STUDY SPACE</span>
          <h1>Plan Smarter.<br /><span>Study Better.</span><br />Achieve More.</h1>
          <p>Organize your subjects, make time for what matters, and build a study routine that works for you.</p>
          <div className="hero-actions">
            <Button onClick={() => { setAuthMode('register'); setNotice(null); document.getElementById('account-card')?.scrollIntoView({ behavior: 'smooth' }); }}>
              Get Started <ArrowRight size={16} />
            </Button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => { setAuthMode('login'); setNotice(null); document.getElementById('account-card')?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              Log in
            </button>
          </div>
          <div className="hero-perks">
            <span><BookOpen size={16} /> Organize subjects</span>
            <span><Clock3 size={16} /> Manage your time</span>
            <span><CalendarDays size={16} /> Plan a routine</span>
          </div>
        </div>
        <div className="hero-art" aria-label="Books and study calendar illustration">
          <div className="orb orb-one" /><div className="orb orb-two" />
          <div className="art-calendar"><CalendarDays size={54} /><span>PLAN</span></div>
          <div className="art-clock"><Clock3 size={64} /></div>
          <div className="book-stack"><div /><div /><div /></div>
          <GraduationCap className="art-cap" size={106} />
          <div className="art-caption">Small steps. Brighter future.</div>
        </div>
      </section>

      {authMode && (
        <section className="auth-grid" id="account-card">
          <form className="panel auth-card" onSubmit={handleAuth}>
            <div className="auth-card-header">
              <div className="auth-tabs">
                <button
                  type="button"
                  className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
                  onClick={() => { setAuthMode('login'); setNotice(null); }}
                >
                  Log in
                </button>
                <button
                  type="button"
                  className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
                  onClick={() => { setAuthMode('register'); setNotice(null); }}
                >
                  Register
                </button>
              </div>
              <button
                type="button"
                className="auth-close-btn"
                onClick={() => { setAuthMode(null); setNotice(null); }}
                title="Return to landing page"
              >
                <X size={15} /> <span>Close</span>
              </button>
            </div>
            <div className="panel-heading">
              <span className="icon-tile"><UserRound size={23} /></span>
              <div>
                <h2>{authMode === 'register' ? 'Create your account' : authMode === 'reset' ? 'Reset your password' : 'Welcome back'}</h2>
                <p>{authMode === 'register' ? 'Start building better study habits.' : authMode === 'reset' ? 'We will email you a secure reset link.' : 'Log in to continue your study journey.'}</p>
              </div>
            </div>
            {authMode === 'register' && (
              <>
                <Field label="Full name" value={fullName} onChange={setFullName} placeholder="Your full name" required />
                <div className="form-row">
                  <Field label="Class" value={className} onChange={setClassName} placeholder="e.g. HSC 1st Year" />
                  <Field label="School / College" value={school} onChange={setSchool} placeholder="Institution name" />
                </div>
                <Field label="Username" value={username} onChange={setUsername} placeholder="Choose a username (optional)" />
              </>
            )}
            <Field label="Email address" value={email} onChange={setEmail} placeholder="you@example.com" type="email" required />
            {authMode !== 'reset' && (
              <label className="field">
                <span>Password</span>
                <div className="password-wrap">
                  <input
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={authMode === 'register' ? 'At least 8 characters' : 'Enter your password'}
                    required
                  />
                  <button
                    type="button"
                    className="reveal"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
            )}
            {authMode === 'register' && (
              <label className="field">
                <span>Confirm password</span>
                <div className="password-wrap">
                  <input
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password again"
                    required
                  />
                </div>
              </label>
            )}
            {authMode === 'login' && (
              <div className="forgot-row">
                <button type="button" className="inline-link" onClick={() => { setAuthMode('reset'); setNotice(null); }}>
                  Forgot password?
                </button>
              </div>
            )}
            <Button type="submit" disabled={authBusy}>
              {authBusy ? <><LoaderCircle size={16} className="spin" /> Please wait…</> : authMode === 'register' ? 'Create account' : authMode === 'reset' ? 'Send reset link' : 'Log in'} {!authBusy && <ArrowRight size={17} />}
            </Button>
            <div className="auth-switch">
              {authMode === 'login' ? (
                <>New to Study Flow? <button type="button" onClick={() => { setAuthMode('register'); setNotice(null); }}>Create an account</button></>
              ) : authMode === 'register' ? (
                <>Already registered? <button type="button" onClick={() => { setAuthMode('login'); setNotice(null); }}>Log in</button></>
              ) : (
                <>Remembered it? <button type="button" onClick={() => { setAuthMode('login'); setNotice(null); }}>Back to login</button></>
              )}
            </div>
          </form>
          <aside className="panel auth-aside">
            <div className="aside-art">
              <div className="book book-a" /><div className="book book-b" /><div className="book book-c" /><Sparkles size={26} className="aside-spark" />
            </div>
            <h3>A calmer way to study</h3>
            <p>Your subjects, your schedule, and your goals — organized in one place you control.</p>
            <div className="aside-feature"><span><CheckCircle2 size={18} /></span><div><strong>Your own account</strong><small>Private data and a personal study space.</small></div></div>
            <div className="aside-feature"><span><CheckCircle2 size={18} /></span><div><strong>Time that works for you</strong><small>Keep your unavailable periods protected.</small></div></div>
            <div className="aside-feature"><span><CheckCircle2 size={18} /></span><div><strong>Flexible routines</strong><small>Adjust the plan as your week changes.</small></div></div>
          </aside>
        </section>
      )}

      <section className="feature-section" id="features">
        <div className="section-intro">
          <span className="eyebrow"><Zap size={15} /> EVERYTHING IN ONE PLACE</span>
          <h2>Make every study session count.</h2>
          <p>Built around your real subjects, time, and priorities.</p>
        </div>
        <div className="feature-grid">
          <article className="feature-card"><span className="feature-icon violet"><BookOpen /></span><h3>Organize subjects</h3><p>Keep units, topics, and preferred session lengths together.</p></article>
          <article className="feature-card"><span className="feature-icon blue"><Clock3 /></span><h3>Own your time</h3><p>Set when you can study and block the times you cannot.</p></article>
          <article className="feature-card"><span className="feature-icon mint"><CalendarDays /></span><h3>Build a routine</h3><p>Create a weekly plan from your saved subjects and time slots.</p></article>
          <article className="feature-card"><span className="feature-icon peach"><Activity /></span><h3>Track progress</h3><p>Mark real sessions complete and see your progress grow.</p></article>
        </div>
      </section>

      <section className="how-section" id="how">
        <div className="section-intro">
          <span className="eyebrow"><Sparkles size={15} /> SIMPLE THREE-STEP FLOW</span>
          <h2>How Study Flow works</h2>
          <p>Everything you need to turn chaos into a steady weekly routine.</p>
        </div>
        <div className="how-grid">
          <div className="how-card"><span className="step-num">1</span><h3>Add your subjects</h3><p>Enter your courses, unit goals, and how long you prefer to study each session.</p></div>
          <div className="how-card"><span className="step-num">2</span><h3>Protect your time</h3><p>Set available study hours and block off classes, work shifts, meals, or downtime.</p></div>
          <div className="how-card"><span className="step-num">3</span><h3>Generate your plan</h3><p>Click Generate to build a weekly timetable, track completion, and stay consistent.</p></div>
        </div>
      </section>
    </main>
    <footer className="public-footer" id="about">
      <Brand small />
      <span>Make room for focused learning.</span>
      <span>© {new Date().getFullYear()} Study Flow</span>
    </footer>
    {notice && <div className={`toast toast-${notice.type}`}><span>{notice.text}</span><button onClick={noticeDismiss} aria-label="Dismiss message"><X size={16} /></button></div>}
  </div>

  if (passwordRecovery && user) return <div className="recovery-shell"><form className="panel recovery-card" onSubmit={updatePassword}><Brand /><span className="icon-tile recovery-icon"><KeyRound size={23} /></span><h1>Choose a new password</h1><p>Create a new password for your Study Flow account.</p><Field label="New password" value={newPassword} onChange={setNewPassword} type="password" placeholder="At least 8 characters" required /><Field label="Confirm new password" value={confirmNewPassword} onChange={setConfirmNewPassword} type="password" placeholder="Enter it again" required /><Button type="submit" disabled={authBusy}>{authBusy ? <><LoaderCircle size={16} className="spin" /> Updating…</> : 'Update password'} {!authBusy && <ArrowRight size={16} />}</Button>{notice && <div className={`notice notice-${notice.type}`}>{notice.text}</div>}</form></div>

  return <div className="dashboard-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><Brand small /></div>
      <div className="sidebar-label">WORKSPACE</div>
      <nav>{navItems.map(item => <button key={item.label} className={view === item.label ? 'nav-item active' : 'nav-item'} onClick={() => setView(item.label)}>{item.icon}<span>{item.label}</span>{view === item.label && <span className="nav-dot" />}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="sidebar-motivation"><div className="motivation-icon"><Sparkles size={22} /></div><strong>Keep going!</strong><span>Small steps build big progress.</span></div>
        <button className="nav-item signout" onClick={signOut}><LogOut size={18} /><span>Sign out</span></button>
      </div>
    </aside>
    <main className="workspace">
      <header className="dashboard-topbar">
        <div>
          <span className="topbar-kicker">YOUR PERSONAL PLANNER</span>
          <strong>{view === 'Home' ? 'Your study overview' : view === 'Profile' ? 'Your profile' : view}</strong>
        </div>
        <div className="topbar-right">
          <span className="today-chip"><CalendarDays size={15} />{new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <button
            type="button"
            className={`user-avatar user-avatar-btn ${view === 'Profile' ? 'avatar-active' : ''}`}
            onClick={() => setView('Profile')}
            title={`View your profile (${greetingName})`}
            aria-label="View profile"
          >
            {greetingName.slice(0, 1).toUpperCase()}
          </button>
        </div>
      </header>
      {notice && <div className={`notice notice-${notice.type}`}><span>{notice.type === 'error' ? <AlertCircle size={18} /> : notice.type === 'success' ? <CheckCircle2 size={18} /> : <Activity size={18} />} {notice.text}</span><button onClick={noticeDismiss} aria-label="Dismiss"><X size={17} /></button></div>}
      {loadingData ? <div className="loading-panel"><LoaderCircle className="spin" size={25} /> Loading your saved study data…</div> : <>
      {view === 'Home' && <><section className="welcome-row"><div><span className="eyebrow"><Sparkles size={15} /> YOUR STUDY SPACE</span><h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {greetingName.split(' ')[0]}.</h1><p>One focused session at a time. You’re building something good.</p></div><Button onClick={generatePlan} disabled={planBusy}>{planBusy ? <LoaderCircle size={17} className="spin" /> : <Sparkles size={17} />} Generate routine <ArrowRight size={16} /></Button></section>
        <section className="stats-grid"><div className="stat-card"><span className="stat-icon stat-violet"><BookOpen size={19} /></span><div><small>Total subjects</small><strong>{subjects.length}</strong><span className="stat-sub">{subjects.length === 1 ? 'subject saved' : 'subjects saved'}</span></div></div><div className="stat-card"><span className="stat-icon stat-blue"><Clock3 size={19} /></span><div><small>Completed study time</small><strong>{Math.floor(studyMinutes / 60)}h {studyMinutes % 60}m</strong><span className="stat-sub">Based on completed sessions</span></div></div><div className="stat-card"><span className="stat-icon stat-mint"><Check size={19} /></span><div><small>Sessions completed</small><strong>{completed}</strong><span className="stat-sub">Keep your momentum</span></div></div><div className="stat-card"><span className="stat-icon stat-peach"><Flame size={19} /></span><div><small>Planned this week</small><strong>{sessions.filter(s => s.status === 'planned').length}</strong><span className="stat-sub">Saved sessions</span></div></div></section>
        <div className="content-grid"><section className="panel content-panel"><div className="panel-title-row"><div><h2>Today's study flow</h2><p>Your scheduled sessions for {DAYS[today]}.</p></div><button className="subtle-link" onClick={() => setView('Routine')}>View routine <ArrowRight size={15} /></button></div>{todaySessions.length === 0 ? <EmptyState title="Your day is open" description="Create a routine to see your study sessions here." icon={<CalendarDays size={22} />} /> : <div className="today-list">{todaySessions.map((s, i) => <div className="today-session" key={s.id}><div className={`timeline-marker marker-${i % 4}`} /><div className="session-time">{fmtTime(s.start_time)}<small>{fmtTime(s.end_time)}</small></div><div className="session-subject"><strong>{s.subject_name}</strong><small>{s.status === 'completed' ? 'Completed' : 'Planned session'}</small></div><button title={s.status === 'completed' ? 'Mark as planned' : 'Mark as completed'} className={s.status === 'completed' ? 'complete-toggle is-complete' : 'complete-toggle'} onClick={() => toggleSession(s)}>{s.status === 'completed' ? <Check size={17} /> : <CheckCircle2 size={17} />}</button></div>)}</div>}</section>
        <section className="panel content-panel"><div className="panel-title-row"><div><h2>Quick actions</h2><p>Pick up where you left off.</p></div><span className="soft-badge">Workspace</span></div><div className="quick-actions"><button onClick={() => setView('Subjects')}><span className="quick-icon q-violet"><BookOpen size={18} /></span><span><strong>Add a subject</strong><small>Organize a class or topic</small></span><ArrowRight size={16} /></button><button onClick={() => setView('Block Time')}><span className="quick-icon q-blue"><Clock3 size={18} /></span><span><strong>Set your time</strong><small>Add available or blocked hours</small></span><ArrowRight size={16} /></button><button onClick={() => setView('Routine')}><span className="quick-icon q-mint"><CalendarDays size={18} /></span><span><strong>Review routine</strong><small>See your weekly plan</small></span><ArrowRight size={16} /></button></div></section></div>
        <section className="panel content-panel"><div className="panel-title-row"><div><h2>Your subjects</h2><p>Only subjects you have added appear here.</p></div><Button variant="secondary" onClick={() => setView('Subjects')}><Plus size={16} /> Add subject</Button></div>{subjects.length === 0 ? <EmptyState title="No subjects yet" description="Add your first subject to start organizing your study plan." icon={<BookOpen size={22} />} /> : <div className="subject-mini-grid">{subjects.slice(0, 4).map((s, i) => <div className="subject-mini" key={s.id}><span className={`subject-bullet bullet-${i % 4}`}>{s.name.slice(0, 1).toUpperCase()}</span><div><strong>{s.name}</strong><small>{s.units} {s.units === 1 ? 'unit' : 'units'} · {s.duration_minutes} min/session</small></div><ArrowRight size={15} /></div>)}</div>}</section>
      </>}
      {view === 'Profile' && <section className="panel page-panel"><div className="page-heading"><span className="icon-tile"><UserRound size={23} /></span><div><h1>Your profile</h1><p>Manage the information connected to your account.</p></div><div className="heading-spacer" /><Button variant="secondary" onClick={() => { setFullName(profile?.full_name || ''); setClassName(profile?.class_name || ''); setSchool(profile?.school || ''); setUsername(profile?.username || ''); setEditingProfile(!editingProfile) }}>{editingProfile ? 'Cancel' : 'Edit profile'}</Button></div>{!editingProfile ? <div className="profile-overview"><div className="profile-avatar">{greetingName.slice(0, 1).toUpperCase()}</div><div className="profile-info"><h2>{profile?.full_name || greetingName}</h2><p>{user?.email}</p><div className="profile-tags"><span>{profile?.class_name || 'Class not set'}</span><span>{profile?.school || 'School / college not set'}</span></div><p className="muted">{profile?.about || 'Add information about yourself to personalize your study space.'}</p></div></div> : <form className="form-grid" onSubmit={saveProfile}><Field label="Full name" value={fullName} onChange={setFullName} required /><Field label="Class" value={className} onChange={setClassName} /><Field label="School / College" value={school} onChange={setSchool} /><Field label="Username" value={username} onChange={setUsername} /><div className="form-actions"><Button type="submit">Save changes</Button></div></form>}</section>}
      {view === 'Subjects' && (
        <div className="page-stack">
          <section className="panel page-panel">
            <div className="page-heading">
              <span className="icon-tile"><BookOpen size={23} /></span>
              <div>
                <h1>Add New Subject</h1>
                <p>Add a new subject to your study plan.</p>
              </div>
            </div>
            <form className="subject-form-redesigned" onSubmit={addSubject}>
              <Field
                label="Subject Name"
                value={subjectName}
                onChange={setSubjectName}
                placeholder="e.g. Mathematics"
                required
              />
              <div className="form-row-units-topics">
                <div className="field-units">
                  <Field
                    label="Units"
                    value={units}
                    onChange={setUnits}
                    type="number"
                    placeholder="1"
                    required
                  />
                </div>
                <div className="field-topics">
                  <Field
                    label="Chapters / Topics"
                    value={topics}
                    onChange={setTopics}
                    placeholder="e.g. Algebra, Geometry, Trigonometry"
                  />
                </div>
              </div>
              <label className="field">
                <span>Preferred Session (minutes)</span>
                <select value={duration} onChange={e => setDuration(e.target.value)}>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">120 minutes</option>
                </select>
              </label>
              <div className="form-actions-full">
                <Button type="submit" disabled={subjectBusy}>
                  {subjectBusy ? <LoaderCircle size={16} className="spin" /> : <Plus size={17} />} Add Subject
                </Button>
              </div>
            </form>
          </section>

          <section className="panel page-panel">
            <div className="panel-title-row">
              <div>
                <h2>Your subjects ({subjects.length})</h2>
                <p>Saved securely to your account.</p>
              </div>
            </div>
            {subjects.length === 0 ? (
              <EmptyState title="Your subject list is empty" description="Add a subject above. No sample subjects are preloaded." />
            ) : (
              <div className="saved-subjects">
                {subjects.map((s, i) => (
                  <div className="saved-subject" key={s.id}>
                    <span className={`subject-bullet bullet-${i % 4}`}>{s.name.slice(0, 1).toUpperCase()}</span>
                    <div className="saved-subject-main">
                      <strong>{s.name}</strong>
                      <span>{s.units} {s.units === 1 ? 'unit' : 'units'} · {s.duration_minutes} min</span>
                      {s.topics && <p>{s.topics}</p>}
                    </div>
                    <div className="subject-item-actions">
                      <button
                        type="button"
                        className="icon-button edit-icon"
                        aria-label={`Edit ${s.name}`}
                        title={`Edit ${s.name}`}
                        onClick={() => startEditSubject(s)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button danger-icon"
                        aria-label={`Delete ${s.name}`}
                        title={`Delete ${s.name}`}
                        onClick={() => deleteSubject(s.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {editingSubject && (
            <div className="edit-modal-overlay" onClick={cancelEditSubject}>
              <div className="edit-modal-card" onClick={e => e.stopPropagation()}>
                <div className="edit-modal-header">
                  <div className="edit-modal-title">
                    <Pencil size={18} className="edit-title-icon" />
                    <h3>Edit Subject</h3>
                  </div>
                  <button type="button" className="close-btn" onClick={cancelEditSubject} aria-label="Close edit">
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={updateSubject} className="edit-subject-form">
                  <Field
                    label="Subject Name"
                    value={editSubjectName}
                    onChange={setEditSubjectName}
                    placeholder="e.g. Mathematics"
                    required
                  />
                  <div className="form-row-units-topics">
                    <div className="field-units">
                      <Field
                        label="Units"
                        value={editUnits}
                        onChange={setEditUnits}
                        type="number"
                        placeholder="1"
                        required
                      />
                    </div>
                    <div className="field-topics">
                      <Field
                        label="Chapters / Topics"
                        value={editTopics}
                        onChange={setEditTopics}
                        placeholder="Algebra, Geometry"
                      />
                    </div>
                  </div>
                  <label className="field">
                    <span>Preferred Session (minutes)</span>
                    <select value={editDuration} onChange={e => setEditDuration(e.target.value)}>
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                      <option value="90">90 minutes</option>
                      <option value="120">120 minutes</option>
                    </select>
                  </label>
                  <div className="edit-modal-actions">
                    <Button variant="secondary" onClick={cancelEditSubject}>Cancel</Button>
                    <Button type="submit" disabled={subjectBusy}>
                      {subjectBusy ? <LoaderCircle size={16} className="spin" /> : <Save size={16} />} Update Subject
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
      {view === 'Block Time' && (
        <div className="page-stack">
          <section className="panel page-panel" id="time-form-card">
            <div className="page-heading">
              <span className="icon-tile"><Clock3 size={23} /></span>
              <div>
                <h1>{editingSlotGroup ? 'Edit Time Period' : 'Block Time'}</h1>
                <p>Block your unavailable time or set when you can study.</p>
              </div>
            </div>
            <form className="time-form-redesigned" onSubmit={saveSlots}>
              <label className="field">
                <span>Time type</span>
                <select value={slotKind} onChange={e => setSlotKind(e.target.value as 'available' | 'blocked')}>
                  <option value="blocked">Block time — can't study</option>
                  <option value="available">Available time — can study</option>
                </select>
              </label>

              <div className="days-select-wrap">
                <span className="days-select-label">
                  <CalendarDays size={15} /> Select days
                </span>
                <div className="days-select-grid">
                  {SELECT_DAYS.map(d => {
                    const isSelected = selectedDays.includes(d.day)
                    return (
                      <button
                        type="button"
                        key={d.day}
                        className={`day-chip ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleDay(d.day)}
                        aria-pressed={isSelected}
                      >
                        {isSelected && <Check size={14} />}
                        <span>{d.label}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="days-helper-text">Select one or more days</p>
              </div>

              <div className="form-row">
                <Field label="Start time" value={slotStart} onChange={setSlotStart} type="time" required />
                <Field label="End time" value={slotEnd} onChange={setSlotEnd} type="time" required />
              </div>

              <Field
                label="Description (optional)"
                value={slotLabel}
                onChange={setSlotLabel}
                placeholder="e.g. Library time, exam prep..."
              />

              <div className="form-actions-row">
                <Button type="submit">
                  <Save size={16} /> {editingSlotGroup ? 'Update Block Time' : 'Save Block Time'}
                </Button>
                {editingSlotGroup && (
                  <Button variant="secondary" onClick={cancelEditSlot}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </section>

          <div className="time-cards">
            <section className="panel page-panel">
              <div className="panel-title-row">
                <div>
                  <h2><span className="status-dot dot-available" /> Available time</h2>
                  <p>Periods when you can study.</p>
                </div>
                <span className="count-pill">{groupSlots(slots.filter(s => s.kind === 'available')).length}</span>
              </div>
              <SlotList
                slots={slots.filter(s => s.kind === 'available')}
                onEdit={startEditSlotGroup}
                onDelete={deleteSlotGroup}
              />
            </section>
            <section className="panel page-panel blocked-panel">
              <div className="panel-title-row">
                <div>
                  <h2><span className="status-dot dot-blocked" /> Block time</h2>
                  <p>Protected periods when you cannot study.</p>
                </div>
                <span className="count-pill">{groupSlots(slots.filter(s => s.kind === 'blocked')).length}</span>
              </div>
              <SlotList
                slots={slots.filter(s => s.kind === 'blocked')}
                onEdit={startEditSlotGroup}
                onDelete={deleteSlotGroup}
              />
            </section>
          </div>
        </div>
      )}
      {view === 'Routine' && <section className="panel page-panel"><div className="page-heading"><span className="icon-tile"><CalendarDays size={23} /></span><div><h1>Weekly study routine</h1><p>Built from your saved subjects and availability.</p></div><div className="heading-spacer" /><Button onClick={generatePlan} disabled={planBusy}>{planBusy ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />} Generate again</Button></div>
      {sessions.length === 0 ? (
        subjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><BookOpen size={24} /></div>
            <strong>Add your subjects first</strong>
            <p>You need to add at least one subject before a weekly routine can be planned.</p>
            <div style={{ marginTop: 14 }}><Button onClick={() => setView('Subjects')}><Plus size={16} /> Add your first subject</Button></div>
          </div>
        ) : slots.filter(s => s.kind === 'available').length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><CalendarClock size={24} /></div>
            <strong>Set your available study hours</strong>
            <p>Tell Study Flow when you are free to study so it can schedule your sessions.</p>
            <div style={{ marginTop: 14 }}><Button onClick={() => setView('Block Time')}><Plus size={16} /> Set available time</Button></div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon"><CalendarDays size={24} /></div>
            <strong>Your routine is ready to be created</strong>
            <p>Click the button below to generate your personalized weekly study schedule.</p>
            <div style={{ marginTop: 14 }}><Button onClick={generatePlan} disabled={planBusy}>{planBusy ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />} Generate routine</Button></div>
          </div>
        )
      ) : (
        <div className="calendar-wrap">
          <div className="week-grid">
            <div className="week-label">TIME</div>
            {DAY_SHORT.map((d, i) => <div className={i === today ? 'week-day today-day' : 'week-day'} key={d}>{d}</div>)}
            {timeSlots.map((t) => (
              <Fragment key={t}>
                <div className="time-label">{fmtTime(t)}</div>
                {DAY_SHORT.map((d, di) => {
                  const matches = sessionsByDay[di].filter(
                    s => mins(s.start_time) >= mins(t) && mins(s.start_time) < mins(t) + 120
                  )
                  return (
                    <div className="calendar-cell" key={d + t}>
                      {matches.map(s => {
                        const subjIndex = subjects.findIndex(sb => sb.id === s.subject_id)
                        const colorClass = `color-${subjIndex >= 0 ? subjIndex % 4 : 0}`
                        return (
                          <button
                            key={s.id}
                            className={`calendar-session ${s.status === 'completed' ? 'session-done' : ''} ${colorClass}`}
                            title={`${s.subject_name}, ${fmtTime(s.start_time)}–${fmtTime(s.end_time)}`}
                            onClick={() => toggleSession(s)}
                          >
                            <strong>{s.subject_name}</strong>
                            <small>{fmtTime(s.start_time)}–{fmtTime(s.end_time)}</small>
                            <span>{s.status === 'completed' ? 'Completed' : 'Mark complete'}</span>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </Fragment>
            ))}
          </div>
          <p className="calendar-hint"><CheckCircle2 size={15} /> Click a session to toggle its completion status.</p>
        </div>
      )}
      </section>}
      {view === 'Settings' && <div className="page-stack"><section className="panel page-panel"><div className="page-heading"><span className="icon-tile"><SettingsIcon size={23} /></span><div><h1>Settings</h1><p>Account and study planner preferences.</p></div></div><div className="settings-list">
<div className="settings-item"><span className="settings-icon"><Activity size={19} /></span><div><strong>App Updates</strong><p>Check the latest Android release and download the APK directly. Android will ask before installing it.</p><small id="app-update-status" aria-live="polite">Installed web build: {import.meta.env.VITE_APP_VERSION || '1.1.0'}. Check for a newer APK below.</small></div><button className="subtle-link" onClick={async () => { const status=document.getElementById('app-update-status'); if(status) status.textContent='Checking for updates…'; try { const response=await fetch('/release-metadata.json',{cache:'no-store'}); if(!response.ok) throw new Error('Update metadata is not published yet.'); const release=await response.json() as {version?:string;versionCode?:number;apkUrl?:string;releaseNotes?:string}; if(!release.apkUrl || !release.version) throw new Error('Release metadata is incomplete.'); if(status) status.textContent='Latest published version: '+release.version+(release.releaseNotes?' — '+release.releaseNotes:''); if(window.confirm('New Update Available: '+release.version+'\nDownload the APK now?')) window.open(release.apkUrl,'_blank','noopener,noreferrer'); } catch(error) { if(status) status.textContent=error instanceof Error?error.message:'Could not check for updates.'; } }}>Check / Download APK <ArrowRight size={15} /></button></div><div className="settings-item"><span className="settings-icon"><ShieldCheck size={19} /></span><div><strong>Account security</strong><p>Signed in as {user.email}. Password recovery is handled by Supabase Auth.</p></div><button className="subtle-link" onClick={() => { setEmail(user.email || ''); setAuthMode('reset'); void supabase.auth.resetPasswordForEmail(user.email || '', { redirectTo: window.location.origin }).then(({ error }) => setNotice({ type: error ? 'error' : 'success', text: error ? 'Could not send a reset link. Please try again.' : 'If your account is eligible, a reset email will arrive shortly.' })) }}>Send reset email <ArrowRight size={15} /></button></div><div className="settings-item"><span className="settings-icon"><UserRound size={19} /></span><div><strong>Profile settings</strong><p>Update your name, class, school, and username.</p></div><button className="subtle-link" onClick={() => setView('Profile')}>Manage <ArrowRight size={15}/></button></div><div className="settings-item"><span className="settings-icon"><CalendarDays size={19} /></span><div><strong>Routine and study plan</strong><p>Manage your saved subjects and time rules.</p></div><button className="subtle-link" onClick={() => setView('Routine')}>Open routine <ArrowRight size={15} /></button></div></div></section><section className="panel page-panel account-warning"><h2>Sign out</h2><p>Sign out from this device. Your saved subjects, profile, time slots, and sessions are stored in your account.</p><Button variant="secondary" onClick={signOut}><LogOut size={17} /> Sign out</Button></section></div>}
      </>}
      <footer className="workspace-footer"><Brand small /><span>Make room for focused learning.</span><span>© {new Date().getFullYear()} Study Flow</span></footer>
    </main>
    <div className="bottom-nav-wrap">
      <nav className="bottom-nav-bar" aria-label="Bottom Navigation">
        {navItems.map(item => {
          const isActive = view === item.label
          return (
            <button
              key={item.label}
              type="button"
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setView(item.label)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="bottom-nav-icon">{item.icon}</span>
              <span className="bottom-nav-label">{item.label}</span>
              {isActive && <span className="bottom-nav-indicator" />}
            </button>
          )
        })}
      </nav>
    </div>
    {notice && <div className={`toast toast-${notice.type}`}><span>{notice.text}</span><button onClick={noticeDismiss} aria-label="Dismiss message"><X size={16} /></button></div>}
  </div>
}

function SlotList({
  slots,
  onEdit,
  onDelete
}: {
  slots: TimeSlot[]
  onEdit: (group: SlotGroup) => void
  onDelete: (ids: string[]) => void
}) {
  const groups = groupSlots(slots)
  if (!groups.length) {
    return (
      <EmptyState
        title="Nothing added yet"
        description="Use the form above to add a time period."
        icon={<Clock3 size={22} />}
      />
    )
  }
  return (
    <div className="slot-list">
      {groups.map(g => (
        <div className="slot-row" key={g.key}>
          <div className={g.kind === 'blocked' ? 'slot-icon slot-icon-blocked' : 'slot-icon'}>
            {g.kind === 'blocked' ? <X size={17} /> : <Clock3 size={17} />}
          </div>
          <div className="slot-info">
            <strong>{formatDaysList(g.days)}</strong>
            <span>{fmtTime(g.start_time)} — {fmtTime(g.end_time)}</span>
            {g.label && <small className="slot-label-text">{g.label}</small>}
          </div>
          <div className="slot-actions">
            <button
              type="button"
              className="icon-button edit-icon"
              onClick={() => onEdit(g)}
              aria-label="Edit time period"
              title="Edit time period"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              className="icon-button danger-icon"
              onClick={() => onDelete(g.ids)}
              aria-label="Remove time period"
              title="Remove time period"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
