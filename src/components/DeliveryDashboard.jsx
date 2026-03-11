import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import API, { hubConnection } from '../api';
import { Bike, CheckCircle, LogOut, MapPin, Phone, Clock, Radar, ShieldAlert } from 'lucide-react';
import Swal from 'sweetalert2';

const DeliveryDashboard = ({ logout }) => {
  const [orders, setOrders] = useState([]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const interactedRef = useRef(false); // 🔥 Ref to handle stale closure in SignalR
  // const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://10.223.15.107:5054/api';
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://kumarancoffeecorner.tech/api';

  useEffect(() => {
    fetchOrders();

    const startConnection = async () => {
      if (hubConnection.state === 'Disconnected') {
        try {
          await hubConnection.start();
          console.log("⚡ SignalR Connected");
        } catch (err) {
          console.error("❌ SignalR Connection Error: ", err);
          setTimeout(startConnection, 5000);
        }
      }
    };

    startConnection();

    hubConnection.on("ReceiveOrderUpdate", () => {
      console.log("⚡ [SignalR] Update received!");
      fetchOrders();
    });

    return () => {
      hubConnection.off("ReceiveOrderUpdate");
    };
  }, []);

  const activateDashboard = () => {
    setHasInteracted(true);
    interactedRef.current = true;
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audio.volume = 0;
    audio.play().catch(() => { });
  };

  const fetchOrders = async () => {
    try {
      const res = await API.get(`/order`);
      const allOrders = res.data || [];

      const pendingBroadcasts = allOrders.filter(o =>
        o.status === 'Pending' && o.isBroadcasted === true && (!o.partnerName || o.partnerName === '')
      );

      const lastId = parseInt(localStorage.getItem('lastDeliveryAlertId') || '0');
      const latestId = pendingBroadcasts.length > 0 ? Math.max(...pendingBroadcasts.map(o => o.id)) : 0;

      if (latestId > lastId) {
        localStorage.setItem('lastDeliveryAlertId', latestId);

        // 🔥 Play Alarm: Use interactedRef.current to avoid stale closure
        if (interactedRef.current) {
          console.log("🔔 [Alarm] Playing sound...");
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
          audio.volume = 1.0;
          // Play multiple times for a real "Alarm" effect
          audio.play().catch(e => console.log("Audio play blocked", e));
          setTimeout(() => audio.play().catch(() => { }), 1000);
          setTimeout(() => audio.play().catch(() => { }), 2000);

          if (navigator.vibrate) {
            try { navigator.vibrate([1000, 500, 1000, 500, 1000]); } catch (e) { }
          }
        } else {
          console.log("⚠️ [Alarm] Skipped: No user interaction yet.");
        }

        if (Notification.permission === "granted") {
          new Notification("🚨 NEW ORDER RECEIVED!", {
            body: `Order #${latestId} is waiting. Accept now!`,
            icon: '/bike-icon.png'
          });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission();
        }
      }

      const myName = localStorage.getItem('partnerName');
      // 🔥 Show all broadcasted orders that are not delivered
      setOrders(allOrders.filter(o =>
        (o.status !== 'Delivered') &&
        (o.isBroadcasted === true)
      ));
    } catch (err) { console.error("Fetch error", err); }
  };

  const updateStatus = async (id, status) => {
    try {
      await API.patch(`/order/${id}/status`, `"${status}"`, {
        headers: { 'Content-Type': 'application/json' }
      });
      fetchOrders();
      if (status === 'Delivered') {
        Swal.fire({
          title: 'Success!',
          text: 'Order Completed Successfully!',
          icon: 'success',
          confirmButtonColor: '#e11d48',
          background: '#0f172a',
          color: '#fff',
          timer: 3000
        });
      }
    } catch (err) {
      Swal.fire({
        title: 'Error!',
        text: 'Status Update Failed',
        icon: 'error',
        confirmButtonColor: '#e11d48',
        background: '#0f172a',
        color: '#fff'
      });
    }
  };

  const handleAccept = async (id) => {
    const myName = localStorage.getItem('partnerName');
    if (!myName) return Swal.fire({
      title: 'Auth Error',
      text: 'Please Login Again!',
      icon: 'warning',
      background: '#0f172a',
      color: '#fff'
    });
    try {
      await API.patch(`/order/${id}/accept?partnerName=${myName}`);
      Swal.fire({
        title: 'Order Assigned!',
        text: 'Order Assigned to You Successfully.',
        icon: 'success',
        confirmButtonColor: '#10b981',
        background: '#0f172a',
        color: '#fff',
        timer: 4000
      });
      fetchOrders();
    } catch (err) {
      Swal.fire({
        title: 'Too Late!',
        text: 'Another partner already taken this order.',
        icon: 'error',
        confirmButtonColor: '#e11d48',
        background: '#0f172a',
        color: '#fff'
      });
      fetchOrders();
    }
  };

  return (
    <div className="w-full min-h-screen relative bg-slate-950 text-white overflow-y-auto font-sans text-left">
      {/* 🔥 Browser Interaction Overlay */}
      {!hasInteracted && (
        <div className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 text-center">
          <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] space-y-6 max-w-sm animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-red-600/20 animate-pulse">
              <Bike size={40} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase italic tracking-tighter">Ready to Deliver?</h2>
              <p className="text-gray-400 text-xs font-bold uppercase mt-2 leading-relaxed">Tap below to activate real-time <br /> order alerts & notifications.</p>
            </div>
            <button
              onClick={activateDashboard}
              className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl active:scale-95"
            >
              Start Dashboard
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 bg-black/80 backdrop-blur-lg p-4 flex justify-between items-center border-b border-white/10 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-red-600 p-1.5 rounded-lg"><Bike size={18} /></div>
          <h1 className="text-lg font-black uppercase italic tracking-tighter leading-none text-white">PARTNER <span className="text-red-600">PORTAL</span></h1>
        </div>
        <button onClick={logout} className="bg-white/10 p-2.5 rounded-xl active:scale-90 transition-all border border-white/5 outline-none"><LogOut size={20} /></button>
      </header>

      <main className="p-4 space-y-4 pb-24 max-w-2xl mx-auto">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center opacity-30">
            <Clock size={48} className="mb-4 animate-spin-slow" />
            <p className="font-black uppercase italic tracking-[0.2em] text-xs text-center">Waiting for new orders...</p>
          </div>
        ) : (
          orders.map(order => {
            // 🔥 STRICT SECURITY CHECK
            const myName = localStorage.getItem('partnerName');
            const isTakenByOthers = order.partnerName && order.partnerName !== "" && order.partnerName !== myName;
            const isTakenByMe = order.partnerName === myName;

            return (
              <div key={order.id} className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 shadow-2xl relative space-y-5 animate-in fade-in slide-in-from-bottom-4 text-left overflow-hidden">

                <div className="flex justify-between items-center text-left">
                  <span className="text-red-600 font-black italic">#KCC-{order.id}</span>
                  <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${isTakenByOthers ? 'bg-gray-800 border-gray-700 text-gray-500' : 'bg-red-600/20 border-red-600 text-red-500'}`}>
                    {isTakenByOthers ? 'ORDER TAKEN' : order.status}
                  </span>
                </div>

                {/* 🔥 VIEW MASKING: Hide everything if someone else accepted */}
                {isTakenByOthers ? (
                  <div className="py-10 text-center animate-in fade-in duration-500">
                    <ShieldAlert size={32} className="mx-auto mb-3 opacity-20 text-white" />
                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest leading-tight text-center">
                      This order was accepted <br /> by another partner.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start text-left">
                      <div className="flex-1 text-left">
                        <h3 className="font-black uppercase text-lg italic text-white leading-none text-left">{order.customerName}</h3>
                        <p className="text-[10px] text-gray-500 font-bold flex items-center gap-1 uppercase tracking-tighter text-left mt-2 leading-relaxed">
                          <MapPin size={12} className="text-red-600 shrink-0" /> {order.deliveryAddress}
                        </p>
                      </div>
                      <a href={`tel:${order.phoneNumber}`} className="bg-green-600/20 p-3 rounded-2xl text-green-500 border border-green-600/20 active:scale-90 transition-all shadow-lg"><Phone size={18} /></a>
                    </div>

                    <a
                      href={order.googleMapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-red-600/10 py-3 rounded-xl text-red-500 flex items-center justify-center gap-2 text-[9px] font-black uppercase italic border border-red-500/20 active:scale-95 transition-all outline-none"
                    >
                      <Radar size={14} /> Track Customer Location
                    </a>

                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5 text-left">
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2 italic text-left">Items To Pick</p>
                      <div className="space-y-1 text-left">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-[11px] font-bold italic text-left">
                            <span className="text-gray-300 uppercase">{item.productName}</span>
                            <span className="text-white/50">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      {!order.partnerName && (
                        <button onClick={() => handleAccept(order.id)} className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-black text-xs uppercase italic tracking-widest active:scale-95 transition-all outline-none">Accept Order</button>
                      )}

                      {isTakenByMe && (
                        <>
                          {order.status === 'Pending' && <div className="bg-gray-800 text-gray-400 py-3 rounded-xl text-center font-bold text-xs uppercase italic">Waiting for Confirmation</div>}
                          {order.status === 'Confirmed' && <button onClick={() => updateStatus(order.id, 'Picked Up')} className="bg-orange-600 hover:bg-orange-700 py-4 rounded-2xl font-black text-xs uppercase active:scale-95 transition-all outline-none">Picked Up</button>}
                          {order.status === 'Picked Up' && <button onClick={() => updateStatus(order.id, 'On the Way')} className="bg-indigo-600 hover:bg-indigo-700 py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 active:scale-95 transition-all outline-none"><Bike size={18} /> Start Delivery Movement</button>}
                          {order.status === 'On the Way' && <button onClick={() => updateStatus(order.id, 'Delivered')} className="bg-green-600 hover:bg-green-700 py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 active:scale-95 transition-all outline-none"><CheckCircle size={18} /> Mark Delivered</button>}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
};

export default DeliveryDashboard;