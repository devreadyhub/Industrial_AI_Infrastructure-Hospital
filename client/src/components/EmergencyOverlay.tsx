import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, MapPin, Users, Phone, X } from 'lucide-react';

export interface EmergencyPayload {
  incidentType: string;
  location: string;
  priority: 'HIGH' | 'CRITICAL' | 'CODE_BLUE';
  description?: string;
  patientId?: number;
  requiredActions: string[];
  triggeredBy?: string;
  timestamp: string;
}

interface EmergencyOverlayProps {
  isVisible: boolean;
  emergency: EmergencyPayload | null;
  onDismiss: () => void;
  onEnterCommandMode: () => void;
}

export const EmergencyOverlay: React.FC<EmergencyOverlayProps> = ({
  isVisible,
  onDismiss,
  onEnterCommandMode,
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CODE_BLUE':
        return 'from-red-600 to-red-800';
      case 'CRITICAL':
        return 'from-red-500 to-orange-600';
      case 'HIGH':
        return 'from-orange-500 to-yellow-600';
      default:
        return 'from-blue-500 to-blue-700';
    }
  };

  if (!isVisible || !emergency) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="relative w-full max-w-2xl mx-4"
        >
          {/* Emergency Alert Banner */}
          <motion.div
            className={`bg-gradient-to-r ${getPriorityColor(emergency.priority)} text-white p-6 rounded-t-2xl shadow-2xl`}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
          >
            <div className="flex items-center gap-4">
              {getPriorityIcon(emergency.priority)}
              <div className="flex-1">
                <h1 className="text-2xl font-bold uppercase tracking-wide">
                  {emergency.incidentType}
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-lg">{emergency.location}</span>
                </div>
              </div>
              <button
                onClick={onDismiss}
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </motion.div>

          {/* Emergency Details */}
          <motion.div
            className="bg-white rounded-b-2xl shadow-2xl p-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {emergency.description && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700">{emergency.description}</p>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Required Actions
              </h3>
              <ul className="space-y-2">
                {emergency.requiredActions.map((action, index) => (
                  <motion.li
                    key={index}
                    className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-gray-800">{action}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600 mb-6">
              <span>Triggered by: {emergency.triggeredBy}</span>
              <span>{new Date(emergency.timestamp).toLocaleTimeString()}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <motion.button
                onClick={onEnterCommandMode}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <AlertTriangle className="w-5 h-5" />
                Enter Command Mode
              </motion.button>

              <motion.button
                onClick={() => {
                  // Open voice channel (placeholder)
                  alert('Voice channel opened for emergency team');
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Phone className="w-5 h-5" />
                Open Voice Channel
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};