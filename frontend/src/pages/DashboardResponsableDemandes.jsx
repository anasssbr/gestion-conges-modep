import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import './DashboardResponsable.css';

const allRequests = [
  { id: 'DMD-2026-041', nom: 'Sara El Mansouri', type: 'Congé annuel',    typeKey: 'annuel',     dateDebut: '2026-05-03', dateFin: '2026-05-07', jours: 5,  motif: 'Vacances',           statut: 'En attente', priorite: 'Normale' },
  { id: 'DMD-2026-042', nom: 'Youssef Berrada',  type: 'Congé maladie',   typeKey: 'maladie',    dateDebut: '2026-04-30', dateFin: '2026-05-01', jours: 2,  motif: 'Consultation',       statut: 'En attente', priorite: 'Urgente' },
  { id: 'DMD-2026-043', nom: 'Nadia Chafik',     type: 'Congé sans solde',typeKey: 'sans-solde', dateDebut: '2026-05-10', dateFin: '2026-05-14', jours: 5,  motif: 'Raisons personnelles',statut: 'En attente', priorite: 'Normale' },
  { id: 'DMD-2026-044', nom: 'Amine Benali',     type: 'Congé annuel',    typeKey: 'annuel',     dateDebut: '2026-05-15', dateFin: '2026-05-21', jours: 7,  motif: 'Repos',              statut: 'Approuvée',  priorite: 'Normale' },
  { id: 'DMD-2026-045', nom: 'Fatima Zahrae',    type: 'Congé annuel',    typeKey: 'annuel',     dateDebut: '2026-05-20', dateFin: '2026-05-22', jours: 3,  motif: 'Voyage familial',    statut: 'Refusée',    priorite: 'Normale' },
  { id: 'DMD-2026-046', nom: 'Khalid Moussaoui', type: 'Congé maladie',   typeKey: 'maladie',    dateDebut: '2026-05-08', dateFin: '2026-05-09', jours: 2,  motif: 'Maladie',            statut: 'Approuvée',  priorite: 'Urgente' },
];

const TYPE_CONFIG = {
  annuel:       { color: '#c55ea8', bg: '#fdf0fb', label: 'Congé annuel' },
  maladie:      { color: '#2ca8f2', bg: '#edf7ff', label: 'Congé maladie' },
  'sans-solde': { color: '#6a63dc', bg: '#f2f1ff', label: 'Congé sans solde' },
  maternite:    { color: '#eead38', bg: '#fffbef', label: 'Congé maternité' },
};

const STATUT_CONFIG = {
  'En attente': { cls: 'wait', label: 'En attente' },
  'Approuvée':  { cls: 'ok',   label: 'Approuvée'  },
  'Refusée':    { cls: 'no',   label: 'Refusée'    },
};

const menuItems = [
  { key: 'overview',   label: 'Vue globale',        icon: 'overview'  },
  { key: 'demandes',   label: 'Demandes à valider', icon: 'demandes'  },
  { key: 'nouvelle',   label: 'Nouvelle demande',   icon: 'nouvelle'  },
  { key: 'profil',     label: 'Mon profil',         icon: 'profil'    },
  { key: 'calendrier', label: 'Calendrier',         icon: 'calendar'  },
  { key: 'parametres', label: 'Paramètres',         icon: 'settings'  },
];

