import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API from '../api';
import { ChevronLeft, Clock, Package, Bike, CheckCircle, Receipt, PackageCheck, ShieldAlert } from 'lucide-react';

const TrackingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const DELIVERY_CHARGE = 40;

  useEffect(() => {
    const myStoredId = localStorage.getItem('lastOrderId');

    if (myStoredId && myStoredId.toString() === id.toString()) {
      setIsAuthorized(true);
      fetchOrder();
    } else {
      setIsAuthorized(false);
      setLoading(false);
    }

    const interval = setInterval(() => {
      const currentId = localStorage.getItem('lastOrderId');
      if (currentId && currentId.toString() === id.toString()) {
        fetchOrder();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await API.get(`/order/${id}`);
      setOrder(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Fetch error", err);
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-black italic animate-pulse">
      VERIFYING ACCESS...
    </div>
  );

  // 🔥 CUSTOMER PRIVACY ALERT
  if (!isAuthorized) return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <ShieldAlert size={60} className="text-red-600 mb-6 animate-bounce" />
      <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-4">Privacy Alert!</h2>
      <p className="text-gray-500 text-xs font-bold uppercase tracking-widest max-w-xs leading-relaxed mb-8">
        Security Check Failed. You can only track orders placed from this specific device.
      </p>
      <button onClick={() => navigate('/')} className="bg-white text-black px-10 py-4 rounded-2xl font-black uppercase text-[10px]">Back to Store</button>
    </div>
  );

  const getStageIndex = (status) => {
    switch (status) {
      case 'Pending': return 0;
      case 'Confirmed': return 1;
      case 'Picked Up': return 2;
      case 'On the Way': return 3;
      case 'Delivered': return 4;
      default: return 0;
    }
  };

  const currentStage = getStageIndex(order?.status);
  const stages = [
    { label: 'Order Received', icon: <Clock size={20} />, time: 'Bakery is checking' },
    { label: 'Kitchen Confirmed', icon: <PackageCheck size={20} />, time: 'Preparing your food' },
    { label: 'Picked Up', icon: <Package size={20} />, time: order?.partnerName ? `Picked up by ${order.partnerName}` : 'Waiting for partner' },
    { label: 'Out for Delivery', icon: <Bike size={20} />, time: 'Partner is on the way' },
    { label: 'Delivered', icon: <CheckCircle size={20} />, time: 'Enjoy your meal!' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-10 font-sans text-left">
      <button onClick={() => navigate('/')} className="mb-8 flex items-center text-gray-500 hover:text-white uppercase font-black text-[10px] italic bg-transparent border-none outline-none">
        <ChevronLeft size={16} className="mr-1" /> Back to Store
      </button>

      <div className="max-w-2xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter">Track <span className="text-red-600">Order</span></h1>
          <p className="text-gray-500 text-[9px] mt-2 font-mono uppercase tracking-widest border border-white/5 inline-block px-3 py-1 rounded-full font-bold italic">ORDER ID: #KCC-{id}</p>
        </header>

        <div className="space-y-8 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-1 before:bg-white/5">
          {stages.map((stage, index) => (
            <div key={index} className={`relative flex items-center gap-6 transition-all duration-700 ${index <= currentStage ? 'opacity-100' : 'opacity-20'}`}>
              <div className={`z-10 w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${index <= currentStage ? 'bg-red-600 border-red-900 shadow-[0_0_25px_rgba(220,38,38,0.3)]' : 'bg-gray-800 border-gray-900'}`}>
                {stage.icon}
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-black italic uppercase text-sm md:text-lg leading-none">{stage.label}</h3>
                <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-tighter">{stage.time}</p>
              </div>
              {index === currentStage && index !== 4 && <div className="w-2 h-2 bg-red-600 rounded-full animate-ping"></div>}
            </div>
          ))}
        </div>

        <div className="mt-12 bg-white/5 border border-white/10 p-6 rounded-[2.5rem] backdrop-blur-md shadow-2xl relative overflow-hidden text-left">
          <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12"><Receipt size={80} /></div>
          <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4 relative z-10">
            <h4 className="font-black uppercase italic text-[10px] text-red-500 tracking-widest">Billing Details</h4>
            <span className={`text-[9px] font-black px-3 py-1 rounded-full border ${order?.paymentMode === 'COD' ? 'border-orange-500/50 text-orange-500 bg-orange-500/10' : 'border-green-500/50 text-green-500 bg-green-500/10'}`}>
              {order?.paymentMode}
            </span>
          </div>

          <div className="space-y-3 relative z-10">
            {order?.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs italic font-bold">
                <span className="opacity-80 uppercase text-[10px]">{item.productName} <span className="text-gray-500 ml-1">x{item.quantity}</span></span>
                <span className="font-mono text-white tracking-tighter">₹{item.price * item.quantity}</span>
              </div>
            ))}
            <div className="flex justify-between items-center text-xs italic font-bold pt-2 border-t border-white/5">
              <span className="opacity-50 uppercase text-[10px]">Delivery Fee</span>
              <span className="font-mono text-white tracking-tighter">₹{DELIVERY_CHARGE}</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center relative z-10">
            <span className="font-black uppercase italic text-[11px] tracking-widest text-red-500">Amount Paid</span>
            <span className="text-xl md:text-2xl font-black text-white italic font-mono tracking-tighter">₹{(order?.items?.reduce((s, i) => s + (i.price * i.quantity), 0) || 0) + DELIVERY_CHARGE}</span>
          </div>
        </div>

        {currentStage === 4 && (
          <div className="mt-10 bg-green-600/10 border border-green-600/30 p-8 rounded-[2.5rem] text-center animate-in zoom-in duration-500 shadow-xl shadow-green-950/20">
            <div className="bg-green-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg"><CheckCircle size={24} /></div>
            <h3 className="text-green-500 font-black italic uppercase text-lg mb-1 text-center">Order Delivered!</h3>
            <p className="text-green-500/60 font-bold uppercase text-[9px] tracking-[0.2em] text-center">Thank you for ordering with Kumaran Coffee</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackingPage;


