import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Smile, 
  Play, 
  Volume2, 
  Bot, 
  Layers, 
  CheckCircle,
  HelpCircle,
  Zap,
  Check
} from "lucide-react";

interface TutorialModeProps {
  onClose: () => void;
  onGoToStep?: (step: number) => void;
  onOpenCreator?: () => void;
}

interface TourStep {
  id: number;
  title: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
  hint: string;
  mascotExpression: "happy" | "explain" | "super" | "surprised" | "wave";
}

export default function TutorialMode({ onClose, onGoToStep, onOpenCreator }: TutorialModeProps) {
  const [currentIdx, setCurrentIdx] = useState(0);

  const steps: TourStep[] = [
    {
      id: 1,
      title: "Selamat Datang di Talking Object Pro! 🎬",
      badge: "Berkenalan",
      description: "Halo pencipta konten! Aplikasi ini membantu Anda membuat prompt video pendek berkarakter 3D ala Pixar dengan alur cerita edukatif yang viral secara otomatis menggunakan Gemini AI.",
      icon: <Sparkles className="w-8 h-8 text-pink-500 animate-pulse" />,
      hint: "Klik 'Lanjut' di bawah untuk mengenal fitur-fitur mutakhir aplikasi ini secara ringkas.",
      mascotExpression: "wave"
    },
    {
      id: 2,
      title: "Desainer Karakter Unik (Character Creator) 👾",
      badge: "Fitur Desain",
      description: "Bosan dengan karakter standar? Sekarang Anda bisa mendesain karakter kustom unik Anda sendiri! Pilih bentuk tubuh (bulat, kotak, bintang), warna favorit, ekspresi wajah, pakaian, dan aksesoris keren.",
      icon: <Bot className="w-8 h-8 text-blue-500" />,
      hint: "Anda bisa meluncurkan desainer ini lewat tombol 'Character Creator' di bagian atas menu beranda.",
      mascotExpression: "happy"
    },
    {
      id: 3,
      title: "12 Parameter Alur Cerita AI yang Fleksibel ⚙️",
      badge: "Kustomisasi Cerita",
      description: "Sesuaikan segalanya tentang video Anda melalui 12 langkah intuitif: dari kategori objek (buah, sayur, gadget), musik, rasio video (TikTok Shorts/YouTube), gaya emosi, hingga gerakan kamera.",
      icon: <Layers className="w-8 h-8 text-indigo-500" />,
      hint: "Karakter Anda juga bisa berbicara dalam bahasa gaul Indonesia atau narasi bahasa Inggris formal!",
      mascotExpression: "explain"
    },
    {
      id: 4,
      title: "Dubbing Suara & Render Gambar Sinematik 🎙️",
      badge: "Multimedia AI",
      description: "Setelah skrip dibuat, dengarkan suara karakter secara instan menggunakan AI, edit draf dialog sesuka hati, buat klip gambar referensi, dan unduh rekaman audio penuh untuk bahan editing Anda.",
      icon: <Volume2 className="w-8 h-8 text-emerald-500" />,
      hint: "Tekan tombol dengar suara di samping scene skrip untuk membunyikan suara karakter.",
      mascotExpression: "super"
    },
    {
      id: 5,
      title: "Ekspor Serbaguna Ke Alat Pengedit Video 🚀",
      badge: "Siap Produksi",
      description: "Salin prompt gambar atau video ke generator video AI favorit Anda. Ekspor juga seluruh skrip ke file JSON/CSV untuk otomatisasi batch editing di Premiere, CapCut, atau Canva!",
      icon: <CheckCircle className="w-8 h-8 text-[#FF4D8D]" />,
      hint: "Masuk/Login untuk merekam seluruh riwayat karya secara aman di database awan Firebase.",
      mascotExpression: "surprised"
    }
  ];

  const currentStep = steps[currentIdx];

  const handleNext = () => {
    if (currentIdx < steps.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
    }
  };

  // Render a cute vector mascot based on expression
  const renderMascotSVG = (expression: string) => {
    return (
      <svg viewBox="0 0 120 120" className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-md">
        <defs>
          <linearGradient id="mascotGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#80E2FF" />
            <stop offset="100%" stopColor="#0071F2" />
          </linearGradient>
        </defs>
        
        {/* Floating shadow */}
        <ellipse cx="60" cy="112" rx="30" ry="6" fill="#000" opacity="0.1" />

        {/* Mascot Body */}
        <motion.g
          animate={{
            y: [0, -5, 0],
            rotate: [0, 2, -2, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Main Round Blob */}
          <circle cx="60" cy="60" r="45" fill="url(#mascotGrad)" stroke="#1D4ED8" strokeWidth="2.5" />
          
          {/* Left Wing/Arm waving */}
          {expression === "wave" ? (
            <motion.path 
              d="M 18 55 C 8 45, 10 25, 22 35 Z" 
              fill="#0071F2" 
              stroke="#1D4ED8" 
              strokeWidth="2" 
              animate={{ rotate: [0, -20, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              style={{ originX: "20px", originY: "50px" }}
            />
          ) : (
            <path d="M 18 55 C 8 60, 5 70, 18 75 Z" fill="#0071F2" stroke="#1D4ED8" strokeWidth="2" />
          )}

          {/* Right Arm */}
          <path d="M 102 55 C 112 60, 115 70, 102 75 Z" fill="#0071F2" stroke="#1D4ED8" strokeWidth="2" />

          {/* Eyebrows */}
          <path d="M 38 42 Q 45 36 51 40" stroke="#1E293B" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 69 40 Q 75 36 82 42" stroke="#1E293B" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* Rosy blush cheeks */}
          <circle cx="34" cy="58" r="6" fill="#FF4D8D" opacity="0.4" />
          <circle cx="86" cy="58" r="6" fill="#FF4D8D" opacity="0.4" />

          {/* Expressions mapping */}
          {expression === "happy" && (
            <>
              {/* Joyful arches for eyes */}
              <path d="M 32 48 Q 40 40 48 48" stroke="#1E293B" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M 72 48 Q 80 40 88 48" stroke="#1E293B" strokeWidth="3" fill="none" strokeLinecap="round" />
              {/* Cute smiling blushing cheeks */}
              <path d="M 52 58 Q 60 66 68 58" stroke="#1E293B" strokeWidth="3" fill="none" strokeLinecap="round" />
            </>
          )}

          {expression === "wave" && (
            <>
              {/* Left wink, Right open */}
              <path d="M 32 52 Q 40 44 48 52" stroke="#1E293B" strokeWidth="3" fill="none" strokeLinecap="round" />
              <circle cx="80" cy="50" r="5" fill="#1E293B" />
              <circle cx="78" cy="48" r="2" fill="#FFFFFF" />
              <path d="M 54 58 Q 60 64 66 58" stroke="#1E293B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </>
          )}

          {expression === "explain" && (
            <>
              {/* Smart specs eyeglasses */}
              <circle cx="42" cy="50" r="10" fill="none" stroke="#FFFFFF" strokeWidth="3" />
              <circle cx="78" cy="50" r="10" fill="none" stroke="#FFFFFF" strokeWidth="3" />
              <line x1="52" y1="50" x2="68" y2="50" stroke="#FFFFFF" strokeWidth="3" />
              <circle cx="42" cy="50" r="4" fill="#1E293B" />
              <circle cx="78" cy="50" r="4" fill="#1E293B" />
              <path d="M 54 62 Q 60 66 66 62" stroke="#1E293B" strokeWidth="2" fill="none" />
            </>
          )}

          {expression === "super" && (
            <>
              <circle cx="40" cy="50" r="6" fill="#1E293B" />
              <circle cx="80" cy="50" r="6" fill="#1E293B" />
              <circle cx="38" cy="48" r="2" fill="#FFFFFF" />
              <circle cx="78" cy="48" r="2" fill="#FFFFFF" />
              {/* Sparkle emblem on forehead */}
              <path d="M 60 22 L 63 32 L 72 32 L 65 37 L 68 46 L 60 40 L 52 46 L 55 37 L 48 32 L 57 32 Z" fill="#FBBF24" />
              {/* Glowing smile */}
              <path d="M 50 58 Q 60 70 70 58 Z" fill="#F43F5E" stroke="#1E233B" strokeWidth="1.5" />
            </>
          )}

          {expression === "surprised" && (
            <>
              <circle cx="40" cy="50" r="7" fill="#1E293B" />
              <circle cx="80" cy="50" r="7" fill="#1E293B" />
              <circle cx="38" cy="47" r="2.5" fill="#FFFFFF" />
              <circle cx="78" cy="47" r="2.5" fill="#FFFFFF" />
              {/* Tiny rounded amazed mouth */}
              <circle cx="60" cy="62" r="5.5" fill="#1E293B" />
            </>
          )}
        </motion.g>
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 bg-[#0F172AD0] dark:bg-[#020617E8] backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <motion.div 
        key={currentIdx}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 sm:p-6 max-w-sm sm:max-w-md w-full shadow-2xl relative border-[3px] border-blue-50 dark:border-slate-800 overflow-hidden"
      >
        {/* Close Button top-right */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Mascot + Title Row */}
        <div className="flex flex-col items-center text-center gap-3 mt-1">
          {renderMascotSVG(currentStep.mascotExpression)}
          
          <div className="flex flex-col gap-1 items-center">
            <span className="px-3 py-0.5 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-full font-black text-[9px] sm:text-[10px] tracking-wider uppercase">
              {currentStep.badge}
            </span>
            <h3 className="text-lg sm:text-xl font-black text-[#1E293B] dark:text-white mt-1.5">
              {currentStep.title}
            </h3>
          </div>
        </div>

        {/* Feature Explanation */}
        <div className="mt-4 bg-[#F8FAFC] dark:bg-slate-950 border-2 border-blue-50/50 dark:border-slate-800/40 p-4 rounded-2xl flex items-start gap-3">
          <div className="p-2.5 bg-white dark:bg-slate-800 border border-blue-50 dark:border-slate-700 shadow-sm rounded-xl flex-shrink-0">
            {currentStep.icon}
          </div>
          <div className="flex flex-col gap-1 leading-normal">
            <p className="text-xs sm:text-sm font-semibold text-[#334155] dark:text-slate-300">
              {currentStep.description}
            </p>
            <p className="text-[10px] sm:text-[11px] font-bold text-blue-500 dark:text-blue-400 italic mt-1 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 shrink-0" /> {currentStep.hint}
            </p>
          </div>
        </div>

        {/* Stepper Dots Indicator */}
        <div className="flex justify-center gap-2 mt-5">
          {steps.map((step, idx) => (
            <button
              key={step.id}
              onClick={() => setCurrentIdx(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIdx ? "w-6 bg-[#FF4D8D]" : "w-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Stepper Navigation Buttons */}
        <div className="flex gap-2.5 mt-5">
          {currentIdx > 0 ? (
            <button
              onClick={handlePrev}
              className="flex-1 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 text-[#475569] dark:text-slate-300 font-black rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs playful-button"
            >
              <ChevronLeft className="w-4 h-4" /> Kembali
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 py-3 text-[#94A3B8] hover:text-[#475569] dark:hover:text-slate-300 transition-all font-bold text-xs text-center"
            >
              Lewati Tutorial
            </button>
          )}

          <button
            onClick={handleNext}
            className="flex-1 py-3 bg-[#FF4D8D] hover:bg-[#E6397A] text-white font-extrabold rounded-xl transition-all flex items-center justify-center gap-1 text-xs shadow-md shadow-pink-500/10 playful-button"
          >
            {currentIdx === steps.length - 1 ? (
              <>Mulai <Check className="w-4 h-4 ml-1" /></>
            ) : (
              <>Lanjut <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>

        {/* Launch custom button trigger directly inside step 2 tool */}
        {currentStep.id === 2 && onOpenCreator && (
          <div className="mt-3.5 flex justify-center">
            <button
              onClick={() => {
                onClose();
                onOpenCreator();
              }}
              className="py-2 px-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 font-bold rounded-xl text-[10px] sm:text-xs flex items-center gap-1.5 transition-all animate-pulse"
            >
              Coba Character Creator Sekarang! →
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
