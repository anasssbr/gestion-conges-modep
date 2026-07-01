import { useEffect, useMemo, useState, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import './DashboardAdmin.css';
import axios from 'axios';

const API = 'http://localhost:5000/api';

// ─── Système de Toast interne ────────────────────────────────────
function ToastContainer({ toasts, onRemove }) {
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:10, pointerEvents:'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display:'flex', alignItems:'center', gap:12,
          background: t.type==='error'?'#fff1f2': t.type==='success'?'#f0fdf4': t.type==='confirm'?'#fffbeb':'#eff6ff',
          border: `1.5px solid ${t.type==='error'?'#fecaca':t.type==='success'?'#bbf7d0':t.type==='confirm'?'#fde68a':'#bfdbfe'}`,
          borderRadius:14, padding:'14px 18px', boxShadow:'0 8px 24px rgba(0,0,0,0.12)',
          minWidth:280, maxWidth:380, pointerEvents:'all', animation:'toast-in 0.22s cubic-bezier(.34,1.56,.64,1)'
        }}>
          <span style={{fontSize:20,flexShrink:0}}>{t.type==='error'?'❌':t.type==='success'?'✅':t.type==='confirm'?'⚠️':'ℹ️'}</span>
          <div style={{flex:1}}>
            <p style={{margin:0,fontSize:14,fontWeight:700,color:'#1a2340'}}>{t.message}</p>
            {t.type==='confirm' && (
              <div style={{display:'flex',gap:8,marginTop:10}}>
                <button onClick={()=>{t.onConfirm?.();onRemove(t.id);}} style={{border:0,borderRadius:8,padding:'6px 16px',background:'#dc2626',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>Confirmer</button>
                <button onClick={()=>onRemove(t.id)} style={{border:'1px solid #e2e7f7',borderRadius:8,padding:'6px 16px',background:'#fff',color:'#4b506d',fontWeight:700,fontSize:12,cursor:'pointer'}}>Annuler</button>
              </div>
            )}
          </div>
          {t.type!=='confirm' && <button onClick={()=>onRemove(t.id)} style={{border:0,background:'transparent',cursor:'pointer',fontSize:16,color:'#9aa4c2',padding:0,flexShrink:0}}>✕</button>}
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const remove = useCallback(id => setToasts(prev => prev.filter(t => t.id !== id)), []);
  const add = useCallback((message, type='info', duration=3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, {id, message, type}]);
    if (type !== 'confirm') setTimeout(() => remove(id), duration);
  }, [remove]);
  const success    = useCallback(msg => add(msg,'success'), [add]);
  const error      = useCallback(msg => add(msg,'error',5000), [add]);
  const askConfirm = useCallback((message, onConfirm) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, {id, message, type:'confirm', onConfirm}]);
  }, []);
  return { toasts, remove, success, error, info: add, askConfirm };
}

const LEAVE_TYPE_CONFIG = {
  annuel:       { color: '#c55ea8', bg: '#fdf0fb', label: 'Congé annuel' },
  maladie:      { color: '#2ca8f2', bg: '#edf7ff', label: 'Congé maladie' },
  maternite:    { color: '#eead38', bg: '#fffbef', label: 'Congé maternité' },
  sans_solde:   { color: '#6a63dc', bg: '#f2f1ff', label: 'Congé sans solde' },
  exceptionnel: { color: '#e74c3c', bg: '#fdecea', label: 'Congé exceptionnel' },
};

const STATUT_LABELS = {
  en_attente: 'En attente', approuve_responsable: 'Validé resp.',
  approuve_rh: 'Approuvé RH', signe_directeur: 'Signé', refuse: 'Refusé'
};

const STATUT_CLASS = {
  en_attente: 'wait', approuve_responsable: 'wait',
  approuve_rh: 'ok', signe_directeur: 'ok', refuse: 'no'
};

const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAY_NAMES = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

const menuItems = [
  { key: 'overview',     label: 'Overview',         icon: 'overview'   },
  { key: 'demandes',     label: 'Demandes RH',       icon: 'demandes'   },
  { key: 'employes',     label: 'Employés',          icon: 'employes'   },
  { key: 'signatures',   label: 'Signatures',        icon: 'signatures' },
  { key: 'calendrier',   label: 'Calendrier',        icon: 'calendar'   },
  { key: 'mes-demandes', label: 'Mes demandes',      icon: 'mesdem'     },
  { key: 'nouvelle',     label: 'Nouvelle demande',  icon: 'nouvelle'   },
  { key: 'profil',       label: 'Mon profil',        icon: 'profil'     },
  { key: 'parametres',   label: 'Paramètres',        icon: 'settings'   }
];

function buildCalendar(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  let startOffset = firstDay - 1;
  if (startOffset < 0) startOffset = 6;
  const cells = [];
  for (let i = startOffset - 1; i >= 0; i--) cells.push({ day: prevDays - i, current: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - startOffset + 1, current: false });
  return cells;
}

function SideIcon({ type, active = false }) {
  const color = active ? '#197BBD' : '#C7C7C7';
  const p = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none' };
  if (type==='overview')   return <svg {...p}><path d="M4 19V6M4 19H20M8 14L11 11L14 12.5L19 7.5" stroke={color} strokeWidth="2" strokeLinecap="round"/></svg>;
  if (type==='demandes')   return <svg {...p}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke={color} strokeWidth="2" strokeLinecap="round"/><rect x="9" y="3" width="6" height="4" rx="1" stroke={color} strokeWidth="2"/><path d="M9 12l2 2 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if (type==='employes')   return <svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth="2"/><circle cx="9" cy="10" r="2" stroke={color} strokeWidth="2"/><path d="M5 18c0-2.2 1.8-4 4-4" stroke={color} strokeWidth="2" strokeLinecap="round"/><path d="M13 9h4M13 13h3" stroke={color} strokeWidth="2" strokeLinecap="round"/></svg>;
  if (type==='mesdem')     return <svg {...p}><path d="M8.5 7H20M8.5 12H20M8.5 17H20" stroke={color} strokeWidth="2" strokeLinecap="round"/><circle cx="5" cy="7" r="1.1" fill={color}/><circle cx="5" cy="12" r="1.1" fill={color}/><circle cx="5" cy="17" r="1.1" fill={color}/></svg>;
  if (type==='signatures') return <svg {...p}><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 3 21l.5-4.5L17 3z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 21h18" stroke={color} strokeWidth="2" strokeLinecap="round"/></svg>;
  if (type==='nouvelle')   return <svg {...p}><path d="M7 4H14L18.5 8.5V20H7V4Z" stroke={color} strokeWidth="2"/><path d="M14 4V8.3H18.2" stroke={color} strokeWidth="2"/><path d="M10 13h4M12 11v4" stroke={color} strokeWidth="2" strokeLinecap="round"/></svg>;
  if (type==='profil')     return <svg {...p}><circle cx="12" cy="8" r="3.2" stroke={color} strokeWidth="2"/><path d="M5.8 19C6.7 15.9 8.9 14 12 14C15.1 14 17.3 15.9 18.2 19" stroke={color} strokeWidth="2" strokeLinecap="round"/></svg>;
  if (type==='calendar')   return <svg {...p}><rect x="4" y="5.5" width="16" height="14" rx="2" stroke={color} strokeWidth="2"/><path d="M8 4V7M16 4V7M4.5 9.5H19.5" stroke={color} strokeWidth="2" strokeLinecap="round"/></svg>;
  return <svg {...p}><path d="M19 13.5C19.1 13 19.2 12.5 19.2 12C19.2 11.5 19.1 11 19 10.5L21 9L19.2 5.5L16.7 6.4C15.9 5.8 15 5.3 14 5L13.7 2.5H10.3L10 5C9 5.3 8.1 5.8 7.3 6.4L4.8 5.5L3 9L5 10.5C4.9 11 4.8 11.5 4.8 12C4.8 12.5 4.9 13 5 13.5L3 15L4.8 18.5L7.3 17.6C8.1 18.2 9 18.7 10 19L10.3 21.5H13.7L14 19C15 18.7 15.9 18.2 16.7 17.6L19.2 18.5L21 15L19 13.5Z" stroke={color} strokeWidth="1.6"/><circle cx="12" cy="12" r="2.8" stroke={color} strokeWidth="1.6"/></svg>;
}

function LogoutIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14.5 6.8V5.6C14.5 4.7 13.8 4 12.9 4H6.8C5.9 4 5.2 4.7 5.2 5.6V18.4C5.2 19.3 5.9 20 6.8 20H12.9C13.8 20 14.5 19.3 14.5 18.4V17.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/><path d="M10.4 12H20.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/><path d="M17.6 9.3L20.3 12L17.6 14.7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const toast = useToast();

  const utilisateur = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('utilisateur') || 'null'); }
    catch { return null; }
  }, []);
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const [activeMenu, setActiveMenu] = useState('overview');
  const [backgroundMenu, setBackgroundMenu] = useState('overview');
  const [openPanel, setOpenPanel] = useState('');

  const [profil, setProfil] = useState(null);
  const [demandes, setDemandes] = useState([]);
  const [employes, setEmployes] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [mesDemandes, setMesDemandes] = useState([]);
  const [demandesTraiteesInterim, setDemandesTraiteesInterim] = useState([]);
  const [signatures, setSignatures] = useState([]);

  const [typeConge, setTypeConge] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [motif, setMotif] = useState('');
  const [interimRhId, setInterimRhId] = useState('');
  const [interimairesRH, setInterimairesRH] = useState([]);
  const [nbJoursManuel, setNbJoursManuel] = useState(null);
  const [erreurDemande, setErreurDemande] = useState('');
  const [successDemande, setSuccessDemande] = useState('');

  const [filterStatut, setFilterStatut] = useState('Tous');
  const [filterType, setFilterType] = useState('Tous');
  const [filterMesDemandes, setFilterMesDemandes] = useState('Tous');
  const [searchDem, setSearchDem] = useState('');
  const [searchEmp, setSearchEmp] = useState('');

  const [editSolde, setEditSolde] = useState(0);
  const [editReliquat, setEditReliquat] = useState(0);
  const [demandeSelectionnee, setDemandeSelectionnee] = useState(null);
  const [employeSelectionne, setEmployeSelectionne] = useState(null);
  const [loadingDecision, setLoadingDecision] = useState(false);

  const [newSigLabel, setNewSigLabel] = useState('');
  const [newSigFile, setNewSigFile] = useState(null);
  const [newSigPreview, setNewSigPreview] = useState(null);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [viewMode, setViewMode] = useState('month');
  const [selectedDay, setSelectedDay] = useState(null);

  const showNouvelleDemande = activeMenu === 'nouvelle';
  const visibleMenu = showNouvelleDemande ? backgroundMenu : activeMenu;

  const nbJours = useMemo(() => {
    setNbJoursManuel(null);
    if (!dateDebut || !dateFin) return '';
    const [dy,dm,dd] = dateDebut.split('-').map(Number);
    const [fy,fm,fd] = dateFin.split('-').map(Number);
    const debut = new Date(dy, dm-1, dd);
    const fin   = new Date(fy, fm-1, fd);
    if (fin < debut) return '0';
    if (typeConge === 'exceptionnel') return String(Math.floor((fin-debut)/86400000)+1);
    const getLundi = (d) => { const c=new Date(d); const j=d.getDay(); c.setDate(d.getDate()+(j===0?-6:1-j)); return c; };
    const lundiDebut = getLundi(debut);
    const lundiFin   = getLundi(fin);
    const nbSemaines = Math.round((lundiFin - lundiDebut) / (7*86400000));
    if (nbSemaines === 0) return String(Math.floor((fin-debut)/86400000)+1);
    const dimS1 = new Date(lundiDebut); dimS1.setDate(lundiDebut.getDate()+6);
    const joursS1 = Math.floor((dimS1-debut)/86400000)+1;
    const joursDerniere = Math.floor((fin-lundiFin)/86400000)+1;
    const nbInter = nbSemaines - 1;
    let total = joursS1 + (nbInter * 7) + joursDerniere;
    const finJour = fin.getDay();
    if (finJour >= 1 && finJour <= 4 && nbSemaines >= 2) total -= 2;
    return String(total);
  }, [dateDebut, dateFin, typeConge]);

  const chargerDonnees = useCallback(() => {
    axios.get(`${API}/utilisateurs/profil`, { headers }).then(r => setProfil(r.data)).catch(()=>{});
    axios.get(`${API}/demandes/rh`, { headers }).then(r => setDemandes(r.data)).catch(()=>{});
    axios.get(`${API}/utilisateurs`, { headers }).then(r => setEmployes(r.data)).catch(()=>{});
    axios.get(`${API}/notifications`, { headers }).then(r => setNotifications(r.data)).catch(()=>{});
    axios.get(`${API}/demandes/mes-demandes`, { headers }).then(r => setMesDemandes(r.data)).catch(()=>{});
    axios.get(`${API}/demandes/rh/traitees-par-interim`, { headers }).then(r => setDemandesTraiteesInterim(r.data)).catch(()=>{});
    axios.get(`${API}/signatures`, { headers }).then(r => setSignatures(r.data)).catch(()=>{});
  }, []);

  useEffect(() => {
    if (!utilisateur) { navigate('/login'); return; }
    chargerDonnees();
  }, []);

  useEffect(() => {
    if (!dateDebut || !dateFin) {
      axios.get(`${API}/utilisateurs/interimaires-rh`, { headers }).then(r => { setInterimairesRH(r.data); setInterimRhId(''); }).catch(()=>{});
      return;
    }
    axios.get(`${API}/utilisateurs/interimaires-rh`, { headers, params: { date_debut: dateDebut, date_fin: dateFin } })
      .then(r => { setInterimairesRH(r.data); setInterimRhId(''); }).catch(()=>{});
  }, [dateDebut, dateFin]);

  const nonLues = notifications.filter(n => !n.lu).length;
  const countByStatut = (s) => demandes.filter(d => d.statut === s).length;
  const demandesAApprouver = demandes.filter(d => d.statut === 'approuve_responsable');
  const absentsAujourdhui = demandes.filter(d => d.statut==='signe_directeur' && todayStr>=d.date_debut?.slice(0,10) && todayStr<=d.date_fin?.slice(0,10)).length;
  const tauxValidation = demandes.length > 0 ? Math.round((demandes.filter(d=>d.statut==='signe_directeur').length / demandes.length)*100) : 0;

  const repartitionParType = useMemo(() => {
    const counts = {};
    demandes.forEach(d => { counts[d.type_conge] = (counts[d.type_conge]||0)+1; });
    return counts;
  }, [demandes]);

  const demandesFiltrees = useMemo(() => demandes.filter(d => {
    if (filterStatut!=='Tous' && d.statut!==filterStatut) return false;
    if (filterType!=='Tous' && d.type_conge!==filterType) return false;
    if (searchDem && !`${d.prenom} ${d.nom}`.toLowerCase().includes(searchDem.toLowerCase()) && !d.reference?.toLowerCase().includes(searchDem.toLowerCase())) return false;
    return true;
  }), [demandes, filterStatut, filterType, searchDem]);

  const employesFiltres = useMemo(() => employes.filter(e => {
    if (!searchEmp) return true;
    return `${e.prenom} ${e.nom}`.toLowerCase().includes(searchEmp.toLowerCase()) || e.cin?.toLowerCase().includes(searchEmp.toLowerCase()) || e.email?.toLowerCase().includes(searchEmp.toLowerCase());
  }), [employes, searchEmp]);

  const calCells = useMemo(() => buildCalendar(calYear, calMonth), [calYear, calMonth]);
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const timelineDays = Array.from({length:daysInMonth}, (_,i) => new Date(calYear, calMonth, i+1));

  const getCongesForDay = (day) => {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return demandes.filter(d => ['approuve_responsable','approuve_rh','signe_directeur'].includes(d.statut) && dateStr>=d.date_debut?.slice(0,10) && dateStr<=d.date_fin?.slice(0,10));
  };

  const selectedDayConges = selectedDay ? getCongesForDay(selectedDay) : [];

  const timelineEmployes = useMemo(() => {
    const moisStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}`;
    const congesMois = demandes.filter(d => ['approuve_responsable','approuve_rh','signe_directeur'].includes(d.statut) && d.date_debut?.slice(0,7)<=moisStr && d.date_fin?.slice(0,7)>=moisStr);
    const map = {};
    congesMois.forEach(d => { if (!map[d.utilisateur_id]) map[d.utilisateur_id]={nom:`${d.prenom} ${d.nom}`,bars:[]}; map[d.utilisateur_id].bars.push(d); });
    return Object.values(map);
  }, [demandes, calYear, calMonth]);

  const soumettredemande = async (e) => {
    e.preventDefault();
    setErreurDemande(''); setSuccessDemande('');
    try {
      if (interimRhId) await axios.put(`${API}/utilisateurs/profil/interim-rh`, { interim_rh_id: interimRhId }, { headers });
      const res = await axios.post(`${API}/demandes`, { type_conge: typeConge, date_debut: dateDebut, date_fin: dateFin, motif, interimaire_id: null, nb_jours_override: (typeConge === 'exceptionnel' && nbJoursManuel) ? nbJoursManuel : null }, { headers });
      setSuccessDemande(`Demande créée ! Référence : ${res.data.reference}`);
      setTypeConge(''); setDateDebut(''); setDateFin(''); setMotif(''); setInterimRhId(''); setNbJoursManuel(null);
      chargerDonnees();
      setTimeout(() => { setActiveMenu(backgroundMenu); setSuccessDemande(''); }, 2500);
    } catch (err) { setErreurDemande(err.response?.data?.message || 'Erreur'); }
  };

  const visaRH = async (decision) => {
    if (!demandeSelectionnee) return;
    setLoadingDecision(true);
    try {
      await axios.put(`${API}/demandes/${demandeSelectionnee.id}/visa-rh`, { decision }, { headers });
      setDemandeSelectionnee(null);
      chargerDonnees();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur lors du visa RH'); }
    finally { setLoadingDecision(false); }
  };

  const prenom = profil?.prenom || utilisateur?.prenom || '';
  const nom    = profil?.nom    || utilisateur?.nom    || '';

  if (!utilisateur || utilisateur.role !== 'rh') return <Navigate to="/login" replace />;

  return (
    <div className="admin-shell">
      <div className={`admin-layout ${showNouvelleDemande ? 'is-dimmed' : ''}`}>
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <img src={logo} alt="MODEP"/>
            <div><strong>MODEP</strong><small>Dashboard RH</small></div>
          </div>
          <nav className="admin-nav">
            {menuItems.map(item => (
              <button key={item.key} className={activeMenu===item.key?'active':''} onClick={() => {
                if (item.key==='nouvelle') { setBackgroundMenu(activeMenu==='nouvelle'?backgroundMenu:activeMenu); setActiveMenu('nouvelle'); return; }
                setOpenPanel(''); setActiveMenu(item.key); setBackgroundMenu(item.key);
              }}>
                <span><SideIcon type={item.icon} active={activeMenu===item.key}/></span>
                {item.label}
                {item.key==='demandes' && demandesAApprouver.length>0 && <span className="nav-badge">{demandesAApprouver.length}</span>}
              </button>
            ))}
          </nav>
          <button className="admin-logout" onClick={()=>{ localStorage.removeItem('token'); localStorage.removeItem('utilisateur'); navigate('/login'); }}>
            <span><LogoutIcon/></span>Se déconnecter
          </button>
        </aside>

        <main className="admin-main">
          <header className="admin-header">
            <div><h1>Tableau de bord RH</h1><p>Bienvenue, {prenom} !</p></div>
            <div className="admin-top-right">
              <button className={`icon-btn notif-btn ${openPanel==='notif'?'active':''}`} onClick={() => {
                const p = openPanel==='notif'?'':'notif'; setOpenPanel(p);
                if (p==='notif' && nonLues>0) axios.put(`${API}/notifications/tout-lire`,{},{headers}).then(()=>setNotifications(prev=>prev.map(n=>({...n,lu:true}))));
              }}>🔔{nonLues>0&&<i className="notif-dot"/>}</button>
              <button className="avatar-btn" onClick={()=>setActiveMenu('profil')}>{prenom.charAt(0)}</button>
              <div className="admin-user"><span>{prenom} {nom}</span><small>RH</small></div>
            </div>
            {openPanel==='notif' && (
              <div className="admin-header-panel admin-panel-notif">
                <h4>Notifications</h4>
                {notifications.length===0?<p>Aucune notification.</p>:notifications.slice(0,5).map(n=>(
                  <p key={n.id} style={{opacity:n.lu?0.6:1,fontSize:13}}>{n.message}</p>
                ))}
              </div>
            )}
          </header>

          {/* ══ OVERVIEW ══ */}
          {visibleMenu==='overview' && (
            <>
              <section className="admin-kpi-grid">
                {[
                  {label:'Demandes à valider', value:String(demandesAApprouver.length), tone:'orange', icon:'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z'},
                  {label:'Employés actifs',    value:String(employes.length),           tone:'blue',   icon:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0'},
                  {label:"En congé aujourd'hui",value:String(absentsAujourdhui),         tone:'violet', icon:'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'},
                  {label:'Taux de validation', value:`${tauxValidation}%`,              tone:'green',  icon:'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'},
                ].map(card=>(
                  <article key={card.label} className={`balance-card card-${card.tone}`}>
                    <div className="bc-icon-wrap"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={card.icon}/></svg></div>
                    <p className="bc-label">{card.label}</p><i/><p className="bc-value">{card.value}</p>
                  </article>
                ))}
              </section>

              <section className="admin-content-grid">
                <div className="admin-panel emp-panel-wrap">
                  <div className="adm-emp-head">
                    <div className="adm-emp-head-left">
                      <h2 className="adm-emp-title">Demandes récentes</h2>
                      <span className="adm-emp-count">{demandes.length} demandes</span>
                    </div>
                    <button className="adm-btn-toutes" onClick={()=>setActiveMenu('demandes')}>
                      Toutes les demandes
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </button>
                  </div>
                  <div className="adm-emp-kpi-strip">
                    <div className="adm-kpi-chip adm-chip-wait" style={{cursor:'pointer'}} onClick={()=>{setFilterStatut('approuve_responsable');setActiveMenu('demandes');}}><span>À valider</span><strong>{countByStatut('approuve_responsable')}</strong></div>
                    <div className="adm-kpi-chip adm-chip-ok"   style={{cursor:'pointer'}} onClick={()=>{setFilterStatut('approuve_rh');setActiveMenu('demandes');}}><span>Visés RH</span><strong>{countByStatut('approuve_rh')}</strong></div>
                    <div className="adm-kpi-chip adm-chip-no"   style={{cursor:'pointer'}} onClick={()=>{setFilterStatut('refuse');setActiveMenu('demandes');}}><span>Refusés</span><strong>{countByStatut('refuse')}</strong></div>
                    <div className="adm-kpi-chip adm-chip-total"><span>Total</span><strong>{demandes.length}</strong></div>
                  </div>
                  <div className="adm-emp-table-wrap">
                    <table className="adm-emp-table">
                      <thead><tr><th>Employé</th><th>Type</th><th>Dates</th><th>Jours</th><th>Statut</th><th>Action</th></tr></thead>
                      <tbody>
                        {demandes.slice(0,6).map(d=>{
                          const cfg=LEAVE_TYPE_CONFIG[d.type_conge]||{};
                          return (
                            <tr key={d.id} className="adm-emp-row">
                              <td><div className="adm-emp-cell"><span className="adm-emp-avatar">{d.prenom?.charAt(0)}</span><div><span className="adm-emp-name">{d.prenom} {d.nom}</span><small style={{display:'block',color:'#9aa4c2',fontSize:11}}>{d.departement}</small></div></div></td>
                              <td><span className="dem-type-badge" style={{background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.color}`}}>{cfg.label||d.type_conge}</span></td>
                              <td><small>{d.date_debut?.slice(0,10)} → {d.date_fin?.slice(0,10)}</small></td>
                              <td><strong>{d.nb_jours}j</strong></td>
                              <td><span className={`adm-statut-pill ${d.statut==='refuse'?'apill-no':d.statut==='approuve_rh'||d.statut==='signe_directeur'?'apill-ok':'apill-wait'}`}>{STATUT_LABELS[d.statut]||d.statut}</span></td>
                              <td>
                                {(d.statut==='approuve_responsable'||d.statut==='en_attente')?(
                                  <div className="dem-actions">
                                    <button className="dem-btn-approve" onClick={()=>setDemandeSelectionnee(d)}>✓ Visa</button>
                                    <button className="dem-btn-refuse" onClick={async(e)=>{e.stopPropagation();await axios.put(`${API}/demandes/${d.id}/visa-rh`,{decision:'refuser'},{headers});chargerDonnees();}}>✕</button>
                                  </div>
                                ):(
                                  <button className="emp-btn-voir" onClick={()=>setDemandeSelectionnee(d)}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><path d="M2 12C4 7 8 4 12 4s8 3 10 8c-2 5-6 8-10 8S4 17 2 12Z" stroke="currentColor" strokeWidth="2"/></svg>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {demandes.length===0&&<tr><td colSpan="6" className="dem-empty">Aucune demande.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>

                <aside className="admin-side-panels">
                  <div className="admin-panel stat-fill">
                    <h3>Résumé rapide RH</h3>
                    {[
                      {label:'À valider',           value:String(demandesAApprouver.length), dot:'#e65100'},
                      {label:"Absents aujourd'hui", value:String(absentsAujourdhui),          dot:'#6a4cc1'},
                      {label:'Total employés',      value:String(employes.length),            dot:'#2b6cb0'},
                      {label:'Taux validation',     value:`${tauxValidation}%`,               dot:'#2e7d32'},
                    ].map(item=>(
                      <div key={item.label} className="quick-row">
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{width:8,height:8,borderRadius:'50%',background:item.dot,flexShrink:0,display:'inline-block'}}/>
                          <span>{item.label}</span>
                        </div>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                    <button className="quick-action" onClick={()=>setActiveMenu('calendrier')}>Voir le calendrier</button>
                  </div>
                  <div className="admin-panel">
                    <h3 style={{margin:'0 0 14px',fontSize:15,color:'#1a2340',fontWeight:700}}>Répartition des congés</h3>
                    {Object.entries(LEAVE_TYPE_CONFIG).map(([key,cfg])=>{
                      const count=repartitionParType[key]||0;
                      const pct=demandes.length>0?Math.round((count/demandes.length)*100):0;
                      return (
                        <div key={key} style={{marginBottom:10}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                            <span style={{fontSize:12,color:'#5a6a8e',fontWeight:600,display:'flex',alignItems:'center',gap:6}}><i style={{width:8,height:8,borderRadius:'50%',background:cfg.color,display:'inline-block'}}/>{cfg.label}</span>
                            <span style={{fontSize:12,fontWeight:700,color:'#2c3553'}}>{count}</span>
                          </div>
                          <div style={{height:6,background:'#edf2fb',borderRadius:999,overflow:'hidden'}}><div style={{height:'100%',width:`${pct}%`,background:cfg.color,borderRadius:999}}/></div>
                        </div>
                      );
                    })}
                  </div>
                </aside>
              </section>
            </>
          )}

          {/* ══ DEMANDES ══ */}
          {visibleMenu==='demandes' && (
            <section className="demandes-page">
              <div className="dem-kpi-row">
                {[
                  {label:'À valider', statut:'approuve_responsable', tone:'orange'},
                  {label:'Visés RH',  statut:'approuve_rh',          tone:'blue'},
                  {label:'Signés',    statut:'signe_directeur',       tone:'green'},
                  {label:'Refusés',   statut:'refuse',                tone:'red'},
                ].map(k=>(
                  <div key={k.statut} className={`dem-kpi-card tone-${k.tone}`} style={{cursor:'pointer'}} onClick={()=>setFilterStatut(k.statut)}>
                    <div><p>{k.label}</p><strong>{countByStatut(k.statut)}</strong></div>
                  </div>
                ))}
              </div>
              <div className="dem-toolbar">
                <div className="dem-search-wrap">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="#9aa4c2" strokeWidth="2"/><path d="M16 16L20 20" stroke="#9aa4c2" strokeWidth="2" strokeLinecap="round"/></svg>
                  <input className="dem-search" type="text" placeholder="Rechercher employé, référence..." value={searchDem} onChange={e=>setSearchDem(e.target.value)}/>
                </div>
                <div className="dem-filters">
                  <div className="dem-filter-tabs">
                    {[{key:'Tous',label:'Tous'},{key:'en_attente',label:'En attente'},{key:'approuve_responsable',label:'À valider'},{key:'signe_directeur',label:'Approuvés'},{key:'refuse',label:'Refusés'}].map(({key,label})=>(
                      <button key={key} className={filterStatut===key?'active':''} onClick={()=>setFilterStatut(key)}>
                        {label}{key!=='Tous'&&<span className="dem-tab-count">{countByStatut(key)}</span>}
                      </button>
                    ))}
                  </div>
                  <select className="dem-type-select" value={filterType} onChange={e=>setFilterType(e.target.value)}>
                    <option value="Tous">Tous les types</option>
                    {Object.entries(LEAVE_TYPE_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="dem-table-wrap">
                <table className="dem-table">
                  <thead><tr>
                    <th style={{width:'14%'}}>Référence</th><th style={{width:'16%'}}>Employé</th>
                    <th style={{width:'13%'}}>Type</th><th style={{width:'10%'}}>Date début</th>
                    <th style={{width:'10%'}}>Date fin</th><th style={{width:'6%'}}>Jours</th>
                    <th style={{width:'10%'}}>Statut</th><th style={{width:'8%',textAlign:'center'}}>Action</th>
                  </tr></thead>
                  <tbody>
                    {demandesFiltrees.length===0?<tr><td colSpan="8" className="dem-empty">Aucune demande trouvée.</td></tr>
                    :demandesFiltrees.map(d=>{
                      const cfg=LEAVE_TYPE_CONFIG[d.type_conge]||{};
                      return (
                        <tr key={d.id} className="dem-row" onClick={()=>setDemandeSelectionnee(d)}>
                          <td className="dem-id">{d.reference}</td>
                          <td><div className="dem-employe"><span className="dem-avatar" style={{background:cfg.color||'#9aa4c2'}}>{d.prenom?.charAt(0)}</span>{d.prenom} {d.nom}</div></td>
                          <td><span className="dem-type-badge" style={{background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.color}`}}>{cfg.label||d.type_conge}</span></td>
                          <td>{d.date_debut?.slice(0,10)}</td><td>{d.date_fin?.slice(0,10)}</td>
                          <td><strong>{d.nb_jours}j</strong></td>
                          <td><span className={`status-pill ${STATUT_CLASS[d.statut]||'wait'}`}>{STATUT_LABELS[d.statut]||d.statut}</span></td>
                          <td onClick={e=>e.stopPropagation()}>
                            {(d.statut==='approuve_responsable'||d.statut==='en_attente')?(
                              <div className="dem-actions">
                                <button className="dem-btn-approve" onClick={()=>setDemandeSelectionnee(d)}>✓ Visa</button>
                                <button className="dem-btn-refuse" onClick={async()=>{await axios.put(`${API}/demandes/${d.id}/visa-rh`,{decision:'refuser'},{headers});chargerDonnees();}}>✕</button>
                              </div>
                            ):(
                              <button className="emp-btn-voir" onClick={()=>setDemandeSelectionnee(d)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><path d="M2 12C4 7 8 4 12 4s8 3 10 8c-2 5-6 8-10 8S4 17 2 12Z" stroke="currentColor" strokeWidth="2"/></svg>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {demandesTraiteesInterim.length>0&&(
                <div className="dem-table-wrap" style={{marginTop:24}}>
                  <div className="adm-emp-head" style={{padding:'16px 18px 12px',borderBottom:'1px solid #f0f3fb'}}>
                    <div className="adm-emp-head-left">
                      <h2 className="adm-emp-title">Traitées par mon intérimaire pendant mon absence</h2>
                      <span className="adm-emp-count" style={{background:'#fff8ef',color:'#b45309',borderColor:'#fde68a'}}>{demandesTraiteesInterim.length} demande{demandesTraiteesInterim.length>1?'s':''}</span>
                    </div>
                  </div>
                  <table className="dem-table">
                    <thead><tr>
                      <th>Référence</th><th>Employé</th><th>Type</th>
                      <th>Date début</th><th>Date fin</th><th>Jours</th>
                      <th>Statut</th><th>Intérimaire</th><th style={{textAlign:'center'}}>Action</th>
                    </tr></thead>
                    <tbody>
                      {demandesTraiteesInterim.map(d=>{
                        const cfg=LEAVE_TYPE_CONFIG[d.type_conge]||{};
                        const sc=d.statut==='refuse'?'no':d.statut==='signe_directeur'||d.statut==='approuve_rh'?'ok':'wait';
                        return (
                          <tr key={d.id} className="dem-row">
                            <td className="dem-id">{d.reference}</td>
                            <td><div className="dem-employe"><span className="dem-avatar" style={{background:cfg.color||'#9aa4c2'}}>{d.prenom?.charAt(0)}</span>{d.prenom} {d.nom}</div></td>
                            <td><span className="dem-type-badge" style={{background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.color}`}}>{cfg.label||d.type_conge}</span></td>
                            <td>{d.date_debut?.slice(0,10)}</td><td>{d.date_fin?.slice(0,10)}</td>
                            <td><strong>{d.nb_jours}j</strong></td>
                            <td><span className={`status-pill ${sc}`}>{STATUT_LABELS[d.statut]||d.statut}</span></td>
                            <td><span style={{fontWeight:600,color:'#6a63dc',fontSize:13}}>{d.interimaire_prenom} {d.interimaire_nom}</span></td>
                            <td style={{textAlign:'center'}}><button className="emp-btn-voir" onClick={()=>setDemandeSelectionnee(d)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><path d="M2 12C4 7 8 4 12 4s8 3 10 8c-2 5-6 8-10 8S4 17 2 12Z" stroke="currentColor" strokeWidth="2"/></svg></button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* ══ EMPLOYÉS ══ */}
          {visibleMenu==='employes' && (
            <section className="admin-panel" style={{width:'100%',boxSizing:'border-box'}}>
              <div className="adm-emp-head">
                <div className="adm-emp-head-left">
                  <h2 className="adm-emp-title">Gestion des employés</h2>
                  <span className="adm-emp-count">{employes.length} employés</span>
                </div>
                <div className="adm-emp-search">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9aa4c2" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg>
                  <input type="text" placeholder="Rechercher employé, CIN, email..." value={searchEmp} onChange={e=>setSearchEmp(e.target.value)}/>
                </div>
              </div>
              <div className="adm-emp-table-wrap" style={{overflowX:'auto'}}>
                <table className="adm-emp-table">
                  <colgroup><col/><col/><col/><col/><col/><col/><col/><col/></colgroup>
                  <thead><tr>
                    <th>Employé</th><th>CIN</th><th>Email</th><th>Département</th>
                    <th>Rôle</th><th>Solde</th><th>Reliquat</th><th style={{textAlign:'center'}}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {employesFiltres.length===0?<tr><td colSpan="8" className="dem-empty">Aucun employé trouvé.</td></tr>
                    :employesFiltres.map(e=>(
                      <tr key={e.id} className="adm-emp-row">
                        <td><div className="adm-emp-cell"><span className="adm-emp-avatar">{e.prenom?.charAt(0)}</span><div><span className="adm-emp-name">{e.prenom} {e.nom}</span><small style={{display:'block',color:'#9aa4c2',fontSize:11}}>{e.fonction}</small></div></div></td>
                        <td><span className="adm-emp-cin">{e.cin||'-'}</span></td>
                        <td style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}><span title={e.email}>{e.email}</span></td>
                        <td>{e.departement||'-'}</td>
                        <td><span className={`adm-statut-pill ${e.role==='employe'?'apill-wait':'apill-ok'}`}>{e.role}</span></td>
                        <td><span className="adm-emp-solde">{e.solde_conge||0} j</span></td>
                        <td>{e.reliquat||0} j</td>
                        <td style={{textAlign:'center'}}><button className="adm-btn-modifier" onClick={()=>{setEmployeSelectionne(e);setEditSolde(e.solde_conge||0);setEditReliquat(e.reliquat||0);}}>Modifier</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ══ CALENDRIER ══ */}
          {visibleMenu==='calendrier' && (
            <section className="cal-page">
              <div className="cal-topbar">
                <div className="cal-topbar-left">
                  <h2 className="cal-title">Calendrier des congés</h2>
                  <div className="cal-month-nav">
                    <button className="cal-nav-btn" onClick={()=>{if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);setSelectedDay(null);}}>‹</button>
                    <span className="cal-month-label">{MOIS_FR[calMonth]} {calYear}</span>
                    <button className="cal-nav-btn" onClick={()=>{if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);setSelectedDay(null);}}>›</button>
                    <button className="cal-today-btn" onClick={()=>{setCalYear(today.getFullYear());setCalMonth(today.getMonth());setSelectedDay(today.getDate());}}>Aujourd'hui</button>
                  </div>
                </div>
                <div className="cal-topbar-right">
                  <div className="cal-view-toggle">
                    <button className={viewMode==='month'?'active':''} onClick={()=>setViewMode('month')}><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 9h18M8 4V2M16 4V2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
                    <button className={viewMode==='timeline'?'active':''} onClick={()=>setViewMode('timeline')}><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
                  </div>
                </div>
              </div>
              <div className="cal-stats-row">
                {[
                  {label:'Total employés',      value:String(employes.length),   tone:'blue'},
                  {label:"En congé aujourd'hui",value:String(absentsAujourdhui), tone:'violet'},
                  {label:'En attente',          value:String(countByStatut('approuve_responsable')),tone:'orange'},
                  {label:'Approuvés',           value:String(countByStatut('approuve_rh')+countByStatut('signe_directeur')),tone:'green'},
                ].map(s=>(
                  <div key={s.label} className={`cal-stat-card tone-${s.tone}`}><div><p>{s.label}</p><strong>{s.value}</strong></div></div>
                ))}
                <div className="cal-legend-inline">
                  {Object.entries(LEAVE_TYPE_CONFIG).map(([key,cfg])=>(
                    <span key={key} className="cal-legend-item"><i style={{background:cfg.color}}/>{cfg.label}</span>
                  ))}
                </div>
              </div>
              <div className="cal-body">
                {viewMode==='month'?(
                  <div className="cal-month-view">
                    <div className="cal-day-names">{DAY_NAMES.map(d=><div key={d} className="cal-day-name">{d}</div>)}</div>
                    <div className="cal-grid">
                      {calCells.map((cell,idx)=>{
                        if (!cell.current) return <div key={idx} className="cal-cell cal-cell-empty"><span className="cal-cell-num" style={{opacity:0.3}}>{cell.day}</span></div>;
                        const conges=getCongesForDay(cell.day);
                        const isToday=cell.day===today.getDate()&&calMonth===today.getMonth()&&calYear===today.getFullYear();
                        const isSelected=selectedDay===cell.day;
                        const isWeekend=new Date(calYear,calMonth,cell.day).getDay()===0||new Date(calYear,calMonth,cell.day).getDay()===6;
                        return (
                          <div key={idx} className={`cal-cell${isToday?' cal-cell-today':''}${isSelected?' cal-cell-selected':''}${isWeekend?' cal-cell-weekend':''}`} onClick={()=>setSelectedDay(isSelected?null:cell.day)}>
                            <span className="cal-cell-num">{cell.day}</span>
                            <div className="cal-cell-events">
                              {conges.slice(0,3).map(c=>{const cfg=LEAVE_TYPE_CONFIG[c.type_conge]||{};return(<div key={c.id} className="cal-event-pill" style={{background:cfg.bg,borderLeft:`3px solid ${cfg.color}`}}><span className="cal-pill-avatar" style={{background:cfg.color}}>{c.prenom?.charAt(0)}</span><span className="cal-pill-name">{c.prenom}</span></div>);})}
                              {conges.length>3&&<div className="cal-event-more">+{conges.length-3} autres</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ):(
                  <div className="cal-timeline-view">
                    <div className="cal-tl-header" style={{display:'grid',gridTemplateColumns:`200px repeat(${daysInMonth},1fr)`}}>
                      <div className="cal-tl-name-col"/>
                      {timelineDays.map(d=>(
                        <div key={d.getDate()} className={`cal-tl-day-head${d.getDate()===today.getDate()&&calMonth===today.getMonth()&&calYear===today.getFullYear()?' cal-tl-today':''}${d.getDay()===0||d.getDay()===6?' cal-tl-weekend':''}`}>
                          <strong>{d.getDate()}</strong><span>{DAY_NAMES[(d.getDay()+6)%7]}</span>
                        </div>
                      ))}
                    </div>
                    <div className="cal-tl-body">
                      {timelineEmployes.length===0&&<div className="cal-tl-empty">Aucun congé ce mois.</div>}
                      {timelineEmployes.map((emp,ei)=>{
                        const monthStart=new Date(calYear,calMonth,1);
                        const monthEnd=new Date(calYear,calMonth+1,0);
                        return (
                          <div key={ei} className="cal-tl-row">
                            <div className="cal-tl-name-col"><span className="cal-tl-avatar">{emp.nom.charAt(0)}</span><p>{emp.nom}</p></div>
                            <div className="cal-tl-track" style={{display:'grid',gridTemplateColumns:`repeat(${daysInMonth},1fr)`,position:'relative',flex:1}}>
                              {timelineDays.map(d=><div key={d.getDate()} className={`cal-tl-cell${d.getDay()===0||d.getDay()===6?' cal-tl-cell-weekend':''}`} style={{gridColumn:d.getDate(),gridRow:1}}/>)}
                              {emp.bars.map((bar,bi)=>{
                                const startDate=new Date(bar.date_debut);
                                const endDate=new Date(bar.date_fin);
                                const clampStart=startDate<monthStart?monthStart:startDate;
                                const clampEnd=endDate>monthEnd?monthEnd:endDate;
                                const cfg=LEAVE_TYPE_CONFIG[bar.type_conge]||{};
                                return (<div key={bi} className="cal-tl-bar" style={{gridColumn:`${clampStart.getDate()} / ${clampEnd.getDate()+1}`,gridRow:1,background:cfg.color,alignSelf:'center',opacity:bar.statut==='en_attente'?0.55:1}} title={`${bar.prenom} ${bar.nom}`}><span className="cal-tl-bar-label">{bar.prenom}</span></div>);
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <aside className="cal-side">
                  {selectedDay?(
                    <div className="cal-side-day">
                      <div className="cal-side-day-header">
                        <strong>{new Date(calYear,calMonth,selectedDay).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</strong>
                        <button className="cal-side-close" onClick={()=>setSelectedDay(null)}>✕</button>
                      </div>
                      {selectedDayConges.length===0?<p className="cal-side-empty">Aucun congé ce jour.</p>:(
                        <div className="cal-side-list">
                          {selectedDayConges.map(c=>{const cfg=LEAVE_TYPE_CONFIG[c.type_conge]||{};return(
                            <div key={c.id} className="cal-side-item" style={{borderLeft:`4px solid ${cfg.color}`}}>
                              <div className="cal-side-item-top"><span className="cal-side-avatar" style={{background:cfg.color}}>{c.prenom?.charAt(0)}</span><div><p>{c.prenom} {c.nom}</p><small>{cfg.label}</small></div></div>
                              <div className="cal-side-item-foot"><span className={`cal-status-badge ${STATUT_CLASS[c.statut]||'wait'}`}>{STATUT_LABELS[c.statut]||c.statut}</span><span className="cal-dates">{c.date_debut?.slice(0,10)} → {c.date_fin?.slice(0,10)}</span></div>
                            </div>
                          );})}
                        </div>
                      )}
                    </div>
                  ):(
                    <div className="cal-side-upcoming">
                      <h4>Prochains congés</h4>
                      <div className="cal-upcoming-list">
                        {demandes.filter(d=>['approuve_rh','signe_directeur'].includes(d.statut)&&d.date_debut?.slice(0,10)>=todayStr).sort((a,b)=>a.date_debut?.localeCompare(b.date_debut)).slice(0,6).map(c=>{
                          const cfg=LEAVE_TYPE_CONFIG[c.type_conge]||{};
                          return (<div key={c.id} className="cal-upcoming-item" style={{borderLeft:`3px solid ${cfg.color}`}}><span className="cal-upcoming-dot" style={{background:cfg.color}}/><div><p>{c.prenom} {c.nom}</p><small>{cfg.label} · dès le {new Date(c.date_debut).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</small></div><span className={`cal-status-badge ${STATUT_CLASS[c.statut]||'wait'}`}>{STATUT_LABELS[c.statut]||c.statut}</span></div>);
                        })}
                      </div>
                      <div className="cal-type-stats">
                        <h4>Répartition par type</h4>
                        {Object.entries(LEAVE_TYPE_CONFIG).map(([key,cfg])=>{
                          const count=repartitionParType[key]||0;
                          const pct=demandes.length>0?Math.round((count/demandes.length)*100):0;
                          return (<div key={key} className="cal-type-row"><div className="cal-type-label"><i style={{background:cfg.color}}/><span>{cfg.label}</span></div><div className="cal-type-bar-wrap"><div className="cal-type-bar" style={{width:`${pct}%`,background:cfg.color}}/></div><span className="cal-type-count">{count}</span></div>);
                        })}
                      </div>
                    </div>
                  )}
                </aside>
              </div>
            </section>
          )}

          {/* ══ PROFIL ══ */}
          {visibleMenu==='profil' && (
            <section className="content-card profile-card">
              <div className="content-head"><h2>Mon profil</h2></div>
              <div className="profile-top">
                <div className="profile-avatar">{prenom.charAt(0)}</div>
                <div><h3>{prenom} {nom}</h3><p>{profil?.fonction||'Administrateur RH'} — {profil?.departement||'MODEP'}</p></div>
              </div>
              <div className="profile-grid">
                {[{label:'Email',value:profil?.email||''},{label:'CIN',value:profil?.cin||''},{label:'Matricule',value:profil?.matricule||''},{label:'Département',value:profil?.departement||''},{label:'Solde actuel',value:`${profil?.solde_conge||0} jours`},{label:'Reliquat',value:`${profil?.reliquat||0} jours`}].map(row=>(
                  <div key={row.label} className="profile-item"><span>{row.label}</span><strong>{row.value}</strong></div>
                ))}
              </div>
            </section>
          )}

          {/* ══ MES DEMANDES ══ */}
          {visibleMenu==='mes-demandes' && (
            <section className="demandes-page">
              <div className="admin-kpi-grid" style={{marginBottom:20}}>
                {[
                  {label:'Congés restants',    value:String((profil?.solde_conge||0)+(profil?.reliquat||0)),tone:'blue',  icon:'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'},
                  {label:'Solde annuel',        value:String(profil?.solde_conge||0)+' j',                   tone:'green', icon:'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'},
                  {label:'Reliquat',            value:String(profil?.reliquat||0)+' j',                      tone:'violet',icon:'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'},
                  {label:'Jours pris',          value:String(mesDemandes.filter(d=>d.statut==='signe_directeur').reduce((a,d)=>a+d.nb_jours,0))+' j',tone:'orange',icon:'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'},
                ].map(card=>(
                  <article key={card.label} className={`balance-card card-${card.tone}`}>
                    <div className="bc-icon-wrap"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={card.icon}/></svg></div>
                    <p className="bc-label">{card.label}</p><i/><p className="bc-value">{card.value}</p>
                  </article>
                ))}
              </div>
              <div className="dem-table-wrap">
                <div className="adm-emp-head" style={{padding:'16px 18px 12px',borderBottom:'1px solid #f0f3fb'}}>
                  <div className="adm-emp-head-left">
                    <h2 className="adm-emp-title">Mes demandes</h2>
                    <span className="adm-emp-count">{mesDemandes.length} demande{mesDemandes.length>1?'s':''}</span>
                  </div>
                  <button className="adm-btn-toutes" onClick={()=>setActiveMenu('nouvelle')}>+ Nouvelle demande</button>
                </div>
                <div style={{padding:'12px 18px',borderBottom:'2px solid #e8edf8',background:'#fff',display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                  {[{key:'Tous',label:'Tous'},{key:'en_attente',label:'En attente'},{key:'approuve_rh',label:'Approuvé RH'},{key:'signe_directeur',label:'Signé'},{key:'refuse',label:'Refusés'}].map(f=>{
                    const count=f.key==='Tous'?mesDemandes.length:mesDemandes.filter(d=>d.statut===f.key).length;
                    const isActive=(filterMesDemandes||'Tous')===f.key;
                    return (
                      <button key={f.key} onClick={()=>setFilterMesDemandes(f.key)} style={{border:isActive?'1.5px solid #197bbd':'1.5px solid transparent',borderRadius:8,padding:'5px 12px',background:isActive?'#fff':'transparent',color:isActive?'#197bbd':'#8a94b5',fontWeight:isActive?700:600,fontSize:13,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,boxShadow:isActive?'0 1px 4px rgba(25,123,189,0.10)':'none'}}>
                        {f.label}<span style={{background:isActive?'#197bbd':'#e2e7f7',color:isActive?'#fff':'#6f7ba8',borderRadius:99,padding:'1px 7px',fontSize:11,fontWeight:700}}>{count}</span>
                      </button>
                    );
                  })}
                </div>
                <table className="dem-table">
                  <thead><tr><th>Référence</th><th>Type</th><th>Date début</th><th>Date fin</th><th>Jours</th><th>Statut</th><th>Documents</th></tr></thead>
                  <tbody>
                    {mesDemandes.length===0?<tr><td colSpan="7" className="dem-empty">Vous n'avez aucune demande.</td></tr>
                    :mesDemandes.filter(d=>filterMesDemandes==='Tous'||d.statut===filterMesDemandes).map(d=>{
                      const cfg=LEAVE_TYPE_CONFIG[d.type_conge]||{};
                      const estSigne=d.statut==='signe_directeur';
                      const sc=d.statut==='refuse'?'no':estSigne||d.statut==='approuve_rh'?'ok':'wait';
                      return (
                        <tr key={d.id} className="dem-row">
                          <td className="dem-id">{d.reference}</td>
                          <td><span className="dem-type-badge" style={{background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.color}`}}>{cfg.label||d.type_conge}</span></td>
                          <td>{d.date_debut?.slice(0,10)}</td><td>{d.date_fin?.slice(0,10)}</td>
                          <td><strong>{d.nb_jours}j</strong></td>
                          <td><span className={`status-pill ${sc}`}>{STATUT_LABELS[d.statut]||d.statut}</span></td>
                          <td>
                            <div style={{display:'flex',gap:6,alignItems:'center'}}>
                              <button onClick={()=>window.open(`${API}/pdf/demande/${d.id}?token=${token}`,'_blank')} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',border:'1px solid #d4e0f8',background:'#f0f5ff',color:'#3a5fbe'}}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>PDF
                              </button>
                              {estSigne&&<button onClick={()=>window.open(`${API}/pdf/titre/${d.id}?token=${token}`,'_blank')} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',border:'1px solid #bbf7d0',background:'#f0fdf4',color:'#16a34a'}}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>Titre
                              </button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ══ SIGNATURES ══ */}
          {visibleMenu==='signatures' && (
            <section className="admin-panel only-panel">
              <div className="adm-emp-head">
                <div className="adm-emp-head-left">
                  <h2 className="adm-emp-title">Signatures du Directeur</h2>
                  <span className="adm-emp-count">{signatures.length} signature(s)</span>
                </div>
              </div>
              <div style={{background:'#f8faff',border:'1px solid #e2e7f7',borderRadius:12,padding:'20px 24px',marginBottom:24}}>
                <h3 style={{margin:'0 0 16px',fontSize:15,color:'#1a2340',fontWeight:700}}>Ajouter une signature</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,alignItems:'end'}}>
                  <label style={{display:'flex',flexDirection:'column',gap:6,fontSize:13,fontWeight:600,color:'#4b506d'}}>
                    Label (ex: Signature officielle)
                    <input type="text" value={newSigLabel} onChange={e=>setNewSigLabel(e.target.value)} placeholder="Nom de la signature..." style={{border:'1px solid #e2e7f7',borderRadius:8,padding:'9px 12px',fontSize:13}}/>
                  </label>
                  <label style={{display:'flex',flexDirection:'column',gap:6,fontSize:13,fontWeight:600,color:'#4b506d'}}>
                    Image (PNG/JPG transparent)
                    <input type="file" accept="image/*" onChange={e=>{const file=e.target.files[0];if(!file)return;setNewSigFile(file);const reader=new FileReader();reader.onload=ev=>setNewSigPreview(ev.target.result);reader.readAsDataURL(file);}} style={{border:'1px solid #e2e7f7',borderRadius:8,padding:'8px',fontSize:13,background:'#fff'}}/>
                  </label>
                </div>
                {newSigPreview&&<div style={{marginTop:12,padding:10,background:'#fff',border:'1px solid #e2e7f7',borderRadius:8,display:'inline-block'}}><img src={newSigPreview} alt="Preview" style={{maxHeight:70,maxWidth:200,objectFit:'contain'}}/><p style={{margin:'6px 0 0',fontSize:11,color:'#9aa4c2'}}>Aperçu</p></div>}
                <button
                  style={{marginTop:16,border:0,borderRadius:10,padding:'10px 28px',background:'#ffc145',cursor:'pointer',fontWeight:700,fontSize:13,display:'block'}}
                  onClick={async()=>{
                    if (!newSigLabel||!newSigPreview) { toast.error('Label et image requis'); return; }
                    try {
                      await axios.post(`${API}/signatures`,{label:newSigLabel,image_data:newSigPreview},{headers});
                      toast.success('Signature ajoutée avec succès !');
                      setNewSigLabel(''); setNewSigFile(null); setNewSigPreview(null);
                      chargerDonnees();
                    } catch { toast.error("Erreur lors de l'ajout"); }
                  }}
                >+ Ajouter la signature</button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:16}}>
                {signatures.length===0&&<p style={{fontSize:13,color:'#9aa4c2'}}>Aucune signature enregistrée.</p>}
                {signatures.map(sig=>(
                  <div key={sig.id} style={{border:`2px solid ${sig.active?'#86efac':'#e2e7f7'}`,borderRadius:12,padding:16,background:'#fff',textAlign:'center'}}>
                    <img src={sig.image_data} alt={sig.label} style={{maxHeight:70,maxWidth:'100%',objectFit:'contain',marginBottom:8}}/>
                    <p style={{margin:'0 0 4px',fontWeight:700,fontSize:13,color:'#1a2340'}}>{sig.label}</p>
                    <p style={{margin:'0 0 12px',fontSize:11,color:sig.active?'#16a34a':'#9aa4c2'}}>{sig.active?'✓ Active':'○ Désactivée'}</p>
                    <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                      <button style={{border:0,borderRadius:8,padding:'6px 14px',background:sig.active?'#fef9c3':'#f0fdf4',cursor:'pointer',fontSize:12,fontWeight:700,color:sig.active?'#854d0e':'#166534'}} onClick={async()=>{await axios.put(`${API}/signatures/${sig.id}/toggle`,{},{headers});chargerDonnees();}}>
                        {sig.active?'Désactiver':'Activer'}
                      </button>
                      <button style={{border:0,borderRadius:8,padding:'6px 14px',background:'#fdecea',cursor:'pointer',fontSize:12,fontWeight:700,color:'#dc2626'}} onClick={()=>toast.askConfirm('Supprimer cette signature ?',async()=>{try{await axios.delete(`${API}/signatures/${sig.id}`,{headers});chargerDonnees();toast.success('Signature supprimée.');}catch{toast.error('Erreur suppression');}})}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ══ PARAMÈTRES ══ */}
          {visibleMenu==='parametres' && (
            <section className="content-card profile-card">
              <div className="content-head"><h2>Paramètres</h2></div>

              <form onSubmit={async(e)=>{
                e.preventDefault();
                const f=e.target;
                try{
                  await axios.put(`${API}/utilisateurs/profil/modifier`,{nom:f.nom.value,prenom:f.prenom.value,email:f.email.value},{headers});
                  toast.success('Profil mis à jour avec succès !');
                }catch(err){toast.error(err.response?.data?.message||'Erreur');}
              }}>
                <h3 style={{margin:'0 0 16px',fontSize:16,color:'#1a2340'}}>Informations personnelles</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px 20px',marginBottom:16}}>
                  <label style={{display:'flex',flexDirection:'column',gap:6,fontSize:13,fontWeight:600,color:'#4b506d'}}>Prénom<input name="prenom" defaultValue={profil?.prenom||''} style={{border:'1px solid #e2e7f7',borderRadius:8,padding:'9px 12px',fontSize:13}} required/></label>
                  <label style={{display:'flex',flexDirection:'column',gap:6,fontSize:13,fontWeight:600,color:'#4b506d'}}>Nom<input name="nom" defaultValue={profil?.nom||''} style={{border:'1px solid #e2e7f7',borderRadius:8,padding:'9px 12px',fontSize:13}} required/></label>
                  <label style={{display:'flex',flexDirection:'column',gap:6,fontSize:13,fontWeight:600,color:'#4b506d'}}>Email<input name="email" type="email" defaultValue={profil?.email||''} style={{border:'1px solid #e2e7f7',borderRadius:8,padding:'9px 12px',fontSize:13}} required/></label>
                </div>
                <button type="submit" style={{border:0,borderRadius:10,padding:'9px 24px',background:'#ffc145',cursor:'pointer',fontWeight:700,fontSize:13}}>Enregistrer le profil</button>
              </form>

              <hr style={{border:0,borderTop:'1px solid #edf1fb',margin:'24px 0'}}/>

              <form onSubmit={async(e)=>{
                e.preventDefault();
                const f=e.target;
                if(f.nouveau.value!==f.confirm.value){toast.error('Les mots de passe ne correspondent pas.');return;}
                if(f.nouveau.value.length<6){toast.error('Minimum 6 caractères.');return;}
                try{
                  await axios.put(`${API}/utilisateurs/profil/mot-de-passe`,{mot_de_passe_actuel:f.actuel.value,nouveau_mot_de_passe:f.nouveau.value},{headers});
                  toast.success('Mot de passe modifié avec succès !');
                  e.target.reset();
                }catch(err){toast.error(err.response?.data?.message||'Erreur');}
              }}>
                <h3 style={{margin:'0 0 16px',fontSize:16,color:'#1a2340'}}>Changer le mot de passe</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px 20px',marginBottom:16}}>
                  <label style={{display:'flex',flexDirection:'column',gap:6,fontSize:13,fontWeight:600,color:'#4b506d'}}>Mot de passe actuel<input name="actuel" type="password" placeholder="••••••••" style={{border:'1px solid #e2e7f7',borderRadius:8,padding:'9px 12px',fontSize:13}} required/></label>
                  <div/>
                  <label style={{display:'flex',flexDirection:'column',gap:6,fontSize:13,fontWeight:600,color:'#4b506d'}}>Nouveau mot de passe<input name="nouveau" type="password" placeholder="••••••••" style={{border:'1px solid #e2e7f7',borderRadius:8,padding:'9px 12px',fontSize:13}} required/></label>
                  <label style={{display:'flex',flexDirection:'column',gap:6,fontSize:13,fontWeight:600,color:'#4b506d'}}>Confirmer<input name="confirm" type="password" placeholder="••••••••" style={{border:'1px solid #e2e7f7',borderRadius:8,padding:'9px 12px',fontSize:13}} required/></label>
                </div>
                <button type="submit" style={{border:0,borderRadius:10,padding:'9px 24px',background:'#197bbd',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:13}}>Changer le mot de passe</button>
              </form>
            </section>
          )}
        </main>
      </div>

      {/* ══ NOUVELLE DEMANDE ══ */}
      {showNouvelleDemande&&(
        <div className="admin-nouvelle-overlay" role="dialog" aria-modal="true" onClick={()=>setActiveMenu(backgroundMenu)}>
          <div className="admin-nouvelle-card" onClick={e=>e.stopPropagation()}>
            <div className="admin-nouvelle-head"><h2>Nouvelle demande RH</h2><button onClick={()=>setActiveMenu(backgroundMenu)}>✕</button></div>
            <form className="admin-form" onSubmit={soumettredemande}>
              {erreurDemande&&<p style={{color:'red',fontSize:13}}>{erreurDemande}</p>}
              {successDemande&&<p style={{color:'green',fontSize:13}}>{successDemande}</p>}
              <label>Type de congé
                <select value={typeConge} onChange={e=>setTypeConge(e.target.value)} required>
                  <option value="" disabled>Sélectionner</option>
                  <option value="annuel">Congé annuel</option>
                  <option value="maladie">Congé maladie</option>
                  <option value="maternite">Congé maternité</option>
                  <option value="sans_solde">Congé sans solde</option>
                  <option value="exceptionnel">Congé exceptionnel</option>
                </select>
              </label>
              <div className="two-inputs">
                <label>Date début<input type="date" value={dateDebut} onChange={e=>setDateDebut(e.target.value)} required/></label>
                <label>Date fin<input type="date" value={dateFin} onChange={e=>setDateFin(e.target.value)} required/></label>
              </div>
              <div className="two-inputs">
                <label>Nbr de jours
                  <input
                    type={typeConge === 'exceptionnel' ? 'number' : 'text'}
                    value={typeConge === 'exceptionnel' ? (nbJoursManuel ?? nbJours ?? '') : (nbJours ? `${nbJours} jour${nbJours === '1' ? '' : 's'}` : '')}
                    onChange={e => { if (typeConge === 'exceptionnel') setNbJoursManuel(Number(e.target.value)); }}
                    placeholder="Calcul auto"
                    readOnly={typeConge !== 'exceptionnel'}
                    min={1}
                    style={typeConge === 'exceptionnel' ? {border:'2px solid #fbbf24',borderRadius:8,padding:'8px 12px',fontSize:13,fontWeight:700,color:'#b45309',background:'#fffbeb',width:'100%',boxSizing:'border-box'} : {}}
                  />
                  {typeConge === 'exceptionnel' && <small style={{color:'#b45309',fontSize:11,marginTop:3,display:'block'}}>Modifiable pour congé exceptionnel</small>}
                </label>
                <div/>
              </div>
              <label>
                Désigner un intérimaire RH <span style={{color:'#e74c3c',fontSize:11}}>obligatoire</span>
                <select value={interimRhId} onChange={e=>setInterimRhId(e.target.value)} required style={{marginTop:6,border:'1px solid #e2e7f7',borderRadius:8,padding:'9px 12px',fontSize:13,width:'100%'}}>
                  <option value="" disabled>Sélectionner l'intérimaire RH...</option>
                  {interimairesRH.length===0&&<option value="" disabled>Aucun disponible sur cette période</option>}
                  {interimairesRH.map(e=><option key={e.id} value={e.id}>{e.prenom} {e.nom} — {e.role==='rh'?'Admin RH':'Responsable'}</option>)}
                </select>
              </label>
              <label>Motif<textarea rows="4" placeholder="Ajouter un motif..." value={motif} onChange={e=>setMotif(e.target.value)}/></label>
              <div className="admin-nouvelle-actions">
                <button type="button" className="btn-secondary" onClick={()=>setActiveMenu(backgroundMenu)}>Annuler</button>
                <button type="submit" className="btn-primary">Envoyer la demande</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL VISA RH ══ */}
      {demandeSelectionnee&&(
        <div className="cal-modal-overlay" onClick={()=>setDemandeSelectionnee(null)}>
          <div className="cal-modal" onClick={e=>e.stopPropagation()}>
            <button className="cal-modal-close" onClick={()=>setDemandeSelectionnee(null)}>✕</button>
            <div className="cal-modal-header" style={{borderTop:`5px solid ${LEAVE_TYPE_CONFIG[demandeSelectionnee.type_conge]?.color||'#9aa4c2'}`}}>
              <span className="cal-modal-avatar" style={{background:LEAVE_TYPE_CONFIG[demandeSelectionnee.type_conge]?.color||'#9aa4c2'}}>{demandeSelectionnee.prenom?.charAt(0)}</span>
              <div><h3>{demandeSelectionnee.prenom} {demandeSelectionnee.nom}</h3><p>{LEAVE_TYPE_CONFIG[demandeSelectionnee.type_conge]?.label} — {demandeSelectionnee.nb_jours} jour(s)</p></div>
            </div>
            <div className="cal-modal-body">
              <div className="cal-modal-row"><span>Référence</span><strong>{demandeSelectionnee.reference}</strong></div>
              <div className="cal-modal-row"><span>Poste</span><strong>{{employe:'Employé',responsable:'Responsable',rh:'Admin RH',directeur:'Directeur Général'}[demandeSelectionnee.role]||demandeSelectionnee.role||'-'}</strong></div>
              <div className="cal-modal-row"><span>Département</span><strong>{demandeSelectionnee.departement||'-'}</strong></div>
              <div className="cal-modal-row"><span>Date début</span><strong>{demandeSelectionnee.date_debut?.slice(0,10)}</strong></div>
              <div className="cal-modal-row"><span>Date fin</span><strong>{demandeSelectionnee.date_fin?.slice(0,10)}</strong></div>
              <div className="cal-modal-row"><span>Motif</span><strong>{demandeSelectionnee.motif||'-'}</strong></div>
              <div className="cal-modal-row"><span>Avis responsable</span><strong>{demandeSelectionnee.avis_responsable||'-'}</strong></div>
              <div className="cal-modal-row"><span>Statut</span><span className={`cal-status-badge ${STATUT_CLASS[demandeSelectionnee.statut]||'wait'}`}>{STATUT_LABELS[demandeSelectionnee.statut]}</span></div>
            </div>
            {(demandeSelectionnee.statut==='approuve_responsable'||demandeSelectionnee.statut==='en_attente')&&(
              <div style={{display:'flex',gap:10,padding:'0 24px 24px'}}>
                <button style={{flex:1,background:'#16a34a',color:'#fff',border:0,borderRadius:10,padding:'10px 0',fontWeight:700,cursor:'pointer'}} onClick={()=>visaRH('approuver')} disabled={loadingDecision}>✓ Accorder visa RH</button>
                <button style={{flex:1,background:'#dc2626',color:'#fff',border:0,borderRadius:10,padding:'10px 0',fontWeight:700,cursor:'pointer'}} onClick={()=>visaRH('refuser')} disabled={loadingDecision}>✕ Refuser</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ MODAL MODIFIER EMPLOYÉ ══ */}
      {employeSelectionne&&(
        <div className="cal-modal-overlay" onClick={()=>setEmployeSelectionne(null)}>
          <div className="cal-modal" style={{width:'min(540px,calc(100vw - 32px))'}} onClick={e=>e.stopPropagation()}>
            <button className="cal-modal-close" onClick={()=>setEmployeSelectionne(null)}>✕</button>
            <div className="cal-modal-header" style={{borderTop:'5px solid #197bbd'}}>
              <span className="cal-modal-avatar" style={{background:'#197bbd'}}>{employeSelectionne.prenom?.charAt(0)}</span>
              <div><h3>{employeSelectionne.prenom} {employeSelectionne.nom}</h3><p>{{employe:'Employé',responsable:'Responsable',rh:'Admin RH',directeur:'Directeur Général'}[employeSelectionne.role]||employeSelectionne.role}</p></div>
            </div>
            <div className="cal-modal-body" style={{gap:8}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <label style={{display:'flex',flexDirection:'column',gap:5,fontSize:13,fontWeight:600,color:'#4b506d'}}>Prénom<input value={employeSelectionne.prenom||''} onChange={e=>setEmployeSelectionne(prev=>({...prev,prenom:e.target.value}))} style={{border:'1px solid #e2e7f7',borderRadius:8,padding:'8px 12px',fontSize:13}}/></label>
                <label style={{display:'flex',flexDirection:'column',gap:5,fontSize:13,fontWeight:600,color:'#4b506d'}}>Nom<input value={employeSelectionne.nom||''} onChange={e=>setEmployeSelectionne(prev=>({...prev,nom:e.target.value}))} style={{border:'1px solid #e2e7f7',borderRadius:8,padding:'8px 12px',fontSize:13}}/></label>
              </div>
              <label style={{display:'flex',flexDirection:'column',gap:5,fontSize:13,fontWeight:600,color:'#4b506d'}}>Email<input type="email" value={employeSelectionne.email||''} onChange={e=>setEmployeSelectionne(prev=>({...prev,email:e.target.value}))} style={{border:'1px solid #e2e7f7',borderRadius:8,padding:'8px 12px',fontSize:13}}/></label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <label style={{display:'flex',flexDirection:'column',gap:5,fontSize:13,fontWeight:600,color:'#4b506d'}}>CIN<input value={employeSelectionne.cin||''} onChange={e=>setEmployeSelectionne(prev=>({...prev,cin:e.target.value}))} style={{border:'1px solid #e2e7f7',borderRadius:8,padding:'8px 12px',fontSize:13}}/></label>
                <label style={{display:'flex',flexDirection:'column',gap:5,fontSize:13,fontWeight:600,color:'#4b506d'}}>Matricule<input value={employeSelectionne.matricule||''} onChange={e=>setEmployeSelectionne(prev=>({...prev,matricule:e.target.value}))} style={{border:'1px solid #e2e7f7',borderRadius:8,padding:'8px 12px',fontSize:13}}/></label>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <label style={{display:'flex',flexDirection:'column',gap:5,fontSize:13,fontWeight:600,color:'#4b506d'}}>Département<input value={employeSelectionne.departement||''} onChange={e=>setEmployeSelectionne(prev=>({...prev,departement:e.target.value}))} style={{border:'1px solid #e2e7f7',borderRadius:8,padding:'8px 12px',fontSize:13}}/></label>
                <label style={{display:'flex',flexDirection:'column',gap:5,fontSize:13,fontWeight:600,color:'#4b506d'}}>Fonction / Poste<input value={employeSelectionne.fonction||''} onChange={e=>setEmployeSelectionne(prev=>({...prev,fonction:e.target.value}))} style={{border:'1px solid #e2e7f7',borderRadius:8,padding:'8px 12px',fontSize:13}}/></label>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:4,paddingTop:12,borderTop:'1px solid #edf1fb'}}>
                <label style={{display:'flex',flexDirection:'column',gap:5,fontSize:13,fontWeight:600,color:'#15803d'}}>Solde de congés (jours)<input type="number" min="0" value={editSolde} onChange={e=>setEditSolde(Number(e.target.value))} style={{border:'2px solid #bbf7d0',borderRadius:8,padding:'8px 12px',fontSize:14,fontWeight:700,color:'#15803d',background:'#f0fdf4'}}/></label>
                <label style={{display:'flex',flexDirection:'column',gap:5,fontSize:13,fontWeight:600,color:'#197bbd'}}>Reliquat (jours)<input type="number" min="0" value={editReliquat} onChange={e=>setEditReliquat(Number(e.target.value))} style={{border:'2px solid #c5dcf8',borderRadius:8,padding:'8px 12px',fontSize:14,fontWeight:700,color:'#197bbd',background:'#eef6ff'}}/></label>
              </div>
            </div>
            <div style={{display:'flex',gap:10,padding:'0 24px 24px'}}>
              <button style={{flex:1,background:'#f2f4fa',color:'#4b506d',border:0,borderRadius:10,padding:'11px 0',fontWeight:700,cursor:'pointer',fontSize:13}} onClick={()=>setEmployeSelectionne(null)}>Annuler</button>
              <button style={{flex:2,background:'#197bbd',color:'#fff',border:0,borderRadius:10,padding:'11px 0',fontWeight:700,cursor:'pointer',fontSize:13}} onClick={async()=>{
                try {
                  await axios.put(`${API}/utilisateurs/${employeSelectionne.id}`,{nom:employeSelectionne.nom,prenom:employeSelectionne.prenom,email:employeSelectionne.email,cin:employeSelectionne.cin,matricule:employeSelectionne.matricule,fonction:employeSelectionne.fonction,departement:employeSelectionne.departement,solde_conge:editSolde,reliquat:editReliquat},{headers});
                  toast.success('Employé modifié avec succès !');
                  setEmployeSelectionne(null);
                  chargerDonnees();
                } catch(err) { toast.error(err.response?.data?.message||'Erreur lors de la modification'); }
              }}>✓ Enregistrer les modifications</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onRemove={toast.remove}/>
    </div>
  );
}
