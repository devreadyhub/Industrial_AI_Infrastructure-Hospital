import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone, Clock, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminSupport: React.FC = () => {
  const navigate = useNavigate();

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
        {/* Header */}
        <motion.div className="text-center mb-8" variants={itemVariants}>
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-400 to-teal-400 rounded-full mb-6 shadow-lg"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            <Phone className="w-8 h-8 text-white" />
          </motion.div>

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 drop-shadow-lg">
            Admin Support
          </h1>
          <p className="text-lg text-blue-100 drop-shadow">Password Reset Assistance</p>
        </motion.div>

        {/* Support Card */}
        <motion.div
          className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20"
          variants={itemVariants}
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Need Help?</h2>
            <p className="text-blue-100 text-sm">
              Contact the Admin department for password reset assistance
            </p>
          </div>

          {/* Contact Information */}
          <div className="space-y-4 mb-8">
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <Phone className="w-5 h-5 text-blue-300" />
                <span className="text-white font-medium">Phone Support</span>
              </div>
              <p className="text-blue-100 text-sm">Extension: 5000</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-blue-300" />
                <span className="text-white font-medium">Business Hours</span>
              </div>
              <p className="text-blue-100 text-sm">Monday - Friday: 8:00 AM - 6:00 PM</p>
              <p className="text-blue-100 text-sm">Saturday: 9:00 AM - 2:00 PM</p>
              <p className="text-blue-100 text-sm">Sunday: Closed</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <MapPin className="w-5 h-5 text-blue-300" />
                <span className="text-white font-medium">Location</span>
              </div>
              <p className="text-blue-100 text-sm">Admin Office - Building A, Floor 2</p>
              <p className="text-blue-100 text-sm">Room 205</p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-6">
            <p className="text-blue-100 text-sm leading-relaxed">
              Please have your Staff ID ready when contacting support. For security reasons,
              password resets must be performed in person or through verified channels.
            </p>
          </div>

          {/* Back Button */}
          <motion.button
            onClick={() => navigate('/login')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-teal-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Login
          </motion.button>
        </motion.div>

        {/* Security Info Footer */}
        <motion.div
          className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10 text-center"
          variants={itemVariants}
        >
          <p className="text-blue-100 text-xs">
            🔒 This system is secure and monitored. All support interactions are logged.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};