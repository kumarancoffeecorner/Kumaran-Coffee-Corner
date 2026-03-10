import React, { useState, useEffect } from 'react';
import { Plus, Minus, Info, ShieldAlert } from 'lucide-react';
import API, { getImageUrl } from '../api';

const MenuSection = ({ onAddToCart, cart, updateQuantity }) => {
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [isShopOpen, setIsShopOpen] = useState(true);

  useEffect(() => {
    const fetchStatusAndMenu = async () => {
      try {
        const statusRes = await API.get('/Settings/shop-status');
        setIsShopOpen(statusRes.data.isOpen);

        const menuRes = await API.get('/menu');
        setItems(menuRes.data);
      } catch (err) {
        console.error("API Error", err);
        // Fallback to local storage if API fails
        const localStatus = localStorage.getItem('isShopOpen') !== 'false';
        setIsShopOpen(localStatus);
      }
      setLoading(false);
    };

    fetchStatusAndMenu();
    // Poll status every 10 seconds to detect real-time changes
    const interval = setInterval(fetchStatusAndMenu, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-center text-white py-10 italic uppercase font-black text-xs tracking-widest animate-pulse">Loading Kumaran Menu...</div>;

  const categories = ['All', ...new Set(items.map(i => i.category))];
  const filtered = activeCategory === 'All' ? items : items.filter(i => i.category === activeCategory);
  const getQty = (id) => cart.find(i => i.productId === id)?.quantity || 0;

  return (
    <div className="max-w-7xl mx-auto px-2 md:px-6">

      {/* 🔥 SHOP CLOSED ALERT BANNER */}
      {!isShopOpen && (
        <div className="mb-8 bg-red-600/20 border border-red-600/50 p-6 rounded-[2rem] flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
          <ShieldAlert className="text-red-600 mb-2 animate-pulse" size={40} />
          <h2 className="text-white font-black uppercase italic text-xl md:text-3xl tracking-tighter">Online Orders Closed</h2>
          <p className="text-gray-400 font-bold uppercase text-[9px] md:text-[11px] tracking-widest mt-1">We are currently not accepting online orders. Visit our store directly!</p>
        </div>
      )}

      {/* Category Chips - Responsive Scroll */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 mb-8 pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2 rounded-full text-[10px] font-black uppercase transition-all border shrink-0 ${activeCategory === cat
              ? 'bg-red-600 border-red-600 text-white shadow-lg'
              : 'bg-white/10 border-white/20 text-white backdrop-blur-md hover:bg-white/20'
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-8">
        {filtered.map((item) => {
          const qty = getQty(item.id);
          const isSoldOut = !item.isAvailable;
          const blockOrdering = !isShopOpen || isSoldOut;

          return (
            <div
              key={item.id}
              className={`group bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-2 md:p-5 shadow-xl flex flex-col h-full border relative transition-all duration-500 ${blockOrdering ? 'opacity-60 grayscale-[0.5]' : 'hover:scale-[1.03] hover:shadow-2xl hover:border-red-100'
                }`}
            >

              {/* Special Offer Tag */}
              {item.offerPrice && !blockOrdering && (
                <div className="absolute top-3 left-3 z-10 bg-red-600 text-white px-2 py-0.5 rounded-lg font-black text-[9px] uppercase animate-pulse shadow-lg">Special Offer</div>
              )}

              {/* Image with Hover Effect */}
              <div className="h-32 md:h-48 w-full bg-gray-50 rounded-xl md:rounded-[2rem] overflow-hidden relative mb-2">
                <img
                  src={getImageUrl(item.imageName)}
                  className={`w-full h-full object-cover transition-transform duration-700 ${!blockOrdering && 'group-hover:scale-110'}`}
                  alt={item.name}
                />
                {blockOrdering && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                    <span className="bg-red-600 text-white px-3 py-1 rounded-full font-black text-[8px] md:text-[10px] uppercase shadow-xl border border-white/20">
                      {!isShopOpen ? 'Shop Closed' : 'Sold Out'}
                    </span>
                  </div>
                )}
              </div>

              <div className="px-1 flex-1 flex flex-col text-left">
                <h3 className="text-[12px] md:text-lg font-black text-gray-900 uppercase italic truncate leading-tight">{item.name}</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-red-600 font-black text-[14px] md:text-2xl italic font-mono">₹{item.offerPrice || item.price}</p>
                  {item.offerPrice && <span className="text-gray-400 text-[10px] md:text-sm line-through opacity-60 italic">₹{item.price}</span>}
                </div>

                <div className="mt-auto pt-3">
                  {/* 🔥 STRICT CART BLOCKING LOGIC */}
                  {blockOrdering ? (
                    <div className="w-full bg-gray-100 text-gray-400 py-2.5 rounded-xl font-black uppercase text-[9px] text-center border border-gray-200 cursor-not-allowed">
                      Unavailable
                    </div>
                  ) : qty === 0 ? (
                    <button onClick={() => onAddToCart(item)} className="w-full bg-gray-900 text-white py-3 md:py-4 rounded-xl font-black uppercase text-[9px] md:text-xs hover:bg-red-600 active:scale-95 transition-all shadow-md transform translate-z-0">
                      + Add to Cart
                    </button>
                  ) : (
                    <div className="flex items-center justify-between bg-gray-100 rounded-xl p-1.5 border border-gray-200">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 text-red-600 bg-white rounded-lg shadow-sm hover:bg-red-50 transition-colors"><Minus size={14} /></button>
                      <span className="font-black text-xs md:text-lg px-2">{qty}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 text-green-600 bg-white rounded-lg shadow-sm hover:bg-green-50 transition-colors"><Plus size={14} /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MenuSection;