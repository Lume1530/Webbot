import React, { useState, useEffect, useRef } from 'react';
import { LoginForm, AdminDashboard, StaffDashboard, UserDashboard } from './components';
import { authService } from './services/authService';
import { LogOut, Instagram, Send, Megaphone, Users, User, Briefcase, Youtube, X as XIcon, Bitcoin, IndianRupee, Mail, Menu as MenuIcon, X as CloseIcon } from 'lucide-react';

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
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const statsRef = useRef(null);
  const aboutRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const handlePartnerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setPartnerForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    setSent(false);
    try {
      const apiUrl = typeof window !== 'undefined' && window.location.origin ? `${window.location.origin}/api/send-support-mail` : '/api/send-support-mail';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...partnerForm })
      });
      if (res.ok) {
        setSent(true);
        setPartnerForm({ name: '', email: '', contact: '', message: '' });
      } else {
        setError('Failed to send. Please try again.');
      }
    } catch (err) {
      setError('Failed to send. Please try again.');
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
    <div className="min-h-screen bg-[#09090B] flex flex-col relative">
      {/* Top Right Menu */}
      <nav className="fixed top-6 right-6 z-30">
        {/* Desktop menu */}
        <div className="hidden md:flex items-center gap-6">
          <button onClick={() => handleMenu('stats')} className="text-white text-base md:text-lg font-semibold hover:text-pink-400 transition">Stats</button>
          <button onClick={() => handleMenu('about')} className="text-white text-base md:text-lg font-semibold hover:text-pink-400 transition">About Us</button>
          <button onClick={() => handleMenu('dashboard')} className="text-white text-base md:text-lg font-semibold hover:text-pink-400 transition">User Dashboard</button>
        </div>
        {/* Mobile menu icon */}
        <div className="md:hidden flex items-center">
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-pink-400">
            {menuOpen ? <CloseIcon className="w-7 h-7" /> : <MenuIcon className="w-7 h-7" />}
          </button>
        </div>
        {/* Mobile menu dropdown */}
        {menuOpen && (
          <div className="absolute right-0 mt-3 w-48 bg-[#171718] rounded-xl shadow-xl py-4 flex flex-col gap-2 border border-[#232325] animate-fadeIn">
            <button onClick={() => handleMenu('stats')} className="text-white text-base font-semibold hover:text-pink-400 transition px-6 py-2 text-left">Stats</button>
            <button onClick={() => handleMenu('about')} className="text-white text-base font-semibold hover:text-pink-400 transition px-6 py-2 text-left">About Us</button>
            <button onClick={() => handleMenu('dashboard')} className="text-white text-base font-semibold hover:text-pink-400 transition px-6 py-2 text-left">User Dashboard</button>
          </div>
        )}
      </nav>
      {/* Logo at top left - bigger and more prominent */}
      <img src="/Dls_grouplogo.png" alt="DLS Group Logo" className="h-16 md:h-28 w-auto absolute top-4 md:top-8 left-4 md:left-8 z-10 drop-shadow-xl" style={{maxHeight: '110px'}} />
      {/* Hero Section - centered container */}
      <div className="w-full flex justify-center">
        <div className="w-full max-w-6xl flex flex-col md:flex-row items-center justify-between py-10 px-4 md:px-12 gap-8 md:gap-0">
          {/* Left: Tagline and Buttons */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left mt-20 md:mt-0">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-white tracking-tight">CREATE. CLIP.<br className="md:hidden"/> CASH OUT.</h1>
            <p className="text-lg md:text-2xl mb-8 max-w-xl font-medium text-gray-300">Create videos from content and earn money</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start mb-4">
              <button onClick={onShowLogin} className="bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:from-purple-700 hover:to-pink-600 transition-all text-lg">Join Now</button>
              <button onClick={() => setShowPartner(true)} className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:from-yellow-500 hover:to-orange-600 transition-all text-lg">Partner With Us</button>
            </div>
          </div>
          {/* Right: Hero Image */}
          <div className="flex-1 flex justify-center items-center w-full">
            <img src="/dls_website_hero.png" alt="Creators" className="rounded-2xl shadow-xl w-full max-w-2xl h-72 md:h-[520px] object-contain object-center" style={{maxHeight: '520px'}} />
          </div>
        </div>
      </div>
      {/* Client Logos Row - 6 real logos, spaced inside container, no background */}
      <div className="w-full flex justify-center bg-[#09090B] border-y border-[#1a1a1a] mb-8 overflow-hidden">
        <div className="w-full max-w-6xl px-2 sm:px-4 relative overflow-hidden">
          <div className="flex gap-6 sm:gap-10 py-2 whitespace-nowrap animate-marquee" style={{animation: 'marquee 18s linear infinite'}}>
            {[
              '/client_logo/client logo 1.png',
              '/client_logo/client logo 2.png',
              '/client_logo/client logo 3.png',
              '/client_logo/client logo 4.png',
              '/client_logo/client logo 5.png',
              '/client_logo/client logo 6.png',
              '/client_logo/client logo 1.png',
              '/client_logo/client logo 2.png',
              '/client_logo/client logo 3.png',
              '/client_logo/client logo 4.png',
              '/client_logo/client logo 5.png',
              '/client_logo/client logo 6.png',
            ].map((src, i) => (
              <img
                key={src + i}
                src={src}
                alt={`Client Logo ${i%6+1}`}
                className="h-16 w-28 sm:h-28 sm:w-44 object-contain mx-2 sm:mx-4"
                style={{ background: 'none' }}
              />
            ))}
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
      </div>
      {/* Stats Section */}
      <div ref={statsRef} className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-4 gap-6 pb-16 px-4">
        <div className="bg-[#181014] rounded-2xl shadow-xl p-8 flex flex-col items-center gap-2 border border-[#2a1a1a]">
          <span className="text-4xl font-extrabold text-white mb-1">$127.2K+</span>
          <span className="text-gray-300 text-lg">Paid to creators</span>
        </div>
        <div className="bg-[#181014] rounded-2xl shadow-xl p-8 flex flex-col items-center gap-2 border border-[#2a1a1a]">
          <span className="text-4xl font-extrabold text-white mb-1">1,000+</span>
          <span className="text-gray-300 text-lg">Active clippers</span>
        </div>
        <div className="bg-[#181014] rounded-2xl shadow-xl p-8 flex flex-col items-center gap-2 border border-[#2a1a1a]">
          <span className="text-4xl font-extrabold text-white mb-1">2B+</span>
          <span className="text-gray-300 text-lg">Monthly Views</span>
        </div>
        <div className="bg-[#181014] rounded-2xl shadow-xl p-8 flex flex-col items-center gap-2 border border-[#2a1a1a]">
          <span className="text-4xl font-extrabold text-white mb-1">50+</span>
          <span className="text-gray-300 text-lg">Campaigns</span>
        </div>
      </div>
      {/* Section Heading and Description */}
      <div className="w-full flex flex-col items-center justify-center text-center mb-10 px-4">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Everything You Need to Succeed in the Digital World</h2>
        <p className="text-base md:text-lg text-gray-300 max-w-2xl">At DLS Group, our mission is to help brands of every size go viral. Our platform equips you with powerful tools to launch impactful content campaigns that connect, engage, and drive real, measurable results.</p>
      </div>
      {/* Tabs for Creators and Brands with image on left */}
      <div ref={aboutRef} className="w-full flex justify-center pb-16">
        <div className="w-full max-w-[1400px] px-4 flex flex-col md:flex-row items-center gap-10">
          {/* Left: Image */}
          <div className="flex-[1.1] flex justify-center items-center w-full mb-4 md:mb-0" style={{ minWidth: '0' }}>
            <div className="w-full max-w-[340px] h-40 sm:max-w-[400px] sm:h-56 md:max-w-[600px] md:h-[600px] lg:max-w-[700px] lg:h-[700px] flex items-center justify-center">
              <img src="/website_image.png" alt="Creators and Brands" className="w-full h-full object-contain rounded-2xl shadow-2xl" />
            </div>
          </div>
          {/* Right: Tabs */}
          <div className="flex-[1.1] w-full max-w-[540px]">
            <Tabs />
          </div>
        </div>
      </div>
      {/* Supported Platforms & Payment Methods Section */}
      <div className="w-full flex flex-col items-center pb-16">
        <h2 className="text-3xl font-semibold text-white mb-10">We've got you covered</h2>
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl justify-center">
          {/* Supported Platforms */}
          <div className="flex-1 bg-[#181014] rounded-2xl border border-[#2a1a1a] p-8 flex flex-col items-center shadow-xl">
            <span className="text-xl font-bold text-white mb-4">Supported Platforms:</span>
            <div className="flex gap-8 text-4xl text-white mt-2">
              {/* TikTok SVG */}
              <svg width="32" height="32" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg"><g><path d="M204.8 77.6c-22.4 0-40.8-18.4-40.8-40.8V24h-36.8v144.8c0 13.6-11.2 24.8-24.8 24.8s-24.8-11.2-24.8-24.8 11.2-24.8 24.8-24.8c2.4 0 4.8 0.4 7.2 1.2V129.6c-2.4-0.4-4.8-0.4-7.2-0.4-34.4 0-62.4 28-62.4 62.4s28 62.4 62.4 62.4 62.4-28 62.4-62.4V104c12.8 8.8 28 14.4 44.8 14.4v-40.8z" fill="#fff"/><path d="M204.8 77.6c-22.4 0-40.8-18.4-40.8-40.8V24h-36.8v144.8c0 13.6-11.2 24.8-24.8 24.8s-24.8-11.2-24.8-24.8 11.2-24.8 24.8-24.8c2.4 0 4.8 0.4 7.2 1.2V129.6c-2.4-0.4-4.8-0.4-7.2-0.4-34.4 0-62.4 28-62.4 62.4s28 62.4 62.4 62.4 62.4-28 62.4-62.4V104c12.8 8.8 28 14.4 44.8 14.4v-40.8z" fill="#fff"/><path d="M204.8 77.6c-22.4 0-40.8-18.4-40.8-40.8V24h-36.8v144.8c0 13.6-11.2 24.8-24.8 24.8s-24.8-11.2-24.8-24.8 11.2-24.8 24.8-24.8c2.4 0 4.8 0.4 7.2 1.2V129.6c-2.4-0.4-4.8-0.4-7.2-0.4-34.4 0-62.4 28-62.4 62.4s28 62.4 62.4 62.4 62.4-28 62.4-62.4V104c12.8 8.8 28 14.4 44.8 14.4v-40.8z" fill="#fff"/></g></svg>
              <Instagram className="w-8 h-8" />
              <Youtube className="w-8 h-8" />
              <XIcon className="w-8 h-8" />
            </div>
          </div>
          {/* Payment Methods */}
          <div className="flex-1 bg-[#181014] rounded-2xl border border-[#2a1a1a] p-8 flex flex-col items-center shadow-xl">
            <span className="text-xl font-bold text-white mb-4">Payment Methods:</span>
            <div className="flex gap-8 text-4xl text-white mt-2">
              {/* PayPal SVG icon */}
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="20" fill="white"/><path d="M15.5 27L17.5 13.5H23.5C26.5 13.5 28.5 15.5 28.5 18.5C28.5 21.5 26.5 23.5 23.5 23.5H20.5L19.5 27H15.5Z" fill="#003087"/><path d="M17.5 13.5L15.5 27H19.5L20.5 23.5H23.5C26.5 23.5 28.5 21.5 28.5 18.5C28.5 15.5 26.5 13.5 23.5 13.5H17.5Z" fill="#3086C8"/><path d="M19.5 27L20.5 23.5H23.5C26.5 23.5 28.5 21.5 28.5 18.5C28.5 15.5 26.5 13.5 23.5 13.5H17.5L15.5 27H19.5Z" fill="#009CDE"/></svg>
              <IndianRupee className="w-10 h-10" />
              <Bitcoin className="w-10 h-10" />
            </div>
            <span className="text-gray-400 mt-4">more coming soon...</span>
          </div>
        </div>
      </div>
      {/* Partner With Us Modal */}
      {showPartner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md mx-4 relative">
            <button onClick={() => setShowPartner(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            <h3 className="text-2xl font-bold text-orange-600 mb-4">Partner With Us</h3>
            <form onSubmit={handlePartnerSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company/Brand Name</label>
                <input name="name" value={partnerForm.name} onChange={handlePartnerChange} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input name="email" type="email" value={partnerForm.email} onChange={handlePartnerChange} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                <input name="contact" value={partnerForm.contact} onChange={handlePartnerChange} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea name="message" value={partnerForm.message} onChange={handlePartnerChange} required rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none" />
              </div>
              {error && <div className="text-red-600 text-sm">{error}</div>}
              {sent && <div className="text-green-600 text-sm">Thank you! We received your message.</div>}
              <button type="submit" disabled={sending} className="w-full bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50">
                {sending ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Footer (same as dashboard) */}
      <footer className="w-full bg-[#171718] border-t border-[#232325] py-6 mt-8 flex flex-col items-center shadow-lg rounded-t-2xl">
        <div className="flex items-center gap-4 justify-center mb-2">
          <span className="text-gray-300 text-base font-semibold tracking-wide">&copy; DLS GROUP | All rights reserved</span>
        </div>
        <div className="flex items-center gap-4 justify-center">
          <a href="https://t.me/yourtelegram" target="_blank" rel="noopener noreferrer" className="group">
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 text-white shadow-md transition-transform transform group-hover:scale-110 group-hover:shadow-lg">
              <Send className="h-5 w-5" />
            </span>
          </a>
          <a href="https://instagram.com/yourinstagram" target="_blank" rel="noopener noreferrer" className="group">
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-tr from-pink-400 to-yellow-400 text-white shadow-md transition-transform transform group-hover:scale-110 group-hover:shadow-lg">
              <Instagram className="h-5 w-5" />
            </span>
          </a>
          <a href="mailto:support@dlsgroup.org.in" className="group">
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-tr from-gray-700 to-gray-900 text-white shadow-md transition-transform transform group-hover:scale-110 group-hover:shadow-lg">
              <Mail className="h-5 w-5" />
            </span>
          </a>
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

  const handleRegister = async (userData: { username: string; email: string; password: string }) => {
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

  const handleSessionExpired = () => {
    // Session expired, redirect to login
    setUser(null);
    setShowLogin(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    if (showLogin) {
      return (
        <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center relative">
          <div className="w-full max-w-lg mx-auto p-6 md:p-10 bg-[#f8f9fb] rounded-none md:rounded-2xl shadow-2xl border border-gray-100 flex flex-col justify-center font-sans min-h-[80vh]">
            <button
              onClick={() => setShowLogin(false)}
              aria-label="Close"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400 rounded-full w-10 h-10 flex items-center justify-center bg-white/70 shadow z-50"
            >
              <span aria-hidden="true">&times;</span>
            </button>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-extrabold text-gray-900 mb-1 tracking-tight">Welcome to DLS Group</h2>
              <p className="text-gray-500 text-base mb-4">Sign up or log in to start earning or managing campaigns</p>
              <div className="w-16 mx-auto border-b-2 border-gray-200 mb-2" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center space-y-8">
              <LoginForm
                onLogin={handleLogin}
                onRegister={handleRegister}
                isLoading={authLoading}
              />
            </div>
          </div>
        </div>
      );
    }
    return (
      <HomePage
        loginFormProps={{
          onLogin: handleLogin,
          onRegister: handleRegister,
          isLoading: authLoading
        }}
        onShowLogin={() => setShowLogin(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Render appropriate dashboard based on user role */}
      {user.role === 'admin' ? (
        <AdminDashboard currentUser={user} onLogout={handleLogout} onSessionExpired={handleSessionExpired} />
      ) : user.role === 'staff' ? (
        <StaffDashboard currentUser={user} onLogout={handleLogout} onSessionExpired={handleSessionExpired} />
      ) : (
        <UserDashboard 
          user={user} 
          onUpdateUser={(updates) => {
            // Update user in local state
            setUser({ ...user, ...updates });
          }}
          onLogout={handleLogout}
          onSessionExpired={handleSessionExpired}
        />
      )}

      {/* Footer (same as dashboard) */}
      <footer className="w-full bg-[#171718] border-t border-[#232325] py-6 mt-8 flex flex-col items-center shadow-lg rounded-t-2xl">
        <div className="flex items-center gap-4 justify-center mb-2">
          <span className="text-gray-300 text-base font-semibold tracking-wide">&copy; DLS GROUP | All rights reserved</span>
        </div>
        <div className="flex items-center gap-4 justify-center">
          <a href="https://t.me/yourtelegram" target="_blank" rel="noopener noreferrer" className="group">
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 text-white shadow-md transition-transform transform group-hover:scale-110 group-hover:shadow-lg">
              <Send className="h-5 w-5" />
            </span>
          </a>
          <a href="https://instagram.com/yourinstagram" target="_blank" rel="noopener noreferrer" className="group">
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-tr from-pink-400 to-yellow-400 text-white shadow-md transition-transform transform group-hover:scale-110 group-hover:shadow-lg">
              <Instagram className="h-5 w-5" />
            </span>
          </a>
          <a href="mailto:support@dlsgroup.org.in" className="group">
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-tr from-gray-700 to-gray-900 text-white shadow-md transition-transform transform group-hover:scale-110 group-hover:shadow-lg">
              <Mail className="h-5 w-5" />
            </span>
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
export { HomePage };