import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#09090b]">
      <div className="relative flex items-center justify-center">
        {/* Outer spinning ring */}
        <motion.div
          className="w-24 h-24 rounded-full border-[1px] border-zinc-800 border-t-white/80"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Logo in the center */}
        <div className="absolute flex items-center justify-center">
           <img 
             src="https://www.image2url.com/r2/default/images/1777403007715-3125c2b9-991d-4cf5-ae03-744bfabf9b11.png" 
             alt="Meteorfy" 
             className="w-10 h-10 rounded-lg"
           />
        </div>
      </div>
    </div>
  );
}