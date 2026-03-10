import React, { useState, useEffect } from 'react';
import { Coffee, Menu, X } from 'lucide-react';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', id: 'home' },
    { name: 'Menu', id: 'menu' },
    { name: 'Branches', id: 'branch' },
  ];

  const scrollToId = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4 ${
      isScrolled ? 'bg-white shadow-md text-gray-800' : 'bg-transparent text-white'
    }`}>
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => scrollToId('home')}>
          <div className={`p-2 rounded-lg ${isScrolled ? 'bg-red-600 text-white' : 'bg-white text-red-600'}`}>
            <Coffee size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">KUMARAN COFFEE</span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex space-x-8 font-medium">
          {navLinks.map((link) => (
            <button key={link.name} onClick={() => scrollToId(link.id)} className="hover:text-red-500 transition-colors">
              {link.name}
            </button>
          ))}
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white text-gray-800 shadow-xl border-t">
          {navLinks.map((link) => (
            <button key={link.name} onClick={() => scrollToId(link.id)} className="block w-full text-left px-6 py-4 hover:bg-gray-100 border-b">
              {link.name}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;