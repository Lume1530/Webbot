  import React, { useState, useEffect, useRef } from 'react';
import { LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { authService } from '../../services/authService';

interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onRegister: (userData: { username: string; email: string; password: string; referralCode?: string }) => Promise<{ success: boolean; error?: string; referrerInfo?: { username: string; email: string } }>;
  isLoading: boolean;
  handleRequestOtp:(otp: string, email: string, password: string) => Promise<{success: boolean; error?: string}>;
}

export function LoginForm({ onLogin, onRegister, isLoading,handleRequestOtp }: LoginFormProps) {
  const [isLoginMode, setIsLoginMode] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [cshowPassword, setCShowPassword] = useState(false);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [isApproved, setIsApproved] = useState<boolean | null>(false);
  const [otp, setOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState(0); // Time in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIdRef = useRef<any>(null); // Ref to store the interval ID
  const [forgotPassword, setForgotPassword] = useState(false);

  const initialTime = 120; // 2 minutes in seconds

  // Function to start the timer
  const startTimer = () => {
    setTimeLeft(initialTime);
    setIsTimerRunning(true);
  };

  // Effect to handle the timer countdown
  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerIdRef['current'] = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning && timerIdRef.current) {
      // Timer has run out
      setIsTimerRunning(false);
      clearInterval(timerIdRef.current);
    }

    // Cleanup function to clear the interval when the component unmounts
    // or when the timer stops
    return () => {
      if (timerIdRef.current)
        clearInterval(timerIdRef.current);
    };
  }, [isTimerRunning, timeLeft]);

  // Function to format time for display (MM:SS)
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleRequest = async (e:any) => {
    e.preventDefault();
    setError('');
    if (otp.trim() === '') {
      setError('OTP is required');
      return;
    }
    if(forgotPassword){
      try{
        setLoading(true);
      const result=await authService.forgotPassword({
        email: formData.email,
        password: formData.password,
        otp
      });
      console.log(result);
      if(result.error){
        setError(result.error);
      }else{
      toast.success('Password updated successfully!');
      setShowOtpVerification(false);
      setIsTimerRunning(false);
      setForgotPassword(false);
      setFormData({ username: '', email: '', password: '', referralCode: '', cpassword: '' });
      setOtp('');
      setError('');
      setIsLoginMode(null);
      setShowPassword(false);
      setCShowPassword(false);
      }

    }catch(error) {
      console.error('Error updating password:', error);
      setError('Failed to update password. Please try again.');
      return;
    }finally{
setLoading(false);
    }

    }else{
    let result =await handleRequestOtp(
      otp,
      formData.email,  
      formData.password
    );
     if (!result.success) {
          setError(result.error || 'Login failed');
        };
      }
  };
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    referralCode: '',
    cpassword: ''
  });
  const [error, setError] = useState('');
  const [referrerInfo, setReferrerInfo] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // On mount, check for referral code in URL and set in formData
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    console.log(ref);
    if (ref) {
      setFormData(f => ({ ...f, referralCode: ref }));
      setReferrerInfo(ref);
    }
  }, []);

  const checkEmail = async () => {
    setLoading(true);
    try {
      if (formData.email.trim() === '') {
        setError('Email is required');
        return;
      }
      const result = await authService.checkEmail(formData.email);
      setIsLoginMode(result?.user?.user_exist ? true : false);
      setIsApproved(result?.user?.isApproved);
    } catch (error) {
      return { success: false, error: 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    try {
      const result = await authService.sendOtp({ email: formData.email, password: formData.password });
      setOtp('');
      startTimer();
      console.log(result);
      if (!result.error) {
        toast.success('OTP sent successfully! Please check your email.');
        setShowOtpVerification(true);
      } else {
        setError(result.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      setError(error?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isApproved && isLoginMode == true) {
      if (formData.email.trim() === '') {
        setError('Email is required');
        return;
      }
      if (formData.password.trim() === '') {
        setError('Password is required');
        return;
      }
      resendOtp();
    } else {
      if (isLoginMode == true) {
        const result = await onLogin(formData.email, formData.password);
        if (!result.success) {
          setError(result.error || 'Login failed');
        }
      } else if (isLoginMode == false) {
        console.log("HH",referrerInfo)
        if (!formData.email) {
          setError('Email is required');
          return;
        }
        if (passwordStrength.length == false || passwordStrength.special == false || passwordStrength.number == false || passwordStrength.uppercase == false || passwordStrength.lowercase == false) {
          setError('Invalid password format.');
          return;
        }
        if (formData.password != formData.cpassword) {
          setError('Password & Confirm Password do not match');
          return;
        }
        // Always send referralCode if present
        const result = await onRegister({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          referralCode: referrerInfo
        });
        if (result.success) {
          if (result.referrerInfo) {
            toast.success(`Registration successful! You were referred by ${result.referrerInfo.username} (${result.referrerInfo.email}). Please wait for admin approval.`);
          } else {
            toast.success('Registration successful! Please verify OTP.');
          }
          startTimer();
          setShowOtpVerification(true);

        } else {
          setError(result.error || 'Registration failed');
        }
      } else {
        checkEmail();
      }
    }
  };

  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    special: false,
    number: false,
    uppercase: false,
    lowercase: false
  });


  const checkPasswordStrength = (password: string) => {
    setPasswordStrength({
      length: password.length >= 8,
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      number: /[0-9]/.test(password),
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password)
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const getStrengthColor = (condition: boolean) => {
    return condition ? 'text-green-600' : 'text-gray-400';
  };

  const handleForgotPassword = () => {
    if (formData.email.trim() === '') {
      setError('Email is required to reset password');
      return;
    } 
    if(passwordStrength.length == false || passwordStrength.special == false || passwordStrength.number == false || passwordStrength.uppercase == false || passwordStrength.lowercase == false) { 
      setError('Invalid password format.');
      return;
    }
    if(formData.password != formData.cpassword) {
      setError('Password & Confirm Password do not match');
      return;
    }
    resendOtp();setShowOtpVerification(true);
  }

  if (showOtpVerification) {
    return (<div className='w-full md:h-screen flex items-center justify-center p-4 bg-[#09090B]'>
      <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
        <div className="text-center mb-8 flex justify-center flex-col">
          <div className='w-full flex justify-center mb-4'>
            <motion.img
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              src="/Dls_grouplogo.webp"
              alt="DLS Group Logo"
              className="h-16 w-auto top-4 drop-shadow-2xl"
              style={{
                maxHeight: '110px',
                filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.3))'
              }}
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                // Fallback to original PNG if WebP fails
                e.currentTarget.src = '/Dls_grouplogo.png';
              }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Creator Dashboard
          </h1>
          {
            forgotPassword==true?<p className="text-gray-300">
           Update Your Password
          </p>:
          <p className="text-gray-300">
            {isLoginMode == null ? "Monetize Your Visuals. It's Time to Get Paid." : isLoginMode ? 'Welcome Back' : 'Create a new account'}
          </p>
          }
          {isLoginMode != null && <div className="mt-4 text-sm text-gray-400 flex items-center justify-center space-x-2">
            <div>{formData?.email}</div>
            <div onClick={() => {  setShowPassword(false);
      setCShowPassword(false); setIsLoginMode(null);setForgotPassword(false); setError(''); setShowOtpVerification(false); setFormData(pre => ({ ...pre, password: '', cpassword: '', username: '' })) }} className='font-bold cursor-pointer'>Edit</div>
          </div>}
        </div>

        <form onSubmit={handleRequest} className="space-y-6 mb-6">

          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-200 mb-2">
              OTP
            </label>
            <input
              name='otp'
              type="text"
              value={otp}
              onChange={(e) => {setOtp(e.target.value);setError('');}}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter OTP"
            />
          </div>


          {error && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3 text-red-200 text-sm">
              {error}
            </div>
          )}
           <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={()=>resendOtp()}
              disabled={isTimerRunning || loading}
              className={`text-sm text-purple-400 hover:text-purple-300 ${isTimerRunning ? 'cursor-not-allowed' : ''}`}
            >
              {isTimerRunning ? `Resend OTP in ${formatTime(timeLeft)}` : 'Resend OTP'}
            </button>
          </div>
          

          <button
            type="submit"
            disabled={isLoading || loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
          >
            {(isLoading || loading) ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <span>Verify OTP</span>

              </>
            )}
          </button>
        </form>

      </div>
    </div>)
  }



  if(forgotPassword) {
    return  (
    <div className='w-full md:h-screen flex items-center justify-center p-4 bg-[#09090B]'>
      <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
        <div className="text-center mb-8 flex justify-center flex-col">
          <div className='w-full flex justify-center mb-4'>
            <motion.img
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              src="/Dls_grouplogo.webp"
              alt="DLS Group Logo"
              className="h-16 w-auto top-4 drop-shadow-2xl"
              style={{
                maxHeight: '110px',
                filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.3))'
              }}
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                // Fallback to original PNG if WebP fails
                e.currentTarget.src = '/Dls_grouplogo.png';
              }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Creator Dashboard
          </h1>
          <p className="text-gray-300">
            Update Your Password
          </p>
          {isLoginMode != null && <div className="mt-4 text-sm text-gray-400 flex items-center justify-center space-x-2">
            <div>{formData?.email}</div>
            <div onClick={() => {   setShowPassword(false);
      setCShowPassword(false);setShowOtpVerification(false);setForgotPassword(false); setIsLoginMode(null); setError(''); setOtp(''); setFormData(pre => ({ ...pre, password: '', cpassword: '', username: '' })); setOtp(''); }} className='font-bold cursor-pointer'>Edit</div>
          </div>}
        </div>

        <form onSubmit={(e)=>{e.preventDefault();handleForgotPassword();}} className="space-y-6 mb-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={(e) => { handleInputChange(e);setError(''); checkPasswordStrength(e.target.value); }}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => {setShowPassword(!showPassword);setError('');}}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="cpassword" className="block text-sm font-medium text-gray-200 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="cpassword"
                name="cpassword"
                value={formData.cpassword}
                onChange={(e) => { handleInputChange(e); setError('');}}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                placeholder="Enter confirm password"
              />
              <button
                type="button"
                onClick={() => {setCShowPassword(!cshowPassword);setError('');}}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {cshowPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="pt-2 text-xs">
            <div className={`flex items-center ${getStrengthColor(passwordStrength.length)}`}>
              <span className="mr-2">•</span>
              <span>At least 8 characters</span>
            </div>
            <div className={`flex items-center ${getStrengthColor(passwordStrength.special)}`}>
              <span className="mr-2">•</span>
              <span>Contains special character</span>
            </div>
            <div className={`flex items-center ${getStrengthColor(passwordStrength.number)}`}>
              <span className="mr-2">•</span>
              <span>Contains number</span>
            </div>
            <div className={`flex items-center ${getStrengthColor(passwordStrength.uppercase)}`}>
              <span className="mr-2">•</span>
              <span>Contains uppercase letter</span>
            </div>
            <div className={`flex items-center ${getStrengthColor(passwordStrength.lowercase)}`}>
              <span className="mr-2">•</span>
              <span>Contains lowercase letter</span>
            </div>
          </div>


          {error && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3 text-red-200 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
          >
            {(isLoading || loading) ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                Update Password
              </>
            )}
          </button>
        </form>

        {/* <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setError('');
              setFormData({ username: '', email: '', password: '',referralCode: referrerInfo });
            }}
            className="text-purple-300 hover:text-purple-200 transition-colors"
          >
            {isLoginMode 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"
            }
          </button>
        </div> */}
      </div>
    </div>
  );
  }

  return (
    <div className='w-full md:h-screen flex items-center justify-center p-4 bg-[#09090B]'>
      <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
        <div className="text-center mb-8 flex justify-center flex-col">
          <div className='w-full flex justify-center mb-4'>
            <motion.img
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              src="/Dls_grouplogo.webp"
              alt="DLS Group Logo"
              className="h-16 w-auto top-4 drop-shadow-2xl"
              style={{
                maxHeight: '110px',
                filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.3))'
              }}
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                // Fallback to original PNG if WebP fails
                e.currentTarget.src = '/Dls_grouplogo.png';
              }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Creator Dashboard
          </h1>
          <p className="text-gray-300">
            {isLoginMode == null ? "Monetize Your Visuals. It's Time to Get Paid." : isLoginMode ? 'Welcome Back' : 'Create a new account'}
          </p>
          {isLoginMode != null && <div className="mt-4 text-sm text-gray-400 flex items-center justify-center space-x-2">
            <div>{formData?.email}</div>
            <div onClick={() => {   setShowPassword(false);
      setCShowPassword(false);setShowOtpVerification(false); setIsLoginMode(null); setError(''); setOtp(''); setFormData(pre => ({ ...pre, password: '', cpassword: '', username: '' })); setOtp(''); }} className='font-bold cursor-pointer'>Edit</div>
          </div>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mb-6">
          {isLoginMode == null && (<div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={(e)=>{handleInputChange(e);setError('');}}
              required={true}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter your email"
            />
          </div>)}


          {(isLoginMode == true || isLoginMode == false) && <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={(e) => { setError('');handleInputChange(e); checkPasswordStrength(e.target.value); }}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => {setShowPassword(!showPassword);setError('');}}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>}

          {(isLoginMode == false) && <div>
            <label htmlFor="cpassword" className="block text-sm font-medium text-gray-200 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="cpassword"
                name="cpassword"
                value={formData.cpassword}
                onChange={(e) => {setError(''); handleInputChange(e); }}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                placeholder="Enter confirm password"
              />
              <button
                type="button"
                onClick={() => {setCShowPassword(!cshowPassword);setError('');}}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {cshowPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>}

          {(isLoginMode == false) && (<div className="pt-2 text-xs">
            <div className={`flex items-center ${getStrengthColor(passwordStrength.length)}`}>
              <span className="mr-2">•</span>
              <span>At least 8 characters</span>
            </div>
            <div className={`flex items-center ${getStrengthColor(passwordStrength.special)}`}>
              <span className="mr-2">•</span>
              <span>Contains special character</span>
            </div>
            <div className={`flex items-center ${getStrengthColor(passwordStrength.number)}`}>
              <span className="mr-2">•</span>
              <span>Contains number</span>
            </div>
            <div className={`flex items-center ${getStrengthColor(passwordStrength.uppercase)}`}>
              <span className="mr-2">•</span>
              <span>Contains uppercase letter</span>
            </div>
            <div className={`flex items-center ${getStrengthColor(passwordStrength.lowercase)}`}>
              <span className="mr-2">•</span>
              <span>Contains lowercase letter</span>
            </div>
          </div>)}
          {isLoginMode==true && <div onClick={()=>setForgotPassword(true)} className='text-gray-400 cursor-pointer hover:text-gray-500'>Forgot Password?</div>}


          {error && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3 text-red-200 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
          >
            {(isLoading || loading) ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                {isLoginMode != null && (isLoginMode ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />)}
                <span>{isLoginMode == null ? 'Continue' : (isLoginMode ? 'Sign In' : 'Sign Up')}</span>
              </>
            )}
          </button>
        </form>

        {/* <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setError('');
              setFormData({ username: '', email: '', password: '',referralCode: referrerInfo });
            }}
            className="text-purple-300 hover:text-purple-200 transition-colors"
          >
            {isLoginMode 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"
            }
          </button>
        </div> */}
      </div>
    </div>
  );
}