function SideIcon({ type, active = false }) {
  const color = active ? '#197BBD' : '#C7C7C7';
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none' };
  if (type === 'overview')  return <svg {...common}><path d="M4 19V6M4 19H20M8 14L11 11L14 12.5L19 7.5" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>;
  if (type === 'demandes')  return <svg {...common}><path d="M8.5 7H20M8.5 12H20M8.5 17H20" stroke={color} strokeWidth="2" strokeLinecap="round" /><circle cx="5" cy="7" r="1.1" fill={color} /><circle cx="5" cy="12" r="1.1" fill={color} /><circle cx="5" cy="17" r="1.1" fill={color} /></svg>;
  if (type === 'nouvelle')  return <svg {...common}><path d="M7 4H14L18.5 8.5V20H7V4Z" stroke={color} strokeWidth="2" /><path d="M14 4V8.3H18.2" stroke={color} strokeWidth="2" /></svg>;
  if (type === 'profil')    return <svg {...common}><circle cx="12" cy="8" r="3.2" stroke={color} strokeWidth="2" /><path d="M5.8 19C6.7 15.9 8.9 14 12 14C15.1 14 17.3 15.9 18.2 19" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>;
  if (type === 'calendar')  return <svg {...common}><rect x="4" y="5.5" width="16" height="14" rx="2" stroke={color} strokeWidth="2" /><path d="M8 4V7M16 4V7M4.5 9.5H19.5" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>;
  return <svg {...common}><path d="M19 13.5C19.1 13 19.2 12.5 19.2 12C19.2 11.5 19.1 11 19 10.5L21 9L19.2 5.5L16.7 6.4C15.9 5.8 15 5.3 14 5L13.7 2.5H10.3L10 5C9 5.3 8.1 5.8 7.3 6.4L4.8 5.5L3 9L5 10.5C4.9 11 4.8 11.5 4.8 12C4.8 12.5 4.9 13 5 13.5L3 15L4.8 18.5L7.3 17.6C8.1 18.2 9 18.7 10 19L10.3 21.5H13.7L14 19C15 18.7 15.9 18.2 16.7 17.6L19.2 18.5L21 15L19 13.5Z" stroke={color} strokeWidth="1.6" /><circle cx="12" cy="12" r="2.8" stroke={color} strokeWidth="1.6" /></svg>;
}

function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M14.5 6.8V5.6C14.5 4.7 13.8 4 12.9 4H6.8C5.9 4 5.2 4.7 5.2 5.6V18.4C5.2 19.3 5.9 20 6.8 20H12.9C13.8 20 14.5 19.3 14.5 18.4V17.2" stroke="#404040" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M10.4 12H20.1" stroke="#404040" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M17.6 9.3L20.3 12L17.6 14.7" stroke="#404040" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const AVATAR_COLORS = ['#e07b5f','#5f9ee0','#7b5fe0','#5fc47b','#e0bb5f','#d45fa8'];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

