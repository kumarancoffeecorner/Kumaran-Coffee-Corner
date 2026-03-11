import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import MenuSection from './components/MenuSection';
import BranchSection from './components/BranchSection';
import AdminPanel from './components/AdminPanel';
import DeliveryDashboard from './components/DeliveryDashboard';
import CartModal from './components/CartModal';
import Reviews from './components/Reviews';
import TrackingPage from './components/TrackingPage';
import axios from 'axios';
import API from './api';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { ShoppingBag, ChevronRight, Lock, X, Instagram, MessageCircle, Radar, ChevronLeft, ShieldAlert, Loader2 } from 'lucide-react';


const MainLayout = ({ cart, addToCart, updateQuantity, cartCount, cartTotal, setShowCart, handleSecretClick, navigate }) => {
  const [lastOrderId, setLastOrderId] = useState(localStorage.getItem('lastOrderId'));
  const [isDelivered, setIsDelivered] = useState(false);

  useEffect(() => {
    const syncStatus = async () => {
      const storedId = localStorage.getItem('lastOrderId');
      if (storedId) {
        try {
          const res = await API.get(`/order/${storedId}`);
          // 🔥 Hide ONLY if Delivered
          if (res.data.status === 'Delivered') {
            setIsDelivered(true);
          } else {
            setIsDelivered(false);
            setLastOrderId(storedId);
          }
        } catch (e) { console.error("Sync Error", e); }
      }
    };

    syncStatus();
    const timer = setInterval(syncStatus, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 overflow-x-hidden">
      <Navbar cartCount={cartCount} onCartOpen={() => setShowCart(true)} />

      {/* --- HERO SECTION --- */}
      <section id="home" className="relative h-screen flex items-center justify-center text-white text-left">
        <div className="absolute inset-0 z-0" style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.6)), url('/shopimg.png')`,
          backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'
        }} />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-5xl md:text-8xl font-black mb-4 tracking-tighter uppercase italic drop-shadow-2xl">
            Kumaran <span className="text-red-600">Coffee</span>
          </h1>
          <button onClick={() => document.getElementById('menu').scrollIntoView({ behavior: 'smooth' })}
            className="bg-red-600 hover:bg-red-700 text-white px-10 py-4 rounded-full font-black uppercase flex items-center mx-auto shadow-2xl active:scale-95 transition-all mt-20">
            Explore Menu <ChevronRight className="ml-2" />
          </button>
        </div>
      </section>

      {/* --- MENU SECTION --- */}
      <section id="menu" className="py-16 relative" style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.9)), url('/food-bg.png')`,
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'
      }}>
        <div className="max-w-7xl mx-auto px-4 text-center mb-10 text-white relative z-10">
          <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter">Delicious Menu</h2>
          <div className="w-16 h-1.5 bg-red-600 mx-auto mt-4 rounded-full"></div>
        </div>
        <MenuSection onAddToCart={addToCart} cart={cart} updateQuantity={updateQuantity} />
      </section>

      {/* --- BRANCH SECTION --- */}
      <section id="branch" className="py-20 bg-gray-900 text-left">
        <div className="max-w-7xl mx-auto px-4 text-center mb-10 text-white">
          <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-center">Our Locations</h2>
          <div className="w-16 h-1.5 bg-red-600 mx-auto mt-4 rounded-full"></div>
        </div>
        <BranchSection />
      </section>

      <Reviews />

      {/* --- FOOTER SECTION --- */}
      <footer className="bg-[#0b1120] text-white py-12 px-6 relative z-10 border-t border-gray-800 text-left">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 border-b border-gray-800/50 pb-10">
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-black italic tracking-tighter mb-4 uppercase">
              KUMARAN <span className="text-red-600">COFFEE</span>
            </h3>
            <p className="text-gray-400 leading-relaxed text-xs md:text-sm">
              Serving the finest coffee and traditional sweets with love since 2015.
              Quality is our first priority.
            </p>
          </div>

          <div className="text-center">
            <h4 className="font-bold text-lg mb-6 uppercase tracking-widest text-gray-300">Quick Links</h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-red-500 transition-colors border-none bg-transparent outline-none">Home</button></li>
              <li><button onClick={() => document.getElementById('menu').scrollIntoView({ behavior: 'smooth' })} className="hover:text-red-500 transition-colors border-none bg-transparent outline-none">Menu</button></li>
              <li><button onClick={() => document.getElementById('branch').scrollIntoView({ behavior: 'smooth' })} className="hover:text-red-500 transition-colors border-none bg-transparent outline-none">Branches</button></li>
            </ul>
          </div>

          <div className="text-center md:text-right flex flex-col items-center md:items-end">
            <h4 className="font-bold text-lg mb-6 uppercase tracking-widest text-gray-300 text-center">Connect With Us</h4>
            <div className="flex items-center space-x-5 mb-6">
              {/* 🔥 TRACK BUTTON PERSISTENCE FIXED */}
              {lastOrderId && !isDelivered && (
                <button
                  onClick={() => navigate(`/track/${lastOrderId}`)}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-black uppercase italic text-[10px] flex items-center gap-2 shadow-lg shadow-red-900/40 animate-pulse border-none outline-none"
                >
                  <Radar size={14} /> Track Order
                </button>
              )}
              <a href="https://instagram.com/kumarancoffeecorner" target="_blank" rel="noreferrer" className="bg-gradient-to-tr from-yellow-400 to-purple-600 p-2.5 rounded-full hover:scale-110 active:scale-95 transition-all">
                <Instagram size={20} />
              </a>
              <a href="https://wa.me/919952525962" target="_blank" rel="noreferrer" className="bg-green-500 p-2.5 rounded-full hover:scale-110 active:scale-95 transition-all">
                <MessageCircle size={20} />
              </a>
            </div>
            <p className="text-gray-500 text-sm italic font-serif">"Taste the Tradition."</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 text-center">
          <p className="text-gray-500 text-[10px] md:text-xs select-none tracking-wide">
            © 2026 Kumaran Coffee Corner & Sweets. All Rights Reserved
            <span onClick={handleSecretClick} className="inline-block cursor-default px-2 py-2 -mx-1 text-transparent">.</span>
          </p>
        </div>
      </footer>

      {/* --- FIXED BUY NOW BUTTON --- */}
      {cart.length > 0 && (
        <button onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 z-[100] bg-green-600 text-white shadow-2xl transition-all flex items-center border-2 border-white p-3 md:px-8 md:py-4 rounded-full active:scale-95 animate-bounce outline-none">
          <ShoppingBag size={22} className="md:mr-3" />
          <span className="hidden md:inline font-black text-lg uppercase tracking-widest">Buy Now (₹{cartTotal})</span>
          <span className="md:hidden ml-2 font-black text-sm font-mono tracking-tighter">₹{cartTotal}</span>
        </button>
      )}
    </div>
  );
};

