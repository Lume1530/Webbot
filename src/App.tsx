import React, { useState, useEffect, useRef } from 'react';
import { LoginForm, AdminDashboard, StaffDashboard, UserDashboard } from './components';
import { authService } from './services/authService';
import { LogOut, Instagram, Send, Megaphone, Users, User, Briefcase, Youtube, X as XIcon, Bitcoin, IndianRupee, Mail, Menu as MenuIcon, X as CloseIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from 'react-datepicker'; 
import 'react-datepicker/dist/react-datepicker.css';
import moment from 'moment-timezone'; 
import { notificationService } from './services/notificationService';
import { toast } from 'sonner';

// Helper for smooth scroll
function scrollToRef(ref: React.RefObject<HTMLElement>) {
  if (ref && ref.current) {
    ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

interface HomePageProps {
  loginFormProps: any;
  onShowLogin: () => void;
}

function HomePage({ loginFormProps, onShowLogin }: HomePageProps) {
  const [showPartner, setShowPartner] = useState(false);
  const [partnerForm, setPartnerForm] = useState({ name: '', email: '', contact: '', message: '' });
  const [appointmentForm, setAppointmentForm] = useState({
    name: '',
    email: '',
    contact: '',
    message: '',
    date: null,
    time: null, 
    timezone: moment.tz.guess(), 
  });
  const [activeTab, setActiveTab] = useState('email');

  const [sending, setSending] = useState(false);
  const statsRef = useRef(null);
  const aboutRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const timezones = moment.tz.names();


  const handleAppointmentChange = (e:React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAppointmentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date:any) => {
    setAppointmentForm((prev) => ({ ...prev, date }));
  };

  const handleTimeChange = (time:any) => {
    setAppointmentForm((prev) => ({ ...prev, time }));
  };

  const handleTimezoneChange = (e:any) => {
    setAppointmentForm((prev) => ({ ...prev, timezone: e.target.value }));
  };


  const handlePartnerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setPartnerForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

 const handlePartnerSubmit = async (e: React.FormEvent, data: any) => {
  e.preventDefault();
  setSending(true);
  try {
    try{
    if (activeTab === 'appointment') {
      if(typeof (data.date as Date)!='string') {
      data['date'] = (data.date as Date)?.toISOString()?.split('T')[0] || ''
      }
    if(typeof (data.time as Date)!='string') {
      data['time'] = (data.time as Date)?.toTimeString()?.split(' ')[0] || ''
      }
    }
  }catch(e){

  }

    const res = await notificationService.sendSupportMail(data);
    if (res.success) {
      setShowPartner(false);
      if (activeTab === 'email') {
        toast.success('Partner request sent successfully!. We will get back to you soon!'); // Corrected toast message
      } else { // activeTab === 'appointment'
        toast.success('Appointment request sent successfully!. We will get back to you soon!');
      }

      setPartnerForm({ name: '', email: '', contact: '', message: '' });
      setAppointmentForm({ name: '', email: '', contact: '', message: '', date: null, time: null, timezone: moment.tz.guess() });
    } else {
      toast.error('Failed to send. Please try again.');
    }
  } catch (err) {
    console.error("Submission error:", err); // Log the actual error
    toast.error('Failed to send. Please try again.');
  } finally {
    setSending(false);
  }
};

  // Menu actions
  const handleMenu = (section: string) => {
    setMenuOpen(false);
    if (section === 'stats') scrollToRef(statsRef);
    if (section === 'about') scrollToRef(aboutRef);
    if (section === 'dashboard') onShowLogin();
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col relative overflow-hidden">
      {/* Animated Background Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Primary gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Floating particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </div>

      {/* Top Right Menu */}
      <nav className="fixed top-6 right-6 z-30">
        {/* Desktop menu */}
        <div className="hidden md:flex items-center gap-6">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleMenu('stats')} 
            className="text-white text-base md:text-lg font-semibold hover:text-pink-400 transition-colors duration-300"
          >
            Stats
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleMenu('about')} 
            className="text-white text-base md:text-lg font-semibold hover:text-pink-400 transition-colors duration-300"
          >
            About Us
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleMenu('dashboard')} 
            className="text-white text-base md:text-lg font-semibold hover:text-pink-400 transition-colors duration-300"
          >
            User Dashboard
          </motion.button>
        </div>
        {/* Mobile menu icon */}
        <div className="md:hidden flex items-center">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setMenuOpen(!menuOpen)} 
            className="text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-pink-400"
          >
            {menuOpen ? <CloseIcon className="w-7 h-7" /> : <MenuIcon className="w-7 h-7" />}
          </motion.button>
        </div>
        {/* Mobile menu dropdown */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-3 w-48 bg-[#171718]/95 backdrop-blur-sm rounded-xl shadow-xl py-4 flex flex-col gap-2 border border-[#232325]"
            >
              <button onClick={() => handleMenu('stats')} className="text-white text-base font-semibold hover:text-pink-400 transition px-6 py-2 text-left">Stats</button>
              <button onClick={() => handleMenu('about')} className="text-white text-base font-semibold hover:text-pink-400 transition px-6 py-2 text-left">About Us</button>
              <button onClick={() => handleMenu('dashboard')} className="text-white text-base font-semibold hover:text-pink-400 transition px-6 py-2 text-left">User Dashboard</button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Logo at top left - bigger and more prominent with glow */}
      <motion.img 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        src="/Dls_grouplogo.webp" 
        alt="DLS Group Logo" 
        className="h-16 md:h-28 w-auto absolute top-4 md:top-8 left-4 md:left-8 z-10 drop-shadow-2xl"
        style={{
          maxHeight: '110px',
          filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.3))'
        }}
        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
          // Fallback to original PNG if WebP fails
          e.currentTarget.src = '/Dls_grouplogo.png';
        }}
      />

      {/* Hero Section - centered container with enhanced animation */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full flex justify-center relative z-10"
      >
        <div className="w-full max-w-6xl flex flex-col md:flex-row items-center justify-between py-10 px-4 md:px-12 gap-8 md:gap-0">
          {/* Left: Tagline and Buttons */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex-1 flex flex-col items-center md:items-start text-center md:text-left mt-20 md:mt-0"
          >
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-4xl md:text-5xl font-extrabold mb-4 text-white tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #fff 0%, #f3e8ff 50%, #e9d5ff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 30px rgba(168, 85, 247, 0.5))'
              }}
            >
              CREATE. CLIP.<br className="md:hidden"/> CASH OUT.
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="text-lg md:text-2xl mb-8 max-w-xl font-medium text-gray-300"
            >
              Create videos from content and earn money
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.0 }}
              className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start mb-4"
            >
              <motion.button 
                whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(168, 85, 247, 0.3)" }}
                whileTap={{ scale: 0.95 }}
                onClick={onShowLogin} 
                className="bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:from-purple-700 hover:to-pink-600 transition-all text-lg relative overflow-hidden group"
                style={{
                  boxShadow: '0 10px 30px rgba(168, 85, 247, 0.3)',
                }}
              >
                <span className="relative z-10">Join Now</span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(245, 158, 11, 0.3)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowPartner(true)} 
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:from-yellow-500 hover:to-orange-600 transition-all text-lg relative overflow-hidden group"
                style={{
                  boxShadow: '0 10px 30px rgba(245, 158, 11, 0.3)',
                }}
              >
                <span className="relative z-10">Partner With Us</span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-orange-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </motion.button>
            </motion.div>
          </motion.div>
          {/* Right: Hero Image */}
          <motion.div 
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="flex-1 flex justify-center items-center w-full"
          >
            <motion.img 
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
              src="/dls_website_hero.webp" 
              alt="Creators" 
              className="rounded-2xl shadow-2xl w-full max-w-2xl h-72 md:h-[520px] object-contain object-center" 
              style={{
                maxHeight: '520px',
                filter: 'drop-shadow(0 20px 40px rgba(168, 85, 247, 0.2))'
              }}
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                // Fallback to original PNG if WebP fails
                e.currentTarget.src = '/dls_website_hero.png';
              }}
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Client Logos Row - 6 real logos, spaced inside container, no background */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.2, ease: 'easeOut' }}
        className="w-full flex justify-center bg-[#09090B]/50 backdrop-blur-sm border-y border-[#1a1a1a] mb-8 overflow-hidden relative z-10"
      >
        <div className="w-full max-w-6xl px-2 sm:px-4 relative overflow-hidden">
          <div className="flex gap-6 sm:gap-10 py-2 whitespace-nowrap animate-marquee" style={{animation: 'marquee 18s linear infinite'}}>
            {[
              '/Client_logo/client logo 1.png',
              '/Client_logo/client logo 2.png',
              '/Client_logo/client logo 3.png',
              '/Client_logo/client logo 4.png',
              '/Client_logo/client logo 5.png',
              '/Client_logo/client logo 6.png',
              '/Client_logo/client logo 1.png',
              '/Client_logo/client logo 2.png',
              '/Client_logo/client logo 3.png',
              '/Client_logo/client logo 4.png',
              '/Client_logo/client logo 5.png',
              '/Client_logo/client logo 6.png',
            ].map((src, i) => {
              // Convert to compressed WebP path
              const webpSrc = src.replace('.png', '.webp');
              return (
                <motion.img
                  key={src + i}
                  whileHover={{ scale: 1.1, filter: 'brightness(1.2)' }}
                  transition={{ duration: 0.2 }}
                  src={webpSrc}
                  alt={`Client Logo ${i%6+1}`}
                  className="h-16 w-28 sm:h-28 sm:w-44 object-contain mx-2 sm:mx-4 transition-all duration-300"
                  style={{ background: 'none' }}
                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                    // Fallback to original PNG if WebP fails
                    e.currentTarget.src = src;
                  }}
                />
              );
            })}
          </div>
          <style>{`
            @keyframes marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .animate-marquee::-webkit-scrollbar { display: none; }
            .animate-marquee { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>
        </div>
      </motion.div>

      {/* Stats Section */}
      <motion.div
        ref={statsRef}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.4, ease: 'easeOut' }}
        className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-4 gap-6 pb-16 px-4 relative z-10"
      >
        {[
          { value: '$127.2K+', label: 'Paid to creators', color: 'from-purple-600/20 to-pink-600/20' },
          { value: '1,000+', label: 'Active clippers', color: 'from-blue-600/20 to-cyan-600/20' },
          { value: '2B+', label: 'Monthly Views', color: 'from-green-600/20 to-emerald-600/20' },
          { value: '50+', label: 'Campaigns', color: 'from-yellow-600/20 to-orange-600/20' }
        ].map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 1.6 + index * 0.1 }}
            whileHover={{ 
              scale: 1.05, 
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
              y: -5
            }}
            className={`bg-[#181014]/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 flex flex-col items-center gap-2 border border-[#2a1a1a] relative overflow-hidden group`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
            <span className="text-4xl font-extrabold text-white mb-1 relative z-10 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all duration-300">
              {stat.value}
            </span>
            <span className="text-gray-300 text-lg relative z-10">{stat.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Section Heading and Description */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 2.0, ease: 'easeOut' }}
        className="w-full flex flex-col items-center justify-center text-center mb-10 px-4 relative z-10"
      >
        <motion.h2 
          whileInView={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          className="text-3xl md:text-4xl font-extrabold text-white mb-4"
          style={{
            background: 'linear-gradient(135deg, #fff 0%, #f3e8ff 50%, #e9d5ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Everything You Need to Succeed in the Digital World
        </motion.h2>
        <motion.p 
          whileInView={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-base md:text-lg text-gray-300 max-w-2xl"
        >
          At DLS Group, our mission is to help brands of every size go viral. Our platform equips you with powerful tools to launch impactful content campaigns that connect, engage, and drive real, measurable results.
        </motion.p>
      </motion.div>

      {/* Tabs for Creators and Brands with image on left */}
      <motion.div
        ref={aboutRef}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 2.2, ease: 'easeOut' }}
        className="w-full flex justify-center pb-16 relative z-10"
      >
        <div className="w-full max-w-[1400px] px-4 flex flex-col md:flex-row items-center gap-10">
          {/* Left: Image */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-[1.1] flex justify-center items-center w-full mb-4 md:mb-0" 
            style={{ minWidth: '0' }}
          >
            <motion.div 
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-[340px] h-40 sm:max-w-[400px] sm:h-56 md:max-w-[600px] md:h-[600px] lg:max-w-[700px] lg:h-[700px] flex items-center justify-center"
            >
              <img 
                src="/website_image.webp" 
                alt="Creators and Brands" 
                className="w-full h-full object-contain rounded-2xl shadow-2xl" 
                style={{
                  filter: 'drop-shadow(0 20px 40px rgba(168, 85, 247, 0.2))'
                }}
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                  // Fallback to original PNG if WebP fails
                  e.currentTarget.src = '/website_image.png';
                }}
              />
            </motion.div>
          </motion.div>
          {/* Right: Tabs */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex-[1.1] w-full max-w-[540px]"
          >
            <Tabs />
          </motion.div>
        </div>
      </motion.div>

      {/* Supported Platforms & Payment Methods Section */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 2.4, ease: 'easeOut' }}
        className="w-full flex flex-col items-center pb-16 relative z-10"
      >
        <motion.h2 
          whileInView={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          className="text-3xl font-semibold text-white mb-10"
        >
          We've got you covered
        </motion.h2>
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl justify-center">
          {/* Supported Platforms */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ duration: 0.3 }}
            className="flex-1 bg-[#181014]/80 backdrop-blur-sm rounded-2xl border border-[#2a1a1a] p-8 flex flex-col items-center shadow-xl relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="text-xl font-bold text-white mb-4 relative z-10">Supported Platforms:</span>
            <div className="flex gap-8 text-4xl text-white mt-2 relative z-10">
              {/* TikTok SVG */}
              <motion.svg 
                whileHover={{ scale: 1.2, rotate: 5 }}
                transition={{ duration: 0.2 }}
                width="32" height="32" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg"
              >
                <g>
                  <path d="M204.8 77.6c-22.4 0-40.8-18.4-40.8-40.8V24h-36.8v144.8c0 13.6-11.2 24.8-24.8 24.8s-24.8-11.2-24.8-24.8 11.2-24.8 24.8-24.8c2.4 0 4.8 0.4 7.2 1.2V129.6c-2.4-0.4-4.8-0.4-7.2-0.4-34.4 0-62.4 28-62.4 62.4s28 62.4 62.4 62.4 62.4-28 62.4-62.4V104c12.8 8.8 28 14.4 44.8 14.4v-40.8z" fill="#fff"/>
                  <path d="M204.8 77.6c-22.4 0-40.8-18.4-40.8-40.8V24h-36.8v144.8c0 13.6-11.2 24.8-24.8 24.8s-24.8-11.2-24.8-24.8 11.2-24.8 24.8-24.8c2.4 0 4.8 0.4 7.2 1.2V129.6c-2.4-0.4-4.8-0.4-7.2-0.4-34.4 0-62.4 28-62.4 62.4s28 62.4 62.4 62.4 62.4-28 62.4-62.4V104c12.8 8.8 28 14.4 44.8 14.4v-40.8z" fill="#fff"/>
                  <path d="M204.8 77.6c-22.4 0-40.8-18.4-40.8-40.8V24h-36.8v144.8c0 13.6-11.2 24.8-24.8 24.8s-24.8-11.2-24.8-24.8 11.2-24.8 24.8-24.8c2.4 0 4.8 0.4 7.2 1.2V129.6c-2.4-0.4-4.8-0.4-7.2-0.4-34.4 0-62.4 28-62.4 62.4s28 62.4 62.4 62.4 62.4-28 62.4-62.4V104c12.8 8.8 28 14.4 44.8 14.4v-40.8z" fill="#fff"/>
                </g>
              </motion.svg>
              <motion.div whileHover={{ scale: 1.2, rotate: 5 }} transition={{ duration: 0.2 }}>
                <Instagram className="w-8 h-8" />
              </motion.div>
              <motion.div whileHover={{ scale: 1.2, rotate: 5 }} transition={{ duration: 0.2 }}>
                <Youtube className="w-8 h-8" />
              </motion.div>
              <motion.div whileHover={{ scale: 1.2, rotate: 5 }} transition={{ duration: 0.2 }}>
                <XIcon className="w-8 h-8" />
              </motion.div>
            </div>
          </motion.div>
          {/* Payment Methods */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ duration: 0.3 }}
            className="flex-1 bg-[#181014]/80 backdrop-blur-sm rounded-2xl border border-[#2a1a1a] p-8 flex flex-col items-center shadow-xl relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-cyan-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="text-xl font-bold text-white mb-4 relative z-10">Payment Methods:</span>
            <div className="flex gap-8 text-4xl text-white mt-2 relative z-10">
              {/* PayPal SVG icon */}
              <motion.svg 
                whileHover={{ scale: 1.2, rotate: 5 }}
                transition={{ duration: 0.2 }}
                width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="40" height="40" rx="20" fill="white"/>
                <path d="M15.5 27L17.5 13.5H23.5C26.5 13.5 28.5 15.5 28.5 18.5C28.5 21.5 26.5 23.5 23.5 23.5H20.5L19.5 27H15.5Z" fill="#003087"/>
                <path d="M17.5 13.5L15.5 27H19.5L20.5 23.5H23.5C26.5 23.5 28.5 21.5 28.5 18.5C28.5 15.5 26.5 13.5 23.5 13.5H17.5Z" fill="#3086C8"/>
                <path d="M19.5 27L20.5 23.5H23.5C26.5 23.5 28.5 21.5 28.5 18.5C28.5 15.5 26.5 13.5 23.5 13.5H17.5L15.5 27H19.5Z" fill="#009CDE"/>
              </motion.svg>
              <motion.div whileHover={{ scale: 1.2, rotate: 5 }} transition={{ duration: 0.2 }}>
                <IndianRupee className="w-10 h-10" />
              </motion.div>
              <motion.div whileHover={{ scale: 1.2, rotate: 5 }} transition={{ duration: 0.2 }}>
                <Bitcoin className="w-10 h-10" />
              </motion.div>
            </div>
            <span className="text-gray-400 mt-4 relative z-10">more coming soon...</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Partner With Us Modal */}
      <AnimatePresence>
      {showPartner && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 py-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg m-4 my-8 relative h-full overflow-y-auto"
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowPartner(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl transition-colors"
            >
              &times;
            </motion.button>
            <h3 className="text-2xl font-bold mb-4 text-center">Partner With Us</h3>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveTab('email')}
                className={`flex-1 py-3 text-center text-lg font-[600] ${
                  activeTab === 'email'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-500 hover:text-gray-700'
                } transition-colors duration-200`}
              >
                Email Us Your Need
              </button>
              <button
                onClick={() => setActiveTab('appointment')}
                className={`flex-1 py-3 text-center text-lg font-[600] ${
                  activeTab === 'appointment'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-500 hover:text-gray-700'
                } transition-colors duration-200`}
              >
                Schedule an Appointment
              </button>
            </div>

            {/* Tab Content with Framer Motion AnimatePresence */}
            <AnimatePresence mode="wait">
              {activeTab === 'email' && (
                <motion.div
                  key="email-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <form onSubmit={e=>handlePartnerSubmit(e,{...partnerForm})} className='flex flex-col space-y-3'>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company/Brand Name</label>
                      <input
                        name="name"
                        value={partnerForm.name}
                        onChange={handlePartnerChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-0   transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        name="email"
                        type="email"
                        value={partnerForm.email}
                        onChange={handlePartnerChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-0 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                      <input
                        name="contact"
                        value={partnerForm.contact}
                        onChange={handlePartnerChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-0 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                      <textarea
                        name="message"
                        value={partnerForm.message}
                        onChange={handlePartnerChange}
                        required
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-0 resize-none transition-all"
                      />
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={sending}
                      className="w-full bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50"
                    >
                      {sending ? 'Sending...' : 'Send'}
                    </motion.button>
                  </form>
                </motion.div>
              )}

              {activeTab === 'appointment' && (
                <motion.div
                  key="appointment-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <form onSubmit={e=>handlePartnerSubmit(e,{...appointmentForm})}  className='flex flex-col space-y-3'>
                    {/* Common fields */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company/Brand Name</label>
                      <input
                        name="name"
                        value={appointmentForm.name}
                        onChange={handleAppointmentChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-0 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        name="email"
                        type="email"
                        value={appointmentForm.email}
                        onChange={handleAppointmentChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-0 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                      <input
                        name="contact"
                        value={appointmentForm.contact}
                        onChange={handleAppointmentChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-0 transition-all"
                      />
                    </div>
                    {/* Date and Time Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
                        <DatePicker
                          selected={appointmentForm.date}
                          onChange={handleDateChange}
                          dateFormat="MM/dd/yyyy"
                          minDate={new Date()} // Prevent selecting past dates
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-0 transition-all"
                          placeholderText="Select a date"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time</label>
                        <DatePicker
                          selected={appointmentForm.time}
                          onChange={handleTimeChange}
                          showTimeSelect
                          showTimeSelectOnly
                          timeIntervals={15}
                          timeCaption="Time"
                          dateFormat="h:mm aa"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-0 transition-all"
                          placeholderText="Select a time"
                          required
                        />
                      </div>
                    </div>
                    {/* Timezone Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Your Timezone</label>
                      <select
                        name="timezone"
                        value={appointmentForm.timezone}
                        onChange={handleTimezoneChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-0 transition-all"
                        required
                      >
                        {timezones.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Message (Optional)</label>
                      <textarea
                        name="message"
                        value={appointmentForm.message}
                        onChange={handleAppointmentChange}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-0 resize-none transition-all"
                      />
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={sending}
                      className="w-full bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50"
                    >
                      {sending ? 'Scheduling...' : 'Schedule Appointment'}
                    </motion.button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Footer (same as dashboard) */}
      <footer className="w-full bg-[#171718]/80 backdrop-blur-sm border-t border-[#232325] py-6 mt-8 flex flex-col items-center shadow-lg rounded-t-2xl relative z-10">
        <div className="flex items-center gap-4 justify-center mb-2">
          <span className="text-gray-300 text-base font-semibold tracking-wide">&copy; DLS GROUP | All rights reserved</span>
        </div>
        <div className="flex items-center gap-4 justify-center">
          <motion.a 
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            href="https://t.me/+TDBG7LH2nAdkMDY1" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="group"
          >
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 text-white shadow-md transition-transform transform group-hover:scale-110 group-hover:shadow-lg">
              <Send className="h-5 w-5" />
            </span>
          </motion.a>
          <motion.a 
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            href="https://www.instagram.com/dlsgroup.pvtltd?igsh=MXZ5bDZ1cWU2ajJ6OQ==" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="group"
          >
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-tr from-pink-400 to-yellow-400 text-white shadow-md transition-transform transform group-hover:scale-110 group-hover:shadow-lg">
              <Instagram className="h-5 w-5" />
            </span>
          </motion.a>
          <motion.a 
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            href="mailto:support@dlsgroup.org.in" 
            className="group"
          >
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-tr from-gray-700 to-gray-900 text-white shadow-md transition-transform transform group-hover:scale-110 group-hover:shadow-lg">
              <Mail className="h-5 w-5" />
            </span>
          </motion.a>
        </div>
      </footer>
    </div>
  );
}

function Tabs() {
  const [tab, setTab] = React.useState<'creators' | 'brands'>('creators');
  return (
    <div className="bg-[#171718] rounded-2xl shadow-xl border border-[#232325] p-0 overflow-hidden">
      <div className="flex gap-0">
        <button
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-bold text-lg transition-all focus:outline-none ${tab === 'creators' ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow scale-105 z-10' : 'bg-[#171718] text-gray-300 hover:bg-[#232325]'}`}
          onClick={() => setTab('creators')}
          style={{ borderBottomLeftRadius: '1rem' }}
        >
          <User className="w-5 h-5" /> For Creators
        </button>
        <button
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-bold text-lg transition-all focus:outline-none ${tab === 'brands' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow scale-105 z-10' : 'bg-[#171718] text-gray-300 hover:bg-[#232325]'}`}
          onClick={() => setTab('brands')}
          style={{ borderBottomRightRadius: '1rem' }}
        >
          <Briefcase className="w-5 h-5" /> For Brands
        </button>
      </div>
      <div className="bg-[#171718] p-8 text-white min-h-[340px] flex flex-col justify-center text-[12px] md:text-[15px]">
        {tab === 'creators' ? (
          <div>
            <h2 className="text-xl md:text-3xl font-extrabold mb-3 text-pink-400">Earn with DLS Group – Get Paid for Real Views</h2>
            <ol className="space-y-4 list-decimal list-inside text-sm md:text-base">
              <li><span className="font-semibold text-white">Choose a Campaign:</span> <span className="text-[11px] md:text-sm text-gray-300">Browse live campaigns that match your content style. Each one shows how much you'll earn per 1,000 views, what platforms to post on, and what kind of content is expected.</span></li>
              <li><span className="font-semibold text-white">Create Your Video:</span> <span className="text-xs md:text-sm text-gray-300">Use the brief to make engaging short-form content for Instagram Reels, TikTok, or YouTube Shorts. Some campaigns come with assets like clips or music — others give you full creative freedom.</span></li>
              <li><span className="font-semibold text-white">Post It on Your Page:</span> <span className="text-xs md:text-sm text-gray-300">Upload the video to your account. Just make sure to follow the campaign rules, like tagging the brand or using specific audio.</span></li>
              <li><span className="font-semibold text-white">Submit Your Link:</span> <span className="text-xs md:text-sm text-gray-300">Paste your post link into the campaign dashboard so we can track your views and performance in real-time.</span></li>
              <li><span className="font-semibold text-white">Get Paid for Your Views:</span> <span className="text-xs md:text-sm text-gray-300">DLS Group automatically tracks your video's real views — no bots, no guesswork. The more views you earn, the more you get paid.</span></li>
            </ol>
          </div>
        ) : (
          <div>
            <h2 className="text-xl md:text-3xl font-extrabold mb-3 text-orange-400">Launch Viral Campaigns with DLS Group – Only Pay for Real Views</h2>
            <ol className="space-y-4 list-decimal list-inside text-sm md:text-base">
              <li><span className="font-semibold text-white">Start Your Campaign:</span> <span className="text-xs md:text-sm text-gray-300">Set your total budget and decide your payout per 1,000 views. Add a compelling title, campaign brief, and any posting guidelines for creators.</span></li>
              <li><span className="font-semibold text-white">Share Your Creative Vision:</span> <span className="text-xs md:text-sm text-gray-300">Upload brand assets, reference clips, or just a few lines describing what kind of content you're looking for. We'll make sure creators understand your brand tone and direction.</span></li>
              <li><span className="font-semibold text-white">Let Creators Do the Work:</span> <span className="text-xs md:text-sm text-gray-300">Once your campaign goes live, our network of creators starts submitting content. We handle discovery, content submissions, and basic screening to ensure quality.</span></li>
              <li><span className="font-semibold text-white">Track Every Clip in Real-Time:</span> <span className="text-xs md:text-sm text-gray-300">Monitor views, performance, and engagement in real-time. We validate each view and automatically filter out bots and fake traffic.</span></li>
              <li><span className="font-semibold text-white">Pay Only for Real Views:</span> <span className="text-xs md:text-sm text-gray-300">You're charged only for genuine performance. If no one sees the content, you don't pay. When your budget is used up, we send you a detailed report with post links, view counts, and campaign insights.</span></li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

   useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      setShowLogin(true);
    }
  }, []);

  useEffect(() => {
    // Check if user is already logged in and validate token
    const validateAndSetUser = async () => {
      const currentUser = authService.getCurrentUser();
      const token = authService.getToken();
      
      if (currentUser && token) {
        // Validate token with backend
        const isValid = await authService.validateToken();
        if (isValid) {
          setUser(currentUser);
        } else {
          // Token is invalid, clear it
          authService.logout();
        }
      }
      setIsLoading(false);
    };

    validateAndSetUser();
  }, []);

   const handleRequestOtp = async (otp:string,email:string,password:string) => {
     setAuthLoading(true);
    try {
      let result=await authService.verifyOtp({
        otp,
        email: email,  
        password: password
      });
      if (result.success) {
        const currentUser = authService.getCurrentUser();
        setUser({...currentUser,first_time:true});
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
  } catch (error) {
      return { success: false, error: 'Otp verification failed' };
    } finally {
      setAuthLoading(false);
    }
    };

  const handleLogin = async (username: string, password: string) => {
    setAuthLoading(true);
    try {
      const result = await authService.login(username, password);
      if (result.success) {
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: 'Login failed' };
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (userData: { username: string; email: string; password: string,referralCode?:string }) => {
    setAuthLoading(true);
    try {
      const result = await authService.register(userData);
      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: 'Registration failed' };
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen overflow-y-auto bg-[#09090B] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Animated Background Gradients for Login */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Homepage Content */}
        <AnimatePresence mode="wait">
          {!showLogin ? (
            <motion.div
              key="homepage"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full"
            >
              <HomePage
                loginFormProps={{
                  onLogin: handleLogin,
                  onRegister: handleRegister,
                  isLoading: authLoading
                }}
                onShowLogin={() => setShowLogin(true)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="h-screen bg-[#09090B] w-full my-12 text-gray-900 flex flex-col md:flex-row justify-center"
            >
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                onClick={() => setShowLogin(false)}
                aria-label="Close"
                className="absolute top-4 right-4 hover:text-gray-600 text-2xl font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400 rounded-full w-8 h-8 flex items-center justify-center bg-white/70 shadow z-50"
              >
                <span aria-hidden="true">&times;</span>
              </motion.button>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="max-w-screen-xl px-4 md:pl-8 bg-[#09090B] shadow flex justify-center  items-center md:items-start pt-12 md:pt-0 md:flex-1 flex-col"
              >
                <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-3xl md:text-5xl font-extrabold mb-4 text-white tracking-tight "
              style={{
                background: 'linear-gradient(135deg, #fff 0%, #f3e8ff 50%, #e9d5ff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 30px rgba(168, 85, 247, 0.5))'
              }}
            >
              Welcome to DLS Group
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="text-lg md:text-2xl md:mb-8 max-w-xl font-medium text-gray-300"
            >
              Sign up or log in to start earning or managing campaigns
            </motion.p>
              
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex-1 bg-[#09090B] w-full flex flex-col items-center justify-center md:space-y-8"
              >
                <LoginForm
                  onLogin={handleLogin}
                  onRegister={handleRegister}
                  isLoading={authLoading}
                  handleRequestOtp={handleRequestOtp}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Render appropriate dashboard based on user role */}
      {user.role === 'admin' ? (
        <AdminDashboard currentUser={user} onLogout={handleLogout} />
      ) : user.role === 'staff' ? (
        <StaffDashboard currentUser={user} onLogout={handleLogout} />
      ) : (
        <UserDashboard 
          user={user} 
          onUpdateUser={(updates) => {
            // Update user in local state
            setUser({ ...user, ...updates });
          }}
          onLogout={handleLogout}
        />
      )}

      {/* Footer (same as dashboard) */}
      <footer className="w-full bg-[#171718]/80 backdrop-blur-sm border-t border-[#232325] py-6 mt-8 flex flex-col items-center shadow-lg rounded-t-2xl relative z-10">
        <div className="flex items-center gap-4 justify-center mb-2">
          <span className="text-gray-300 text-base font-semibold tracking-wide">&copy; DLS GROUP | All rights reserved</span>
        </div>
        <div className="flex items-center gap-4 justify-center">
          <motion.a 
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            href="https://t.me/+TDBG7LH2nAdkMDY1" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="group"
          >
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 text-white shadow-md transition-transform transform group-hover:scale-110 group-hover:shadow-lg">
              <Send className="h-5 w-5" />
            </span>
          </motion.a>
          <motion.a 
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            href="https://www.instagram.com/dlsgroup.pvtltd?igsh=MXZ5bDZ1cWU2ajJ6OQ==" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="group"
          >
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-tr from-pink-400 to-yellow-400 text-white shadow-md transition-transform transform group-hover:scale-110 group-hover:shadow-lg">
              <Instagram className="h-5 w-5" />
            </span>
          </motion.a>
          <motion.a 
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            href="mailto:support@dlsgroup.org.in" 
            className="group"
          >
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-tr from-gray-700 to-gray-900 text-white shadow-md transition-transform transform group-hover:scale-110 group-hover:shadow-lg">
              <Mail className="h-5 w-5" />
            </span>
          </motion.a>
        </div>
      </footer>
    </div>
  );
}

export default App;
export { HomePage };