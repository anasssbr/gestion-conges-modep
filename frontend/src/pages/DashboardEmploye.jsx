import logo from '../assets/logo.png';
import './DashboardEmploye.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:5000/api';

const LEAVE_TYPE_CONFIG = {
  annuel:       { color: '#c55ea8', bg: '#fdf0fb', label: 'Congé annuel' },
  maladie:      { color: '#2ca8f2', bg: '#edf7ff', label: 'Congé maladie' },
  maternite:    { color: '#eead38', bg: '#fffbef', label: 'Congé maternité' },
  sans_solde:   { color: '#6a63dc', bg: '#f2f1ff', label: 'Congé sans solde' },
  exceptionnel: { color: '#e74c3c', bg: '#fdecea', label: 'Congé exceptionnel' },
};

const STATUT_LABELS = {
  en_attente: 'En attente',
  approuve_responsable: 'Approuvé responsable',
  approuve_rh: 'Approuvé RH',
  signe_directeur: 'Signé',
  refuse: 'Refusé'
};

const STATUT_CLASS = {
  en_attente: 'wait',
  approuve_responsable: 'wait',
  approuve_rh: 'wait',
  signe_directeur: 'ok',
  refuse: 'no'
};

const TYPE_OPTIONS = ['Tous les types', 'annuel', 'maladie', 'maternite', 'sans_solde', 'exceptionnel'];

const menuItems = [
  { key: 'overview',   label: 'Overview' },
  { key: 'demandes',   label: 'Mes demandes' },
  { key: 'nouvelle',   label: 'Nouvelle demande' },
  { key: 'profil',     label: 'Mon profil' },
  { key: 'calendrier', label: 'Calendrier' },
  { key: 'parametres', label: 'Paramètres' }
];

const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const getJoursFeries = (year) => [
  { date: `${year}-01-01`, label: 'Jour de l\'An', emoji: '🎉' },
  { date: `${year}-01-11`, label: 'Manifeste de l\'Indépendance', emoji: '🇲🇦' },
  { date: `${year}-05-01`, label: 'Fête du Travail', emoji: '👷' },
  { date: `${year}-07-30`, label: 'Fête du Trône', emoji: '👑' },
  { date: `${year}-08-14`, label: 'Allégeance de l\'Oued Eddahab', emoji: '🇲🇦' },
  { date: `${year}-08-20`, label: 'Révolution du Roi et du Peuple', emoji: '🇲🇦' },
  { date: `${year}-08-21`, label: 'Fête de la Jeunesse', emoji: '🎊' },
  { date: `${year}-11-06`, label: 'Marche Verte', emoji: '🌿' },
  { date: `${year}-11-18`, label: 'Fête de l\'Indépendance', emoji: '🇲🇦' },
];

function SidebarIcon({ type, active }) {
  const color = active ? '#197BBD' : '#C7C7C7';
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none' };
  if (type === 'overview') return <svg {...p}><path d="M4 19.5V5" stroke={color} strokeWidth="2" strokeLinecap="round" /><path d="M4 19.5H20" stroke={color} strokeWidth="2" strokeLinecap="round" /><path d="M8 14L11 11L14 12.5L19 7.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (type === 'demandes') return <svg {...p}><path d="M8.5 7H20" stroke={color} strokeWidth="2" strokeLinecap="round" /><path d="M8.5 12H20" stroke={color} strokeWidth="2" strokeLinecap="round" /><path d="M8.5 17H20" stroke={color} strokeWidth="2" strokeLinecap="round" /><circle cx="5" cy="7" r="1.2" fill={color} /><circle cx="5" cy="12" r="1.2" fill={color} /><circle cx="5" cy="17" r="1.2" fill={color} /></svg>;
  if (type === 'nouvelle') return <svg {...p}><path d="M7 3.8H14.2L18.6 8.2V20H7V3.8Z" stroke={color} strokeWidth="2" strokeLinejoin="round" /><path d="M14 3.9V8.1H18.2" stroke={color} strokeWidth="2" strokeLinejoin="round" /></svg>;
  if (type === 'profil') return <svg {...p}><circle cx="12" cy="8" r="3.3" stroke={color} strokeWidth="2" /><path d="M5.7 19C6.5 15.9 8.8 14 12 14C15.2 14 17.5 15.9 18.3 19" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>;
  if (type === 'calendrier') return <svg {...p}><rect x="4" y="5.4" width="16" height="14" rx="2" stroke={color} strokeWidth="2" /><path d="M8 3.8V7.1" stroke={color} strokeWidth="2" strokeLinecap="round" /><path d="M16 3.8V7.1" stroke={color} strokeWidth="2" strokeLinecap="round" /><path d="M4.5 9.5H19.5" stroke={color} strokeWidth="2" /></svg>;
  return <svg {...p}><path d="M19.1 13.5C19.16 13 19.2 12.5 19.2 12C19.2 11.5 19.16 11 19.1 10.5L21.2 8.9L19.2 5.4L16.7 6.4C15.9 5.8 15 5.3 14 5L13.7 2.4H10.3L10 5C9 5.3 8.1 5.8 7.3 6.4L4.8 5.4L2.8 8.9L4.9 10.5C4.84 11 4.8 11.5 4.8 12C4.8 12.5 4.84 13 4.9 13.5L2.8 15.1L4.8 18.6L7.3 17.6C8.1 18.2 9 18.7 10 19L10.3 21.6H13.7L14 19C15 18.7 15.9 18.2 16.7 17.6L19.2 18.6L21.2 15.1L19.1 13.5Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="12" r="2.9" stroke={color} strokeWidth="1.8" /></svg>;
}

