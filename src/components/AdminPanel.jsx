import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import API, { getImageUrl, hubConnection } from '../api';
import Swal from 'sweetalert2';
import {
  Trash2, Edit, Plus, X, MapPin, Coffee, ChevronLeft, Users, ShieldAlert,
  ShoppingBag, History, Phone, Radar, TrendingUp, Calendar, Image as ImageIcon,
  Copy, Check, Download, Power, PowerOff, Star, MessageSquare
} from 'lucide-react';

const AdminPanel = ({ exit }) => {
  const [activeTab, setActiveTab] = useState('orders');
  const [menuItems, setMenuItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [orders, setOrders] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const interactedRef = useRef(false); // 🔥 Ref to handle stale closure in SignalR

  // Shop Status & Date Filter
  const [isShopOpen, setIsShopOpen] = useState(true);

  // Helper to get local YYYY-MM-DD
  const getLocalDateHelper = (date = new Date()) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [filterDate, setFilterDate] = useState(getLocalDateHelper());

  const [menuForm, setMenuForm] = useState({ name: '', category: '', price: '', offerPrice: '', isAvailable: true, imageName: '' });
  const [branchForm, setBranchForm] = useState({ name: '', phoneNumber: '', mapUrl: '', imageName: '', latitude: '', longitude: '' });
  const [staffForm, setStaffForm] = useState({ username: '', password: '', role: 'Delivery' });

  const [copiedId, setCopiedId] = useState(null);
  // const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://10.225.118.107:5054/api';
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://kumarancoffeecorner.tech/api';
  const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dlynud71e/image/upload";
  const UPLOAD_PRESET = "kumaran_preset";

  useEffect(() => {
    fetchData();
    // Initial Shop Status Fetch
    API.get(`/Settings/shop-status`)
      .then(res => setIsShopOpen(res.data.isOpen))
      .catch(() => { });

    // 🔥 SIGNALR REAL-TIME UPDATES
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
      fetchOrdersOnly();
    });

    // 🔥 PERIODIC CHECK: Every 30 seconds to catch "Stale" orders (> 2 mins unaccepted)
    const interval = setInterval(fetchOrdersOnly, 30000);

    return () => {
      hubConnection.off("ReceiveOrderUpdate");
      clearInterval(interval);
    };
  }, []);

  const activateDashboard = () => {
    setHasInteracted(true);
    interactedRef.current = true;
    // Play a silent sound to "unlock" audio for the session
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audio.volume = 0;
    audio.play().catch(() => { });
  };

  const fetchData = async () => {
    API.get(`/Menu`).then(res => setMenuItems(res.data)).catch(() => { });
    API.get(`/Branch`).then(res => setBranches(res.data)).catch(() => { });
    API.get(`/Staff`).then(res => setStaffs(res.data)).catch(() => { });
    API.get(`/Review`).then(res => setReviews(res.data)).catch(() => { });
    fetchOrdersOnly();
  };

  const fetchOrdersOnly = async () => {
    try {
      const res = await API.get(`/Order`);
      const allOrders = res.data || [];
      setOrders(allOrders);

      const now = new Date().getTime();
      // 🔥 ALERT LOGIC: Sound alarm for ANY Pending order that is either NOT broadcasted yet 
      // OR has been broadcasted but not taken for > 2 mins
      const pendingOrders = allOrders.filter(o => o.status === 'Pending' && (!o.partnerName || o.partnerName === ""));

      const needsAlert = pendingOrders.some(o => {
        if (!o.isBroadcasted) return true; // Sound immediately for new unbroadcasted orders
        const orderTime = new Date(o.orderDate).getTime();
        return (now - orderTime) / 60000 >= 2; // Sound for neglected broadcasted orders
      });

      if (needsAlert && interactedRef.current) {
        console.log("🔔 [Alarm] Playing sound...");
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        audio.volume = 0.8;
        // Play multiple times for a real "Alarm" effect
        audio.play().catch(e => console.log("Audio play blocked", e));
        setTimeout(() => audio.play().catch(() => { }), 1000);
        setTimeout(() => audio.play().catch(() => { }), 2000);
      }
    } catch (e) { console.error(e); }
  };

  // Toggle Shop Status via Backend
  const handleShopToggle = async () => {
    const newState = !isShopOpen;
    try {
      await API.patch(`/Settings/toggle-shop?open=${newState}`);
      setIsShopOpen(newState);
      // alert(`Shop status updated to: ${newState ? 'OPEN' : 'CLOSED'}`);
    } catch (err) {
      Swal.fire({
        title: 'Error!',
        text: 'Failed to update shop status.',
        icon: 'error',
        confirmButtonColor: '#e11d48',
        background: '#0f172a',
        color: '#fff'
      });
    }
  };

  // 🔥 Review Delete Logic
  const handleDeleteReview = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "Delete this review permanently?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#334155',
      confirmButtonText: 'Yes, delete it!',
      background: '#0f172a',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        await API.delete(`/Review/${id}`);
        setReviews(reviews.filter(r => r.id !== id));
        Swal.fire({
          title: 'Deleted!',
          text: 'Review has been removed.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          background: '#0f172a',
          color: '#fff'
        });
      } catch (err) {
        Swal.fire({
          title: 'Error!',
          text: 'Failed to delete review.',
          icon: 'error',
          background: '#0f172a',
          color: '#fff'
        });
      }
    }
  };

  const getSales = (type) => {
    const now = new Date();
    const filtered = orders.filter(o => {
      const d = new Date(o.orderDate);
      const isCorrectDate = type === 'daily'
        ? d.toDateString() === now.toDateString()
        : d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return o.status === 'Delivered' && o.isBroadcasted === true && isCorrectDate;
    });
    return filtered.reduce((s, o) => s + (o.items?.reduce((st, i) => st + (i.price * i.quantity), 0) + (o.deliveryCharge || 30)), 0);
  };

  // Itemized PDF Export
  const exportToPDF = () => {
    const filtered = orders.filter(o => o.status === 'Delivered' && o.isBroadcasted === true && getLocalDateHelper(o.orderDate) === filterDate);
    if (filtered.length === 0) return Swal.fire({
      title: 'No Sales',
      text: 'No sales found for this date!',
      icon: 'info',
      background: '#0f172a',
      color: '#fff'
    });

    const printWindow = window.open('', '_blank');
    const totalRevenue = filtered.reduce((s, o) => s + (o.items?.reduce((st, i) => st + (i.price * i.quantity), 0) + 30), 0);

    printWindow.document.write(`
      <html>
        <head><title>Sales Report - ${filterDate}</title></head>
        <body style="font-family: sans-serif; padding: 20px;">
          <h1 style="text-align: center; color: #e11d48; margin-bottom: 5px;">KUMARAN COFFEE CORNER</h1>
          <p style="text-align: center; font-weight: bold;">Sales Report: ${new Date(filterDate).toDateString()}</p>
          <hr/>
          <table border="1" style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px;">
            <thead><tr style="background: #f4f4f4;"><th>ID</th><th>Customer</th><th>Items Purchased</th><th>Payment</th><th>Total</th></tr></thead>
            <tbody>
              ${filtered.map(o => `
                <tr>
                  <td style="padding: 8px; text-align: center;">#${o.id}</td>
                  <td style="padding: 8px;">${o.customerName}</td>
                  <td style="padding: 8px;">${o.items ? o.items.map(i => `${i.productName} x${i.quantity}`).join(", ") : 'No data'}</td>
                  <td style="padding: 8px; text-align: center;">${o.paymentMode}</td>
                  <td style="padding: 8px; font-weight: bold;">₹${o.items ? o.items.reduce((s, i) => s + (i.price * i.quantity), 0) + 30 : 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="text-align: right; margin-top: 20px; border-top: 2px solid black; padding-top: 10px;">
             <h3>Total Sales Revenue: ₹${totalRevenue}</h3>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // const handleSave = async (e) => {
  //   e.preventDefault();
  //   setLoading(true);
  //   try {
  //     if (activeTab === 'staff') {
  //       await API.post(`/Staff`, staffForm);
  //       // alert("Staff Added!");
  //     } else {
  //       let finalImageUrl = activeTab === 'menu' ? menuForm.imageName : branchForm.imageName;
  //       if (selectedFile) {
  //         const formData = new FormData();
  //         formData.append("file", selectedFile);
  //         formData.append("upload_preset", UPLOAD_PRESET);
  //         const res = await API.post(CLOUDINARY_URL, formData);
  //         finalImageUrl = res.data.secure_url;
  //       }
  //       const endpoint = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
  //       const payload = activeTab === 'menu'
  //         ? { ...menuForm, id: editingItem?.id || 0, price: parseFloat(menuForm.price), offerPrice: menuForm.offerPrice ? parseFloat(menuForm.offerPrice) : null, imageName: finalImageUrl }
  //         : { ...branchForm, id: editingItem?.id || 0, latitude: parseFloat(branchForm.latitude) || 0, longitude: parseFloat(branchForm.longitude) || 0, imageName: finalImageUrl };

  //       editingItem ? await API.put(`/${endpoint}/${editingItem.id}`, payload) : await API.post(`/${endpoint}`, payload);
  //       // alert("Updated!");
  //     }
  //     closeModal(); fetchData();
  //   } catch (err) { alert("Error saving data!"); }
  //   setLoading(false);
  // };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (activeTab === 'staff') {
        await API.post(`/Staff`, staffForm);
      } else {
        let finalImageUrl = activeTab === 'menu' ? menuForm.imageName : branchForm.imageName;

        if (selectedFile) {
          const formData = new FormData();
          formData.append("file", selectedFile);
          formData.append("upload_preset", UPLOAD_PRESET);

          const res = await axios.post(CLOUDINARY_URL, formData, {
            transformRequest: [(data, headers) => {
              delete headers.Authorization;
              return data;
            }]
          });

          finalImageUrl = res.data.secure_url;
          console.log("✅ Cloudinary Success:", finalImageUrl);
        }

        const endpoint = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
        const payload = activeTab === 'menu'
          ? { ...menuForm, id: editingItem?.id || 0, price: parseFloat(menuForm.price), offerPrice: menuForm.offerPrice ? parseFloat(menuForm.offerPrice) : null, imageName: finalImageUrl }
          : { ...branchForm, id: editingItem?.id || 0, latitude: parseFloat(branchForm.latitude) || 0, longitude: parseFloat(branchForm.longitude) || 0, imageName: finalImageUrl };

        editingItem ? await API.put(`/${endpoint}/${editingItem.id}`, payload) : await API.post(`/${endpoint}`, payload);
      }
      closeModal();
      fetchData();
    } catch (err) {
      console.error("Upload Error Details:", err.response?.data);
      Swal.fire({
        title: 'Save Failed',
        text: err.response?.data?.error?.message || "Check network/settings",
        icon: 'error',
        background: '#0f172a',
        color: '#fff'
      });
    }
    setLoading(false);
  };

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBroadcast = async (id) => {
    try {
      await API.patch(`/Order/${id}/broadcast`);
      // alert("Broadcasted to Delivery Partners!");
      fetchOrdersOnly();
      Swal.fire({
        title: 'Broadcasted!',
        text: 'Order sent to all partners.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        background: '#0f172a',
        color: '#fff'
      });
    } catch (err) {
      Swal.fire({
        title: 'Error!',
        text: 'Broadcast Failed!',
        icon: 'error',
        background: '#0f172a',
        color: '#fff'
      });
    }
  };

  // 🔥 REJECT & DELETE ORDER LOGIC
  const handleDeleteOrder = async (id) => {
    const result = await Swal.fire({
      title: 'Reject Order?',
      text: "Are you sure you want to REJECT and DELETE this order?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#334155',
      confirmButtonText: 'Yes, reject it!',
      background: '#0f172a',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        await API.delete(`/Order/${id}`);
        fetchOrdersOnly();
        Swal.fire({
          title: 'Rejected!',
          text: 'Order has been removed.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          background: '#0f172a',
          color: '#fff'
        });
      } catch (err) {
        Swal.fire({
          title: 'Error!',
          text: 'Failed to reject order. Try again.',
          icon: 'error',
          background: '#0f172a',
          color: '#fff'
        });
      }
    }
  };

  const closeModal = () => {
    setShowModal(false); setEditingItem(null); setSelectedFile(null); setPreviewUrl(null);
    setMenuForm({ name: '', category: '', price: '', offerPrice: '', isAvailable: true, imageName: '' });
    setBranchForm({ name: '', phoneNumber: '', mapUrl: '', imageName: '', latitude: '', longitude: '' });
    setStaffForm({ username: '', password: '', role: 'Delivery' });
  };

  return (
    <div className="fixed inset-0 z-[600] bg-[#050505] text-white overflow-y-auto font-sans pb-20 text-left">
      {/* 🔥 Browser Interaction Overlay */}
      {!hasInteracted && (
        <div className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 text-center">
          <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] space-y-6 max-w-sm animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-red-600/20 animate-pulse">
              <ShieldAlert size={40} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase italic tracking-tighter">Admin Portal Active</h2>
              <p className="text-gray-400 text-xs font-bold uppercase mt-2 leading-relaxed">Tap below to activate real-time <br /> order alarms & notifications.</p>
            </div>
            <button
              onClick={activateDashboard}
              className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl active:scale-95"
            >
              Start Admin Console
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 bg-black/90 backdrop-blur-lg p-3 md:p-4 flex justify-between items-center border-b border-white/5 z-50">
        <h1 className="text-[12px] md:text-lg font-black uppercase italic tracking-tighter leading-none">ADMIN <span className="text-red-600">PORTAL</span></h1>

        <div className="flex items-center gap-2 md:gap-4">
          {/* 🔥 REVIEW MANAGER ICON */}
          <button onClick={() => setShowReviewModal(true)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 relative transition-all">
            <MessageSquare size={18} />
            {reviews.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-[8px] px-1.5 py-0.5 rounded-full font-black animate-bounce">{reviews.length}</span>}
          </button>

          <button onClick={handleShopToggle} className={`px-2 py-1 md:px-4 md:py-2 rounded-full text-[7px] md:text-[9px] font-black uppercase flex items-center gap-1.5 transition-all border ${isShopOpen ? 'bg-green-600/10 border-green-600 text-green-500' : 'bg-red-600/10 border-red-600 text-red-500'}`}>
            {isShopOpen ? <Power size={10} /> : <PowerOff size={10} />} {isShopOpen ? 'Online' : 'Closed'}
          </button>

          <button onClick={exit} className="bg-red-600 px-3 py-1 md:px-5 md:py-2 rounded-full text-[7px] md:text-[9px] font-black italic shadow-lg active:scale-95 transition-all flex items-center"><ChevronLeft size={10} /> EXIT</button>
        </div>
      </header>

      {/* 🔥 OPTIMIZED LAPTOP SIZE: max-w-5xl */}
      <main className="p-4 max-w-5xl mx-auto md:px-6">
        <div className="grid grid-cols-2 gap-3 mb-6 mt-4">
          <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <TrendingUp size={18} className="text-green-500" /><div className="text-left leading-none"><p className="text-[7px] font-black text-gray-500 uppercase">Today</p><h2 className="text-lg font-black italic text-white text-left">₹{getSales('daily')}</h2></div>
          </div>
          <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <Calendar size={18} className="text-blue-500" /><div className="text-left leading-none"><p className="text-[7px] font-black text-gray-500 uppercase">Monthly</p><h2 className="text-lg font-black italic text-white text-left">₹{getSales('monthly')}</h2></div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1 mb-6">
          {['orders', 'history', 'menu', 'branch', 'staff'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`py-4 rounded-xl flex flex-col items-center justify-center gap-1 font-black text-[7px] md:text-[9px] uppercase border transition-all ${activeTab === t ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-white/[0.03] border-white/5 text-gray-500 hover:bg-white/5'}`}>
              {t === 'orders' && <ShoppingBag size={16} />}
              {t === 'history' && <History size={16} />}
              {t === 'menu' && <Coffee size={16} />}
              {t === 'branch' && <MapPin size={16} />}
              {t === 'staff' && <Users size={16} />}
              {t === 'branch' ? 'OUTLETS' : t.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {activeTab === 'history' && (
            <div className="flex gap-2 mb-4 animate-in slide-in-from-top-2">
              <input type="date" className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-black uppercase text-white outline-none" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
              <button onClick={exportToPDF} className="bg-green-600 px-4 rounded-xl flex items-center gap-2 text-[8px] font-black uppercase italic shadow-lg active:scale-95"><Download size={14} /> PDF</button>
            </div>
          )}

          {(activeTab === 'orders' || activeTab === 'history') && orders
            .filter(o => (activeTab === 'orders' ? o.status !== 'Delivered' : (o.status === 'Delivered' && getLocalDateHelper(o.orderDate) === filterDate)))
            .map(order => (
              <div key={order.id} className="bg-white/[0.03] p-4 rounded-[1.8rem] border border-white/5 space-y-2 text-left animate-in fade-in">
                <div className="flex justify-between items-center text-left">
                  <h4 className="text-white font-black uppercase italic text-[10px]">#{order.id} {order.customerName}</h4>
                  <div className="flex items-center gap-1.5">
                    {!order.isBroadcasted && order.status === 'Pending' && <span className="text-[6px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-600 animate-pulse">New Order</span>}
                    <span className={`text-[6px] font-black uppercase px-2 py-0.5 rounded-full ${order.status === 'Delivered' ? 'bg-green-600' : 'bg-red-600'}`}>{order.status}</span>
                  </div>
                </div>
                <p className="text-gray-500 text-[8px] font-bold uppercase text-left leading-none mb-1">📞 {order.phoneNumber} • {order.paymentMode}</p>
                <div className="flex flex-wrap gap-1 text-left">{order.items?.map((item, idx) => <span key={idx} className="bg-white/5 px-2 py-0.5 rounded-md text-[7px] text-gray-400 font-bold italic">{item.productName} x{item.quantity}</span>)}</div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <a href={order.googleMapsLink} target="_blank" className="bg-red-600/10 py-2.5 rounded-xl text-red-500 flex items-center justify-center gap-2 text-[8px] font-black uppercase border border-red-600/10 active:scale-95 transition-all outline-none"><Radar size={12} /> Map</a>

                  {/* 🔥 REJECT & BROADCAST SECTION */}
                  {order.status === 'Pending' && (
                    <div className="grid grid-cols-2 gap-2 w-full">
                      {!order.isBroadcasted && (
                        <button onClick={() => handleBroadcast(order.id)} className="bg-blue-600 py-2.5 rounded-xl text-white flex items-center justify-center gap-2 text-[8px] font-black uppercase shadow-lg active:scale-95 transition-all outline-none animate-bounce">Broadcast</button>
                      )}
                      <button onClick={() => handleDeleteOrder(order.id)} className="bg-white/5 py-2.5 rounded-xl text-red-500 flex items-center justify-center gap-2 text-[8px] font-black uppercase border border-red-600/10 hover:bg-red-600 hover:text-white transition-all active:scale-95"><Trash2 size={12} /> Reject</button>
                    </div>
                  )}

                  {order.isBroadcasted && order.status !== 'Delivered' && order.status !== 'Pending' && (
                    <div className="bg-white/5 py-2.5 rounded-xl text-gray-400 flex items-center justify-center gap-2 text-[8px] font-black uppercase border border-white/5">Broadcasted</div>
                  )}
                </div>
              </div>
            ))}

          {activeTab === 'staff' && staffs.map(staff => (
            <div key={staff.id} className="bg-white/[0.02] p-3 rounded-2xl border border-white/5 flex items-center justify-between animate-in fade-in">
              <div className="text-left flex items-center gap-3">
                <div className="w-8 h-8 bg-red-600/20 rounded-full flex items-center justify-center text-red-600"><Users size={14} /></div>
                <div><h3 className="font-black italic uppercase text-white text-[10px] text-left">{staff.username}</h3><p className="text-gray-500 font-bold text-[7px] uppercase text-left">{staff.role}</p></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => copyText(staff.username, staff.id)} className="p-2.5 bg-white/5 text-blue-500 rounded-lg">{copiedId === staff.id ? <Check size={12} /> : <Copy size={12} />}</button>
                {staff.role !== 'Admin' ? (
                  <button onClick={async () => {
                    const result = await Swal.fire({
                      title: 'Delete Staff?',
                      text: "Remove this staff member permanently?",
                      icon: 'warning',
                      showCancelButton: true,
                      confirmButtonColor: '#e11d48',
                      cancelButtonColor: '#334155',
                      background: '#0f172a',
                      color: '#fff'
                    });
                    if (result.isConfirmed) {
                      await API.delete(`/Staff/${staff.id}`);
                      fetchData();
                    }
                  }} className="p-2.5 bg-white/5 text-red-500 rounded-lg hover:bg-red-600 active:text-white transition-all"><Trash2 size={12} /></button>
                ) : (
                  <div className="p-2.5 bg-white/5 text-gray-600 rounded-lg"><ShieldAlert size={12} /></div>
                )}
              </div>
            </div>
          ))}

          {(activeTab === 'menu' || activeTab === 'branch') && (activeTab === 'menu' ? menuItems : branches).map(item => (
            <div key={item.id} className="bg-white/[0.02] p-3 rounded-2xl border border-white/5 flex items-center justify-between group text-left">
              <div className="flex items-center gap-3 text-left">
                <img src={getImageUrl(item.imageName)} className="w-10 h-10 rounded-lg object-cover border border-white/5" alt="p" />
                <div className="text-left">
                  <h3 className="font-black italic uppercase text-white text-[10px] text-left">{item.name}</h3>
                  <div className="flex items-center gap-2">
                    {activeTab === 'menu' ? (
                      <>
                        <p className="text-red-600 font-bold text-[7px] uppercase tracking-tighter text-left">₹{item.offerPrice || item.price}</p>
                        {item.offerPrice && <span className="text-gray-500 text-[6px] line-through italic">₹{item.price}</span>}
                        {!item.isAvailable && <span className="bg-red-600 text-white text-[5px] px-1 rounded-sm uppercase font-black">Sold Out</span>}
                      </>
                    ) : (
                      <p className="text-red-600 font-bold text-[7px] uppercase tracking-tighter text-left">{item.phoneNumber}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => { setEditingItem(item); activeTab === 'menu' ? setMenuForm(item) : setBranchForm(item); setShowModal(true); }} className="p-2.5 bg-white/5 text-blue-500 rounded-lg hover:bg-blue-600 active:text-white transition-all"><Edit size={12} /></button>
                <button onClick={async () => {
                  const result = await Swal.fire({
                    title: 'Delete?',
                    text: `Are you sure you want to delete this ${activeTab}?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#e11d48',
                    cancelButtonColor: '#334155',
                    background: '#0f172a',
                    color: '#fff'
                  });
                  if (result.isConfirmed) {
                    await API.delete(`/${activeTab}/${item.id}`);
                    fetchData();
                  }
                }} className="p-2.5 bg-white/5 text-red-500 rounded-lg hover:bg-red-600 active:text-white transition-all"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* 🔥 Floating Action Button */}
      {['menu', 'branch', 'staff'].includes(activeTab) && (
        <button onClick={() => { setShowModal(true); setEditingItem(null); }} className="fixed bottom-8 right-8 w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white/10 hover:scale-110 active:scale-90 transition-all z-50">
          <Plus color="white" size={28} strokeWidth={3} />
        </button>
      )}

      {/* 🔥 REVIEW MODAL WITH DELETE BUTTON */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[2000] p-4 flex items-center justify-center">
          <div className="bg-[#0f0f0f] w-full max-w-lg rounded-[2.5rem] border border-white/10 h-[70vh] flex flex-col shadow-2xl animate-in zoom-in duration-200 overflow-hidden">
            <div className="p-5 bg-red-600 text-white flex justify-between items-center shadow-lg leading-none"><h2 className="text-xs font-black italic uppercase tracking-widest text-left">Review Manager</h2><button onClick={() => setShowReviewModal(false)} className="bg-black/20 p-2 rounded-full hover:bg-black/40 transition-colors"><X size={20} /></button></div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar text-left">
              {reviews.length === 0 ? <p className="text-center text-gray-600 text-[10px] mt-20 uppercase font-black italic">No reviews yet.</p> :
                reviews.map(r => (
                  <div key={r.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 relative group animate-in fade-in">
                    <button onClick={() => handleDeleteReview(r.id)} className="absolute top-4 right-4 text-red-500 p-2 bg-red-500/10 rounded-xl hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-lg"><Trash2 size={16} /></button>
                    <div className="text-left">
                      <h4 className="text-white font-black italic uppercase text-[10px] leading-none mb-1">{r.customerName}</h4>
                      <div className="flex gap-0.5 mb-2">{[...Array(5)].map((_, i) => <Star key={i} size={8} className={i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-700"} />)}</div>
                      <p className="text-gray-400 text-[10px] font-bold uppercase italic leading-tight">"{r.comment}"</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[1000] p-4 flex items-center justify-center overflow-y-auto">
          <div className="bg-[#0f0f0f] w-full max-w-sm rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-4 bg-red-600 text-white flex justify-between items-center shadow-lg leading-none"><h2 className="text-sm font-black italic uppercase tracking-widest text-left">Add {activeTab}</h2><button onClick={closeModal} className="bg-black/20 p-1.5 rounded-full active:scale-90"><X size={16} /></button></div>
            <form onSubmit={handleSave} className="p-6 space-y-4 text-left">
              {activeTab !== 'staff' && (
                <div className="h-32 bg-white/5 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden relative" onClick={() => document.getElementById('imageInput').click()}>
                  {previewUrl || (activeTab === 'menu' ? menuForm.imageName : branchForm.imageName) ? <img src={previewUrl || getImageUrl(activeTab === 'menu' ? menuForm.imageName : branchForm.imageName)} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="preview" /> : <div className="text-center opacity-40"><ImageIcon size={24} className="mx-auto mb-1" /><p className="text-[8px] font-black uppercase text-center">Upload Photo</p></div>}
                  <input id="imageInput" type="file" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files[0]; if (f) { setSelectedFile(f); setPreviewUrl(URL.createObjectURL(f)); } }} />
                </div>
              )}
              <div className="space-y-2 text-left">
                {activeTab === 'staff' && (
                  <><input required placeholder="USERNAME" className="w-full bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 font-black uppercase text-[9px] text-white" value={staffForm.username} onChange={e => setStaffForm({ ...staffForm, username: e.target.value })} /><input required type="password" placeholder="PASSWORD" className="w-full bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 font-black text-[9px] text-white" value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })} /><select className="w-full bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 font-black uppercase text-[9px] text-white" value={staffForm.role} onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}><option value="Delivery">Delivery Partner</option><option value="Admin">Admin</option></select></>
                )}
                {activeTab === 'menu' && (
                  <><input required placeholder="NAME" className="w-full bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 font-black uppercase text-[9px] text-white" value={menuForm.name} onChange={e => setMenuForm({ ...menuForm, name: e.target.value })} /><input required placeholder="CATEGORY" className="w-full bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 font-black uppercase text-[9px] text-white" value={menuForm.category} onChange={e => setMenuForm({ ...menuForm, category: e.target.value })} /><div className="grid grid-cols-2 gap-2 text-left"><input required type="number" placeholder="MRP" className="bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 font-black text-[9px] text-white" value={menuForm.price} onChange={e => setMenuForm({ ...menuForm, price: e.target.value })} /><input type="number" placeholder="OFFER" className="bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 font-black text-[9px] text-green-400" value={menuForm.offerPrice || ''} onChange={e => setMenuForm({ ...menuForm, offerPrice: e.target.value })} />
                  </div><div className="flex items-center gap-2 mt-2 bg-white/5 p-2 rounded-lg"><input type="checkbox" id="avail" checked={menuForm.isAvailable} onChange={e => setMenuForm({ ...menuForm, isAvailable: e.target.checked })} className="w-4 h-4 accent-red-600" /><label htmlFor="avail" className="text-[10px] font-black uppercase cursor-pointer">Available (Show in Menu)</label></div></>
                )}
                {activeTab === 'branch' && (
                  <><input required placeholder="BRANCH NAME" className="w-full bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 font-black uppercase text-[9px] text-white" value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} /><input required placeholder="PHONE" className="w-full bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 font-black text-[9px] text-white" value={branchForm.phoneNumber} onChange={e => setBranchForm({ ...branchForm, phoneNumber: e.target.value })} /><input required placeholder="MAP URL" className="w-full bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 font-black text-[8px] text-blue-400" value={branchForm.mapUrl} onChange={e => setBranchForm({ ...branchForm, mapUrl: e.target.value })} /><div className="grid grid-cols-2 gap-2 text-left"><input required placeholder="LAT" type="number" step="any" className="bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 text-[9px] text-white" value={branchForm.latitude} onChange={e => setBranchForm({ ...branchForm, latitude: e.target.value })} /><input required placeholder="LONG" type="number" step="any" className="bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 text-[9px] text-white" value={branchForm.longitude} onChange={e => setBranchForm({ ...branchForm, longitude: e.target.value })} /></div></>
                )}
              </div>
              <button disabled={loading} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-[9px] hover:bg-red-600 hover:text-white transition-all shadow-xl active:scale-95 shadow-white/5">{loading ? 'SAVING...' : 'SAVE CHANGES'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import API, { getImageUrl } from '../api';
// import {
//   Trash2, Edit, Plus, X, MapPin, Coffee, ChevronLeft, Users, ShieldAlert,
//   ShoppingBag, History, Phone, Radar, TrendingUp, Calendar, Image as ImageIcon,
//   Copy, Check, Download, Power, PowerOff, Star, MessageSquare
// } from 'lucide-react';

// const AdminPanel = ({ exit }) => {
//   const [activeTab, setActiveTab] = useState('orders');
//   const [menuItems, setMenuItems] = useState([]);
//   const [branches, setBranches] = useState([]);
//   const [orders, setOrders] = useState([]);
//   const [staffs, setStaffs] = useState([]);
//   const [reviews, setReviews] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [showModal, setShowModal] = useState(false);
//   const [showReviewModal, setShowReviewModal] = useState(false);
//   const [editingItem, setEditingItem] = useState(null);
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [previewUrl, setPreviewUrl] = useState(null);

//   // Shop Status & Date Filter
//   const [isShopOpen, setIsShopOpen] = useState(true);

//   // Helper to get local YYYY-MM-DD
//   const getLocalDateHelper = (date = new Date()) => {
//     const d = new Date(date);
//     const year = d.getFullYear();
//     const month = String(d.getMonth() + 1).padStart(2, '0');
//     const day = String(d.getDate()).padStart(2, '0');
//     return `${year}-${month}-${day}`;
//   };

//   const [filterDate, setFilterDate] = useState(getLocalDateHelper());

//   const [menuForm, setMenuForm] = useState({ name: '', category: '', price: '', offerPrice: '', isAvailable: true, imageName: '' });
//   const [branchForm, setBranchForm] = useState({ name: '', phoneNumber: '', mapUrl: '', imageName: '', latitude: '', longitude: '' });
//   const [staffForm, setStaffForm] = useState({ username: '', password: '', role: 'Delivery' });

//   const [copiedId, setCopiedId] = useState(null);
//   const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://10.225.118.107:5054/api';
//   const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dlynud71e/image/upload";
//   const UPLOAD_PRESET = "kumaran_preset";

//   useEffect(() => {
//     fetchData();
//     // Initial Shop Status Fetch
//     API.get(`/Settings/shop-status`)
//       .then(res => setIsShopOpen(res.data.isOpen))
//       .catch(() => { });

//     const interval = setInterval(fetchOrdersOnly, 5000);
//     return () => clearInterval(interval);
//   }, []);

//   const fetchData = async () => {
//     API.get(`/Menu`).then(res => setMenuItems(res.data)).catch(() => { });
//     API.get(`/Branch`).then(res => setBranches(res.data)).catch(() => { });
//     API.get(`/Staff`).then(res => setStaffs(res.data)).catch(() => { });
//     API.get(`/Review`).then(res => setReviews(res.data)).catch(() => { });
//     fetchOrdersOnly();
//   };

//   const fetchOrdersOnly = async () => {
//     try {
//       const res = await API.get(`/Order`);
//       const allOrders = res.data || [];
//       setOrders(allOrders);

//       const now = new Date().getTime();
//       // 🔥 ALERT LOGIC: Sound alarm for ANY Pending order that is either NOT broadcasted yet
//       // OR has been broadcasted but not taken for > 2 mins
//       const pendingOrders = allOrders.filter(o => o.status === 'Pending' && (!o.partnerName || o.partnerName === ""));

//       const needsAlert = pendingOrders.some(o => {
//         if (!o.isBroadcasted) return true; // Sound immediately for new unbroadcasted orders
//         const orderTime = new Date(o.orderDate).getTime();
//         return (now - orderTime) / 60000 >= 2; // Sound for neglected broadcasted orders
//       });

//       if (needsAlert) {
//         const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
//         audio.volume = 0.6;
//         audio.play().catch(() => { });
//       }
//     } catch (e) { console.error(e); }
//   };

//   // Toggle Shop Status via Backend
//   const handleShopToggle = async () => {
//     const newState = !isShopOpen;
//     try {
//       await API.patch(`/Settings/toggle-shop?open=${newState}`);
//       setIsShopOpen(newState);
//       // alert(`Shop status updated to: ${newState ? 'OPEN' : 'CLOSED'}`);
//     } catch (err) {
//       alert("Failed to update shop status.");
//     }
//   };

//   // 🔥 Review Delete Logic
//   const handleDeleteReview = async (id) => {
//     if (window.confirm("Delete this review permanently?")) {
//       try {
//         await API.delete(`/Review/${id}`);
//         setReviews(reviews.filter(r => r.id !== id));
//       } catch (err) {
//         alert("Failed to delete review.");
//       }
//     }
//   };

//   const getSales = (type) => {
//     const now = new Date();
//     const filtered = orders.filter(o => {
//       const d = new Date(o.orderDate);
//       const isCorrectDate = type === 'daily'
//         ? d.toDateString() === now.toDateString()
//         : d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
//       return o.status === 'Delivered' && o.isBroadcasted === true && isCorrectDate;
//     });
//     return filtered.reduce((s, o) => s + (o.items?.reduce((st, i) => st + (i.price * i.quantity), 0) + (o.deliveryCharge || 30)), 0);
//   };

//   // Itemized PDF Export
//   const exportToPDF = () => {
//     const filtered = orders.filter(o => o.status === 'Delivered' && o.isBroadcasted === true && getLocalDateHelper(o.orderDate) === filterDate);
//     if (filtered.length === 0) return alert("No sales found for this date!");

//     const printWindow = window.open('', '_blank');
//     const totalRevenue = filtered.reduce((s, o) => s + (o.items?.reduce((st, i) => st + (i.price * i.quantity), 0) + 30), 0);

//     printWindow.document.write(`
//       <html>
//         <head><title>Sales Report - ${filterDate}</title></head>
//         <body style="font-family: sans-serif; padding: 20px;">
//           <h1 style="text-align: center; color: #e11d48; margin-bottom: 5px;">KUMARAN COFFEE CORNER</h1>
//           <p style="text-align: center; font-weight: bold;">Sales Report: ${new Date(filterDate).toDateString()}</p>
//           <hr/>
//           <table border="1" style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px;">
//             <thead><tr style="background: #f4f4f4;"><th>ID</th><th>Customer</th><th>Items Purchased</th><th>Payment</th><th>Total</th></tr></thead>
//             <tbody>
//               ${filtered.map(o => `
//                 <tr>
//                   <td style="padding: 8px; text-align: center;">#${o.id}</td>
//                   <td style="padding: 8px;">${o.customerName}</td>
//                   <td style="padding: 8px;">${o.items ? o.items.map(i => `${i.productName} x${i.quantity}`).join(", ") : 'No data'}</td>
//                   <td style="padding: 8px; text-align: center;">${o.paymentMode}</td>
//                   <td style="padding: 8px; font-weight: bold;">₹${o.items ? o.items.reduce((s, i) => s + (i.price * i.quantity), 0) + 30 : 0}</td>
//                 </tr>
//               `).join('')}
//             </tbody>
//           </table>
//           <div style="text-align: right; margin-top: 20px; border-top: 2px solid black; padding-top: 10px;">
//              <h3>Total Sales Revenue: ₹${totalRevenue}</h3>
//           </div>
//         </body>
//       </html>
//     `);
//     printWindow.document.close();
//     printWindow.print();
//   };

//   const handleSave = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     try {
//       if (activeTab === 'staff') {
//         await API.post(`/Staff`, staffForm);
//         // alert("Staff Added!");
//       } else {
//         let finalImageUrl = activeTab === 'menu' ? menuForm.imageName : branchForm.imageName;
//         if (selectedFile) {
//           const formData = new FormData();
//           formData.append("file", selectedFile);
//           formData.append("upload_preset", UPLOAD_PRESET);
//           const res = await API.post(CLOUDINARY_URL, formData);
//           finalImageUrl = res.data.secure_url;
//         }
//         const endpoint = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
//         const payload = activeTab === 'menu'
//           ? { ...menuForm, id: editingItem?.id || 0, price: parseFloat(menuForm.price), offerPrice: menuForm.offerPrice ? parseFloat(menuForm.offerPrice) : null, imageName: finalImageUrl }
//           : { ...branchForm, id: editingItem?.id || 0, latitude: parseFloat(branchForm.latitude) || 0, longitude: parseFloat(branchForm.longitude) || 0, imageName: finalImageUrl };

//         editingItem ? await API.put(`/${endpoint}/${editingItem.id}`, payload) : await API.post(`/${endpoint}`, payload);
//         // alert("Updated!");
//       }
//       closeModal(); fetchData();
//     } catch (err) { alert("Error saving data!"); }
//     setLoading(false);
//   };

//   const copyText = (text, id) => {
//     navigator.clipboard.writeText(text);
//     setCopiedId(id);
//     setTimeout(() => setCopiedId(null), 2000);
//   };

//   const handleBroadcast = async (id) => {
//     try {
//       await API.patch(`/Order/${id}/broadcast`);
//       // alert("Broadcasted to Delivery Partners!");
//       fetchOrdersOnly();
//     } catch (err) { alert("Broadcast Failed!"); }
//   };

//   const handleDeleteOrder = async (id) => {
//   if (window.confirm("Are you sure you want to REJECT and DELETE this order?")) {
//     try {
//       await API.delete(`/Order/${id}`);
//       // alert("Order Rejected and Removed!");
//       fetchOrdersOnly();
//     } catch (err) {
//       alert("Failed to reject order. Try again.");
//     }
//   }
// };

//   const closeModal = () => {
//     setShowModal(false); setEditingItem(null); setSelectedFile(null); setPreviewUrl(null);
//     setMenuForm({ name: '', category: '', price: '', offerPrice: '', isAvailable: true, imageName: '' });
//     setBranchForm({ name: '', phoneNumber: '', mapUrl: '', imageName: '', latitude: '', longitude: '' });
//     setStaffForm({ username: '', password: '', role: 'Delivery' });
//   };

//   return (
//     <div className="fixed inset-0 z-[600] bg-[#050505] text-white overflow-y-auto font-sans pb-20 text-left">
//       <header className="sticky top-0 bg-black/90 backdrop-blur-lg p-3 md:p-4 flex justify-between items-center border-b border-white/5 z-50">
//         <h1 className="text-[12px] md:text-lg font-black uppercase italic tracking-tighter leading-none">ADMIN <span className="text-red-600">PORTAL</span></h1>

//         <div className="flex items-center gap-2 md:gap-4">
//           {/* 🔥 REVIEW MANAGER ICON */}
//           <button onClick={() => setShowReviewModal(true)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 relative transition-all">
//             <MessageSquare size={18} />
//             {reviews.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-[8px] px-1.5 py-0.5 rounded-full font-black animate-bounce">{reviews.length}</span>}
//           </button>

//           <button onClick={handleShopToggle} className={`px-2 py-1 md:px-4 md:py-2 rounded-full text-[7px] md:text-[9px] font-black uppercase flex items-center gap-1.5 transition-all border ${isShopOpen ? 'bg-green-600/10 border-green-600 text-green-500' : 'bg-red-600/10 border-red-600 text-red-500'}`}>
//             {isShopOpen ? <Power size={10} /> : <PowerOff size={10} />} {isShopOpen ? 'Online' : 'Closed'}
//           </button>

//           <button onClick={exit} className="bg-red-600 px-3 py-1 md:px-5 md:py-2 rounded-full text-[7px] md:text-[9px] font-black italic shadow-lg active:scale-95 transition-all flex items-center"><ChevronLeft size={10} /> EXIT</button>
//         </div>
//       </header>

//       {/* 🔥 OPTIMIZED LAPTOP SIZE: max-w-5xl */}
//       <main className="p-4 max-w-5xl mx-auto md:px-6">
//         <div className="grid grid-cols-2 gap-3 mb-6 mt-4">
//           <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
//             <TrendingUp size={18} className="text-green-500" /><div className="text-left leading-none"><p className="text-[7px] font-black text-gray-500 uppercase">Today</p><h2 className="text-lg font-black italic text-white text-left">₹{getSales('daily')}</h2></div>
//           </div>
//           <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
//             <Calendar size={18} className="text-blue-500" /><div className="text-left leading-none"><p className="text-[7px] font-black text-gray-500 uppercase">Monthly</p><h2 className="text-lg font-black italic text-white text-left">₹{getSales('monthly')}</h2></div>
//           </div>
//         </div>

//         <div className="grid grid-cols-5 gap-1 mb-6">
//           {['orders', 'history', 'menu', 'branch', 'staff'].map(t => (
//             <button key={t} onClick={() => setActiveTab(t)} className={`py-4 rounded-xl flex flex-col items-center justify-center gap-1 font-black text-[7px] md:text-[9px] uppercase border transition-all ${activeTab === t ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-white/[0.03] border-white/5 text-gray-500 hover:bg-white/5'}`}>
//               {t === 'orders' && <ShoppingBag size={16} />}
//               {t === 'history' && <History size={16} />}
//               {t === 'menu' && <Coffee size={16} />}
//               {t === 'branch' && <MapPin size={16} />}
//               {t === 'staff' && <Users size={16} />}
//               {t === 'branch' ? 'OUTLETS' : t.toUpperCase()}
//             </button>
//           ))}
//         </div>

//         <div className="space-y-4">
//           {activeTab === 'history' && (
//             <div className="flex gap-2 mb-4 animate-in slide-in-from-top-2">
//               <input type="date" className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-black uppercase text-white outline-none" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
//               <button onClick={exportToPDF} className="bg-green-600 px-4 rounded-xl flex items-center gap-2 text-[8px] font-black uppercase italic shadow-lg active:scale-95"><Download size={14} /> PDF</button>
//             </div>
//           )}

//           {(activeTab === 'orders' || activeTab === 'history') && orders
//             .filter(o => (activeTab === 'orders' ? o.status !== 'Delivered' : (o.status === 'Delivered' && getLocalDateHelper(o.orderDate) === filterDate)))
//             .map(order => (
//               <div key={order.id} className="bg-white/[0.03] p-4 rounded-[1.8rem] border border-white/5 space-y-2 text-left animate-in fade-in">
//                 <div className="flex justify-between items-center text-left">
//                   <h4 className="text-white font-black uppercase italic text-[10px]">#{order.id} {order.customerName}</h4>
//                   <div className="flex items-center gap-1.5">
//                     {!order.isBroadcasted && order.status === 'Pending' && <span className="text-[6px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-600 animate-pulse">New Order</span>}
//                     <span className={`text-[6px] font-black uppercase px-2 py-0.5 rounded-full ${order.status === 'Delivered' ? 'bg-green-600' : 'bg-red-600'}`}>{order.status}</span>
//                   </div>
//                 </div>
//                 <p className="text-gray-500 text-[8px] font-bold uppercase text-left leading-none mb-1">📞 {order.phoneNumber} • {order.paymentMode}</p>
//                 <div className="flex flex-wrap gap-1 text-left">{order.items?.map((item, idx) => <span key={idx} className="bg-white/5 px-2 py-0.5 rounded-md text-[7px] text-gray-400 font-bold italic">{item.productName} x{item.quantity}</span>)}</div>

//                 <div className="grid grid-cols-2 gap-2 mt-2">
//                   <a href={order.googleMapsLink} target="_blank" className="bg-red-600/10 py-2.5 rounded-xl text-red-500 flex items-center justify-center gap-2 text-[8px] font-black uppercase border border-red-600/10 active:scale-95 transition-all outline-none"><Radar size={12} /> Map</a>
//                   {!order.isBroadcasted && order.status === 'Pending' && (
//                     <button onClick={() => handleBroadcast(order.id)} className="bg-blue-600 py-2.5 rounded-xl text-white flex items-center justify-center gap-2 text-[8px] font-black uppercase shadow-lg active:scale-95 transition-all outline-none animate-bounce">Broadcast Now</button>
//                   )}
//                   {order.isBroadcasted && (
//                     <div className="bg-white/5 py-2.5 rounded-xl text-gray-400 flex items-center justify-center gap-2 text-[8px] font-black uppercase border border-white/5">Broadcasted</div>
//                   )}
//                 </div>
//               </div>
//             ))}

//           {activeTab === 'staff' && staffs.map(staff => (
//             <div key={staff.id} className="bg-white/[0.02] p-3 rounded-2xl border border-white/5 flex items-center justify-between animate-in fade-in">
//               <div className="text-left flex items-center gap-3">
//                 <div className="w-8 h-8 bg-red-600/20 rounded-full flex items-center justify-center text-red-600"><Users size={14} /></div>
//                 <div><h3 className="font-black italic uppercase text-white text-[10px] text-left">{staff.username}</h3><p className="text-gray-500 font-bold text-[7px] uppercase text-left">{staff.role}</p></div>
//               </div>
//               <div className="flex gap-2">
//                 <button onClick={() => copyText(staff.username, staff.id)} className="p-2.5 bg-white/5 text-blue-500 rounded-lg">{copiedId === staff.id ? <Check size={12} /> : <Copy size={12} />}</button>
//                 {staff.role !== 'Admin' ? (
//                   <button onClick={async () => { if (window.confirm("Delete Staff?")) { await API.delete(`/Staff/${staff.id}`); fetchData(); } }} className="p-2.5 bg-white/5 text-red-500 rounded-lg hover:bg-red-600 active:text-white transition-all"><Trash2 size={12} /></button>
//                 ) : (
//                   <div className="p-2.5 bg-white/5 text-gray-600 rounded-lg"><ShieldAlert size={12} /></div>
//                 )}
//               </div>
//             </div>
//           ))}

//           {(activeTab === 'menu' || activeTab === 'branch') && (activeTab === 'menu' ? menuItems : branches).map(item => (
//             <div key={item.id} className="bg-white/[0.02] p-3 rounded-2xl border border-white/5 flex items-center justify-between group text-left">
//               <div className="flex items-center gap-3 text-left">
//                 <img src={getImageUrl(item.imageName)} className="w-10 h-10 rounded-lg object-cover border border-white/5" alt="p" />
//                 <div className="text-left">
//                   <h3 className="font-black italic uppercase text-white text-[10px] text-left">{item.name}</h3>
//                   <div className="flex items-center gap-2">
//                     {activeTab === 'menu' ? (
//                       <>
//                         <p className="text-red-600 font-bold text-[7px] uppercase tracking-tighter text-left">₹{item.offerPrice || item.price}</p>
//                         {item.offerPrice && <span className="text-gray-500 text-[6px] line-through italic">₹{item.price}</span>}
//                         {!item.isAvailable && <span className="bg-red-600 text-white text-[5px] px-1 rounded-sm uppercase font-black">Sold Out</span>}
//                       </>
//                     ) : (
//                       <p className="text-red-600 font-bold text-[7px] uppercase tracking-tighter text-left">{item.phoneNumber}</p>
//                     )}
//                   </div>
//                 </div>
//               </div>
//               <div className="flex gap-1.5">
//                 <button onClick={() => { setEditingItem(item); activeTab === 'menu' ? setMenuForm(item) : setBranchForm(item); setShowModal(true); }} className="p-2.5 bg-white/5 text-blue-500 rounded-lg hover:bg-blue-600 active:text-white transition-all"><Edit size={12} /></button>
//                 <button onClick={async () => { if (window.confirm("Delete?")) { await API.delete(`/${activeTab}/${item.id}`); fetchData(); } }} className="p-2.5 bg-white/5 text-red-500 rounded-lg hover:bg-red-600 active:text-white transition-all"><Trash2 size={12} /></button>
//               </div>
//             </div>
//           ))}
//         </div>
//       </main>

//       {/* 🔥 Floating Action Button */}
//       {['menu', 'branch', 'staff'].includes(activeTab) && (
//         <button onClick={() => { setShowModal(true); setEditingItem(null); }} className="fixed bottom-8 right-8 w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white/10 hover:scale-110 active:scale-90 transition-all z-50">
//           <Plus color="white" size={28} strokeWidth={3} />
//         </button>
//       )}

//       {/* 🔥 REVIEW MODAL WITH DELETE BUTTON */}
//       {showReviewModal && (
//         <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[2000] p-4 flex items-center justify-center">
//           <div className="bg-[#0f0f0f] w-full max-w-lg rounded-[2.5rem] border border-white/10 h-[70vh] flex flex-col shadow-2xl animate-in zoom-in duration-200 overflow-hidden">
//             <div className="p-5 bg-red-600 text-white flex justify-between items-center shadow-lg leading-none"><h2 className="text-xs font-black italic uppercase tracking-widest text-left">Review Manager</h2><button onClick={() => setShowReviewModal(false)} className="bg-black/20 p-2 rounded-full hover:bg-black/40 transition-colors"><X size={20} /></button></div>
//             <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar text-left">
//               {reviews.length === 0 ? <p className="text-center text-gray-600 text-[10px] mt-20 uppercase font-black italic">No reviews yet.</p> :
//                 reviews.map(r => (
//                   <div key={r.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 relative group animate-in fade-in">
//                     <button onClick={() => handleDeleteReview(r.id)} className="absolute top-4 right-4 text-red-500 p-2 bg-red-500/10 rounded-xl hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-lg"><Trash2 size={16} /></button>
//                     <div className="text-left">
//                       <h4 className="text-white font-black italic uppercase text-[10px] leading-none mb-1">{r.customerName}</h4>
//                       <div className="flex gap-0.5 mb-2">{[...Array(5)].map((_, i) => <Star key={i} size={8} className={i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-700"} />)}</div>
//                       <p className="text-gray-400 text-[10px] font-bold uppercase italic leading-tight">"{r.comment}"</p>
//                     </div>
//                   </div>
//                 ))}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Add/Edit Modal */}
//       {showModal && (
//         <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[1000] p-4 flex items-center justify-center overflow-y-auto">
//           <div className="bg-[#0f0f0f] w-full max-w-sm rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in duration-200">
//             <div className="p-4 bg-red-600 text-white flex justify-between items-center shadow-lg leading-none"><h2 className="text-sm font-black italic uppercase tracking-widest text-left">Add {activeTab}</h2><button onClick={closeModal} className="bg-black/20 p-1.5 rounded-full active:scale-90"><X size={16} /></button></div>
//             <form onSubmit={handleSave} className="p-6 space-y-4 text-left">
//               {activeTab !== 'staff' && (
//                 <div className="h-32 bg-white/5 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden relative" onClick={() => document.getElementById('imageInput').click()}>
//                   {previewUrl || (activeTab === 'menu' ? menuForm.imageName : branchForm.imageName) ? <img src={previewUrl || getImageUrl(activeTab === 'menu' ? menuForm.imageName : branchForm.imageName)} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="preview" /> : <div className="text-center opacity-40"><ImageIcon size={24} className="mx-auto mb-1" /><p className="text-[8px] font-black uppercase text-center">Upload Photo</p></div>}
//                   <input id="imageInput" type="file" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files[0]; if (f) { setSelectedFile(f); setPreviewUrl(URL.createObjectURL(f)); } }} />
//                 </div>
//               )}
//               <div className="space-y-2 text-left">
//                 {activeTab === 'staff' && (
//                   <><input required placeholder="USERNAME" className="w-full bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 font-black uppercase text-[9px] text-white" value={staffForm.username} onChange={e => setStaffForm({ ...staffForm, username: e.target.value })} /><input required type="password" placeholder="PASSWORD" className="w-full bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 font-black text-[9px] text-white" value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })} /><select className="w-full bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 font-black uppercase text-[9px] text-white" value={staffForm.role} onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}><option value="Delivery">Delivery Partner</option><option value="Admin">Admin</option></select></>
//                 )}
//                 {activeTab === 'menu' && (
//                   <><input required placeholder="NAME" className="w-full bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 font-black uppercase text-[9px] text-white" value={menuForm.name} onChange={e => setMenuForm({ ...menuForm, name: e.target.value })} /><input required placeholder="CATEGORY" className="w-full bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 font-black uppercase text-[9px] text-white" value={menuForm.category} onChange={e => setMenuForm({ ...menuForm, category: e.target.value })} /><div className="grid grid-cols-2 gap-2 text-left"><input required type="number" placeholder="MRP" className="bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 font-black text-[9px] text-white" value={menuForm.price} onChange={e => setMenuForm({ ...menuForm, price: e.target.value })} /><input type="number" placeholder="OFFER" className="bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 font-black text-[9px] text-green-400" value={menuForm.offerPrice || ''} onChange={e => setMenuForm({ ...menuForm, offerPrice: e.target.value })} />
//                   </div><div className="flex items-center gap-2 mt-2 bg-white/5 p-2 rounded-lg"><input type="checkbox" id="avail" checked={menuForm.isAvailable} onChange={e => setMenuForm({ ...menuForm, isAvailable: e.target.checked })} className="w-4 h-4 accent-red-600" /><label htmlFor="avail" className="text-[10px] font-black uppercase cursor-pointer">Available (Show in Menu)</label></div></>
//                 )}
//                 {activeTab === 'branch' && (
//                   <><input required placeholder="BRANCH NAME" className="w-full bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 font-black uppercase text-[9px] text-white" value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} /><input required placeholder="PHONE" className="w-full bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 font-black text-[9px] text-white" value={branchForm.phoneNumber} onChange={e => setBranchForm({ ...branchForm, phoneNumber: e.target.value })} /><input required placeholder="MAP URL" className="w-full bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 font-black text-[8px] text-blue-400" value={branchForm.mapUrl} onChange={e => setBranchForm({ ...branchForm, mapUrl: e.target.value })} /><div className="grid grid-cols-2 gap-2 text-left"><input required placeholder="LAT" type="number" step="any" className="bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 text-[9px] text-white" value={branchForm.latitude} onChange={e => setBranchForm({ ...branchForm, latitude: e.target.value })} /><input required placeholder="LONG" type="number" step="any" className="bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 text-[9px] text-white" value={branchForm.longitude} onChange={e => setBranchForm({ ...branchForm, longitude: e.target.value })} /></div></>
//                 )}
//               </div>
//               <button disabled={loading} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-[9px] hover:bg-red-600 hover:text-white transition-all shadow-xl active:scale-95 shadow-white/5">{loading ? 'SAVING...' : 'SAVE CHANGES'}</button>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default AdminPanel;