import React, { useState, useEffect } from 'react';
import { Phone, ExternalLink } from 'lucide-react';
import API, { getImageUrl } from '../api';

const BranchSection = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // API fetch logic from your local server
    API.get('/branch')
      .then(res => {
        setBranches(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Branch fetch error", err);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-2 md:px-4 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
      {branches.map((branch) => (
        <div key={branch.id} className="bg-white/5 border border-white/10 rounded-[1.2rem] md:rounded-[2rem] overflow-hidden group hover:border-red-600/50 transition-all duration-500 shadow-2xl backdrop-blur-sm flex flex-col h-full">
          <div className="h-28 md:h-48 relative overflow-hidden shrink-0">
            <img
              src={getImageUrl(branch.imageName) || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80'}
              alt={branch.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60"></div>
            <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-0.5 rounded-full font-black uppercase italic text-[6px] md:text-[8px] tracking-widest shadow-lg">Active</div>
          </div>

          <div className="p-3 md:p-5 text-left flex flex-col flex-1">
            <h3 className="text-xs md:text-lg font-black uppercase text-white mb-0.5 md:mb-1 italic tracking-tighter truncate">{branch.name}</h3>
            <p className="text-gray-400 text-[7px] md:text-xs font-bold uppercase tracking-widest mb-2 md:mb-4 flex items-center gap-1 md:gap-1.5 truncate">
              <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-green-500 rounded-full animate-pulse"></span> {branch.location}
            </p>

            <div className="flex flex-col gap-1.5 md:gap-2 mt-auto">
              <a
                href={`tel:${branch.phoneNumber}`}
                className="flex items-center justify-between bg-white/5 p-1.5 md:p-3 rounded-lg md:rounded-xl hover:bg-white/10 transition-all border border-white/5 group/btn active:scale-95"
              >
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="bg-green-600/20 p-1 md:p-1.5 rounded-lg text-green-500"><Phone size={12} className="md:w-4 md:h-4" /></div>
                  <span className="text-white font-black italic uppercase text-[7px] md:text-[10px]">Call</span>
                </div>
                <span className="text-gray-500 font-mono text-[7px] md:text-[9px] hidden sm:block">{branch.phoneNumber}</span>
              </a>

              <a
                href={`https://www.google.com/maps?q=${branch.latitude},${branch.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 md:gap-2 bg-red-600 py-2.5 md:py-4 rounded-xl md:rounded-2xl text-white font-black uppercase italic text-[8px] md:text-xs shadow-xl shadow-red-900/20 active:scale-95 transition-all"
              >
                <ExternalLink size={14} className="md:w-[18px] md:h-[18px]" /> Maps
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BranchSection;