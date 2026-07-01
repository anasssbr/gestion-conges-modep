import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const API = 'http://localhost:5000/api';

const normalizeRole = (rawRole) => String(rawRole || '')
  .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s-]+/g, '_').trim();

function Login() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const navigate = useNavigate();

  // Étapes : 'login' | 'forgot-email' | 'forgot-sent' | 'forgot-reset' | 'forgot-success'
  const [etape, setEtape] = useState('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotPrenom, setForgotPrenom] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmMdp, setConfirmMdp] = useState('');
  const [forgotErreur, setForgotErreur] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showMdp, setShowMdp] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Détecter le token dans l'URL au chargement
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      // Vérifier le token auprès du backend
      axios.get(`${API}/auth/verify-token?token=${token}`)
        .then(res => {
          setResetToken(token);
          setForgotEmail(res.data.email);
          setEtape('forgot-reset');
          // Nettoyer l'URL sans recharger la page
          window.history.replaceState({}, document.title, '/login');
        })
        .catch(() => {
          setEtape('token-invalide');
          window.history.replaceState({}, document.title, '/login');
        });
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErreur('');
    try {
      const response = await axios.post(`${API}/auth/login`, { email, mot_de_passe: motDePasse });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('utilisateur', JSON.stringify(response.data.utilisateur));
      const role = normalizeRole(response.data.utilisateur.role);
      if (role === 'employe') navigate('/dashboard-employe');
      else if (role === 'responsable') navigate('/dashboard-responsable');
      else if (['directeur', 'director'].includes(role)) navigate('/dashboard-directeur');
      else if (['admin', 'rh', 'admin_rh', 'administrateur', 'administrateur_rh'].includes(role)) navigate('/dashboard-admin');
      else setErreur("Votre rôle n'est pas autorisé sur cette interface");
    } catch { setErreur('Email ou mot de passe incorrect'); }
  };

  // Étape 1 : vérifier email et envoyer le lien
  const handleCheckEmail = async (e) => {
    e.preventDefault();
    setForgotErreur(''); setForgotLoading(true);
    try {
      const res = await axios.post(`${API}/auth/check-email`, { email: forgotEmail });
      setForgotPrenom(res.data.prenom);
      setEtape('forgot-sent');
    } catch (err) {
      setForgotErreur(err.response?.data?.message || 'Email introuvable');
    } finally { setForgotLoading(false); }
  };

  // Étape 3 : réinitialiser mot de passe avec le token
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotErreur('');
    if (nouveauMdp.length < 6) { setForgotErreur('Le mot de passe doit faire au moins 6 caractères.'); return; }
    if (nouveauMdp !== confirmMdp) { setForgotErreur('Les mots de passe ne correspondent pas.'); return; }
    setForgotLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { token: resetToken, nouveau_mot_de_passe: nouveauMdp });
      setEtape('forgot-success');
    } catch (err) {
      setForgotErreur(err.response?.data?.message || 'Erreur lors de la réinitialisation');
    } finally { setForgotLoading(false); }
  };

  const retourLogin = () => {
    setEtape('login'); setForgotEmail(''); setForgotPrenom('');
    setNouveauMdp(''); setConfirmMdp(''); setForgotErreur(''); setResetToken('');
  };

  const titreHeader = {
    'login': 'Connexion',
    'forgot-email': 'Réinitialisation',
    'forgot-sent': 'Email envoyé !',
    'forgot-reset': 'Nouveau mot de passe',
    'forgot-success': 'Succès !',
    'token-invalide': 'Lien invalide',
  }[etape] || 'Connexion';

  return (
    <div className="min-h-screen flex items-center justify-end pr-20"
      style={{ backgroundImage: 'url(/port.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="bg-white bg-opacity-90 rounded-2xl shadow-xl p-10 w-[450px]">

        {/* En-tête */}
        <div className="flex justify-between items-start mb-8">
          <div className="pt-2">
            <p className="text-sm text-gray-900 font-medium block mb-1">
              Bienvenue à la <span className="text-orange-500 font-semibold">MODEP</span>
            </p>
            <h1 className="text-4xl font-bold text-gray-800">{titreHeader}</h1>
          </div>
          <div className="flex-shrink-0">
            <img src={logo} alt="MODEP" className="h-16 object-contain" />
          </div>
        </div>

        {/* ══ LOGIN ══ */}
        {etape === 'login' && (
          <>
            {erreur && <p className="text-red-500 text-sm mb-4">{erreur}</p>}
            <form onSubmit={handleLogin}>
              <div className="mb-5">
                <label className="text-sm text-gray-800 font-medium block mb-2">Adresse email</label>
                <input type="email" placeholder="ex: nom@modep.ma" value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
              </div>
              <div className="mb-3">
                <label className="text-sm text-gray-800 font-medium block mb-2">Mot de passe</label>
                <input type="password" placeholder="Entrez votre mot de passe" value={motDePasse}
                  onChange={e => setMotDePasse(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
              </div>
              <div className="flex justify-end mb-6">
                <button type="button" onClick={() => { setForgotEmail(email); setEtape('forgot-email'); setErreur(''); }}
                  className="text-sm text-blue-600 hover:underline bg-transparent border-0 cursor-pointer p-0">
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="flex justify-end">
                <button type="submit"
                  className="bg-[#ef4444] hover:bg-red-600 text-white rounded-lg px-8 py-2.5 text-sm font-semibold transition shadow-sm">
                  Se connecter
                </button>
              </div>
            </form>
          </>
        )}

        {/* ══ ÉTAPE 1 : EMAIL ══ */}
        {etape === 'forgot-email' && (
          <>
            <p className="text-sm text-gray-500 mb-6">Entrez votre adresse email — vous recevrez un lien pour réinitialiser votre mot de passe.</p>
            {forgotErreur && <p className="text-red-500 text-sm mb-4">{forgotErreur}</p>}
            <form onSubmit={handleCheckEmail}>
              <div className="mb-6">
                <label className="text-sm text-gray-800 font-medium block mb-2">Adresse email</label>
                <input type="email" placeholder="ex: nom@modep.ma" value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
              </div>
              <div className="flex justify-between items-center">
                <button type="button" onClick={retourLogin}
                  className="text-sm text-gray-500 hover:underline bg-transparent border-0 cursor-pointer p-0">
                  ← Retour
                </button>
                <button type="submit" disabled={forgotLoading}
                  className="bg-[#ef4444] hover:bg-red-600 text-white rounded-lg px-8 py-2.5 text-sm font-semibold transition shadow-sm disabled:opacity-60">
                  {forgotLoading ? 'Envoi en cours...' : 'Envoyer le lien'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* ══ ÉTAPE 2 : EMAIL ENVOYÉ ══ */}
        {etape === 'forgot-sent' && (
          <div className="text-center">
            <div style={{ fontSize: 56, marginBottom: 16 }}>📧</div>
            <p className="text-gray-700 font-semibold text-base mb-2">
              Vérifiez votre boîte mail !
            </p>
            <p className="text-sm text-gray-500 mb-2">
              Un lien de réinitialisation a été envoyé à :
            </p>
            <p className="text-sm font-semibold text-blue-600 mb-4">{forgotEmail}</p>
            <p className="text-xs text-gray-400 mb-8">
              Le lien expire dans <strong>15 minutes</strong>. Cliquez dessus pour choisir un nouveau mot de passe.
            </p>
            <button onClick={retourLogin}
              className="text-sm text-gray-500 hover:underline bg-transparent border-0 cursor-pointer p-0">
              ← Retour à la connexion
            </button>
          </div>
        )}

        {/* ══ ÉTAPE 3 : NOUVEAU MOT DE PASSE (via lien email) ══ */}
        {etape === 'forgot-reset' && (
          <>
            <p className="text-sm text-gray-500 mb-6">Choisissez un nouveau mot de passe pour votre compte.</p>
            {forgotErreur && <p className="text-red-500 text-sm mb-4">{forgotErreur}</p>}
            <form onSubmit={handleResetPassword}>
              <div className="mb-4">
                <label className="text-sm text-gray-800 font-medium block mb-2">Nouveau mot de passe</label>
                <div className="relative">
                  <input type={showMdp ? 'text' : 'password'} placeholder="Minimum 6 caractères" value={nouveauMdp}
                    onChange={e => setNouveauMdp(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                  <button type="button" onClick={() => setShowMdp(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs bg-transparent border-0 cursor-pointer">
                    {showMdp ? 'Masquer' : 'Voir'}
                  </button>
                </div>
              </div>
              <div className="mb-6">
                <label className="text-sm text-gray-800 font-medium block mb-2">Confirmer le mot de passe</label>
                <div className="relative">
                  <input type={showConfirm ? 'text' : 'password'} placeholder="Retapez le mot de passe" value={confirmMdp}
                    onChange={e => setConfirmMdp(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs bg-transparent border-0 cursor-pointer">
                    {showConfirm ? 'Masquer' : 'Voir'}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={forgotLoading}
                  className="bg-[#ef4444] hover:bg-red-600 text-white rounded-lg px-8 py-2.5 text-sm font-semibold transition shadow-sm disabled:opacity-60 w-full">
                  {forgotLoading ? 'Enregistrement...' : 'Réinitialiser le mot de passe'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* ══ SUCCÈS ══ */}
        {etape === 'forgot-success' && (
          <div className="text-center">
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <p className="text-gray-700 font-semibold text-base mb-2">Mot de passe réinitialisé !</p>
            <p className="text-sm text-gray-500 mb-8">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
            <button onClick={retourLogin}
              className="bg-[#ef4444] hover:bg-red-600 text-white rounded-lg px-8 py-2.5 text-sm font-semibold transition shadow-sm w-full">
              Se connecter
            </button>
          </div>
        )}

        {/* ══ TOKEN INVALIDE / EXPIRÉ ══ */}
        {etape === 'token-invalide' && (
          <div className="text-center">
            <div style={{ fontSize: 56, marginBottom: 16 }}>⚠️</div>
            <p className="text-gray-700 font-semibold text-base mb-2">Lien invalide ou expiré</p>
            <p className="text-sm text-gray-500 mb-8">Ce lien de réinitialisation est expiré ou déjà utilisé. Faites une nouvelle demande.</p>
            <button onClick={() => setEtape('forgot-email')}
              className="bg-[#ef4444] hover:bg-red-600 text-white rounded-lg px-8 py-2.5 text-sm font-semibold transition shadow-sm w-full">
              Nouvelle demande
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-8">Accès réservé aux agents de la MODEP</p>
      </div>
    </div>
  );
}

export default Login;