// --- SEPARATE LOGIN PAGE WITH BACKEND LOGIC ---
const StaffLogin = ({ onLoginSuccess }) => {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.get(`/Staff/login`, {
        params: { u: u, p: p }
      });
      onLoginSuccess(res.data);
    } catch (err) {
      alert("Invalid Staff Credentials!");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans text-left">
      <button onClick={() => nav('/')} className="absolute top-6 left-6 text-gray-500 flex items-center font-bold text-xs uppercase outline-none bg-transparent border-none"><ChevronLeft size={16} /> Back to Store</button>
      <div className="w-full max-w-sm bg-white/5 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="bg-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-red-600/30 shadow-lg"><Lock size={30} /></div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white leading-none">Portal Access</h2>
          <p className="text-[8px] font-bold text-gray-500 uppercase mt-2">Authorized Staff Only</p>
        </div>
        <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
          <input required type="text" placeholder="USERNAME" className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-white/10 font-bold text-xs uppercase focus:border-red-600 transition-all" value={u} onChange={e => setU(e.target.value)} />
          <input required type="password" placeholder="PASSWORD" className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-white/10 font-bold text-xs uppercase focus:border-red-600 transition-all" value={p} onChange={e => setP(e.target.value)} />
          <button disabled={loading} className="w-full bg-red-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-900/20 active:scale-95 transition-all flex items-center justify-center outline-none border-none">
            {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

const App = () => {
  const [userRole, setUserRole] = useState(() => localStorage.getItem('userRole'));
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart')) || []);
  const [showCart, setShowCart] = useState(false);
  const [secretCount, setSecretCount] = useState(0);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
    if (userRole) localStorage.setItem('userRole', userRole);
    else localStorage.removeItem('userRole');
  }, [cart, userRole]);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId: product.id, productName: product.name, price: product.offerPrice || product.price, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart((prev) =>
      prev.map((item) => item.productId === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)
        .filter((item) => item.quantity > 0)
    );
  };

  const handleLoginSuccess = (userData) => {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('partnerName', userData.username);
    localStorage.setItem('userRole', userData.role.toLowerCase());
    setUserRole(userData.role.toLowerCase());
  };

  const handleLogout = () => {
    localStorage.clear();
    setUserRole(null);
    window.location.href = "/";
  };

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const AccessDenied = () => (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <ShieldAlert size={60} className="text-red-600 mb-6 animate-pulse" />
      <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-4 text-center">Access Denied</h2>
      <button onClick={() => window.location.href = "/"} className="bg-white text-black px-10 py-4 rounded-2xl font-black uppercase text-[10px] outline-none border-none">Back to Home</button>
    </div>
  );

  return (
    <Router>
      <Routes>
        {/* --- CUSTOMER MAIN ROUTE --- */}
        <Route path="/" element={
          <MainLayout
            cart={cart} addToCart={addToCart} updateQuantity={updateQuantity}
            cartCount={cartCount} cartTotal={cartTotal} setShowCart={setShowCart}
            handleSecretClick={() => setSecretCount(s => {
              if (s + 1 === 5) {
                window.location.href = "/portal-login";
                return 0;
              }
              return s + 1;
            })}
            navigate={(p) => window.location.href = p}
          />
        } />

        <Route path="/portal-login" element={userRole ? <Navigate to={userRole === 'admin' ? '/admin' : '/delivery'} /> : <StaffLogin onLoginSuccess={handleLoginSuccess} />} />

        <Route path="/track/:id" element={<TrackingPage />} />

        <Route path="/admin" element={userRole === 'admin' ? <AdminPanel exit={handleLogout} /> : <AccessDenied />} />

        <Route path="/delivery" element={userRole === 'delivery' ? <DeliveryDashboard logout={handleLogout} /> : <AccessDenied />} />
      </Routes>

      {showCart && <CartModal cart={cart} close={() => setShowCart(false)} updateQuantity={updateQuantity} clearCart={() => { setCart([]); localStorage.removeItem('cart'); }} />}
    </Router>
  );
};

export default App;

