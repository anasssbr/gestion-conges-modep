import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import logo from '../assets/logo.png';
import './DashboardDirecteur.css';
import axios from 'axios';

const API = 'http://localhost:5000/api';

const LEAVE_TYPE_CONFIG = {
  annuel:       { color: '#c55ea8', bg: '#fdf0fb', label: 'Congé annuel' },
  maladie:      { color: '#2ca8f2', bg: '#edf7ff', label: 'Congé maladie' },
  maternite:    { color: '#eead38', bg: '#fffbef', label: 'Congé maternité' },
  sans_solde:   { color: '#6a63dc', bg: '#f2f1ff', label: 'Sans solde' },
  exceptionnel: { color: '#e74c3c', bg: '#fdecea', label: 'Exceptionnel' },
};

const STATUT_LABELS = {
  en_attente: 'En attente', approuve_responsable: 'Validé resp.',
  approuve_rh: 'Approuvé RH', signe_directeur: 'Signé', refuse: 'Refusé',
};

const normalizeRole = (r) => String(r||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\s-]+/g,'_').trim();

const menuItems = [
  { key: 'overview',   label: 'Tableau de bord',  icon: 'overview' },
  { key: 'demandes',   label: 'Demandes à signer', icon: 'sign'    },
  { key: 'traitees',   label: 'Demandes traitées', icon: 'demandes'},
  { key: 'profil',     label: 'Mon profil',         icon: 'profil'  },
  { key: 'parametres', label: 'Paramètres',         icon: 'settings'},
];
const validMenuKeys = new Set(menuItems.map(i => i.key));

function SideIcon({ type, active = false }) {
  const color = active ? '#197BBD' : '#C7C7C7';
  const p = { width:16, height:16, viewBox:'0 0 24 24', fill:'none' };
  if (type==='overview') return <svg {...p}><path d="M4 19V6M4 19H20M8 14L11 11L14 12.5L19 7.5" stroke={color} strokeWidth="2" strokeLinecap="round"/></svg>;
  if (type==='sign')     return <svg {...p}><path d="M7 7h10M7 12h10M7 17h10" stroke={color} strokeWidth="2" strokeLinecap="round"/><path d="M4.5 8.5l1.1 1.1 2.3-2.3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if (type==='demandes') return <svg {...p}><path d="M8.5 7H20M8.5 12H20M8.5 17H20" stroke={color} strokeWidth="2" strokeLinecap="round"/><circle cx="5" cy="7" r="1.1" fill={color}/><circle cx="5" cy="12" r="1.1" fill={color}/><circle cx="5" cy="17" r="1.1" fill={color}/></svg>;
  if (type==='profil')   return <svg {...p}><circle cx="12" cy="8" r="3.2" stroke={color} strokeWidth="2"/><path d="M5.8 19C6.7 15.9 8.9 14 12 14C15.1 14 17.3 15.9 18.2 19" stroke={color} strokeWidth="2" strokeLinecap="round"/></svg>;
  return <svg {...p}><path d="M19 13.5C19.1 13 19.2 12.5 19.2 12C19.2 11.5 19.1 11 19 10.5L21 9L19.2 5.5L16.7 6.4C15.9 5.8 15 5.3 14 5L13.7 2.5H10.3L10 5C9 5.3 8.1 5.8 7.3 6.4L4.8 5.5L3 9L5 10.5C4.9 11 4.8 11.5 4.8 12C4.8 12.5 4.9 13 5 13.5L3 15L4.8 18.5L7.3 17.6C8.1 18.2 9 18.7 10 19L10.3 21.5H13.7L14 19C15 18.7 15.9 18.2 16.7 17.6L19.2 18.5L21 15L19 13.5Z" stroke={color} strokeWidth="1.6"/><circle cx="12" cy="12" r="2.8" stroke={color} strokeWidth="1.6"/></svg>;
}

function LogoutIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14.5 6.8V5.6C14.5 4.7 13.8 4 12.9 4H6.8C5.9 4 5.2 4.7 5.2 5.6V18.4C5.2 19.3 5.9 20 6.8 20H12.9C13.8 20 14.5 19.3 14.5 18.4V17.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/><path d="M10.4 12H20.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/><path d="M17.6 9.3L20.3 12L17.6 14.7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function SignatureCanvas({ onSave, onCancel, token }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [mode, setMode] = useState('dessin');
  const [signatures, setSignatures] = useState([]);
  const [selectedSig, setSelectedSig] = useState(null);

  useEffect(() => {
    if (mode === 'enregistree') {
      axios.get(`${API}/signatures`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => setSignatures(r.data.filter(s => s.active)))
        .catch(() => {});
    }
  }, [mode]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };
  const startDraw = (e) => { e.preventDefault(); drawing.current = true; const c = canvasRef.current; const ctx = c.getContext('2d'); const {x,y} = getPos(e,c); ctx.beginPath(); ctx.moveTo(x,y); };
  const draw = (e) => { if (!drawing.current) return; e.preventDefault(); const c = canvasRef.current; const ctx = c.getContext('2d'); const {x,y} = getPos(e,c); ctx.lineWidth=2.5; ctx.lineCap='round'; ctx.strokeStyle='#1a2340'; ctx.lineTo(x,y); ctx.stroke(); };
  const stopDraw = () => { drawing.current = false; };
  const clear = () => { const c = canvasRef.current; c.getContext('2d').clearRect(0,0,c.width,c.height); };
  const save = () => mode === 'dessin' ? onSave(canvasRef.current.toDataURL('image/png')) : selectedSig && onSave(selectedSig.image_data);

  return (
    <div style={{padding:'0 20px 20px'}}>
      <div style={{display:'flex',gap:8,marginBottom:16,borderBottom:'1px solid #edf1fb',paddingBottom:12}}>
        <button onClick={() => setMode('dessin')} style={{padding:'7px 18px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:700,fontSize:13,background:mode==='dessin'?'#197bbd':'#f0f4ff',color:mode==='dessin'?'#fff':'#4b506d'}}>✏️ Dessiner</button>
        <button onClick={() => setMode('enregistree')} style={{padding:'7px 18px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:700,fontSize:13,background:mode==='enregistree'?'#197bbd':'#f0f4ff',color:mode==='enregistree'?'#fff':'#4b506d'}}>🖼️ Signature enregistrée</button>
      </div>
      {mode === 'dessin' && (
        <>
          <p style={{margin:'0 0 8px',fontSize:13,color:'#7b8db4',fontWeight:600}}>Dessinez votre signature ci-dessous :</p>
          <canvas ref={canvasRef} width={500} height={150} style={{border:'2px dashed #c5dcf8',borderRadius:12,background:'#f8fbff',cursor:'crosshair',width:'100%',display:'block',touchAction:'none'}} onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw} onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}/>
          <div style={{display:'flex',gap:8,marginTop:12}}>
            <button onClick={clear} style={{flex:1,border:'1px solid #e2e7f7',borderRadius:10,padding:'9px 0',background:'#f6f8ff',cursor:'pointer',fontWeight:700,fontSize:13,color:'#4b506d'}}>Effacer</button>
            <button onClick={onCancel} style={{flex:1,border:'1px solid #e2e7f7',borderRadius:10,padding:'9px 0',background:'#fff',cursor:'pointer',fontWeight:700,fontSize:13,color:'#4b506d'}}>Annuler</button>
            <button onClick={save} style={{flex:2,border:0,borderRadius:10,padding:'9px 0',background:'#ffc145',cursor:'pointer',fontWeight:700,fontSize:13,color:'#404040'}}>✓ Confirmer la signature</button>
          </div>
        </>
      )}
      {mode === 'enregistree' && (
        <>
          <p style={{margin:'0 0 12px',fontSize:13,color:'#7b8db4',fontWeight:600}}>Sélectionnez une signature :</p>
          {signatures.length === 0 ? (
            <p style={{fontSize:13,color:'#9aa4c2',textAlign:'center',padding:'20px 0'}}>Aucune signature enregistrée.</p>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              {signatures.map(sig => (
                <div key={sig.id} onClick={() => setSelectedSig(sig)} style={{border:`2px solid ${selectedSig?.id===sig.id?'#197bbd':'#e2e7f7'}`,borderRadius:10,padding:10,cursor:'pointer',background:selectedSig?.id===sig.id?'#eef6ff':'#fff',textAlign:'center'}}>
                  <img src={sig.image_data} alt={sig.label} style={{maxHeight:60,maxWidth:'100%',objectFit:'contain'}} />
                  <p style={{margin:'6px 0 0',fontSize:12,fontWeight:700,color:'#4b506d'}}>{sig.label}</p>
                </div>
              ))}
            </div>
          )}
          <div style={{display:'flex',gap:8,marginTop:4}}>
            <button onClick={onCancel} style={{flex:1,border:'1px solid #e2e7f7',borderRadius:10,padding:'9px 0',background:'#fff',cursor:'pointer',fontWeight:700,fontSize:13,color:'#4b506d'}}>Annuler</button>
            <button onClick={save} disabled={!selectedSig} style={{flex:2,border:0,borderRadius:10,padding:'9px 0',background:selectedSig?'#ffc145':'#e2e7f7',cursor:selectedSig?'pointer':'not-allowed',fontWeight:700,fontSize:13,color:'#404040'}}>✓ Utiliser cette signature</button>
          </div>
        </>
      )}
    </div>
  );
}

function PdfActions({ d, token }) {
  const estSigne = d.statut === 'signe_directeur';
  return (
    <div className="dir-row-actions">
      <button className="dir-btn-pdf" onClick={() => window.open(`${API}/pdf/demande/${d.id}?token=${token}`, '_blank')} style={{display:'flex',alignItems:'center',gap:4}}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        PDF
      </button>
      {estSigne && (
        <button className="dir-btn-titre" onClick={() => window.open(`${API}/pdf/titre/${d.id}?token=${token}`, '_blank')} style={{background:'#f0fdf4',color:'#16a34a',border:'1.5px solid #86efac',display:'flex',alignItems:'center',gap:4}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Titre
        </button>
      )}
    </div>
  );
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
    e.preventDefault(); setMsgProfil(''); setErrProfil('');
    try {
      await axios.put(`${API}/utilisateurs/profil/modifier`, { nom, prenom, email }, { headers });
      setMsgProfil('Profil mis à jour avec succès !');
      setTimeout(() => setMsgProfil(''), 3000);
    } catch (err) { setErrProfil(err.response?.data?.message || 'Erreur'); }
  };

  const changerMdp = async (e) => {
    e.preventDefault(); setMsgMdp(''); setErrMdp('');
    if (nouveauMdp !== confirmMdp) { setErrMdp('Les mots de passe ne correspondent pas.'); return; }
    if (nouveauMdp.length < 6) { setErrMdp('Minimum 6 caractères.'); return; }
    try {
      await axios.put(`${API}/utilisateurs/profil/mot-de-passe`, { mot_de_passe_actuel: mdpActuel, nouveau_mot_de_passe: nouveauMdp }, { headers });
      setMsgMdp('Mot de passe modifié !');
      setMdpActuel(''); setNouveauMdp(''); setConfirmMdp('');
      setTimeout(() => setMsgMdp(''), 3000);
    } catch (err) { setErrMdp(err.response?.data?.message || 'Erreur'); }
  };

  const f = { border:'1px solid #e2e7f7', borderRadius:8, padding:'9px 12px', fontSize:13, width:'100%', boxSizing:'border-box' };
  const l = { display:'flex', flexDirection:'column', gap:6, fontSize:13, fontWeight:600, color:'#4b506d' };

  return (
    <section className="content-card profile-card">
      <div className="content-head"><h2>Paramètres</h2></div>

      <form onSubmit={sauvegarderProfil}>
        <h3 style={{margin:'0 0 16px',fontSize:16,color:'#1a2340',fontWeight:700}}>Informations personnelles</h3>
        {msgProfil && <p style={{color:'#16a34a',fontSize:13,marginBottom:10,fontWeight:600}}>✓ {msgProfil}</p>}
        {errProfil && <p style={{color:'#dc2626',fontSize:13,marginBottom:10}}>{errProfil}</p>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px 20px',marginBottom:20}}>
          <label style={l}>Prénom<input style={f} value={prenom} onChange={e=>setPrenom(e.target.value)} required /></label>
          <label style={l}>Nom<input style={f} value={nom} onChange={e=>setNom(e.target.value)} required /></label>
          <label style={l}>Email<input type="email" style={f} value={email} onChange={e=>setEmail(e.target.value)} required /></label>
        </div>
        <button type="submit" style={{border:0,borderRadius:10,padding:'9px 24px',background:'#ffc145',cursor:'pointer',fontWeight:700,fontSize:13}}>Enregistrer le profil</button>
      </form>

      <hr style={{border:0,borderTop:'1px solid #edf1fb',margin:'24px 0'}} />

      <form onSubmit={changerMdp}>
        <h3 style={{margin:'0 0 16px',fontSize:16,color:'#1a2340',fontWeight:700}}>Changer le mot de passe</h3>
        {msgMdp && <p style={{color:'#16a34a',fontSize:13,marginBottom:10,fontWeight:600}}>✓ {msgMdp}</p>}
        {errMdp && <p style={{color:'#dc2626',fontSize:13,marginBottom:10}}>{errMdp}</p>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px 20px',marginBottom:20}}>
          <label style={l}>Mot de passe actuel<input type="password" style={f} value={mdpActuel} onChange={e=>setMdpActuel(e.target.value)} required placeholder="••••••••" /></label>
          <div />
          <label style={l}>Nouveau mot de passe<input type="password" style={f} value={nouveauMdp} onChange={e=>setNouveauMdp(e.target.value)} required placeholder="••••••••" /></label>
          <label style={l}>Confirmer<input type="password" style={f} value={confirmMdp} onChange={e=>setConfirmMdp(e.target.value)} required placeholder="••••••••" /></label>
        </div>
        <button type="submit" style={{border:0,borderRadius:10,padding:'9px 24px',background:'#197bbd',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:13}}>Changer le mot de passe</button>
      </form>
    </section>
  );
}

export default function DashboardDirecteur() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeMenu, setActiveMenu] = useState(() => tabFromUrl && validMenuKeys.has(tabFromUrl) ? tabFromUrl : 'overview');

  const utilisateur = useMemo(() => { try { return JSON.parse(localStorage.getItem('utilisateur')||'null'); } catch { return null; } }, []);
  const token = localStorage.getItem('token');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [profil, setProfil] = useState(null);
  const [demandes, setDemandes] = useState([]);
  const [demandesTraitees, setDemandesTraitees] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [openPanel, setOpenPanel] = useState('');

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('Tous');
  const [filterTraitees, setFilterTraitees] = useState('Tous');
  const [searchTraitees, setSearchTraitees] = useState('');

  const [demandeSelectionnee, setDemandeSelectionnee] = useState(null);
  const [showSignature, setShowSignature] = useState(false);
  const [loadingDecision, setLoadingDecision] = useState(false);

  const chargerDonnees = useCallback(() => {
    axios.get(`${API}/utilisateurs/profil`, { headers }).then(r => setProfil(r.data)).catch(()=>{});
    axios.get(`${API}/demandes/directeur`, { headers }).then(r => setDemandes(r.data)).catch(()=>{});
    axios.get(`${API}/demandes/directeur/traitees`, { headers }).then(r => setDemandesTraitees(r.data)).catch(()=>{});
    axios.get(`${API}/notifications`, { headers }).then(r => setNotifications(r.data)).catch(()=>{});
  }, [headers]);

  useEffect(() => { if (!utilisateur) { navigate('/login'); return; } chargerDonnees(); }, []);
  useEffect(() => { const t = tabFromUrl && validMenuKeys.has(tabFromUrl) ? tabFromUrl : 'overview'; setActiveMenu(t); }, [tabFromUrl]);

  const nonLues = notifications.filter(n => !n.lu).length;
  const prenom = profil?.prenom || utilisateur?.prenom || '';
  const nom    = profil?.nom    || utilisateur?.nom    || '';

  const demandesFiltrees = useMemo(() => demandes.filter(d => {
    if (filterType !== 'Tous' && d.type_conge !== filterType) return false;
    if (search && !`${d.prenom} ${d.nom}`.toLowerCase().includes(search.toLowerCase()) && !d.reference?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [demandes, filterType, search]);

  const traiteeFiltrees = useMemo(() => demandesTraitees.filter(d => {
    if (filterTraitees !== 'Tous' && d.statut !== filterTraitees) return false;
    if (searchTraitees && !`${d.prenom} ${d.nom}`.toLowerCase().includes(searchTraitees.toLowerCase()) && !d.reference?.toLowerCase().includes(searchTraitees.toLowerCase())) return false;
    return true;
  }), [demandesTraitees, filterTraitees, searchTraitees]);

  const nbSignees  = demandesTraitees.filter(d => d.statut === 'signe_directeur').length;
  const nbRefusees = demandesTraitees.filter(d => d.statut === 'refuse').length;

  const goToTab = (key) => {
    setOpenPanel('');
    setActiveMenu(key);
    if (key === 'overview') { navigate('/dashboard-directeur'); return; }
    navigate(`/dashboard-directeur?tab=${key}`);
  };

  const signerDemande = async (dataUrl) => {
    if (!demandeSelectionnee) return;
    setLoadingDecision(true);
    try {
      await axios.put(`${API}/demandes/${demandeSelectionnee.id}/signer`, { signature_directeur: dataUrl }, { headers });
      setDemandeSelectionnee(null); setShowSignature(false);
      chargerDonnees();
    } catch (err) { alert(err.response?.data?.message || 'Erreur lors de la signature'); }
    finally { setLoadingDecision(false); }
  };

  const refuserDemande = async (id) => {
    if (!window.confirm('Confirmer le refus de cette demande ?')) return;
    setLoadingDecision(true);
    try {
      await axios.put(`${API}/demandes/${id}/signer`, { decision: 'refuser' }, { headers });
      setDemandeSelectionnee(null);
      chargerDonnees();
    } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
    finally { setLoadingDecision(false); }
  };

  if (!utilisateur || !['directeur','director'].includes(normalizeRole(utilisateur?.role))) return <Navigate to="/login" replace />;

  const kpiCards = [
    { label: 'En attente de signature', value: String(demandes.length),  tone: 'blue',   icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Signées (total)',          value: String(nbSignees),        tone: 'green',  icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Refusées (total)',         value: String(nbRefusees),       tone: 'violet', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  return (
    <div className="dir-shell">
      <div className="dir-layout">

        <aside className="dir-sidebar">
          <div className="dir-brand">
            <img src={logo} alt="MODEP" />
            <div><strong>MODEP</strong><small>Dashboard Directeur</small></div>
          </div>
          <nav className="dir-nav">
            {menuItems.map(item => (
              <button key={item.key} className={activeMenu === item.key ? 'active' : ''} onClick={() => goToTab(item.key)}>
                <span><SideIcon type={item.icon} active={activeMenu === item.key} /></span>
                {item.label}
                {item.key === 'demandes'  && demandes.length > 0        && <span className="nav-badge">{demandes.length}</span>}
                {item.key === 'traitees'  && demandesTraitees.length > 0 && <span className="nav-badge">{demandesTraitees.length}</span>}
              </button>
            ))}
          </nav>
          <button className="dir-logout" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('utilisateur'); navigate('/login'); }}>
            <span><LogoutIcon /></span>Se déconnecter
          </button>
        </aside>

        <main className="dir-main">
          <header className="dir-header">
            <div><h1>Tableau de bord</h1><p>Bienvenue, {prenom} !</p></div>
            <div className="dir-top-right">
              <button className={`dir-icon-btn dir-notif-btn ${openPanel==='notif'?'active':''}`} onClick={() => {
                const newPanel = openPanel === 'notif' ? '' : 'notif';
                setOpenPanel(newPanel);
                if (newPanel === 'notif' && nonLues > 0) {
                  axios.put(`${API}/notifications/tout-lire`, {}, { headers })
                    .then(() => setNotifications(prev => prev.map(n => ({ ...n, lu: true }))));
                }
              }}>
                🔔{nonLues > 0 && <i />}
              </button>
              <button className="dir-avatar-btn" onClick={() => goToTab('profil')}>{prenom.charAt(0)}</button>
              <div className="dir-user"><span>{prenom} {nom}</span><small>Directeur</small></div>
            </div>
            {openPanel === 'notif' && (
              <div className="dir-header-panel dir-panel-notif">
                <h4>Notifications</h4>
                {notifications.length === 0 ? <p>Aucune notification.</p> : notifications.slice(0,5).map(n => (
                  <p key={n.id} style={{opacity:n.lu?0.6:1,fontSize:13}}>{n.message}</p>
                ))}
              </div>
            )}
          </header>

          {/* ── OVERVIEW ── */}
          {activeMenu === 'overview' && (
            <>
              <section className="dir-kpi-grid-new">
                {kpiCards.map(card => (
                  <article key={card.label} className={`dir-balance-card dir-card-${card.tone}`}>
                    <div className="dir-bc-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={card.icon}/></svg></div>
                    <p className="dir-bc-label">{card.label}</p><i className="dir-bc-bar"/>
                    <p className="dir-bc-value">{card.value}</p>
                  </article>
                ))}
              </section>
              <section className="dir-overview-grid">
                <div className="dir-panel">
                  <div className="dir-dem-head">
                    <div className="dir-dem-head-left"><h2 className="dir-dem-title">Demandes à signer</h2><span className="dir-dem-count-badge">{demandes.length}</span></div>
                    <button className="dir-all-demands-btn" onClick={() => goToTab('demandes')}>Toutes les demandes <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>
                  </div>
                  <div className="dir-table-wrap">
                    <table className="dir-table-new">
                      <thead><tr><th>Employé</th><th>Type</th><th>Dates</th><th>Jours</th><th>Visa RH</th><th>Actions</th></tr></thead>
                      <tbody>
                        {demandes.slice(0,6).map(d => {
                          const cfg = LEAVE_TYPE_CONFIG[d.type_conge]||{};
                          return (
                            <tr key={d.id} className="dir-row-new" onClick={() => { setDemandeSelectionnee(d); setShowSignature(false); }}>
                              <td><div className="dir-emp-cell"><span className="dir-emp-avatar" style={{background:cfg.color||'#9aa4c2'}}>{d.prenom?.charAt(0)}</span><span className="dir-emp-name">{d.prenom} {d.nom}</span></div></td>
                              <td><span className="dir-type-badge" style={{background:cfg.bg,color:cfg.color,borderColor:cfg.color}}>{cfg.label||d.type_conge}</span></td>
                              <td><small style={{color:'#5a6480'}}>{d.date_debut?.slice(0,10)} → {d.date_fin?.slice(0,10)}</small></td>
                              <td><span className="dir-duree-badge">{d.nb_jours}j</span></td>
                              <td><span className="dir-visa-pill dir-visa-ok">✓ Validé RH</span></td>
                              <td onClick={e=>e.stopPropagation()}>
                                <div className="dir-row-actions">
                                  <button className="dir-btn-sign" onClick={() => { setDemandeSelectionnee(d); setShowSignature(true); }}>✎ Signer</button>
                                  <button className="dir-btn-refuse" onClick={() => refuserDemande(d.id)}>✕</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {demandes.length === 0 && <tr><td colSpan="6" className="dir-empty">Aucune demande à signer.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
                <aside className="dir-side-panels">
                  <div className="dir-side-card">
                    <h3>Résumé rapide</h3>
                    {[
                      { label:'En attente de signature', value: String(demandes.length),  dot:'#f59e0b' },
                      { label:'Signées (total)',          value: String(nbSignees),        dot:'#16a34a' },
                      { label:'Refusées (total)',         value: String(nbRefusees),       dot:'#e74c3c' },
                    ].map(item => (
                      <div key={item.label} className="dir-quick-row">
                        <div className="dir-quick-left"><span className="dir-quick-dot" style={{background:item.dot}}/><span>{item.label}</span></div>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                    <button className="dir-quick-action" onClick={() => goToTab('demandes')}>Voir toutes les demandes <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>
                  </div>
                </aside>
              </section>
            </>
          )}

          {/* ── DEMANDES À SIGNER ── */}
          {activeMenu === 'demandes' && (
            <section className="dir-section">
              <div className="dir-dem-kpi-strip">
                <div className="dir-dem-chip dir-chip-wait"><span>À signer</span><strong>{demandes.length}</strong></div>
                <div className="dir-dem-chip dir-chip-ok"><span>Signées</span><strong>{nbSignees}</strong></div>
                <div className="dir-dem-chip" style={{background:'#fdecea',color:'#e74c3c'}}><span>Refusées</span><strong>{nbRefusees}</strong></div>
              </div>
              <div className="dir-panel">
                <div className="dir-dem-head">
                  <div className="dir-dem-head-left"><h2 className="dir-dem-title">Demandes à signer</h2><span className="dir-dem-count-badge">{demandes.length} demandes</span></div>
                  <div className="dir-dem-head-right">
                    <div className="dir-search-box">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9aa4c2" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg>
                      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher employé, référence..."/>
                      {search && <button className="dir-search-clear" onClick={()=>setSearch('')}>✕</button>}
                    </div>
                    <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{border:'1.5px solid #e5e9f5',borderRadius:10,padding:'8px 12px',fontSize:13,outline:'none',background:'#fff'}}>
                      <option value="Tous">Tous les types</option>
                      {Object.entries(LEAVE_TYPE_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="dir-table-wrap">
                  <table className="dir-table-new">
                    <thead><tr><th>Référence</th><th>Employé</th><th>Type</th><th>Date début</th><th>Date fin</th><th>Jours</th><th>Motif</th><th>Actions</th></tr></thead>
                    <tbody>
                      {demandesFiltrees.length === 0
                        ? <tr><td colSpan="8" className="dir-empty">Aucune demande trouvée.</td></tr>
                        : demandesFiltrees.map(d => {
                          const cfg = LEAVE_TYPE_CONFIG[d.type_conge]||{};
                          return (
                            <tr key={d.id} className="dir-row-new" onClick={() => { setDemandeSelectionnee(d); setShowSignature(false); }}>
                              <td style={{fontFamily:'monospace',color:'#8b95b0',fontSize:12}}>{d.reference}</td>
                              <td><div className="dir-emp-cell"><span className="dir-emp-avatar" style={{background:cfg.color||'#9aa4c2'}}>{d.prenom?.charAt(0)}</span><span className="dir-emp-name">{d.prenom} {d.nom}</span></div></td>
                              <td><span className="dir-type-badge" style={{background:cfg.bg,color:cfg.color,borderColor:cfg.color}}>{cfg.label||d.type_conge}</span></td>
                              <td>{d.date_debut?.slice(0,10)}</td>
                              <td>{d.date_fin?.slice(0,10)}</td>
                              <td><span className="dir-duree-badge">{d.nb_jours}j</span></td>
                              <td><small style={{color:'#8b95b0'}}>{d.motif||'-'}</small></td>
                              <td onClick={e=>e.stopPropagation()}>
                                <div className="dir-row-actions">
                                  <button className="dir-btn-pdf" onClick={()=>window.open(`${API}/pdf/demande/${d.id}?token=${token}`,'_blank')}>PDF</button>
                                  <button className="dir-btn-sign" onClick={() => { setDemandeSelectionnee(d); setShowSignature(true); }}>✎ Signer</button>
                                  <button className="dir-btn-refuse" onClick={()=>refuserDemande(d.id)}>✕ Refuser</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ── DEMANDES TRAITÉES ── */}
          {activeMenu === 'traitees' && (
            <section className="dir-section">
              <div className="dir-dem-kpi-strip">
                <div className="dir-dem-chip dir-chip-ok"><span>Signées</span><strong>{nbSignees}</strong></div>
                <div className="dir-dem-chip" style={{background:'#fdecea',color:'#e74c3c'}}><span>Refusées</span><strong>{nbRefusees}</strong></div>
                <div className="dir-dem-chip dir-chip-wait"><span>Total traité</span><strong>{demandesTraitees.length}</strong></div>
              </div>
              <div className="dir-panel">
                <div className="dir-dem-head">
                  <div className="dir-dem-head-left"><h2 className="dir-dem-title">Demandes traitées</h2><span className="dir-dem-count-badge">{traiteeFiltrees.length} demandes</span></div>
                  <div className="dir-dem-head-right">
                    <div className="dir-visa-tabs">
                      {[{key:'Tous',label:'Toutes'},{key:'signe_directeur',label:'✓ Signées'},{key:'refuse',label:'✕ Refusées'}].map(s => (
                        <button key={s.key} className={filterTraitees===s.key?'active':''} onClick={()=>setFilterTraitees(s.key)}>{s.label}</button>
                      ))}
                    </div>
                    <div className="dir-search-box">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9aa4c2" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg>
                      <input value={searchTraitees} onChange={e=>setSearchTraitees(e.target.value)} placeholder="Rechercher..."/>
                      {searchTraitees && <button className="dir-search-clear" onClick={()=>setSearchTraitees('')}>✕</button>}
                    </div>
                  </div>
                </div>
                <div className="dir-table-wrap">
                  <table className="dir-table-new">
                    <thead><tr><th>Référence</th><th>Employé</th><th>Type</th><th>Date début</th><th>Date fin</th><th>Jours</th><th>Décision</th><th>Documents</th></tr></thead>
                    <tbody>
                      {traiteeFiltrees.length === 0
                        ? <tr><td colSpan="8" className="dir-empty">Aucune demande traitée.</td></tr>
                        : traiteeFiltrees.map(d => {
                          const cfg = LEAVE_TYPE_CONFIG[d.type_conge]||{};
                          const estSigne = d.statut === 'signe_directeur';
                          return (
                            <tr key={d.id} className="dir-row-new">
                              <td style={{fontFamily:'monospace',color:'#8b95b0',fontSize:12}}>{d.reference}</td>
                              <td><div className="dir-emp-cell"><span className="dir-emp-avatar" style={{background:cfg.color||'#9aa4c2'}}>{d.prenom?.charAt(0)}</span><span className="dir-emp-name">{d.prenom} {d.nom}</span></div></td>
                              <td><span className="dir-type-badge" style={{background:cfg.bg,color:cfg.color,borderColor:cfg.color}}>{cfg.label||d.type_conge}</span></td>
                              <td>{d.date_debut?.slice(0,10)}</td>
                              <td>{d.date_fin?.slice(0,10)}</td>
                              <td><span className="dir-duree-badge">{d.nb_jours}j</span></td>
                              <td>{estSigne ? <span className="dir-visa-pill dir-visa-ok">✓ Signé</span> : <span className="dir-visa-pill dir-visa-no">✕ Refusé</span>}</td>
                              <td><PdfActions d={d} token={token} /></td>
                            </tr>
                          );
                        })
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ── PROFIL ── */}
          {activeMenu === 'profil' && (
            <section className="content-card profile-card">
              <div className="content-head"><h2>Mon profil</h2></div>
              <div className="profile-top">
                <div className="profile-avatar">{prenom.charAt(0)}</div>
                <div><h3>{prenom} {nom}</h3><p>{profil?.fonction||'Directeur Général'} — MODEP</p></div>
              </div>
              <div className="profile-grid">
                {[
                  { label:'Email',        value:profil?.email||'' },
                  { label:'CIN',          value:profil?.cin||'' },
                  { label:'Matricule',    value:profil?.matricule||'' },
                ].map(row => (
                  <div key={row.label} className="profile-item"><span>{row.label}</span><strong>{row.value}</strong></div>
                ))}
              </div>
            </section>
          )}

          {/* ── PARAMÈTRES ── */}
          {activeMenu === 'parametres' && (
            <ParametresForm profil={profil} headers={headers} API={API} />
          )}

        </main>
      </div>

      {/* ── MODAL DÉTAIL + SIGNATURE ── */}
      {demandeSelectionnee && (
        <div className="dir-modal-overlay" onClick={()=>{setDemandeSelectionnee(null);setShowSignature(false);}}>
          <div className="dir-modal" style={{width:showSignature?'min(560px,calc(100vw - 32px))':undefined}} onClick={e=>e.stopPropagation()}>
            <button className="dir-modal-close" onClick={()=>{setDemandeSelectionnee(null);setShowSignature(false);}}>✕</button>
            {(()=>{
              const cfg = LEAVE_TYPE_CONFIG[demandeSelectionnee.type_conge]||{color:'#9aa4c2',bg:'#f5f7ff'};
              return (
                <>
                  <div className="dir-modal-header" style={{borderTop:`5px solid ${cfg.color}`}}>
                    <span className="dir-modal-avatar" style={{background:cfg.color}}>{demandeSelectionnee.prenom?.charAt(0)}</span>
                    <div><h3>{demandeSelectionnee.prenom} {demandeSelectionnee.nom}</h3><p>{cfg.label} — {demandeSelectionnee.nb_jours} jour(s)</p></div>
                  </div>
                  <div className="dir-modal-body">
                    <div className="dir-modal-row"><span>Référence</span><strong>{demandeSelectionnee.reference}</strong></div>
                    <div className="dir-modal-row"><span>Poste</span><strong>{{ employe:'Employé', responsable:'Responsable', rh:'Admin RH', directeur:'Directeur Général' }[demandeSelectionnee.role] || demandeSelectionnee.role || '-'}</strong></div>
                    <div className="dir-modal-row"><span>Département</span><strong>{demandeSelectionnee.departement||'-'}</strong></div>
                    <div className="dir-modal-row"><span>Date début</span><strong>{demandeSelectionnee.date_debut?.slice(0,10)}</strong></div>
                    <div className="dir-modal-row"><span>Date fin</span><strong>{demandeSelectionnee.date_fin?.slice(0,10)}</strong></div>
                    <div className="dir-modal-row"><span>Motif</span><strong>{demandeSelectionnee.motif||'-'}</strong></div>
                    <div className="dir-modal-row"><span>Avis responsable</span><strong>{demandeSelectionnee.avis_responsable||'-'}</strong></div>
                    <div className="dir-modal-row"><span>Visa RH</span><span className="dir-visa-pill dir-visa-ok">✓ Approuvé RH</span></div>
                  </div>
                  {!showSignature ? (
                    <div className="dir-modal-actions">
                      <button className="dir-modal-btn dir-modal-refuse" onClick={()=>refuserDemande(demandeSelectionnee.id)} disabled={loadingDecision}>✕ Refuser</button>
                      <button className="dir-modal-btn dir-modal-sign" onClick={()=>setShowSignature(true)} disabled={loadingDecision}>✎ Apposer ma signature</button>
                    </div>
                  ) : (
                    <SignatureCanvas onSave={signerDemande} onCancel={()=>setShowSignature(false)} token={token} />
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