function TopIcon({ type }) {
  if (type === 'mail') return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3.8 6.8H20.2V17.2H3.8V6.8Z" stroke="#C7C7C7" strokeWidth="1.8" /><path d="M4.8 8L12 13.4L19.2 8" stroke="#C7C7C7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 4.6C9.5 4.6 7.5 6.6 7.5 9.1V11.3L6 13.2V14.2H18V13.2L16.5 11.3V9.1C16.5 6.6 14.5 4.6 12 4.6Z" stroke="#C7C7C7" strokeWidth="1.8" strokeLinejoin="round" /><path d="M10.3 16.2C10.5 17.1 11.1 17.6 12 17.6C12.9 17.6 13.5 17.1 13.7 16.2" stroke="#C7C7C7" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

function LogoutIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14.5 6.8V5.6C14.5 4.7 13.8 4 12.9 4H6.8C5.9 4 5.2 4.7 5.2 5.6V18.4C5.2 19.3 5.9 20 6.8 20H12.9C13.8 20 14.5 19.3 14.5 18.4V17.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /><path d="M10.4 12H20.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /><path d="M17.6 9.3L20.3 12L17.6 14.7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

// ─── Système de Toast (partagé) ─────────────────────────────────
function ToastContainer({ toasts, onRemove }) {
  return (
    <div style={{position:'fixed',bottom:24,right:24,zIndex:9999,display:'flex',flexDirection:'column',gap:10,pointerEvents:'none'}}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display:'flex',alignItems:'center',gap:12,
          background:t.type==='error'?'#fff1f2':t.type==='success'?'#f0fdf4':t.type==='warn'?'#fffbeb':'#eff6ff',
          border:`1.5px solid ${t.type==='error'?'#fecaca':t.type==='success'?'#bbf7d0':t.type==='warn'?'#fde68a':'#bfdbfe'}`,
          borderRadius:14,padding:'14px 18px',boxShadow:'0 8px 24px rgba(0,0,0,0.13)',
          minWidth:280,maxWidth:400,pointerEvents:'all',
          animation:'toast-in 0.22s cubic-bezier(.34,1.56,.64,1)'
        }}>
          <span style={{fontSize:20,flexShrink:0}}>
            {t.type==='error'?'❌':t.type==='success'?'✅':t.type==='warn'?'⚠️':'ℹ️'}
          </span>
          <div style={{flex:1}}>
            <p style={{margin:0,fontSize:14,fontWeight:700,color:'#1a2340'}}>{t.title}</p>
            {t.message && <p style={{margin:'3px 0 0',fontSize:12,color:'#5a6480'}}>{t.message}</p>}
          </div>
          <button onClick={()=>onRemove(t.id)} style={{border:0,background:'transparent',cursor:'pointer',fontSize:16,color:'#9aa4c2',padding:0,flexShrink:0}}>✕</button>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));
  const add = (title, message='', type='info', duration=4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, {id, title, message, type}]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  };
  return {
    toasts, remove,
    success: (title, msg='') => add(title, msg, 'success', 4000),
    error:   (title, msg='') => add(title, msg, 'error',   6000),
    warn:    (title, msg='') => add(title, msg, 'warn',    5000),
    info:    (title, msg='') => add(title, msg, 'info',    4000),
  };
}

function buildCalendar(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevDays - i, current: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - firstDay + 1, current: false });
  return cells;
}

