import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API from '../api';
import Swal from 'sweetalert2';
import {
  X, MapPin, Send, Loader2, Minus, Plus,
  Banknote, Smartphone, AlertCircle, CheckCircle2, QrCode, Camera, Copy, Check, Navigation
} from 'lucide-react';

const CartModal = ({ cart, close, updateQuantity, clearCart }) => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState(null);
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [finalAmount, setFinalAmount] = useState(0);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const [userLocation, setUserLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [distanceError, setDistanceError] = useState('');

  const [order, setOrder] = useState({ customerName: '', phoneNumber: '', deliveryAddress: '', googleMapsLink: '' });
  const [paymentMode, setPaymentMode] = useState('COD');
  const DELIVERY_CHARGE = 40;
  const MINIMUM_ORDER_VALUE = 60;

  useEffect(() => {
    API.get('/branch')
      .then(res => setBranches(res.data))
      .catch(err => console.error("Branch fetch failed", err));
  }, []);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const captureLocation = () => {
    if (!selectedBranch) return Swal.fire({
      title: 'Branch Required',
      text: "Select branch first!",
      icon: 'info',
      confirmButtonColor: '#e11d48'
    });
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({ latitude, longitude });
          const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
          setOrder(prev => ({ ...prev, googleMapsLink: mapUrl }));
          const bLat = parseFloat(selectedBranch.latitude);
          const bLon = parseFloat(selectedBranch.longitude);
          const calculatedDist = calculateDistance(latitude, longitude, bLat, bLon);
          setDistance(calculatedDist.toFixed(2));
          if (calculatedDist > 4) setDistanceError(`Out of Range: ${calculatedDist.toFixed(1)}km away.`);
          else setDistanceError('');
          setLoading(false);
        },
        (err) => {
          setLoading(false);
          Swal.fire({
            title: 'GPS Error',
            text: "GPS Permission Denied or Timeout.",
            icon: 'error',
            confirmButtonColor: '#e11d48'
          });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const copyUPI = () => {
    navigator.clipboard.writeText('krishgopal845-3@oksbi');
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const copyPhone = () => {
    navigator.clipboard.writeText('9952525962');
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const currentItemTotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
  const currentGrandTotal = currentItemTotal + DELIVERY_CHARGE;

  const handleCheckout = async (e) => {
    e.preventDefault();

    // 🔥 RULE: Minimum order value check
    if (currentItemTotal < MINIMUM_ORDER_VALUE) {
      return Swal.fire({
        title: 'Minimum Order',
        text: `Minimum order must be ₹${MINIMUM_ORDER_VALUE}. Please add more items!`,
        icon: 'warning',
        confirmButtonColor: '#e11d48'
      });
    }

    if (!selectedBranch || !distance || distance > 4) return Swal.fire({
      title: 'Eligibility Check',
      text: "Please verify delivery distance eligibility.",
      icon: 'warning',
      confirmButtonColor: '#e11d48'
    });

    setLoading(true);
    const capturedTotal = currentGrandTotal;
    setFinalAmount(capturedTotal);

    try {
      // Broadcast Logic: Backend sets 'isBroadcasted: true'
      const payload = { ...order, branchId: selectedBranch.id, items: cart, paymentMode, deliveryCharge: DELIVERY_CHARGE };
      const res = await API.post(`/order/checkout`, payload);
      const { whatsappUrl, orderId } = res.data;

      setWhatsappUrl(whatsappUrl);
      localStorage.setItem('lastOrderId', orderId.toString());
      setPlacedOrderId(orderId);
      clearCart();
    } catch (err) {
      console.error("Checkout detail error:", err.response?.data || err.message);
      Swal.fire({
        title: 'Checkout Failed',
        text: err.response?.data?.message || err.message,
        icon: 'error',
        confirmButtonColor: '#e11d48'
      });
    }
    setLoading(false);
  };

  const handleBroadcast = async () => {
    if (!placedOrderId) return;
    try {
      // 🔥 Trigger broadcast API
      await API.patch(`/order/${placedOrderId}/broadcast`);
    } catch (err) {
      console.error("Broadcast failed:", err);
    }

    const finalUrl = paymentMode === 'UPI'
      ? `${whatsappUrl}%0A%0A*Note:* Pls share your payment screenshot below.`
      : whatsappUrl;
    window.open(finalUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex justify-end">
      <div className="bg-white w-full max-w-md h-full p-6 overflow-y-auto animate-in slide-in-from-right duration-300 shadow-2xl">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-xl font-black italic uppercase tracking-tighter">{placedOrderId ? 'Order Success' : 'Checkout'}</h2>
          <button onClick={close} className="p-2 bg-gray-100 rounded-full active:scale-90 border-none outline-none"><X size={20} /></button>
        </div>

        {placedOrderId ? (
          <div className="flex flex-col items-center text-center space-y-6 animate-in zoom-in duration-300">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center text-green-600 animate-bounce"><CheckCircle2 size={32} /></div>

            <div className="space-y-1">
              <h3 className="text-xl font-black uppercase italic leading-none text-center">Order #KCC-{placedOrderId} Placed!</h3>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1 text-center">
                {paymentMode === 'UPI' ? 'Please complete your payment below' : 'Confirmed as COD'}
              </p>
            </div>

            {paymentMode === 'UPI' && (
              <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 p-6 rounded-[2rem] space-y-4">
                <img src="/payment-qr.png" alt="QR" className="w-40 h-40 mx-auto rounded-xl shadow-lg border-4 border-white" />
                <p className="text-3xl font-black italic text-red-600 font-mono text-center">₹{finalAmount}</p>
                <div className="flex flex-col gap-2">
                  <button onClick={copyUPI} className="flex items-center justify-between bg-white border border-slate-200 p-2.5 rounded-xl text-[10px] font-bold active:scale-95 transition-all outline-none">
                    <span>UPI ID: krishgopal845-3@oksbi</span>
                    {copiedId ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-gray-400" />}
                  </button>
                  <button onClick={copyPhone} className="flex items-center justify-between bg-white border border-slate-200 p-2.5 rounded-xl text-[10px] font-bold active:scale-95 transition-all outline-none">
                    <span>PHONE: 99525 25962</span>
                    {copiedPhone ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-gray-400" />}
                  </button>
                  <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 flex items-center gap-2 text-left">
                    <Camera size={18} className="text-yellow-600 shrink-0" />
                    <p className="text-[8px] font-black text-yellow-800 uppercase leading-tight">Please take payment screenshot and send to whatsapp !</p>
                  </div>
                </div>
              </div>
            )}

            <div className="w-full flex flex-col gap-2">
              <button onClick={handleBroadcast} className="w-full py-4 bg-green-500 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-lg animate-pulse active:scale-95 transition-all border-none outline-none">
                <Send size={18} /> SEND TO WHATSAPP
              </button>
              <button onClick={() => { close(); navigate(`/track/${placedOrderId}`); }} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 active:scale-95 transition-all border-none outline-none">
                <Navigation size={18} /> TRACK MY ORDER
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCheckout} className="space-y-4">
            <div className="space-y-3 mb-6 max-h-40 overflow-y-auto pr-2 custom-scrollbar text-left">
              {cart.map(item => (
                <div key={item.productId} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex flex-col text-left leading-none"><span className="font-bold text-gray-800 text-[11px] uppercase italic mb-1">{item.productName}</span><span className="text-red-600 font-bold text-xs">₹{item.price * item.quantity}</span></div>
                  <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border shadow-sm">
                    <button type="button" onClick={() => updateQuantity(item.productId, -1)} className="p-1 border-none outline-none bg-transparent"><Minus size={12} /></button>
                    <span className="font-black text-xs px-1">{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.productId, 1)} className="p-1 border-none outline-none bg-transparent"><Plus size={12} /></button>
                  </div>
                </div>
              ))}
            </div>

            {/* 🔥 Minimum order alert */}
            {currentItemTotal < MINIMUM_ORDER_VALUE && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 animate-pulse">
                <AlertCircle size={16} />
                <span className="text-[10px] font-black uppercase tracking-tight">Min Order ₹{MINIMUM_ORDER_VALUE} (Need ₹{MINIMUM_ORDER_VALUE - currentItemTotal} more)</span>
              </div>
            )}

            <select required className="w-full p-4 bg-gray-50 rounded-xl outline-none font-bold text-xs border-none shadow-inner"
              onChange={(e) => { setSelectedBranch(branches.find(b => b.id === parseInt(e.target.value))); setDistance(null); }}
              value={selectedBranch?.id || ''}
            >
              <option value="">-- Choose Branch --</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>

            <button type="button" onClick={captureLocation} className={`w-full py-4 rounded-xl font-black text-[10px] uppercase border transition-all flex items-center justify-center gap-2 border-none outline-none ${distance ? 'bg-green-50 border-green-200 text-green-700 shadow-inner' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
              <MapPin size={16} /> {distance ? `Verified: ${distance} km` : 'Verify Delivery Eligibility'}
            </button>
            {distanceError && <div className="text-[10px] text-red-600 font-black p-2 bg-red-50 rounded-lg border border-red-100 text-center">{distanceError}</div>}

            <input required placeholder="YOUR NAME" className="w-full p-4 bg-gray-50 rounded-xl text-xs font-bold uppercase outline-none border-none shadow-inner" value={order.customerName} onChange={e => setOrder({ ...order, customerName: e.target.value })} />
            <input required placeholder="PHONE NUMBER" className="w-full p-4 bg-gray-50 rounded-xl text-xs font-bold outline-none border-none shadow-inner" value={order.phoneNumber} onChange={e => setOrder({ ...order, phoneNumber: e.target.value })} />
            <textarea required placeholder="DELIVERY ADDRESS" className="w-full p-4 bg-gray-50 rounded-xl text-xs font-bold outline-none border-none shadow-inner resize-none" rows="2" value={order.deliveryAddress} onChange={e => setOrder({ ...order, deliveryAddress: e.target.value })} />

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setPaymentMode('COD')} className={`p-4 rounded-xl border-2 flex flex-col items-center transition-all outline-none ${paymentMode === 'COD' ? 'border-red-600 bg-red-50 text-red-600 shadow-inner' : 'border-gray-100 text-gray-400'}`}><Banknote size={20} /><span className="text-[10px] font-black mt-1 uppercase">COD</span></button>
              <button type="button" onClick={() => setPaymentMode('UPI')} className={`p-4 rounded-xl border-2 flex flex-col items-center transition-all outline-none ${paymentMode === 'UPI' ? 'border-red-600 bg-red-50 text-red-600 shadow-inner' : 'border-gray-100 text-gray-400'}`}><Smartphone size={20} /><span className="text-[10px] font-black mt-1 uppercase">UPI Pay</span></button>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-blue-100 mb-2">
              <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <span>Item Total</span>
                <span>₹{currentItemTotal}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <span>Delivery Charge</span>
                <span>₹{DELIVERY_CHARGE}</span>
              </div>
              <div className="flex justify-between text-sm font-black italic uppercase tracking-tighter border-t pt-2 text-gray-900">
                <span>Grand Total</span>
                <span>₹{currentGrandTotal}</span>
              </div>
            </div>

            <button type="submit" disabled={loading || !!distanceError || !distance || currentItemTotal < MINIMUM_ORDER_VALUE} className="w-full py-5 bg-gray-950 text-white rounded-2xl font-black text-xs uppercase shadow-xl flex items-center justify-center transition-all active:scale-95 disabled:bg-gray-300 border-none outline-none">
              {loading ? <Loader2 className="animate-spin" /> : <><Send size={16} className="mr-2" /> CONFIRM & PAY ₹{currentGrandTotal}</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CartModal;