export default function DashboardResponsableDemandes() {
  const navigate = useNavigate();
  const [search,       setSearch]       = useState('');
  const [activeTab,    setActiveTab]     = useState('Toutes');
  const [typeFilter,   setTypeFilter]    = useState('Tous');
  const [selectedReq,  setSelectedReq]   = useState(null);
  const [requests,     setRequests]      = useState(allRequests);

  const utilisateur = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('utilisateur') || 'null'); }
    catch { return null; }
  }, []);

  const counts = useMemo(() => ({
    total:   requests.length,
    attente: requests.filter(r => r.statut === 'En attente').length,
    ok:      requests.filter(r => r.statut === 'Approuvée').length,
    no:      requests.filter(r => r.statut === 'Refusée').length,
  }), [requests]);

  const filtered = useMemo(() => requests.filter(r => {
    const matchTab  = activeTab === 'Toutes' || r.statut === activeTab;
    const matchType = typeFilter === 'Tous'  || r.typeKey === typeFilter;
    const q         = search.toLowerCase();
    const matchQ    = !q || r.nom.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
    return matchTab && matchType && matchQ;
  }), [requests, activeTab, typeFilter, search]);

  if (!utilisateur || utilisateur.role !== 'responsable') {
    return <Navigate to="/login" replace />;
  }

  const handleApprove = (id) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, statut: 'Approuvée' } : r));
    setSelectedReq(null);
  };
  const handleRefuse = (id) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, statut: 'Refusée' } : r));
    setSelectedReq(null);
  };

  const tabs = [
    { label: 'Toutes',      count: counts.total   },
    { label: 'En attente',  count: counts.attente  },
    { label: 'Approuvée',   count: counts.ok       },
    { label: 'Refusée',     count: counts.no       },
  ];

  const kpiCards = [
    { label: 'Total demandes',  value: counts.total,   tone: 'blue',   icon: 'M8.5 7H20M8.5 12H20M8.5 17H20' },
    { label: 'En attente',      value: counts.attente, tone: 'orange', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Approuvées',      value: counts.ok,      tone: 'green',  icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Refusées',        value: counts.no,      tone: 'violet', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  return (
    <div className="respo-shell">
      <div className="respo-layout">
        {/* ── SIDEBAR ── */}
        <aside className="respo-sidebar">
          <div className="respo-brand">
            <img src={logo} alt="MODEP" />
            <div><strong>MODEP</strong><small>Dashboard Responsable</small></div>
          </div>
          <nav className="respo-nav">
            {menuItems.map((item) => (
              <button
                key={item.key}
                className={item.key === 'demandes' ? 'active' : ''}
                onClick={() => {
                  if (item.key === 'overview') { navigate('/dashboard-responsable'); return; }
                  if (item.key === 'demandes') { navigate('/dashboard-responsable/demandes'); return; }
                  navigate(`/dashboard-responsable?tab=${item.key}`);
                }}
              >
                <span><SideIcon type={item.icon} active={item.key === 'demandes'} /></span>
                {item.label}
              </button>
            ))}
          </nav>
          <button className="respo-logout" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('utilisateur'); navigate('/login'); }}>
            <span><LogoutIcon /></span>Se déconnecter
          </button>
        </aside>

        {/* ── MAIN ── */}
        <main className="respo-main">
          <header className="respo-header">
            <div>
              <h1>Demandes à valider</h1>
              <p>Gérez les demandes de congés de votre équipe.</p>
            </div>
            <div className="respo-top-right">
              <button
                className="avatar-btn"
                onClick={() => navigate('/dashboard-responsable?tab=profil')}
              >
                {(utilisateur.prenom || 'R').charAt(0)}
              </button>
              <div className="respo-user">
                <span>{utilisateur.prenom} {utilisateur.nom}</span>
                <small>{utilisateur.role}</small>
              </div>
            </div>
          </header>

          {/* ── KPI CARDS ── */}
          <section className="respo-kpi-grid">
            {kpiCards.map((card) => (
              <article key={card.label} className={`balance-card card-${card.tone}`}>
                <div className="bc-icon-wrap">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={card.icon}/></svg>
                </div>
                <p className="bc-label">{card.label}</p>
                <i />
                <p className="bc-value">{card.value}</p>
              </article>
            ))}
          </section>

          {/* ── TOOLBAR ── */}
          <div className="dem-toolbar">
            <div className="dem-search-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9aa4c2" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg>
              <input
                className="dem-search"
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="dem-filters">
              <div className="dem-filter-tabs">
                {tabs.map(t => (
                  <button
                    key={t.label}
                    className={activeTab === t.label ? 'active' : ''}
                    onClick={() => setActiveTab(t.label)}
                  >
                    {t.label}
                    <span className="dem-tab-count">{t.count}</span>
                  </button>
                ))}
              </div>
              <select className="dem-type-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="Tous">Tous les types</option>
                <option value="annuel">Congé annuel</option>
                <option value="maladie">Congé maladie</option>
                <option value="sans-solde">Congé sans solde</option>
                <option value="maternite">Congé maternité</option>
              </select>
            </div>
          </div>

          {/* ── TABLE ── */}
          <div className="dem-table-wrap">
            <table className="dem-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Employé</th>
                  <th>Type</th>
                  <th>Période</th>
                  <th>Jours</th>
                  <th>Priorité</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="8" className="dem-empty">Aucune demande trouvée.</td></tr>
                ) : filtered.map((req) => {
                  const tc = TYPE_CONFIG[req.typeKey] || {};
                  const sc = STATUT_CONFIG[req.statut] || {};
                  const ac = avatarColor(req.nom);
                  return (
                    <tr key={req.id} className="dem-row" onClick={() => setSelectedReq(req)}>
                      <td><span className="dem-id">{req.id}</span></td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                          <span style={{ width:30, height:30, borderRadius:'50%', background:ac, color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, flexShrink:0 }}>
                            {req.nom.charAt(0)}
                          </span>
                          <span style={{ fontWeight:600, color:'#2c3553' }}>{req.nom}</span>
                        </div>
                      </td>
                      <td>
                        <span className="dem-type-badge" style={{ background: tc.bg, color: tc.color }}>
                          {req.type}
                        </span>
                      </td>
                      <td style={{ color:'#6f7ba8', fontSize:13 }}>
                        {new Date(req.dateDebut).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })}
                        {' → '}
                        {new Date(req.dateFin).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })}
                      </td>
                      <td><strong style={{ color:'#2c3553' }}>{req.jours}j</strong></td>
                      <td>
                        <span className={`pill ${req.priorite === 'Urgente' ? 'urgent' : 'normal'}`}>
                          {req.priorite}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${sc.cls}`}>{sc.label}</span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        {req.statut === 'En attente' ? (
                          <div className="row-actions icon-actions">
                            <button className="ok" title="Approuver" onClick={() => handleApprove(req.id)}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                            </button>
                            <button className="no" title="Refuser" onClick={() => handleRefuse(req.id)}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                          </div>
                        ) : (
                          <button className="dem-btn-view" title="Voir" onClick={() => setSelectedReq(req)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* ── MODAL DÉTAIL ── */}
      {selectedReq && (() => {
        const req = selectedReq;
        const tc  = TYPE_CONFIG[req.typeKey] || {};
        const sc  = STATUT_CONFIG[req.statut] || {};
        const ac  = avatarColor(req.nom);
        return (
          <div className="cal-modal-overlay" onClick={() => setSelectedReq(null)}>
            <div className="cal-modal" onClick={e => e.stopPropagation()}>
              <button className="cal-modal-close" onClick={() => setSelectedReq(null)}>✕</button>
              <div className="cal-modal-header">
                <div className="cal-modal-avatar" style={{ background: ac }}>{req.nom.charAt(0)}</div>
                <div>
                  <h3>{req.nom}</h3>
                  <p>{req.id}</p>
                </div>
              </div>
              <div className="cal-modal-body">
                <div className="cal-modal-row">
                  <span>Type de congé</span>
                  <span className="dem-type-badge" style={{ background: tc.bg, color: tc.color }}>{req.type}</span>
                </div>
                <div className="cal-modal-row">
                  <span>Date début</span>
                  <strong>{new Date(req.dateDebut).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}</strong>
                </div>
                <div className="cal-modal-row">
                  <span>Date fin</span>
                  <strong>{new Date(req.dateFin).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}</strong>
                </div>
                <div className="cal-modal-row">
                  <span>Durée</span>
                  <strong>{req.jours} jour{req.jours > 1 ? 's' : ''}</strong>
                </div>
                <div className="cal-modal-row">
                  <span>Motif</span>
                  <strong>{req.motif || '—'}</strong>
                </div>
                <div className="cal-modal-row">
                  <span>Priorité</span>
                  <span className={`pill ${req.priorite === 'Urgente' ? 'urgent' : 'normal'}`}>{req.priorite}</span>
                </div>
                <div className="cal-modal-row" style={{ borderBottom: 0 }}>
                  <span>Statut actuel</span>
                  <span className={`cal-status-badge ${sc.cls}`}>{sc.label}</span>
                </div>
              </div>
              {req.statut === 'En attente' && (
                <div className="cal-modal-actions">
                  <button className="cal-modal-btn cal-modal-refuse"  onClick={() => handleRefuse(req.id)}>Refuser</button>
                  <button className="cal-modal-btn cal-modal-approve" onClick={() => handleApprove(req.id)}>Approuver</button>
                </div>
              )}
              {req.statut !== 'En attente' && (
                <div className="cal-modal-actions">
                  <button className="cal-modal-btn" style={{ background:'#edf1fb', color:'#4d5a86' }} onClick={() => setSelectedReq(null)}>Fermer</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