function ParametresForm({ profil, headers, API }) {
  const [nom, setNom] = useState(profil?.nom || '');
  const [prenom, setPrenom] = useState(profil?.prenom || '');
  const [email, setEmail] = useState(profil?.email || '');
  const [mdpActuel, setMdpActuel] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmMdp, setConfirmMdp] = useState('');
  const [msgProfil, setMsgProfil] = useState('');
  const [msgMdp, setMsgMdp] = useState('');
  const [errProfil, setErrProfil] = useState('');
  const [errMdp, setErrMdp] = useState('');

  const sauvegarderProfil = async (e) => {
    e.preventDefault();
    setMsgProfil(''); setErrProfil('');
    try {
      await axios.put(`${API}/utilisateurs/profil/modifier`, { nom, prenom, email }, { headers });
      setMsgProfil('Profil mis à jour avec succès !');
      setTimeout(() => setMsgProfil(''), 3000);
    } catch (err) { setErrProfil(err.response?.data?.message || 'Erreur'); }
  };

  const changerMdp = async (e) => {
    e.preventDefault();
    setMsgMdp(''); setErrMdp('');
    if (nouveauMdp !== confirmMdp) { setErrMdp('Les mots de passe ne correspondent pas.'); return; }
    if (nouveauMdp.length < 6) { setErrMdp('Le mot de passe doit faire au moins 6 caractères.'); return; }
    try {
      await axios.put(`${API}/utilisateurs/profil/mot-de-passe`, { mot_de_passe_actuel: mdpActuel, nouveau_mot_de_passe: nouveauMdp }, { headers });
      setMsgMdp('Mot de passe modifié avec succès !');
      setMdpActuel(''); setNouveauMdp(''); setConfirmMdp('');
      setTimeout(() => setMsgMdp(''), 3000);
    } catch (err) { setErrMdp(err.response?.data?.message || 'Erreur'); }
  };

  const fieldStyle = { border: '1px solid #e2e7f7', borderRadius: 8, padding: '9px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' };
  const labelStyle = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#4b506d' };

  return (
    <section className="content-card profile-card">
      <div className="content-head"><h2>Paramètres</h2></div>

      {/* Infos personnelles */}
      <form onSubmit={sauvegarderProfil}>
        <h3 style={{margin:'0 0 16px',fontSize:16,color:'#1a2340'}}>Informations personnelles</h3>
        {msgProfil && <p style={{color:'#16a34a',fontSize:13,marginBottom:10}}>✓ {msgProfil}</p>}
        {errProfil && <p style={{color:'#dc2626',fontSize:13,marginBottom:10}}>{errProfil}</p>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px 20px',marginBottom:16}}>
          <label style={labelStyle}>Prénom<input style={fieldStyle} value={prenom} onChange={e=>setPrenom(e.target.value)} required /></label>
          <label style={labelStyle}>Nom<input style={fieldStyle} value={nom} onChange={e=>setNom(e.target.value)} required /></label>
          <label style={labelStyle}>Email<input type="email" style={fieldStyle} value={email} onChange={e=>setEmail(e.target.value)} required /></label>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button type="submit" style={{border:0,borderRadius:10,padding:'9px 24px',background:'#ffc145',cursor:'pointer',fontWeight:700,fontSize:13}}>Enregistrer le profil</button>
        </div>
      </form>

      <hr style={{border:0,borderTop:'1px solid #edf1fb',margin:'24px 0'}} />

      {/* Changement mot de passe */}
      <form onSubmit={changerMdp}>
        <h3 style={{margin:'0 0 16px',fontSize:16,color:'#1a2340'}}>Changer le mot de passe</h3>
        {msgMdp && <p style={{color:'#16a34a',fontSize:13,marginBottom:10}}>✓ {msgMdp}</p>}
        {errMdp && <p style={{color:'#dc2626',fontSize:13,marginBottom:10}}>{errMdp}</p>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px 20px',marginBottom:16}}>
          <label style={labelStyle}>Mot de passe actuel<input type="password" style={fieldStyle} value={mdpActuel} onChange={e=>setMdpActuel(e.target.value)} required placeholder="••••••••" /></label>
          <div />
          <label style={labelStyle}>Nouveau mot de passe<input type="password" style={fieldStyle} value={nouveauMdp} onChange={e=>setNouveauMdp(e.target.value)} required placeholder="••••••••" /></label>
          <label style={labelStyle}>Confirmer<input type="password" style={fieldStyle} value={confirmMdp} onChange={e=>setConfirmMdp(e.target.value)} required placeholder="••••••••" /></label>
        </div>
        <button type="submit" style={{border:0,borderRadius:10,padding:'9px 24px',background:'#197bbd',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:13}}>Changer le mot de passe</button>
      </form>
    </section>
  );
}

function DashboardEmploye() {
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
  const [interimaires, setInterimaires] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [typeConge, setTypeConge] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [motif, setMotif] = useState('');
  const [interimId, setInterimId] = useState('');
  const [nbJoursManuel, setNbJoursManuel] = useState(null);
  const [erreurDemande, setErreurDemande] = useState('');
  const [successDemande, setSuccessDemande] = useState('');

  const [filterStatut, setFilterStatut] = useState('Toutes');
  const [filterType, setFilterType] = useState('Tous les types');
  const [searchDem, setSearchDem] = useState('');
  const [selectedDemande, setSelectedDemande] = useState(null);

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [ferieIdx, setFerieIdx] = useState(0);

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

    // Jours fériés marocains (toutes les années couvertes par la période)
    const getFeriesSet = (startYear, endYear) => {
      const set = new Set();
      for (let y = startYear; y <= endYear; y++) {
        [
          `${y}-01-01`, `${y}-01-11`, `${y}-05-01`, `${y}-07-30`,
          `${y}-08-14`, `${y}-08-20`, `${y}-08-21`, `${y}-11-06`, `${y}-11-18`
        ].forEach(d => set.add(d));
      }
      return set;
    };
    const feriesSet = getFeriesSet(dy, fy);
    const isFerie = (d) => {
      const s = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      return feriesSet.has(s);
    };

    // Cas exceptionnel : tous les jours calendaires (fériés inclus)
    if (typeConge === 'exceptionnel') return String(Math.floor((fin-debut)/86400000)+1);

    // Lundi de la semaine d'une date
    const getLundi = (d) => { const c=new Date(d); const j=d.getDay(); c.setDate(d.getDate()+(j===0?-6:1-j)); return c; };

    const lundiDebut = getLundi(debut);
    const lundiFin   = getLundi(fin);
    const nbSemaines = Math.round((lundiFin - lundiDebut) / (7*86400000));

    // Même semaine → tous les jours + bonus si fin = vendredi
    if (nbSemaines === 0) {
      const diffJours = Math.floor((fin-debut)/86400000)+1;
      const base = fin.getDay() === 5 ? diffJours + 2 : diffJours;
      // Soustraire les fériés dans cette période étendue
      let ferieCount = 0;
      const cur = new Date(debut);
      const finEtendue = new Date(fin);
      if (fin.getDay() === 5) finEtendue.setDate(fin.getDate()+2);
      while (cur <= finEtendue) { if (isFerie(cur)) ferieCount++; cur.setDate(cur.getDate()+1); }
      return String(Math.max(0, base - ferieCount));
    }

    // Plusieurs semaines
    const dimS1 = new Date(lundiDebut); dimS1.setDate(lundiDebut.getDate()+6);
    const joursS1 = Math.floor((dimS1-debut)/86400000)+1;
    const joursDerniere = Math.floor((fin-lundiFin)/86400000)+1;
    const nbInter = nbSemaines - 1;
    let total = joursS1 + (nbInter * 7) + joursDerniere;
    const finJour = fin.getDay();
    if (finJour >= 1 && finJour <= 4 && nbSemaines >= 2) total -= 2;

    // Soustraire les jours fériés sur toute la période réelle (debut → fin)
    let ferieCount = 0;
    const cur = new Date(debut);
    while (cur <= fin) { if (isFerie(cur)) ferieCount++; cur.setDate(cur.getDate()+1); }
    total = Math.max(0, total - ferieCount);

    return String(total);
  }, [dateDebut, dateFin, typeConge]);

  useEffect(() => {
    if (!utilisateur) { navigate('/login'); return; }
    axios.get(`${API}/utilisateurs/profil`, { headers }).then(r => setProfil(r.data)).catch(() => {});
    axios.get(`${API}/demandes/mes-demandes`, { headers }).then(r => setDemandes(r.data)).catch(() => {});
    axios.get(`${API}/utilisateurs/interimaires`, { headers }).then(r => setInterimaires(r.data)).catch(() => {});
    axios.get(`${API}/notifications`, { headers }).then(r => setNotifications(r.data)).catch(() => {});
  }, []);

  // Vérifie si le responsable est en congé (signé) sur la période choisie par l'employé
  const [responsableAbsent, setResponsableAbsent] = useState(false);

  useEffect(() => {
    if (!dateDebut || !dateFin || !profil?.responsable_id) {
      setResponsableAbsent(false);
      setInterimId('');
      return;
    }
    // Vérifier si responsable absent
    axios.get(`${API}/utilisateurs/responsable-absent`, {
      headers,
      params: { date_debut: dateDebut, date_fin: dateFin }
    })
    .then(r => setResponsableAbsent(r.data.absent))
    .catch(() => setResponsableAbsent(false));

    // Recharger la liste des intérimaires en excluant ceux en congé sur la même période
    axios.get(`${API}/utilisateurs/interimaires`, {
      headers,
      params: { date_debut: dateDebut, date_fin: dateFin }
    })
    .then(r => { setInterimaires(r.data); setInterimId(''); })
    .catch(() => {});
  }, [dateDebut, dateFin, profil]);

  const demandesFiltrees = useMemo(() => {
    return demandes.filter(d => {
      if (filterStatut !== 'Toutes' && d.statut !== filterStatut) return false;
      if (filterType !== 'Tous les types' && d.type_conge !== filterType) return false;
      if (searchDem && !d.reference?.toLowerCase().includes(searchDem.toLowerCase())) return false;
      return true;
    });
  }, [demandes, filterStatut, filterType, searchDem]);

  const countByStatut = (s) => demandes.filter(d => d.statut === s).length;
  const nonLues = notifications.filter(n => !n.lu).length;
  const soldeTotal = profil ? (profil.solde_conge || 0) + (profil.reliquat || 0) : 0;
  const congesPris = demandes.filter(d => d.statut === 'signe_directeur').reduce((acc, d) => acc + d.nb_jours, 0);
  const tauxUtilise = soldeTotal > 0 ? Math.round((congesPris / (soldeTotal + congesPris)) * 100) : 0;

  const prochainConge = useMemo(() => {
    const now = new Date();
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    return demandes
      .filter(d => d.statut === 'signe_directeur' && d.date_fin?.slice(0,10) >= todayLocal)
      .sort((a, b) => a.date_debut.localeCompare(b.date_debut))[0] || null;
  }, [demandes]);

  const joursAvantProchain = useMemo(() => {
    if (!prochainConge) return null;
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [y, m, d] = prochainConge.date_debut.slice(0,10).split('-').map(Number);
    const debut = new Date(y, m-1, d);
    const diff = Math.ceil((debut - todayLocal) / (1000 * 60 * 60 * 24));
    return diff;
  }, [prochainConge]);

  const todayStr = today.toISOString().slice(0, 10);
  const feries = getJoursFeries(today.getFullYear());
  const feriesAVenir = feries.filter(f => f.date >= todayStr);
  const ferieActuel = feriesAVenir[ferieIdx % feriesAVenir.length];

  const calCells = useMemo(() => buildCalendar(calYear, calMonth), [calYear, calMonth]);

  const isDayConge = (day) => {
    if (!day) return null;
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const found = demandes.find(d =>
      ['en_attente','approuve_responsable','approuve_rh','signe_directeur'].includes(d.statut) &&
      dateStr >= d.date_debut?.slice(0, 10) &&
      dateStr <= d.date_fin?.slice(0, 10)
    );
    return found ? LEAVE_TYPE_CONFIG[found.type_conge] : null;
  };

  const isDayFerie = (day) => {
    if (!day) return false;
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return feries.some(f => f.date === dateStr);
  };

  const congesDuMois = useMemo(() => {
    return demandes.filter(d => {
      const debut = d.date_debut?.slice(0, 7);
      const fin = d.date_fin?.slice(0, 7);
      const moisStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
      return debut <= moisStr && fin >= moisStr;
    });
  }, [demandes, calYear, calMonth]);

  const soldeParType = useMemo(() => {
    const prisPar = {};
    demandes.filter(d => d.statut === 'signe_directeur').forEach(d => {
      prisPar[d.type_conge] = (prisPar[d.type_conge] || 0) + d.nb_jours;
    });
    return prisPar;
  }, [demandes]);

  // Vérification responsable absent
  const [infoRespoAbsent, setInfoRespoAbsent] = useState(null);

  useEffect(() => {
    if (!dateDebut || !dateFin || !profil) { setInfoRespoAbsent(null); return; }
    axios.get(`${API}/demandes/responsable-absent`, {
      headers,
      params: { date_debut: dateDebut, date_fin: dateFin }
    }).then(r => setInfoRespoAbsent(r.data.absent ? r.data : null))
      .catch(() => setInfoRespoAbsent(null));
  }, [dateDebut, dateFin, profil]);

  const soumettredemande = async (e) => {
    e.preventDefault();
    setErreurDemande('');
    setSuccessDemande('');
    const nbJ = parseInt(nbJoursManuel ?? nbJours ?? '0');
    try {
      const res = await axios.post(`${API}/demandes`, {
        type_conge: typeConge,
        date_debut: dateDebut,
        date_fin: dateFin,
        nb_jours_override: (typeConge === 'exceptionnel' && nbJoursManuel) ? nbJoursManuel : null,
        motif,
        interimaire_id: interimId || null
      }, { headers });
      // Toast succès
      toast.success(
        'Demande envoyée avec succès !',
        `Réf. ${res.data.reference} — ${res.data.nb_jours} jour(s) — En attente de validation`
      );
      setTypeConge(''); setDateDebut(''); setDateFin(''); setMotif(''); setInterimId(''); setNbJoursManuel(null);
      const r = await axios.get(`${API}/demandes/mes-demandes`, { headers });
      setDemandes(r.data);
      setTimeout(() => setActiveMenu(backgroundMenu), 1500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de la soumission';
      // Toast erreur avec contexte
      if (msg.toLowerCase().includes('solde')) {
        toast.error('Solde insuffisant', msg);
      } else if (msg.toLowerCase().includes('chevauchement') || msg.toLowerCase().includes('période')) {
        toast.warn('Période en conflit', msg);
      } else {
        toast.error('Erreur', msg);
      }
      setErreurDemande(msg);
    }
  };

  const ouvrirPDF   = (id) => window.open(`${API}/pdf/demande/${id}?token=${token}`, '_blank');
  const ouvrirTitre = (id) => window.open(`${API}/pdf/titre/${id}?token=${token}`, '_blank');

  const prenom = profil?.prenom || utilisateur?.prenom || '';
  const nom    = profil?.nom    || utilisateur?.nom    || '';

  return (
    <div className="dashboard-shell">
      <div className={`dashboard-layout ${showNouvelleDemande ? 'is-dimmed' : ''}`}>
        <aside className="dashboard-sidebar">
          <div className="sidebar-brand">
            <img src={logo} alt="MODEP" />
            <div><strong>MODEP</strong><small>Dashboard Employé</small></div>
          </div>
          <nav className="sidebar-nav">
            {menuItems.map((item) => (
              <button
                key={item.key}
                className={`menu-item ${activeMenu === item.key ? 'active' : ''}`}
                onClick={() => {
                  if (item.key === 'nouvelle') {
                    setBackgroundMenu(activeMenu === 'nouvelle' ? backgroundMenu : activeMenu);
                    setActiveMenu('nouvelle');
                    return;
                  }
                  setOpenPanel('');
                  setActiveMenu(item.key);
                }}
              >
                <span className="menu-icon"><SidebarIcon type={item.key} active={activeMenu === item.key} /></span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <button className="logout-btn" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('utilisateur'); navigate('/login'); }}>
            <span className="logout-icon"><LogoutIcon /></span>
            <span>Se déconnecter</span>
          </button>
        </aside>

        <main className="dashboard-main">
          <header className="dashboard-header">
            <div>
              <h1>Tableau de bord</h1>
              <p>Bienvenue, {prenom} !</p>
            </div>
            <div className="header-user">
              <button className={`icon-btn notif-btn ${openPanel === 'notif' ? 'active' : ''}`} onClick={() => {
                const newPanel = openPanel === 'notif' ? '' : 'notif';
                setOpenPanel(newPanel);
                if (newPanel === 'notif' && nonLues > 0) {
                  axios.put(`${API}/notifications/tout-lire`, {}, { headers })
                    .then(() => setNotifications(prev => prev.map(n => ({ ...n, lu: true }))));
                }
              }} aria-label="Notifications">
                🔔{nonLues > 0 && <i className="notif-dot" />}
              </button>
              <button className="user-avatar" onClick={() => setActiveMenu('profil')} aria-label="Mon profil">{prenom.charAt(0)}</button>
              <button className="user-info" onClick={() => setActiveMenu('profil')}>
                <strong>{prenom}</strong>
                <small>employé</small>
              </button>
            </div>
            {openPanel === 'notif' && !showNouvelleDemande && (
              <div className="header-panel panel-notif">
                <h4>Notifications</h4>
                {notifications.length === 0 ? <p>Aucune notification.</p> : notifications.slice(0, 5).map(n => (
                  <p key={n.id} style={{ opacity: n.lu ? 0.6 : 1 }}>{n.message}</p>
                ))}
              </div>
            )}
          </header>

          {/* ══ OVERVIEW ══ */}
          {visibleMenu === 'overview' && (
            <section className="overview-layout">
              <div className="overview-main-col">
                <section className="balance-section">
                  <div className="balance-section-header">
                    <h2>Solde de congés</h2>
                    <span className="balance-year-badge">{today.getFullYear()}</span>
                  </div>
                  <div className="balance-cards">
                    {[
                      { label: 'Congés restants',    value: String(soldeTotal),                  tone: 'blue',   icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                      { label: 'Demandes en attente', value: String(countByStatut('en_attente')), tone: 'orange', icon: 'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' },
                      { label: 'Congés pris',         value: String(congesPris),                  tone: 'green',  icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                      { label: 'Reliquat',             value: String(profil?.reliquat || 0),       tone: 'violet', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
                    ].map((item) => (
                      <article key={item.label} className={`balance-card card-${item.tone}`}>
                        <div className="bc-icon-wrap">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
                        </div>
                        <h3 className="bc-label">{item.label}</h3>
                        <p className="bc-value">{item.value}</p>
                        <i />
                      </article>
                    ))}
                  </div>
                </section>

                <div className="table-card">
                  <div className="table-card-head">
                    <h2>Mes dernières demandes</h2>
                    <button className="see-all-btn" onClick={() => setActiveMenu('demandes')}>
                      Voir tout
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                  <table>
                    <thead><tr><th>Type de congé</th><th>Date début</th><th>Date fin</th><th>Statut</th></tr></thead>
                    <tbody>
                      {demandes.slice(0, 5).map((d, i) => {
                        const cfg = LEAVE_TYPE_CONFIG[d.type_conge] || {};
                        return (
                          <tr key={d.id || i} className="overview-tr">
                            <td><span className="type-dot" style={{ background: cfg.color }} />{cfg.label || d.type_conge}</td>
                            <td>{d.date_debut?.slice(0, 10)}</td>
                            <td>{d.date_fin?.slice(0, 10)}</td>
                            <td><span className={`ov-status-pill ${STATUT_CLASS[d.statut] || 'wait'}`}>{STATUT_LABELS[d.statut] || d.statut}</span></td>
                          </tr>
                        );
                      })}
                      {demandes.length === 0 && <tr><td colSpan="4" className="dem-empty">Aucune demande pour l'instant.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <aside className="overview-side-col">
                <div className="overview-side-card">
                  <div className="osc-head">
                    <div className="osc-icon-bg">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#197bbd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <div>
                      <h3>Actions congés</h3>
                      <p className="side-subtitle">Résumé rapide employé</p>
                    </div>
                  </div>
                  <div className="usage-bar-wrap">
                    <div className="usage-bar-top"><span>Taux utilisé</span><strong>{tauxUtilise}%</strong></div>
                    <div className="usage-bar-track"><div className="usage-bar-fill" style={{ width: `${tauxUtilise}%` }} /></div>
                  </div>
                  <div className="side-stat">
                    <span>Demandes en attente</span>
                    <span className="status-pill wait">{countByStatut('en_attente')}</span>
                  </div>
                  <button className="quick-request-btn" onClick={() => { setBackgroundMenu(activeMenu); setActiveMenu('nouvelle'); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                    Demande rapide
                  </button>
                </div>

                <div className="next-leave-card">
                  <div className="nlc-head">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#197bbd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <h3>Prochain congé</h3>
                  </div>
                  {prochainConge ? (
                    <>
                      <p className="next-leave-title">{LEAVE_TYPE_CONFIG[prochainConge.type_conge]?.label || prochainConge.type_conge}</p>
                      <p className="next-leave-dates">
                        <span>{prochainConge.date_debut?.slice(0, 10)}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                        <span>{prochainConge.date_fin?.slice(0, 10)}</span>
                      </p>
                      <div className="nlc-badge">
                        {joursAvantProchain <= 0 ? 'En cours' : joursAvantProchain === 1 ? 'Demain' : `Dans ${joursAvantProchain} jours`}
                      </div>
                    </>
                  ) : (
                    <p style={{ fontSize: 13, color: '#9aa4c2', marginTop: 8 }}>Aucun congé à venir.</p>
                  )}
                </div>

                <div className="holiday-card">
                  <div className="holiday-head">
                    <button onClick={() => setFerieIdx(i => Math.max(0, i - 1))}>{'<'}</button>
                    <h3>Prochains jours fériés</h3>
                    <button onClick={() => setFerieIdx(i => Math.min(feriesAVenir.length - 1, i + 1))}>{'>'}</button>
                  </div>
                  {ferieActuel ? (
                    <div className="holiday-body">
                      <div className="holiday-icon">{ferieActuel.emoji}</div>
                      <h4>{ferieActuel.label}</h4>
                      <p>{new Date(ferieActuel.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} — {['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][new Date(ferieActuel.date).getDay()]}</p>
                    </div>
                  ) : (
                    <div className="holiday-body"><p>Aucun jour férié à venir.</p></div>
                  )}
                </div>
              </aside>
            </section>
          )}

          {/* ══ DEMANDES ══ */}
          {visibleMenu === 'demandes' && (
            <section className="demandes-page">
              <div className="dem-kpi-row">
                {[
                  { label: 'En attente',  statut: 'en_attente',      tone: 'orange' },
                  { label: 'Approuvées',  statut: 'signe_directeur', tone: 'green' },
                  { label: 'Refusées',    statut: 'refuse',           tone: 'red' },
                ].map(k => (
                  <div key={k.statut} className={`dem-kpi-card tone-${k.tone}`}>
                    <div><p>{k.label}</p><strong>{countByStatut(k.statut)}</strong></div>
                  </div>
                ))}
                <div className="dem-kpi-card tone-blue">
                  <div><p>Total</p><strong>{demandes.length}</strong></div>
                </div>
              </div>

              <div className="dem-toolbar">
                <div className="dem-search-wrap">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="#9aa4c2" strokeWidth="2" /><path d="M16 16L20 20" stroke="#9aa4c2" strokeWidth="2" strokeLinecap="round" /></svg>
                  <input className="dem-search" type="text" placeholder="Rechercher référence..." value={searchDem} onChange={e => setSearchDem(e.target.value)} />
                </div>
                <div className="dem-filters">
                  <div className="dem-filter-tabs">
                    {['Toutes', 'en_attente', 'signe_directeur', 'refuse'].map(s => (
                      <button key={s} className={filterStatut === s ? 'active' : ''} onClick={() => setFilterStatut(s)}>
                        {s === 'Toutes' ? 'Toutes' : STATUT_LABELS[s]}
                      </button>
                    ))}
                  </div>
                  <select className="dem-type-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                    {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t === 'Tous les types' ? t : LEAVE_TYPE_CONFIG[t]?.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="dem-table-wrap">
                <table className="dem-table">
                  <thead>
                    <tr><th>Référence</th><th>Type de congé</th><th>Date début</th><th>Date fin</th><th>Jours</th><th>Statut</th><th>Documents</th></tr>
                  </thead>
                  <tbody>
                    {demandesFiltrees.length === 0 ? (
                      <tr><td colSpan="7" className="dem-empty">Aucune demande trouvée.</td></tr>
                    ) : demandesFiltrees.map(d => {
                      const cfg = LEAVE_TYPE_CONFIG[d.type_conge] || {};
                      const estSigne = d.statut === 'signe_directeur';
                      return (
                        <tr key={d.id} className="dem-row" onClick={() => setSelectedDemande(d)}>
                          <td className="dem-id">{d.reference}</td>
                          <td><span className="dem-type-badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}` }}>{cfg.label || d.type_conge}</span></td>
                          <td>{d.date_debut?.slice(0, 10)}</td>
                          <td>{d.date_fin?.slice(0, 10)}</td>
                          <td><strong>{d.nb_jours}j</strong></td>
                          <td><span className={`status-pill ${STATUT_CLASS[d.statut] || 'wait'}`}>{STATUT_LABELS[d.statut] || d.statut}</span></td>
                          <td onClick={e => e.stopPropagation()}>
                            {/* Bouton PDF demande (toujours visible) */}
                            <div style={{display:'flex',gap:8,alignItems:'center'}}>
                              <button
                                className="dem-btn-pdf"
                                onClick={() => ouvrirPDF(d.id)}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M7 3.8H14.2L18.6 8.2V20H7V3.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M14 3.9V8.1H18.2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
                                PDF
                              </button>
                              {estSigne && (
                                <button
                                  className="dem-btn-titre"
                                  onClick={() => ouvrirTitre(d.id)}
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                  Titre
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {selectedDemande && (
                <div className="cal-modal-overlay" onClick={() => setSelectedDemande(null)}>
                  <div className="cal-modal dem-modal" onClick={e => e.stopPropagation()}>
                    <button className="cal-modal-close" onClick={() => setSelectedDemande(null)}>✕</button>
                    <div className="cal-modal-header" style={{ borderTop: `5px solid ${LEAVE_TYPE_CONFIG[selectedDemande.type_conge]?.color || '#9aa4c2'}` }}>
                      <span className="cal-modal-avatar" style={{ background: LEAVE_TYPE_CONFIG[selectedDemande.type_conge]?.color || '#9aa4c2' }}>
                        {LEAVE_TYPE_CONFIG[selectedDemande.type_conge]?.label?.charAt(0) || 'C'}
                      </span>
                      <div>
                        <h3>{LEAVE_TYPE_CONFIG[selectedDemande.type_conge]?.label || selectedDemande.type_conge}</h3>
                        <p>{prenom} {nom} — Employé</p>
                      </div>
                    </div>
                    <div className="cal-modal-body">
                      <div className="cal-modal-row"><span>Référence</span><strong>{selectedDemande.reference}</strong></div>
                      <div className="cal-modal-row"><span>Date début</span><strong>{selectedDemande.date_debut?.slice(0, 10)}</strong></div>
                      <div className="cal-modal-row"><span>Date fin</span><strong>{selectedDemande.date_fin?.slice(0, 10)}</strong></div>
                      <div className="cal-modal-row"><span>Durée</span><strong>{selectedDemande.nb_jours} jour(s)</strong></div>
                      {selectedDemande.motif && <div className="cal-modal-row"><span>Motif</span><strong>{selectedDemande.motif}</strong></div>}
                      <div className="cal-modal-row"><span>Statut</span><span className={`cal-status-badge ${STATUT_CLASS[selectedDemande.statut] || 'wait'}`}>{STATUT_LABELS[selectedDemande.statut] || selectedDemande.statut}</span></div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ══ CALENDRIER ══ */}
          {visibleMenu === 'calendrier' && (
            <section className="calendar-layout">
              <aside className="calendar-side">
                <div className="calendar-card">
                  <h3>Balances</h3>
                  {[
                    { key: 'annuel',    color: 'pink' },
                    { key: 'maladie',   color: 'blue' },
                    { key: 'maternite', color: 'orange' },
                  ].map(({ key, color }) => {
                    const pris = soldeParType[key] || 0;
                    const cfg = LEAVE_TYPE_CONFIG[key];
                    return (
                      <div key={key} className="balance-line">
                        <span className={`legend-dot ${color}`} />
                        <div>
                          <p>{cfg.label}</p>
                          <small>{pris} jour{pris > 1 ? 's' : ''} pris</small>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="calendar-card">
                  <h3>Mes congés — {MOIS_FR[calMonth]}</h3>
                  {congesDuMois.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#9aa4c2' }}>Aucun congé ce mois.</p>
                  ) : congesDuMois.map(d => {
                    const cfg = LEAVE_TYPE_CONFIG[d.type_conge] || {};
                    const estPasse = d.date_fin?.slice(0, 10) < todayStr;
                    return (
                      <div key={d.id} className="mini-conge-row">
                        <span className="mini-bar" style={{ background: cfg.color }} />
                        <div>
                          <small>{d.date_debut?.slice(0, 10)} → {d.date_fin?.slice(0, 10)}</small>
                          <p>{d.nb_jours}j <em>{estPasse ? 'Passé' : 'À venir'}</em></p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </aside>

              <div className="calendar-main">
                <div className="calendar-head">
                  <h2>Mon calendrier</h2>
                  <div className="month-nav">
                    <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}>{'<'}</button>
                    <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}>{'>'}</button>
                    <strong>{MOIS_FR[calMonth]} {calYear}</strong>
                  </div>
                </div>

                <div className="calendar-grid">
                  {weekDays.map(d => <div key={d} className="day-name">{d}</div>)}
                  {calCells.map((cell, idx) => {
                    const conge = cell.current ? isDayConge(cell.day) : null;
                    const ferie = cell.current ? isDayFerie(cell.day) : false;
                    const isToday = cell.current && cell.day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
                    return (
                      <div key={idx} className={`day-cell${!cell.current ? ' other-month' : ''}${isToday ? ' today' : ''}`}>
                        <span className="day-number" style={ferie ? { color: '#e74c3c', fontWeight: 700 } : {}}>{cell.day}</span>
                        {conge && (
                          <p className="day-event">
                            <span className="legend-dot" style={{ background: conge.color, display: 'inline-block', width: 7, height: 7, borderRadius: '50%', marginRight: 3 }} />
                            {conge.label}
                          </p>
                        )}
                        {ferie && !conge && <p className="day-event" style={{ color: '#e74c3c', fontSize: 10 }}>Férié</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* ══ PROFIL ══ */}
          {visibleMenu === 'profil' && (
            <section className="content-card profile-card">
              <div className="content-head"><h2>Mon profil</h2></div>
              <div className="profile-top">
                <div className="profile-avatar">{prenom.charAt(0)}</div>
                <div>
                  <h3>{prenom} {nom}</h3>
                  <p>{profil?.fonction || 'Employé'} — Département {profil?.departement || ''}</p>
                </div>
              </div>
              <div className="profile-grid">
                {[
                  { label: 'Email',        value: profil?.email || '' },
                  { label: 'CIN',          value: profil?.cin || '' },
                  { label: 'Matricule',    value: profil?.matricule || '' },
                  { label: 'Département',  value: profil?.departement || '' },
                  { label: 'Solde actuel', value: `${profil?.solde_conge || 0} jours` },
                  { label: 'Reliquat',     value: `${profil?.reliquat || 0} jours` },
                ].map(row => (
                  <div key={row.label} className="profile-item">
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ══ PARAMÈTRES ══ */}
          {visibleMenu === 'parametres' && (
            <ParametresForm profil={profil} headers={headers} API={API} />
          )}
        </main>
      </div>

      {/* ══ NOUVELLE DEMANDE ══ */}
      {showNouvelleDemande && (
        <div className="nouvelle-overlay" role="dialog" aria-modal="true" aria-label="Nouvelle demande">
          <div className="nouvelle-card">
            <div className="nouvelle-head">
              <h2>Nouvelle demande</h2>
              <button onClick={() => setActiveMenu(backgroundMenu)} aria-label="Fermer">✕</button>
            </div>
            <form className="nouvelle-form" onSubmit={soumettredemande}>
              {erreurDemande  && <p style={{ color: 'red',   fontSize: 13 }}>{erreurDemande}</p>}
              {successDemande && <p style={{ color: 'green', fontSize: 13 }}>{successDemande}</p>}

              <label>Type de congé
                <select value={typeConge} onChange={e => setTypeConge(e.target.value)} required>
                  <option value="" disabled>Sélectionner</option>
                  <option value="annuel">Congé annuel</option>
                  <option value="maladie">Congé maladie</option>
                  <option value="maternite">Congé maternité</option>
                  <option value="sans_solde">Congé sans solde</option>
                  <option value="exceptionnel">Congé exceptionnel (décès, etc.)</option>
                </select>
              </label>

              <div className="two-cols">
                <label>Date début<input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} required /></label>
                <label>Date fin<input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} required /></label>
              </div>

              <div className="two-cols date-extra-row">
                <label>Nbr de jours
                  <input
                    type={typeConge === 'exceptionnel' ? 'number' : 'text'}
                    value={typeConge === 'exceptionnel' ? (nbJoursManuel ?? nbJours) : (nbJours ? `${nbJours} jour${nbJours === '1' ? '' : 's'}` : '')}
                    onChange={e => { if (typeConge === 'exceptionnel') setNbJoursManuel(Number(e.target.value)); }}
                    placeholder="Calcul auto"
                    readOnly={typeConge !== 'exceptionnel'}
                    min={1}
                    style={typeConge === 'exceptionnel' ? {border:'2px solid #fbbf24',borderRadius:8,padding:'8px 12px',fontSize:13,fontWeight:700,color:'#b45309',background:'#fffbeb'} : {}}
                  />
                  {typeConge === 'exceptionnel' && <small style={{color:'#b45309',fontSize:11,marginTop:3,display:'block'}}>Modifiable pour congé exceptionnel</small>}
                </label>
                <div />
              </div>

              <label>Motif<textarea rows="4" placeholder="Ajouter un motif..." value={motif} onChange={e => setMotif(e.target.value)} /></label>

              {infoRespoAbsent && (
                <div style={{
                  background: '#fff7ed', border: '1px solid #fb923c',
                  borderRadius: 10, padding: '12px 16px', marginBottom: 8,
                  display: 'flex', gap: 10, alignItems: 'flex-start'
                }}>
                  <span style={{fontSize: 18}}>⚠️</span>
                  <div>
                    <p style={{margin:0, fontWeight:700, color:'#c2410c', fontSize:13}}>
                      Votre responsable est actuellement en congé
                    </p>
                    {infoRespoAbsent.interimaire ? (
                      <p style={{margin:'4px 0 0', fontSize:12, color:'#7c3aed'}}>
                        👤 Intérimaire désigné : <strong>{infoRespoAbsent.interimaire.prenom} {infoRespoAbsent.interimaire.nom}</strong>
                        {infoRespoAbsent.interimaire.fonction ? ` (${infoRespoAbsent.interimaire.fonction})` : ''}
                         — Votre demande lui sera transmise automatiquement.
                      </p>
                    ) : (
                      <p style={{margin:'4px 0 0', fontSize:12, color:'#9a3412'}}>
                        Aucun intérimaire désigné pour le moment.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="nouvelle-actions">
                <button type="button" className="btn-secondary" onClick={() => setActiveMenu(backgroundMenu)}>Annuler</button>
                <button type="submit" className="btn-primary">Envoyer la demande</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove}/>
    </div>
  );
}

export default DashboardEmploye;
