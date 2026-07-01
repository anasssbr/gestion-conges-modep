import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import './DashboardResponsable.css';
import axios from 'axios';

const API = 'http://localhost:5000/api';

// ─── Toast ────────────────────────────────────────────
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
          <span style={{fontSize:20,flexShrink:0}}>{t.type==='error'?'❌':t.type==='success'?'✅':t.type==='warn'?'⚠️':'ℹ️'}</span>
          <div style={{flex:1}}>
            <p style={{margin:0,fontSize:14,fontWeight:700,color:'#1a2340'}}>{t.title}</p>
            {t.message&&<p style={{margin:'3px 0 0',fontSize:12,color:'#5a6480'}}>{t.message}</p>}
          </div>
          <button onClick={()=>onRemove(t.id)} style={{border:0,background:'transparent',cursor:'pointer',fontSize:16,color:'#9aa4c2',padding:0,flexShrink:0}}>✕</button>
        </div>
      ))}
    </div>
  );
}
function useToast() {
  const [toasts, setToasts] = useState([]);
  const remove = (id) => setToasts(p => p.filter(t => t.id !== id));
  const add = (title, message='', type='info', dur=4000) => {
    const id = Date.now()+Math.random();
    setToasts(p => [...p, {id,title,message,type}]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), dur);
  };
  return { toasts, remove,
    success:(t,m='')=>add(t,m,'success',4000),
    error:  (t,m='')=>add(t,m,'error',  6000),
    warn:   (t,m='')=>add(t,m,'warn',   5000),
  };
}

const LEAVE_TYPE_CONFIG = {
  annuel:       { color: '#c55ea8', bg: '#fdf0fb', label: 'Congé annuel' },
  maladie:      { color: '#2ca8f2', bg: '#edf7ff', label: 'Congé maladie' },
  maternite:    { color: '#eead38', bg: '#fffbef', label: 'Congé maternité' },
  sans_solde:   { color: '#6a63dc', bg: '#f2f1ff', label: 'Congé sans solde' },
  exceptionnel: { color: '#e74c3c', bg: '#fdecea', label: 'Congé exceptionnel' },
};

const STATUT_LABELS = {
  en_attente: 'En attente',
  approuve_responsable: 'Approuvé',
  approuve_rh: 'Approuvé RH',
  signe_directeur: 'Signé',
  refuse: 'Refusé'
};

const STATUT_CLASS = {
  en_attente: 'pill-wait',
  approuve_responsable: 'pill-ok',
  approuve_rh: 'pill-ok',
  signe_directeur: 'pill-ok',
  refuse: 'pill-no'
};

const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const menuItems = [
  { key: 'overview',    label: 'Vue globale',       icon: 'overview' },
  { key: 'demandes',    label: 'Demandes à traiter', icon: 'demandes' },
  { key: 'mes-demandes',label: 'Mes demandes',       icon: 'demandes' },
  { key: 'nouvelle',    label: 'Nouvelle demande',   icon: 'nouvelle' },
  { key: 'profil',      label: 'Mon profil',          icon: 'profil' },
  { key: 'calendrier',  label: 'Calendrier',          icon: 'calendar' },
  { key: 'parametres',  label: 'Paramètres',          icon: 'settings' }
];

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

function SideIcon({ type, active = false }) {
  const color = active ? '#197BBD' : '#C7C7C7';
  const p = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none' };
  if (type === 'overview') return <svg {...p}><path d="M4 19V6M4 19H20M8 14L11 11L14 12.5L19 7.5" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>;
  if (type === 'demandes') return <svg {...p}><path d="M8.5 7H20M8.5 12H20M8.5 17H20" stroke={color} strokeWidth="2" strokeLinecap="round" /><circle cx="5" cy="7" r="1.1" fill={color} /><circle cx="5" cy="12" r="1.1" fill={color} /><circle cx="5" cy="17" r="1.1" fill={color} /></svg>;
  if (type === 'nouvelle') return <svg {...p}><path d="M7 4H14L18.5 8.5V20H7V4Z" stroke={color} strokeWidth="2" /><path d="M14 4V8.3H18.2" stroke={color} strokeWidth="2" /></svg>;
  if (type === 'profil') return <svg {...p}><circle cx="12" cy="8" r="3.2" stroke={color} strokeWidth="2" /><path d="M5.8 19C6.7 15.9 8.9 14 12 14C15.1 14 17.3 15.9 18.2 19" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>;
  if (type === 'calendar') return <svg {...p}><rect x="4" y="5.5" width="16" height="14" rx="2" stroke={color} strokeWidth="2" /><path d="M8 4V7M16 4V7M4.5 9.5H19.5" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>;
  return <svg {...p}><path d="M19 13.5C19.1 13 19.2 12.5 19.2 12C19.2 11.5 19.1 11 19 10.5L21 9L19.2 5.5L16.7 6.4C15.9 5.8 15 5.3 14 5L13.7 2.5H10.3L10 5C9 5.3 8.1 5.8 7.3 6.4L4.8 5.5L3 9L5 10.5C4.9 11 4.8 11.5 4.8 12C4.8 12.5 4.9 13 5 13.5L3 15L4.8 18.5L7.3 17.6C8.1 18.2 9 18.7 10 19L10.3 21.5H13.7L14 19C15 18.7 15.9 18.2 16.7 17.6L19.2 18.5L21 15L19 13.5Z" stroke={color} strokeWidth="1.6" /><circle cx="12" cy="12" r="2.8" stroke={color} strokeWidth="1.6" /></svg>;
}

function LogoutIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14.5 6.8V5.6C14.5 4.7 13.8 4 12.9 4H6.8C5.9 4 5.2 4.7 5.2 5.6V18.4C5.2 19.3 5.9 20 6.8 20H12.9C13.8 20 14.5 19.3 14.5 18.4V17.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /><path d="M10.4 12H20.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /><path d="M17.6 9.3L20.3 12L17.6 14.7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
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
      <form onSubmit={sauvegarderProfil}>
        <h3 style={{margin:'0 0 16px',fontSize:16,color:'#1a2340'}}>Informations personnelles</h3>
        {msgProfil && <p style={{color:'#16a34a',fontSize:13,marginBottom:10}}>✓ {msgProfil}</p>}
        {errProfil && <p style={{color:'#dc2626',fontSize:13,marginBottom:10}}>{errProfil}</p>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px 20px',marginBottom:16}}>
          <label style={labelStyle}>Prénom<input style={fieldStyle} value={prenom} onChange={e=>setPrenom(e.target.value)} required /></label>
          <label style={labelStyle}>Nom<input style={fieldStyle} value={nom} onChange={e=>setNom(e.target.value)} required /></label>
          <label style={labelStyle}>Email<input type="email" style={fieldStyle} value={email} onChange={e=>setEmail(e.target.value)} required /></label>
        </div>
        <button type="submit" style={{border:0,borderRadius:10,padding:'9px 24px',background:'#ffc145',cursor:'pointer',fontWeight:700,fontSize:13}}>Enregistrer le profil</button>
      </form>
      <hr style={{border:0,borderTop:'1px solid #edf1fb',margin:'24px 0'}} />
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

function DashboardResponsable() {
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

  // Données API
  const [profil, setProfil] = useState(null);
  const [demandes, setDemandes] = useState([]);
  const [mesDemandes, setMesDemandes] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [demandesRH, setDemandesRH] = useState([]);
  const [estInterimaireRH, setEstInterimaireRH] = useState(false);
  const [demandesTraiteesInterim, setDemandesTraiteesInterim] = useState([]);
  const [interimVu, setInterimVu] = useState(() => {
    return parseInt(localStorage.getItem('interim_vu_' + (JSON.parse(localStorage.getItem('utilisateur')||'{}').id || 0)) || '0');
  });

  // Formulaire nouvelle demande
  const [typeConge, setTypeConge] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [motif, setMotif] = useState('');
  const [interimId, setInterimId] = useState('');
  const [nbJoursManuel, setNbJoursManuel] = useState(null);
  const [erreurDemande, setErreurDemande] = useState('');
  const [successDemande, setSuccessDemande] = useState('');

  // Filtres
  const [filterStatutEquipe, setFilterStatutEquipe] = useState('Tous');
  const [filterStatutMes, setFilterStatutMes] = useState('Tous');
  const [searchEquipe, setSearchEquipe] = useState('');
  const [searchMes, setSearchMes] = useState('');

  // Modal décision
  const [demandeSelectionnee, setDemandeSelectionnee] = useState(null);
  const [avisResponsable, setAvisResponsable] = useState('');
  const [interimaireModal, setInterimaireModal] = useState('');
  const [loadingDecision, setLoadingDecision] = useState(false);

  // Calendrier
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const showNouvelleDemande = activeMenu === 'nouvelle';
  const visibleMenu = showNouvelleDemande ? backgroundMenu : activeMenu;

  const nbJours = useMemo(() => {
    setNbJoursManuel(null);
    if (!dateDebut || !dateFin) return '';
    const [dy, dm, dd] = dateDebut.split('-').map(Number);
    const [fy, fm, fd] = dateFin.split('-').map(Number);
    const debut = new Date(dy, dm - 1, dd);
    const fin   = new Date(fy, fm - 1, fd);
    if (fin < debut) return '0';
    if (typeConge === 'exceptionnel') return String(Math.floor((fin - debut) / 86400000) + 1);
    const getLundi = (d) => { const c = new Date(d); const j = d.getDay(); c.setDate(d.getDate() + (j === 0 ? -6 : 1 - j)); return c; };
    const lundiDebut = getLundi(debut);
    const lundiFin   = getLundi(fin);
    const nbSemaines = Math.round((lundiFin - lundiDebut) / (7 * 86400000));
    if (nbSemaines === 0) return String(Math.floor((fin - debut) / 86400000) + 1);
    const dimS1 = new Date(lundiDebut); dimS1.setDate(lundiDebut.getDate() + 6);
    const joursS1 = Math.floor((dimS1 - debut) / 86400000) + 1;
    const joursDerniere = Math.floor((fin - lundiFin) / 86400000) + 1;
    let total = joursS1 + ((nbSemaines - 1) * 7) + joursDerniere;
    const finJour = fin.getDay();
    if (finJour >= 1 && finJour <= 4 && nbSemaines >= 2) total -= 2;
    return String(total);
  }, [dateDebut, dateFin, typeConge]);

  const chargerDonnees = () => {
    axios.get(`${API}/utilisateurs/profil`, { headers }).then(r => setProfil(r.data)).catch(() => {});
    axios.get(`${API}/demandes/responsable`, { headers }).then(r => setDemandes(r.data)).catch(() => {});
    axios.get(`${API}/demandes/mes-demandes`, { headers }).then(r => setMesDemandes(r.data)).catch(() => {});
    axios.get(`${API}/notifications`, { headers }).then(r => setNotifications(r.data)).catch(() => {});
    axios.get(`${API}/utilisateurs`, { headers }).then(r => setEquipe(r.data)).catch(() => {});
    // Vérifier si intérimaire RH
    axios.get(`${API}/demandes/rh`, { headers })
      .then(r => { setDemandesRH(r.data); setEstInterimaireRH(true); })
      .catch(() => { setEstInterimaireRH(false); });
    // Demandes traitées par l'intérimaire (historique)
    axios.get(`${API}/demandes/responsable/traitees-par-interim`, { headers })
      .then(r => setDemandesTraiteesInterim(r.data))
      .catch(() => {});
  };

  useEffect(() => {
    if (!utilisateur) { navigate('/login'); return; }
    chargerDonnees();
  }, []);

  const nonLues = notifications.filter(n => !n.lu).length;
  const countByStatut = (s) => demandes.filter(d => d.statut === s).length;
  const demandesEnAttente = demandes.filter(d => d.statut === 'en_attente');

  const demandesFiltreesEquipe = useMemo(() => {
    return demandes.filter(d => {
      if (filterStatutEquipe !== 'Tous' && d.statut !== filterStatutEquipe) return false;
      if (searchEquipe && !`${d.prenom} ${d.nom}`.toLowerCase().includes(searchEquipe.toLowerCase()) && !d.reference?.toLowerCase().includes(searchEquipe.toLowerCase())) return false;
      return true;
    });
  }, [demandes, filterStatutEquipe, searchEquipe]);

  const demandesFiltreesMes = useMemo(() => {
    return mesDemandes.filter(d => {
      if (filterStatutMes !== 'Tous' && d.statut !== filterStatutMes) return false;
      if (searchMes && !d.reference?.toLowerCase().includes(searchMes.toLowerCase())) return false;
      return true;
    });
  }, [mesDemandes, filterStatutMes, searchMes]);
  const soldeTotal = profil ? (profil.solde_conge || 0) + (profil.reliquat || 0) : 0;
  const congesPris = demandes.filter(d => d.statut === 'signe_directeur' && d.utilisateur_id === profil?.id).reduce((acc, d) => acc + d.nb_jours, 0);

  // Absents aujourd'hui
  const todayStr = today.toISOString().slice(0, 10);
  const absentsAujourdhui = demandes.filter(d =>
    d.statut === 'signe_directeur' &&
    todayStr >= d.date_debut?.slice(0, 10) &&
    todayStr <= d.date_fin?.slice(0, 10)
  ).length;

  // Calendrier
  const calCells = useMemo(() => buildCalendar(calYear, calMonth), [calYear, calMonth]);

  const isDayConge = (day) => {
    if (!day) return null;
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const found = demandes.find(d =>
      ['approuve_responsable','approuve_rh','signe_directeur'].includes(d.statut) &&
      dateStr >= d.date_debut?.slice(0, 10) &&
      dateStr <= d.date_fin?.slice(0, 10)
    );
    if (!found) return null;
    return { ...LEAVE_TYPE_CONFIG[found.type_conge], nom: found.nom, prenom: found.prenom };
  };

  const prochaineMission = useMemo(() => {
    return demandes
      .filter(d => d.statut === 'en_attente')
      .sort((a, b) => a.created_at?.localeCompare(b.created_at))[0] || null;
  }, [demandes]);

  const soumettredemande = async (e) => {
    e.preventDefault();
    setErreurDemande('');
    setSuccessDemande('');
    try {
      const res = await axios.post(`${API}/demandes`, {
        type_conge: typeConge,
        date_debut: dateDebut,
        date_fin: dateFin,
        motif,
        interimaire_id: interimId || null,
        nb_jours_override: (typeConge === 'exceptionnel' && nbJoursManuel) ? nbJoursManuel : null
      }, { headers });
      toast.success('Demande envoyée !', `Réf. ${res.data.reference} — ${res.data.nb_jours} jour(s) — En attente de validation`);
      setTypeConge(''); setDateDebut(''); setDateFin(''); setMotif(''); setInterimId(''); setNbJoursManuel(null);
      chargerDonnees();
      setTimeout(() => setActiveMenu(backgroundMenu), 1500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de la soumission';
      if (msg.toLowerCase().includes('solde')) toast.error('Solde insuffisant', msg);
      else if (msg.toLowerCase().includes('chevauchement') || msg.toLowerCase().includes('période')) toast.warn('Période en conflit', msg);
      else toast.error('Erreur', msg);
      setErreurDemande(msg);
    }
  };

  const prendreDecision = async (decision) => {
    if (!demandeSelectionnee) return;
    setLoadingDecision(true);
    try {
      await axios.put(`${API}/demandes/${demandeSelectionnee.id}/decision-responsable`, {
        decision,
        avis_responsable: avisResponsable
      }, { headers });
      setDemandeSelectionnee(null);
      setAvisResponsable('');
      chargerDonnees();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    } finally {
      setLoadingDecision(false);
    }
  };

  const prenom = profil?.prenom || utilisateur?.prenom || '';
  const nom = profil?.nom || utilisateur?.nom || '';

  if (!utilisateur || utilisateur.role !== 'responsable') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="respo-shell">
      <div className={`respo-layout ${showNouvelleDemande ? 'is-dimmed' : ''}`}>
        <aside className="respo-sidebar">
          <div className="respo-brand">
            <img src={logo} alt="MODEP" />
            <div>
              <strong>MODEP</strong>
              <small>Dashboard Responsable</small>
            </div>
          </div>
          <nav className="respo-nav">
            {menuItems.map((item) => (
              <button
                key={item.key}
                className={activeMenu === item.key ? 'active' : ''}
                onClick={() => {
                  if (item.key === 'nouvelle') {
                    setBackgroundMenu(activeMenu === 'nouvelle' ? backgroundMenu : activeMenu);
                    setActiveMenu('nouvelle');
                    return;
                  }
                  if (item.key === 'demandes') {
                    localStorage.setItem('interim_vu_' + utilisateur?.id, String(demandesTraiteesInterim.length));
                    setInterimVu(demandesTraiteesInterim.length);
                  }
                  setOpenPanel('');
                  setActiveMenu(item.key);
                  setBackgroundMenu(item.key);
                }}
              >
                <span><SideIcon type={item.icon} active={activeMenu === item.key} /></span>
                {item.label}
                {item.key === 'demandes' && demandesEnAttente.length > 0 && (
                  <span className="nav-badge">{demandesEnAttente.length}</span>
                )}
                {item.key === 'demandes' && demandesEnAttente.length === 0 && demandesTraiteesInterim.length > interimVu && (
                  <span style={{width:8,height:8,borderRadius:'50%',background:'#f59e0b',display:'inline-block',marginLeft:6,flexShrink:0}} />
                )}
              </button>
            ))}
            {estInterimaireRH && (
              <button
                className={activeMenu === 'visa-rh' ? 'active' : ''}
                onClick={() => { setOpenPanel(''); setActiveMenu('visa-rh'); }}
                style={{position:'relative'}}
              >
                <span><SideIcon type="demandes" active={activeMenu === 'visa-rh'} /></span>
                Visa RH (Intérim)
                {demandesRH.filter(d => d.statut === 'approuve_responsable').length > 0 && (
                  <span className="nav-badge">{demandesRH.filter(d => d.statut === 'approuve_responsable').length}</span>
                )}
              </button>
            )}
          </nav>
          <button className="respo-logout" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('utilisateur'); navigate('/login'); }}>
            <span><LogoutIcon /></span>
            Se déconnecter
          </button>
        </aside>

        <main className="respo-main">
          <header className="respo-header">
            <div>
              <h1>Tableau de bord</h1>
              <p>Bienvenue, {prenom} !</p>
            </div>
            <div className="respo-top-right">
              <button className={`icon-btn ${openPanel === 'notif' ? 'active' : ''}`} onClick={() => {
                const newPanel = openPanel === 'notif' ? '' : 'notif';
                setOpenPanel(newPanel);
                if (newPanel === 'notif' && nonLues > 0) {
                  axios.put(`${API}/notifications/tout-lire`, {}, { headers })
                    .then(() => setNotifications(prev => prev.map(n => ({ ...n, lu: true }))));
                }
              }}>
                🔔{nonLues > 0 && <i className="notif-dot" />}
              </button>
              <button className="avatar-btn" onClick={() => setActiveMenu('profil')}>{prenom.charAt(0)}</button>
              <div className="respo-user">
                <span>{prenom} {nom}</span>
                <small>responsable</small>
              </div>
            </div>
            {openPanel === 'notif' && (
              <div className="respo-header-panel respo-panel-notif">
                <h4>Notifications</h4>
                {notifications.length === 0 ? <p>Aucune notification.</p> : notifications.slice(0, 5).map(n => (
                  <p key={n.id} style={{ opacity: n.lu ? 0.6 : 1, fontSize: 13 }}>{n.message}</p>
                ))}
              </div>
            )}
          </header>

          {/* ══════ OVERVIEW ══════ */}
          {visibleMenu === 'overview' && (
            <>
              <section className="respo-kpi-grid">
                {[
                  { label: 'Mon solde restant',    value: String(soldeTotal),                  tone: 'blue',   icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                  { label: 'Demandes en attente',  value: String(demandesEnAttente.length),     tone: 'orange', icon: 'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' },
                  { label: 'Absents aujourd\'hui', value: String(absentsAujourdhui),            tone: 'green',  icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                  { label: 'Mon reliquat',          value: String(profil?.reliquat || 0),       tone: 'violet', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
                ].map((card) => (
                  <article key={card.label} className={`balance-card card-${card.tone}`}>
                    <div className="bc-icon-wrap">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={card.icon} /></svg>
                    </div>
                    <p className="bc-label">{card.label}</p>
                    <i />
                    <p className="bc-value">{card.value}</p>
                  </article>
                ))}
              </section>

              <section className="respo-content-grid">
                <div className="respo-panel">
                  <div className="emp-panel-head">
                    <div className="emp-head-left">
                      <h2 className="emp-title">Demandes récentes</h2>
                      <span className="emp-count-badge">{demandes.length} demandes</span>
                    </div>
                    <button className="btn-toutes-demandes" onClick={() => setActiveMenu('demandes')}>
                      Toutes les demandes
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </button>
                  </div>

                  <div className="dem-kpi-strip">
                    <div className="dks-card dks-wait"><span>En attente</span><strong>{countByStatut('en_attente')}</strong></div>
                    <div className="dks-card dks-ok"><span>Approuvés</span><strong>{countByStatut('approuve_responsable')}</strong></div>
                    <div className="dks-card dks-no"><span>Refusés</span><strong>{countByStatut('refuse')}</strong></div>
                    <div className="dks-card dks-total"><span>Total</span><strong>{demandes.length}</strong></div>
                  </div>

                  <div className="emp-table-wrap">
                    <table className="emp-table">
                      <thead>
                        <tr><th>Employé</th><th>Type</th><th>Dates</th><th>Jours</th><th>Statut</th><th>Action</th></tr>
                      </thead>
                      <tbody>
                        {demandes.slice(0, 6).map(d => {
                          const cfg = LEAVE_TYPE_CONFIG[d.type_conge] || {};
                          return (
                            <tr key={d.id} className="emp-row">
                              <td>
                                <div className="emp-cell">
                                  <span className="emp-avatar">{d.prenom?.charAt(0)}</span>
                                  <span className="emp-name">{d.prenom} {d.nom}</span>
                                </div>
                              </td>
                              <td><span className="dem-type-badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}` }}>{cfg.label || d.type_conge}</span></td>
                              <td><small>{d.date_debut?.slice(0, 10)} → {d.date_fin?.slice(0, 10)}</small></td>
                              <td><strong>{d.nb_jours}j</strong></td>
                              <td><span className={`emp-statut-pill ${STATUT_CLASS[d.statut] || 'pill-wait'}`}>{STATUT_LABELS[d.statut] || d.statut}</span></td>
                              <td>
                                {d.statut === 'en_attente' ? (
                                  <button className="emp-btn-modifier" onClick={() => { setDemandeSelectionnee(d); setAvisResponsable(''); }}>
                                    Traiter
                                  </button>
                                ) : (
                                  <button className="emp-btn-voir" onClick={() => { setDemandeSelectionnee(d); setAvisResponsable(''); }} title="Voir les détails">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {demandes.length === 0 && <tr><td colSpan="6" className="dem-empty">Aucune demande.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>

                <aside className="respo-side-panels">
                  <div className="respo-team-card">
                    <h3>Absents ce mois</h3>
                    {demandes.filter(d => {
                      const moisStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                      return d.statut === 'signe_directeur' && d.date_debut?.slice(0, 7) <= moisStr && d.date_fin?.slice(0, 7) >= moisStr;
                    }).slice(0, 4).map(d => (
                      <div key={d.id} className="team-leave-row">
                        <small>{d.date_debut?.slice(0, 10)} → {d.date_fin?.slice(0, 10)}</small>
                        <div className="avatar-list">
                          <span className="avatar-dot">{d.prenom?.charAt(0)}{d.nom?.charAt(0)}</span>
                        </div>
                      </div>
                    ))}
                    {demandes.filter(d => d.statut === 'signe_directeur').length === 0 && (
                      <p style={{ fontSize: 13, color: '#9aa4c2' }}>Aucune absence ce mois.</p>
                    )}
                  </div>

                  <div className="respo-panel stat-fill">
                    <h3>Résumé rapide</h3>
                    <div className="quick-row"><span>Demandes urgentes</span><strong>{demandesEnAttente.length}</strong></div>
                    <div className="quick-row"><span>Absents aujourd'hui</span><strong>{absentsAujourdhui}</strong></div>
                    <div className="quick-row"><span>Total équipe</span><strong>{equipe.length}</strong></div>
                    <button className="quick-action" onClick={() => setActiveMenu('calendrier')}>Voir le calendrier</button>
                  </div>
                </aside>
              </section>
            </>
          )}

          {visibleMenu === 'demandes' && (
            <section className="respo-panel demandes-panel">
              <div className="emp-panel-head">
                <div className="emp-head-left">
                  <h2 className="emp-title">Demandes à traiter</h2>
                  <span className="emp-count-badge">{demandesEnAttente.length} en attente</span>
                </div>
              </div>

              <div className="dem-kpi-strip">
                <div className="dks-card dks-wait" style={{cursor:'pointer'}} onClick={() => setFilterStatutEquipe('en_attente')}><span>En attente</span><strong>{countByStatut('en_attente')}</strong></div>
                <div className="dks-card dks-ok" style={{cursor:'pointer'}} onClick={() => setFilterStatutEquipe('approuve_responsable')}><span>Approuvés</span><strong>{countByStatut('approuve_responsable')}</strong></div>
                <div className="dks-card dks-no" style={{cursor:'pointer'}} onClick={() => setFilterStatutEquipe('refuse')}><span>Refusés</span><strong>{countByStatut('refuse')}</strong></div>
                <div className="dks-card dks-total" style={{cursor:'pointer'}} onClick={() => setFilterStatutEquipe('Tous')}><span>Total</span><strong>{demandes.length}</strong></div>
              </div>

              <div className="dem-toolbar" style={{display:'flex', gap:12, margin:'12px 0', alignItems:'center'}}>
                <div className="dem-search-wrap">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="#9aa4c2" strokeWidth="2" /><path d="M16 16L20 20" stroke="#9aa4c2" strokeWidth="2" strokeLinecap="round" /></svg>
                  <input className="dem-search" type="text" placeholder="Rechercher employé, référence..." value={searchEquipe} onChange={e => setSearchEquipe(e.target.value)} />
                </div>
                <div className="dem-filter-tabs">
                  {['Tous','en_attente','approuve_responsable','refuse'].map(s => (
                    <button key={s} className={filterStatutEquipe === s ? 'active' : ''} onClick={() => setFilterStatutEquipe(s)}>
                      {s === 'Tous' ? 'Tous' : STATUT_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="emp-table-wrap">
                <table className="emp-table dem-9col">
                  <thead>
                    <tr><th>Référence</th><th>Employé</th><th>Type</th><th>Date début</th><th>Date fin</th><th>Jours</th><th>Motif</th><th>Statut</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {demandesFiltreesEquipe.length === 0 ? (
                      <tr><td colSpan="9" className="dem-empty">Aucune demande trouvée.</td></tr>
                    ) : demandesFiltreesEquipe.map(d => {
                      const cfg = LEAVE_TYPE_CONFIG[d.type_conge] || {};
                      return (
                        <tr key={d.id} className="emp-row">
                          <td className="dem-id">{d.reference}</td>
                          <td>
                            <div className="emp-cell">
                              <span className="emp-avatar">{d.prenom?.charAt(0)}</span>
                              <div>
                                <span className="emp-name">{d.prenom} {d.nom}</span>
                                <small style={{ display: 'block', color: '#9aa4c2', fontSize: 11 }}>
                                  {d.departement}
                                  {d.est_interimaire ? (
                                    <span style={{ marginLeft:5, background:'#fef9c3', color:'#92400e', borderRadius:4, padding:'1px 6px', fontSize:10, fontWeight:700 }}>
                                      ⏳ Via intérim
                                    </span>
                                  ) : null}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td><span className="dem-type-badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}` }}>{cfg.label || d.type_conge}</span></td>
                          <td>{d.date_debut?.slice(0, 10)}</td>
                          <td>{d.date_fin?.slice(0, 10)}</td>
                          <td><strong>{d.nb_jours}j</strong></td>
                          <td><small>{d.motif || '-'}</small></td>
                          <td><span className={`emp-statut-pill ${STATUT_CLASS[d.statut] || 'pill-wait'}`}>{STATUT_LABELS[d.statut] || d.statut}</span></td>
                          <td>
                            {d.statut === 'en_attente' && (
                              <button className="emp-btn-modifier" onClick={() => { setDemandeSelectionnee(d); setAvisResponsable(''); }}>
                                Traiter
                              </button>
                            )}
                            {d.statut !== 'en_attente' && (
                              <button className="emp-btn-voir" title="Voir détail" onClick={() => { setDemandeSelectionnee(d); setAvisResponsable(''); }}>
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

              {/* Demandes traitées par l'intérimaire */}
              {demandesTraiteesInterim.length > 0 && (
                <>
                  <div style={{margin:'28px 0 12px',display:'flex',alignItems:'center',gap:10,borderTop:'1px dashed #e2e7f7',paddingTop:20}}>
                    <h3 style={{margin:0,fontSize:15,color:'#1a2340'}}>Traitées par mon intérimaire pendant mon absence</h3>
                    <span style={{background:'#fef9c3',color:'#92400e',borderRadius:20,padding:'2px 10px',fontSize:11,fontWeight:700}}>
                      {demandesTraiteesInterim.length} demande{demandesTraiteesInterim.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="emp-table-wrap">
                    <table className="emp-table">
                      <thead><tr><th>Référence</th><th>Employé</th><th>Type</th><th>Date début</th><th>Date fin</th><th>Jours</th><th>Statut</th><th>Intérimaire</th><th>PDF</th></tr></thead>
                      <tbody>
                        {demandesTraiteesInterim.map(d => {
                          const cfg = LEAVE_TYPE_CONFIG[d.type_conge] || {};
                          return (
                            <tr key={d.id} className="emp-row" style={{background:'#fffdf0'}}>
                              <td className="dem-id">{d.reference}</td>
                              <td><div className="emp-cell"><span className="emp-avatar">{d.prenom?.charAt(0)}</span><span className="emp-name">{d.prenom} {d.nom}</span></div></td>
                              <td><span className="dem-type-badge" style={{background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.color}`}}>{cfg.label||d.type_conge}</span></td>
                              <td>{d.date_debut?.slice(0,10)}</td>
                              <td>{d.date_fin?.slice(0,10)}</td>
                              <td><strong>{d.nb_jours}j</strong></td>
                              <td><span className={`emp-statut-pill ${STATUT_CLASS[d.statut]||'pill-wait'}`}>{STATUT_LABELS[d.statut]||d.statut}</span></td>
                              <td><span style={{fontSize:12,color:'#92400e',fontWeight:600}}>{d.interimaire_prenom} {d.interimaire_nom}</span></td>
                              <td>
                                <button className="emp-btn-voir" onClick={() => window.open(`${API}/pdf/demande/${d.id}?token=${token}`, '_blank')}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><path d="M2 12C4 7 8 4 12 4s8 3 10 8c-2 5-6 8-10 8S4 17 2 12Z" stroke="currentColor" strokeWidth="2"/></svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          )}
          {/* ══════ MES DEMANDES ══════ */}
          {visibleMenu === 'mes-demandes' && (
            <section className="respo-panel only-panel">
              <div className="emp-panel-head">
                <div className="emp-head-left">
                  <h2 className="emp-title">Mes demandes</h2>
                  <span className="emp-count-badge">{mesDemandes.length} demandes</span>
                </div>
              </div>

              <div className="dem-kpi-strip">
                <div className="dks-card dks-wait" style={{cursor:'pointer'}} onClick={() => setFilterStatutMes('en_attente')}><span>En attente</span><strong>{mesDemandes.filter(d => d.statut === 'en_attente').length}</strong></div>
                <div className="dks-card dks-ok" style={{cursor:'pointer'}} onClick={() => setFilterStatutMes('signe_directeur')}><span>Approuvées</span><strong>{mesDemandes.filter(d => d.statut === 'signe_directeur').length}</strong></div>
                <div className="dks-card dks-no" style={{cursor:'pointer'}} onClick={() => setFilterStatutMes('refuse')}><span>Refusées</span><strong>{mesDemandes.filter(d => d.statut === 'refuse').length}</strong></div>
                <div className="dks-card dks-total" style={{cursor:'pointer'}} onClick={() => setFilterStatutMes('Tous')}><span>Total</span><strong>{mesDemandes.length}</strong></div>
              </div>

              <div className="dem-toolbar" style={{display:'flex', gap:12, margin:'12px 0', alignItems:'center'}}>
                <div className="dem-search-wrap">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="#9aa4c2" strokeWidth="2" /><path d="M16 16L20 20" stroke="#9aa4c2" strokeWidth="2" strokeLinecap="round" /></svg>
                  <input className="dem-search" type="text" placeholder="Rechercher référence..." value={searchMes} onChange={e => setSearchMes(e.target.value)} />
                </div>
                <div className="dem-filter-tabs">
                  {['Tous','en_attente','approuve_rh','signe_directeur','refuse'].map(s => (
                    <button key={s} className={filterStatutMes === s ? 'active' : ''} onClick={() => setFilterStatutMes(s)}>
                      {s === 'Tous' ? 'Tous' : STATUT_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="emp-table-wrap">
                <table className="emp-table mes-dem-table">
                  <thead>
                    <tr><th>Référence</th><th>Type</th><th>Date début</th><th>Date fin</th><th>Jours</th><th>Statut</th><th>PDF</th></tr>
                  </thead>
                  <tbody>
                    {demandesFiltreesMes.length === 0 ? (
                      <tr><td colSpan="7" className="dem-empty">Aucune demande trouvée.</td></tr>
                    ) : demandesFiltreesMes.map(d => {
                      const cfg = LEAVE_TYPE_CONFIG[d.type_conge] || {};
                      const estSigne = d.statut === 'signe_directeur';
                      return (
                        <tr key={d.id} className="emp-row">
                          <td className="dem-id">{d.reference}</td>
                          <td><span className="dem-type-badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}` }}>{cfg.label || d.type_conge}</span></td>
                          <td>{d.date_debut?.slice(0, 10)}</td>
                          <td>{d.date_fin?.slice(0, 10)}</td>
                          <td><strong>{d.nb_jours}j</strong></td>
                          <td><span className={`emp-statut-pill ${STATUT_CLASS[d.statut] || 'pill-wait'}`}>{STATUT_LABELS[d.statut] || d.statut}</span></td>
                          <td>
                            <div style={{display:'flex',gap:6}}>
                            <button
                              className="emp-btn-modifier"
                              title="Voir la demande PDF"
                              onClick={() => window.open(`${API}/pdf/demande/${d.id}?token=${token}`, '_blank')}
                            >
                              PDF
                            </button>
                            {estSigne && (
                              <button
                                className="emp-btn-modifier"
                                style={{ color: '#16a34a', background: '#f0fdf4' }}
                                title="Télécharger le titre de congé"
                                onClick={() => window.open(`${API}/pdf/titre/${d.id}?token=${token}`, '_blank')}
                              >
                                🟢 Titre
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
            </section>
          )}

          {/* ══════ CALENDRIER ══════ */}
          {visibleMenu === 'calendrier' && (
            <section className="respo-calendar-layout">
              <aside className="respo-calendar-side">
                <div className="respo-calendar-card">
                  <h3>Balances équipe</h3>
                  {[
                    { label: 'Congés validés',      value: `${demandes.filter(d => d.statut === 'signe_directeur').reduce((a, d) => a + d.nb_jours, 0)} jours`, color: 'pink' },
                    { label: 'Demandes en attente', value: `${demandesEnAttente.length} dossiers`,                                                               color: 'blue' },
                    { label: 'Membres équipe',      value: `${equipe.length} personnes`,                                                                         color: 'orange' },
                    { label: 'Mon solde',           value: `${soldeTotal} jours`,                                                                                color: 'pink' },
                  ].map(item => (
                    <div key={item.label} className="respo-balance-line">
                      <span className={`respo-legend-dot ${item.color}`} />
                      <div><p>{item.label}</p><small>{item.value}</small></div>
                    </div>
                  ))}
                </div>

                <div className="respo-calendar-card">
                  <h3>Congés — {MOIS_FR[calMonth]}</h3>
                  {demandes.filter(d => {
                    const moisStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
                    return d.statut !== 'refuse' && d.date_debut?.slice(0, 7) <= moisStr && d.date_fin?.slice(0, 7) >= moisStr;
                  }).slice(0, 5).map(d => {
                    const cfg = LEAVE_TYPE_CONFIG[d.type_conge] || {};
                    return (
                      <div key={d.id} className="respo-mini-conge-row">
                        <span className="respo-mini-bar" style={{ background: cfg.color }} />
                        <div>
                          <small>{d.prenom} {d.nom}</small>
                          <p>{d.date_debut?.slice(0, 10)} → {d.date_fin?.slice(0, 10)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </aside>

              <div className="respo-calendar-main">
                <div className="respo-calendar-head">
                  <h2>Calendrier équipe</h2>
                  <div className="month-nav">
                    <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}>{'<'}</button>
                    <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}>{'>'}</button>
                    <strong>{MOIS_FR[calMonth]} {calYear}</strong>
                  </div>
                </div>

                <div className="respo-calendar-grid">
                  {weekDays.map(d => <div key={d} className="day-name">{d}</div>)}
                  {calCells.map((cell, idx) => {
                    const conge = cell.current ? isDayConge(cell.day) : null;
                    const isToday = cell.current && cell.day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
                    return (
                      <div key={idx} className={`day-cell${!cell.current ? ' other-month' : ''}${isToday ? ' today' : ''}`}>
                        <span className="day-number">{cell.day}</span>
                        {conge && (
                          <p className="day-event">
                            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: conge.color, marginRight: 3 }} />
                            {conge.prenom}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* ══════ PROFIL ══════ */}
          {visibleMenu === 'profil' && (
            <section className="content-card profile-card">
              <div className="content-head"><h2>Mon profil</h2></div>
              <div className="profile-top">
                <div className="profile-avatar">{prenom.charAt(0)}</div>
                <div>
                  <h3>{prenom} {nom}</h3>
                  <p>{profil?.fonction || 'Responsable'} — {profil?.departement || 'MODEP'}</p>
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
          {/* ══ VISA RH INTÉRIMAIRE ══ */}
          {visibleMenu === 'visa-rh' && estInterimaireRH && (
            <section className="respo-panel only-panel">
              <div className="emp-panel-head">
                <div className="emp-head-left">
                  <h2 className="emp-title">Visa RH — Intérimaire</h2>
                  <span className="emp-count-badge" style={{background:'#fff3cd',color:'#856404'}}>
                    Vous remplacez le service RH
                  </span>
                </div>
              </div>
              <div className="emp-table-wrap">
                <table className="emp-table">
                  <thead><tr><th>Référence</th><th>Employé</th><th>Type</th><th>Date début</th><th>Date fin</th><th>Jours</th><th>Statut</th><th>Action</th></tr></thead>
                  <tbody>
                    {demandesRH.filter(d => d.statut === 'approuve_responsable').length === 0 ? (
                      <tr><td colSpan="8" className="dem-empty">Aucune demande en attente de visa RH.</td></tr>
                    ) : demandesRH.filter(d => d.statut === 'approuve_responsable').map(d => {
                      const cfg = LEAVE_TYPE_CONFIG[d.type_conge] || {};
                      return (
                        <tr key={d.id} className="emp-row">
                          <td className="dem-id">{d.reference}</td>
                          <td><div className="emp-cell"><span className="emp-avatar">{d.prenom?.charAt(0)}</span><span className="emp-name">{d.prenom} {d.nom}</span></div></td>
                          <td><span className="dem-type-badge" style={{background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.color}`}}>{cfg.label||d.type_conge}</span></td>
                          <td>{d.date_debut?.slice(0,10)}</td>
                          <td>{d.date_fin?.slice(0,10)}</td>
                          <td><strong>{d.nb_jours}j</strong></td>
                          <td><span className="emp-statut-pill pill-wait">Validé resp.</span></td>
                          <td>
                            <div className="dem-actions">
                              <button className="dem-btn-approve" onClick={async () => {
                                await axios.put(`${API}/demandes/${d.id}/visa-rh`, { decision: 'approuver' }, { headers });
                                chargerDonnees();
                              }}>✓ Visa</button>
                              <button className="dem-btn-refuse" onClick={async () => {
                                await axios.put(`${API}/demandes/${d.id}/visa-rh`, { decision: 'refuser' }, { headers });
                                chargerDonnees();
                              }}>✕</button>
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

          {/* ══ PARAMÈTRES ══ */}
          {visibleMenu === 'parametres' && (
            <ParametresForm profil={profil} headers={headers} API={API} />
          )}
        </main>
      </div>

      {/* ══════ NOUVELLE DEMANDE ══════ */}
      {showNouvelleDemande && (
        <div className="respo-nouvelle-overlay" role="dialog" aria-modal="true" onClick={() => setActiveMenu(backgroundMenu)}>
          <div className="respo-nouvelle-card" onClick={e => e.stopPropagation()}>
            <div className="respo-nouvelle-head">
              <h2>Nouvelle demande</h2>
              <button onClick={() => setActiveMenu(backgroundMenu)}>✕</button>
            </div>
            <form className="respo-form" onSubmit={soumettredemande}>
              {erreurDemande  && <p style={{ color: 'red',   fontSize: 13 }}>{erreurDemande}</p>}
              {successDemande && <p style={{ color: 'green', fontSize: 13 }}>{successDemande}</p>}
              <label>Type de congé
                <select value={typeConge} onChange={e => setTypeConge(e.target.value)} required>
                  <option value="" disabled>Sélectionner</option>
                  <option value="annuel">Congé annuel</option>
                  <option value="maladie">Congé maladie</option>
                  <option value="maternite">Congé maternité</option>
                  <option value="sans_solde">Congé sans solde</option>
                  <option value="exceptionnel">Congé exceptionnel</option>
                </select>
              </label>
              <div className="two-inputs">
                <label>Date début<input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} required /></label>
                <label>Date fin<input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} required /></label>
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
                <div />
              </div>
              <label>Motif<textarea rows="4" placeholder="Ajouter un motif..." value={motif} onChange={e => setMotif(e.target.value)} /></label>
              {/* Intérimaire : affiché pour tous les types dès qu'un type est choisi */}
              {typeConge && (
                <label>
                  Désigner un intérimaire
                  <select
                    value={interimId}
                    onChange={e => setInterimId(e.target.value)}
                    required={['annuel','sans_solde','maternite'].includes(typeConge)}
                    style={{marginTop:6,border:'1px solid #e2e7f7',borderRadius:8,padding:'9px 12px',fontSize:13,width:'100%'}}
                  >
                    <option value="">Aucun intérimaire</option>
                    {equipe
                      .filter(e => {
                        const r = String(e.role||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
                        return e.id !== profil?.id && r === 'responsable';
                      })
                      .map(e => (
                        <option key={e.id} value={e.id}>
                          {e.prenom} {e.nom} — Responsable
                        </option>
                      ))
                    }
                  </select>
                </label>
              )}
              <div className="respo-nouvelle-actions">
                <button type="button" className="btn-secondary" onClick={() => setActiveMenu(backgroundMenu)}>Annuler</button>
                <button type="submit" className="btn-primary">Envoyer la demande</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════ MODAL DÉCISION ══════ */}
      {demandeSelectionnee && (
        <div className="cal-modal-overlay" onClick={() => setDemandeSelectionnee(null)}>
          <div className="cal-modal" onClick={e => e.stopPropagation()}>
            <button className="cal-modal-close" onClick={() => setDemandeSelectionnee(null)}>✕</button>
            <div className="cal-modal-header" style={{ borderTop: `5px solid ${LEAVE_TYPE_CONFIG[demandeSelectionnee.type_conge]?.color || '#9aa4c2'}` }}>
              <span className="cal-modal-avatar" style={{ background: LEAVE_TYPE_CONFIG[demandeSelectionnee.type_conge]?.color || '#9aa4c2' }}>
                {demandeSelectionnee.prenom?.charAt(0)}
              </span>
              <div>
                <h3>{demandeSelectionnee.prenom} {demandeSelectionnee.nom}</h3>
                <p>{LEAVE_TYPE_CONFIG[demandeSelectionnee.type_conge]?.label} — {demandeSelectionnee.nb_jours} jour(s)</p>
              </div>
            </div>
            <div className="cal-modal-body">
              <div className="cal-modal-row"><span>Référence</span><strong>{demandeSelectionnee.reference}</strong></div>
              <div className="cal-modal-row">
                <span>Poste</span>
                <strong>{{ employe:'Employé', responsable:'Responsable', rh:'Admin RH', directeur:'Directeur Général' }[demandeSelectionnee.role] || demandeSelectionnee.role || '-'}</strong>
              </div>
              <div className="cal-modal-row"><span>Département</span><strong>{demandeSelectionnee.departement || '-'}</strong></div>
              <div className="cal-modal-row"><span>Date début</span><strong>{demandeSelectionnee.date_debut?.slice(0, 10)}</strong></div>
              <div className="cal-modal-row"><span>Date fin</span><strong>{demandeSelectionnee.date_fin?.slice(0, 10)}</strong></div>
              <div className="cal-modal-row"><span>Motif</span><strong>{demandeSelectionnee.motif || '-'}</strong></div>
              <div className="cal-modal-row"><span>Statut</span><span className={`cal-status-badge ${STATUT_CLASS[demandeSelectionnee.statut] || 'pill-wait'}`}>{STATUT_LABELS[demandeSelectionnee.statut] || demandeSelectionnee.statut}</span></div>
              {demandeSelectionnee.avis_responsable && (
                <div className="cal-modal-row"><span>Avis</span><strong>{demandeSelectionnee.avis_responsable}</strong></div>
              )}
              {demandeSelectionnee.statut === 'en_attente' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, marginTop: 12 }}>
                  Avis / Commentaire
                  <textarea rows="3" style={{ border: '1px solid #e2e7f7', borderRadius: 8, padding: 8, fontSize: 13 }} value={avisResponsable} onChange={e => setAvisResponsable(e.target.value)} placeholder="Optionnel..." />
                </label>
              )}
            </div>
            {demandeSelectionnee.statut === 'en_attente' && (
              <div style={{ display: 'flex', gap: 10, padding: '0 24px 24px' }}>
                <button
                  style={{ flex: 1, background: '#16a34a', color: '#fff', border: 0, borderRadius: 10, padding: '10px 0', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => prendreDecision('approuver')}
                  disabled={loadingDecision}
                >
                  ✓ Approuver
                </button>
                <button
                  style={{ flex: 1, background: '#dc2626', color: '#fff', border: 0, borderRadius: 10, padding: '10px 0', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => prendreDecision('refuser')}
                  disabled={loadingDecision}
                >
                  ✕ Refuser
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove}/>
    </div>
  );
}

export default DashboardResponsable;
