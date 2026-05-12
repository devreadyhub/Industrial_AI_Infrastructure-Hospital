import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Users, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface LoginFormData {
  staffId: string;
  password: string;
}

export const LandingPage: React.FC<{ onVisitorAccess: () => void }> = ({ onVisitorAccess }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setLoginError(null);

    try {
      // Simulate API call to authenticate staff
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: data.staffId,
          password: data.password,
        }),
      });

      const responseText = await response.text();
      const responseData = responseText ? JSON.parse(responseText) : null;

      if (!response.ok) {
        setLoginError(
          responseData?.message || 'Login failed. Please check your credentials.',
        );
        setIsLoading(false);
        return;
      }

      const { token, user } = responseData || {};

      if (!token || !user) {
        setLoginError('Login failed. Invalid server response.');
        setIsLoading(false);
        return;
      }

      // Store token in localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('tokenExpiry', Date.now() + 3600000); // 1 hour expiry

      // Update auth context
      login(user);

      // Reset form
      reset();

      // Stop loading and navigate to dashboard
      setIsLoading(false);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : 'An error occurred during login. Please try again.',
      );
      setIsLoading(false);
    }
  };

  // Container animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  // Item animation
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 md:p-8">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"
          animate={{ y: [0, -30, 0], x: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Main content */}
      <motion.div
        className="relative z-10 w-full max-w-md"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Section */}
        <motion.div className="text-center mb-12" variants={itemVariants}>
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-400 to-teal-400 rounded-full mb-6 shadow-lg"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            <Lock className="w-8 h-8 text-white" />
          </motion.div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg">
            Hospital OS
          </h1>
          <p className="text-lg text-blue-100 drop-shadow">Secure Medical Operations Platform</p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20"
          variants={itemVariants}
        >
          {/* Card Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">Staff Login</h2>
            <p className="text-blue-100 text-sm">Enter your credentials to access the system</p>
          </div>

          {/* Error Alert */}
          {loginError && (
            <motion.div
              className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-100 text-sm">{loginError}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Staff ID Field */}
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">Staff ID</label>
              <input
                type="text"
                placeholder="Enter your Staff ID"
                {...register('staffId', {
                  required: 'Staff ID is required',
                  minLength: {
                    value: 3,
                    message: 'Staff ID must be at least 3 characters',
                  },
                })}
                className={`w-full px-4 py-3 rounded-lg bg-white/10 border backdrop-blur transition-all focus:outline-none focus:ring-2 text-white placeholder-blue-200/50 ${
                  errors.staffId
                    ? 'border-red-500/50 focus:ring-red-500/50'
                    : 'border-white/20 focus:ring-blue-400/50 focus:border-blue-400/50'
                }`}
              />
              {errors.staffId && (
                <p className="text-red-400 text-xs mt-1">{errors.staffId.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                  className={`w-full px-4 py-3 pr-12 rounded-lg bg-white/10 border backdrop-blur transition-all focus:outline-none focus:ring-2 text-white placeholder-blue-200/50 ${
                    errors.password
                      ? 'border-red-500/50 focus:ring-red-500/50'
                      : 'border-white/20 focus:ring-blue-400/50 focus:border-blue-400/50'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200 hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => navigate('/admin-support')}
                className="text-blue-300 hover:text-blue-100 text-xs font-medium transition"
              >
                Forgot Password?
              </button>
            </div>

            {/* Login Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-teal-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <motion.div
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  Authenticating...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Sign In
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-blue-200">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Visitor Access Button */}
          <motion.button
            onClick={onVisitorAccess}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 px-4 bg-white/10 border border-white/20 text-blue-100 font-semibold rounded-lg hover:bg-white/20 hover:border-white/30 transition-all flex items-center justify-center gap-2"
          >
            <Users className="w-5 h-5" />
            Visitor Access
          </motion.button>
        </motion.div>

        {/* Security Info Footer */}
        <motion.div
          className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10 text-center"
          variants={itemVariants}
        >
          <p className="text-blue-100 text-xs">
            🔒 This system is secure and monitored. Unauthorized access attempts are logged.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};
