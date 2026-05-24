import { motion } from "framer-motion";

export function LoadingScreenCheckout() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <div className="relative flex items-center justify-center">
        {/* Outer spinning ring */}
        <motion.div
          className="w-24 h-24 rounded-full border-[1px] border-gray-200 border-t-green-600"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />

        {/* Spinner center */}
        <div className="absolute flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-green-600 animate-spin" />
        </div>
      </div>
    </div>
  );
}