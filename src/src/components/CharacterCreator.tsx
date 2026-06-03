import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Sparkles, 
  Smile, 
  Crown, 
  Shirt, 
  Palette, 
  Dices, 
  Download, 
  Play, 
  Gamepad2,
  Check,
  Glasses,
  Star as StarIcon,
  Bot,
  Zap,
  RefreshCw
} from "lucide-react";

export interface AvatarConfig {
  name: string;
  bodyShape: "sphere" | "box" | "capsule" | "star" | "cylinder";
  colorHex: string;
  facialFeature: "anime" | "googly" | "wink" | "sleepy" | "surprised";
  clothing: "bowtie" | "cloak" | "scarf" | "jacket" | "cape" | "none";
  accessory: "crown" | "wizard" | "cat" | "glasses" | "propeller" | "none";
}

interface CharacterCreatorProps {
  onUseCharacter: (config: AvatarConfig) => void;
  onClose?: () => void;
  initialConfig?: AvatarConfig;
}

const PRESET_COLORS = [
  { name: "Coral Pink", hex: "#FF6B8B" },
  { name: "Oceanic Blue", hex: "#3B82F6" },
  { name: "Vibrant Emerald", hex: "#10B981" },
  { name: "Sunny Gold", hex: "#F59E0B" },
  { name: "Royal Violet", hex: "#8B5CF6" },
  { name: "Bright Tangerine", hex: "#F97316" },
  { name: "Lavender Kiss", hex: "#D6BCFA" },
  { name: "Mint Fresh", hex: "#68D391" },
  { name: "Teal Deep", hex: "#319795" },
  { name: "Crimson Red", hex: "#E53E3E" },
];

const BODY_SHAPES = [
  { id: "sphere", label: "Sphere (Bulat)", desc: "Karakter bulat ramah dan ceria" },
  { id: "box", label: "Box (Kotak)", desc: "Karakter robotik, gadget, atau balok" },
  { id: "capsule", label: "Capsule (Kapsul)", desc: "Ramping, cocok untuk sayur/alat tulis" },
  { id: "star", label: "Star (Bintang)", desc: "Karakter luar angkasa penuh keajaiban" },
  { id: "cylinder", label: "Cylinder (Drum)", desc: "Gaya silinder kokoh dan unik" },
];

const FACIAL_FEATURES = [
  { id: "anime", label: "Anime Sparkle", desc: "Mata berbinar bintang & pipi merona" },
  { id: "googly", label: "Googly Silly", desc: "Mata juling kocak & lidah menjulur" },
  { id: "wink", label: "Cute Wink", desc: "Kedipan mata genit & senyum lebar" },
  { id: "sleepy", label: "Sleepy Chibi", desc: "Mata tertutup santai & efek mengantuk" },
  { id: "surprised", label: "Surprised Wow", desc: "Mata bulat lebar & mulut 'O'" },
];

const CLOTHING_OPTIONS = [
  { id: "bowtie", label: "Red Bowtie", desc: "Dasi kupu-kupu merah formal lucu" },
  { id: "cloak", label: "Wizard Cloak", desc: "Jubah penyihir ungu berbintang" },
  { id: "scarf", label: "Warm Scarf", desc: "Syal rajut belang biru-putih hangat" },
  { id: "jacket", label: "Varsity Jacket", desc: "Jaket olahraga anak muda trendy" },
  { id: "cape", label: "Hero Cape", desc: "Jubah superhero merah berani" },
  { id: "none", label: "No Clothes", desc: "Tanpa pakaian tambahan" },
];

const ACCESSORIES_OPTIONS = [
  { id: "crown", label: "Golden Crown", desc: "Mahkota kerajaan emas berkilau" },
  { id: "wizard", label: "Wizard Hat", desc: "Topi penyihir biru runcing klasik" },
  { id: "cat", label: "Kitty Ears", desc: "Bando telinga kucing pink manis" },
  { id: "glasses", label: "Cool Glasses", desc: "Kacamata hitam retro keren" },
  { id: "propeller", label: "Propeller Cap", desc: "Topi baling-baling warna-warni lucu" },
  { id: "none", label: "No Accessory", desc: "Tampil natural polos" },
];

export default function CharacterCreator({ onUseCharacter, onClose, initialConfig }: CharacterCreatorProps) {
  const [config, setConfig] = useState<AvatarConfig>(initialConfig || {
    name: "Mony",
    bodyShape: "sphere",
    colorHex: "#FF6B8B",
    facialFeature: "anime",
    clothing: "bowtie",
    accessory: "crown"
  });

  const [activeTab, setActiveTab] = useState<"body" | "face" | "clothes" | "acc">("body");
  const [copied, setCopied] = useState(false);

  const randomize = () => {
    const randomNamePresets = ["Pip", "Ollie", "Gloop", "Widget", "Sparky", "Bubu", "Ziggy", "Chomp", "Puff", "Dino", "Pixel", "Kiko"];
    const randomName = randomNamePresets[Math.floor(Math.random() * randomNamePresets.length)];
    const randomShape = BODY_SHAPES[Math.floor(Math.random() * BODY_SHAPES.length)].id as any;
    const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)].hex;
    const randomFace = FACIAL_FEATURES[Math.floor(Math.random() * FACIAL_FEATURES.length)].id as any;
    const randomClothing = CLOTHING_OPTIONS[Math.floor(Math.random() * CLOTHING_OPTIONS.length)].id as any;
    const randomAcc = ACCESSORIES_OPTIONS[Math.floor(Math.random() * ACCESSORIES_OPTIONS.length)].id as any;

    setConfig({
      name: randomName,
      bodyShape: randomShape,
      colorHex: randomColor,
      facialFeature: randomFace,
      clothing: randomClothing,
      accessory: randomAcc
    });
  };

  // Helper to get secondary shade of color
  const getDarkerColor = (hex: string) => {
    // simple hex darken approximation
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    
    r = Math.max(0, Math.floor(r * 0.7));
    g = Math.max(0, Math.floor(g * 0.7));
    b = Math.max(0, Math.floor(b * 0.7));
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  const getLighterColor = (hex: string) => {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    
    r = Math.min(255, Math.floor(r + (255 - r) * 0.35));
    g = Math.min(255, Math.floor(g + (255 - g) * 0.35));
    b = Math.min(255, Math.floor(b + (255 - b) * 0.35));
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  // This renders our dynamic SVGs!
  const renderAvatarSVG = () => {
    const baseColor = config.colorHex;
    const shadowColor = getDarkerColor(baseColor);
    const highlightColor = getLighterColor(baseColor);

    return (
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl" id="custom-avatar-svg">
        <defs>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={highlightColor} />
            <stop offset="60%" stopColor={baseColor} />
            <stop offset="100%" stopColor={shadowColor} />
          </linearGradient>
          <radialGradient id="highlightGrad" cx="30%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="purpleCloakGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6B46C1" />
            <stop offset="100%" stopColor="#3B0764" />
          </linearGradient>
        </defs>

        {/* Dynamic Background Circle behind avatar */}
        <circle cx="100" cy="110" r="75" fill="#f1f5f9" opacity="0.3" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 4" />

        {/* LAYER CONTENT: Backing Accessories (e.g. superhero cape, back/cloak) */}
        {config.clothing === "cloak" && (
          <path d="M 60 120 C 30 150, 40 180, 100 185 C 160 180, 170 150, 140 120 Z" fill="url(#purpleCloakGrad)" stroke="#4A148C" strokeWidth="2" />
        )}
        {config.clothing === "cape" && (
          <path d="M 65 115 L 30 175 C 25 185, 75 190, 100 185 C 125 190, 175 185, 170 175 L 135 115 Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="2" />
        )}

        {/* LAYER CONTENT: Main Body Shape */}
        <g id="avatar-body">
          {config.bodyShape === "sphere" && (
            <>
              <circle cx="100" cy="115" r="48" fill="url(#bodyGrad)" stroke={shadowColor} strokeWidth="3" />
              <circle cx="90" cy="100" r="38" fill="url(#highlightGrad)" pointerEvents="none" />
            </>
          )}

          {config.bodyShape === "box" && (
            <>
              <rect x="52" y="67" width="96" height="96" rx="20" fill="url(#bodyGrad)" stroke={shadowColor} strokeWidth="3" />
              <rect x="58" y="73" width="84" height="84" rx="14" fill="url(#highlightGrad)" pointerEvents="none" />
            </>
          )}

          {config.bodyShape === "capsule" && (
            <>
              <rect x="62" y="55" width="76" height="118" rx="38" fill="url(#bodyGrad)" stroke={shadowColor} strokeWidth="3" />
              <rect x="68" y="61" width="64" height="106" rx="32" fill="url(#highlightGrad)" pointerEvents="none" />
            </>
          )}

          {config.bodyShape === "star" && (
            <>
              <path 
                d="M 100 52 L 115 88 L 152 90 L 122 112 L 135 148 L 100 128 L 65 148 L 78 112 L 48 90 L 85 88 Z" 
                fill="url(#bodyGrad)" 
                stroke={shadowColor} 
                strokeWidth="3" 
                strokeLinejoin="round"
              />
              <path 
                d="M 100 58 L 112 90 L 144 91 L 119 111 L 131 141 L 100 124 L 69 141 L 81 111 L 56 91 L 88 90 Z" 
                fill="url(#highlightGrad)" 
                pointerEvents="none"
              />
            </>
          )}

          {config.bodyShape === "cylinder" && (
            <>
              {/* Bottom Round Cap */}
              <path d="M 58 135 A 42 16 0 0 0 142 135 L 142 90 L 58 90 Z" fill="url(#bodyGrad)" stroke={shadowColor} strokeWidth="3" />
              <rect x="58" y="90" width="84" height="45" fill="url(#bodyGrad)" />
              {/* Cylinder height */}
              <ellipse cx="100" cy="90" rx="42" ry="16" fill={highlightColor} stroke={shadowColor} strokeWidth="3" />
              <ellipse cx="100" cy="90" rx="36" ry="12" fill={baseColor} />
            </>
          )}
        </g>

        {/* LAYER CONTENT: Face blushing */}
        <circle cx="75" cy="120" r="8" fill="#FF4D8D" opacity="0.35" filter="blur(1px)" />
        <circle cx="125" cy="120" r="8" fill="#FF4D8D" opacity="0.35" filter="blur(1px)" />

        {/* LAYER CONTENT: Eyebrows */}
        <g id="avatar-eyebrows" opacity="0.8">
          <path d="M 68 93 Q 75 88 82 94" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M 118 94 Q 125 88 132 93" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </g>

        {/* LAYER CONTENT: Facial Features */}
        <g id="avatar-eyes">
          {config.facialFeature === "anime" && (
            <>
              {/* Big Expressive Anime Eyes */}
              <circle cx="76" cy="106" r="10" fill="#1E293B" />
              <circle cx="124" cy="106" r="10" fill="#1E293B" />
              {/* Sparkle Highlights */}
              <circle cx="73" cy="102" r="4" fill="#FFFFFF" />
              <circle cx="79" cy="110" r="1.5" fill="#FFFFFF" />
              <circle cx="121" cy="102" r="4" fill="#FFFFFF" />
              <circle cx="127" cy="110" r="1.5" fill="#FFFFFF" />
              {/* Smile Mouth */}
              <path d="M 94 118 Q 100 125 106 118" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" fill="none" />
            </>
          )}

          {config.facialFeature === "googly" && (
            <>
              {/* Googly eyes look silly */}
              <circle cx="74" cy="104" r="12" fill="#FFFFFF" stroke="#334155" strokeWidth="1.5" />
              <circle cx="126" cy="104" r="12" fill="#FFFFFF" stroke="#334155" strokeWidth="1.5" />
              
              <circle cx="77" cy="106" r="4.5" fill="#1E293B" />
              <circle cx="122" cy="105" r="4.5" fill="#1E293B" />

              {/* Rosy tongue sticking out */}
              <path d="M 96 118 Q 100 128 104 118 Z" fill="#EF4444" stroke="#1E293B" strokeWidth="2" />
              <line x1="100" y1="118" x2="100" y2="124" stroke="#1E293B" strokeWidth="1.5" />
              <path d="M 92 118 Q 100 122 108 118" stroke="#1E293B" strokeWidth="2.5" fill="none" />
            </>
          )}

          {config.facialFeature === "wink" && (
            <>
              {/* Winking left eye */}
              <path d="M 68 108 Q 76 100 84 108" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" fill="none" />
              {/* Right eye open */}
              <circle cx="124" cy="106" r="9" fill="#1E293B" />
              <circle cx="121" cy="102" r="3.5" fill="#FFFFFF" />
              <circle cx="126" cy="108" r="1" fill="#FFFFFF" />
              {/* Big Joyful mouth */}
              <path d="M 92 118 Q 100 132 108 118 Z" fill="#F43F5E" stroke="#1E293B" strokeWidth="2" />
            </>
          )}

          {config.facialFeature === "sleepy" && (
            <>
              {/* Both eyes closed and content */}
              <path d="M 66 108 Q 76 114 86 108" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <path d="M 114 108 Q 124 114 134 108" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              {/* Cozy sleepy mouth */}
              <path d="M 96 119 Q 100 121 104 119" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              {/* Sleep bubbles indicator Zzz */}
              <g transform="translate(142, 65) scale(0.7)">
                <text x="0" y="0" fontFamily="Fredoka" fontWeight="bold" fontSize="18" fill="#3B82F6" opacity="0.8">Z</text>
                <text x="10" y="-12" fontFamily="Fredoka" fontWeight="bold" fontSize="12" fill="#60A5FA" opacity="0.6">z</text>
                <text x="20" y="-20" fontFamily="Fredoka" fontWeight="bold" fontSize="8" fill="#93C5FD" opacity="0.4">z</text>
              </g>
            </>
          )}

          {config.facialFeature === "surprised" && (
            <>
              {/* Big surprised eyes */}
              <circle cx="74" cy="104" r="10" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2" />
              <circle cx="126" cy="104" r="10" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2" />
              <circle cx="74" cy="104" r="3" fill="#1E293B" />
              <circle cx="126" cy="104" r="3" fill="#1E293B" />
              {/* O Mouth */}
              <ellipse cx="100" cy="122" rx="5" ry="8" fill="#1E293B" />
            </>
          )}
        </g>

        {/* LAYER CONTENT: Clothing (Drawn over face layer to fit properly) */}
        <g id="avatar-clothes">
          {config.clothing === "bowtie" && (
            <>
              <path d="M 80 135 L 100 143 L 80 151 Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="1.5" />
              <path d="M 120 135 L 100 143 L 120 151 Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="1.5" />
              <circle cx="100" cy="143" r="5" fill="#EF4444" stroke="#991B1B" strokeWidth="1.5" />
            </>
          )}

          {config.clothing === "cloak" && (
            <g>
              {/* Cloak collars around neck */}
              <path d="M 75 136 Q 100 148 125 136" stroke="#4A148C" strokeWidth="6" fill="none" strokeLinecap="round" />
              <circle cx="100" cy="143" r="4.5" fill="#FBBF24" />
            </g>
          )}

          {config.clothing === "scarf" && (
            <g id="scarf-layer">
              {/* Main scarf block */}
              <path d="M 68 132 C 68 132, 100 152, 132 132 C 132 132, 140 142, 132 148 C 120 154, 80 154, 68 148 Z" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="2" />
              {/* Scarf striping decoration */}
              <path d="M 80 138 L 84 148" stroke="#FFFFFF" strokeWidth="4" />
              <path d="M 100 140 L 100 149" stroke="#FFFFFF" strokeWidth="4" />
              <path d="M 120 138 L 116 148" stroke="#FFFFFF" strokeWidth="4" />
              {/* Hanging scarf tail */}
              <path d="M 115 145 C 115 145, 125 158, 122 178 C 112 178, 105 168, 107 146 Z" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="2" />
              <path d="M 116 155 Q 112 165 115 174" stroke="#FFFFFF" strokeWidth="3" />
            </g>
          )}

          {config.clothing === "jacket" && (
            <g id="jacket-body">
              {/* Left and right jacket parts */}
              <path d="M 54 130 C 50 145, 54 163, 62 163" stroke="#EF4444" strokeWidth="7" fill="none" strokeLinecap="round" />
              <path d="M 146 130 C 150 145, 146 163, 138 163" stroke="#EF4444" strokeWidth="7" fill="none" strokeLinecap="round" />
              {/* White sleeves */}
              <path d="M 52 135 L 42 155" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
              <path d="M 148 135 L 158 155" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
              {/* Yellow zippers & buttons decoration */}
              <circle cx="100" cy="150" r="3" fill="#FBBF24" />
            </g>
          )}

          {config.clothing === "cape" && (
            <g>
              {/* Small neck tie for cape */}
              <circle cx="100" cy="138" r="4" fill="#EF4444" />
              <line x1="88" y1="135" x2="112" y2="135" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
            </g>
          )}
        </g>

        {/* LAYER CONTENT: Accessories on top of Head */}
        <g id="avatar-accessories">
          {config.accessory === "crown" && (
            <g transform="translate(100, 65) scale(0.95)" className="animate-pulse">
              {/* Golden 3 point Crown */}
              <path d="M -30 10 L -35 -15 L -12 -3 L 0 -22 L 12 -3 L 35 -15 L 30 10 Z" fill="#FBBF24" stroke="#B45309" strokeWidth="2" strokeLinejoin="round" />
              {/* Bottom crown band */}
              <rect x="-30" y="5" width="60" height="5" fill="#D97706" />
              {/* Colorful Jewels */}
              <circle cx="-25" cy="-8" r="3" fill="#3B82F6" />
              <circle cx="0" cy="-12" r="3" fill="#EF4444" />
              <circle cx="25" cy="-8" r="3" fill="#10B981" />
              <circle cx="0" cy="0" r="2.5" fill="#A855F7" />
            </g>
          )}

          {config.accessory === "wizard" && (
            <g transform="translate(100, 68) rotate(-5)">
              {/* Tall Magic Wizard Hat */}
              <path d="M -42 5 L -35 -3 L -10 -45 L 8 -5 C 20 -4, 38 4, 38 6 C 30 12, -40 12, -42 5 Z" fill="#1E3A8A" stroke="#1D4ED8" strokeWidth="2" />
              <path d="M -38 4 C -10 0, 10 0, 32 4" stroke="#FBBF24" strokeWidth="5" fill="none" />
              {/* Golden star highlights on wizard hat */}
              <path d="M -15 -18 L -12 -18 L -11 -21 L -10 -18 L -7 -18 L -9 -16 L -8 -13 L -11 -15 L -14 -13 L -13 -16 Z" fill="#FBBF24" />
              <circle cx="10" cy="-18" r="2" fill="#FBBF24" />
            </g>
          )}

          {config.accessory === "cat" && (
            <g transform="translate(100, 68)">
              {/* Hair band structure */}
              <path d="M -35 12 A 38 38 0 0 1 35 12" stroke="#475569" strokeWidth="3" fill="none" />
              {/* Kitty Ears Left */}
              <polygon points="-36,10 -42,-12 -20,-2" fill="#FDA4AF" stroke="#E11D48" strokeWidth="2" strokeLinejoin="round" />
              <polygon points="-33,8 -37,-6 -22,0" fill="#FFE4E6" />
              {/* Kitty Ears Right */}
              <polygon points="36,10 42,-12 20,-2" fill="#FDA4AF" stroke="#E11D48" strokeWidth="2" strokeLinejoin="round" />
              <polygon points="33,8 37,-6 22,0" fill="#FFE4E6" />
            </g>
          )}

          {config.accessory === "glasses" && (
            <g id="glasses-item" transform="translate(0, 4)">
              {/* Cool Aviator shades over eye region */}
              <rect x="54" y="94" width="38" height="25" rx="10" fill="#1E293B" fillOpacity="0.9" stroke="#E2E8F0" strokeWidth="2" />
              <rect x="108" y="94" width="38" height="25" rx="10" fill="#1E293B" fillOpacity="0.9" stroke="#E2E8F0" strokeWidth="2" />
              {/* Glasses center bridge */}
              <rect x="92" y="99" width="16" height="4" fill="#E2E8F0" />
              {/* Reflections */}
              <line x1="58" y1="99" x2="72" y2="112" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
              <line x1="112" y1="99" x2="126" y2="112" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
            </g>
          )}

          {config.accessory === "propeller" && (
            <g transform="translate(100, 68)">
              {/* Retro multi colored cap cover */}
              <path d="M -32 8 C -32 -10, 32 -10, 32 8 Z" fill="#EF4444" stroke="#991B1B" strokeWidth="2" />
              <path d="M -16 5 C -16 -6, 16 -6, 16 5 Z" fill="#FBBF24" />
              {/* Top needle */}
              <rect x="-2" y="-18" width="4" height="12" fill="#4B5563" />
              {/* Propeller plates */}
              <path d="M -18 -22 C -8 -22, -2 -19, -2 -18 L -2 -18 C -2 -17, -8 -14, -18 -14 Z" fill="#3B82F6" />
              <path d="M 18 -22 C 8 -22, 2 -19, 2 -18 L 2 -18 C 2 -17, 8 -14, 18 -14 Z" fill="#10B981" />
              <circle cx="0" cy="-18" r="3" fill="#D97706" />
            </g>
          )}
        </g>
      </svg>
    );
  };

  const copyPromptText = () => {
    const desc = `3D Pixar style character of a cute object named "${config.name}". Shape: ${config.bodyShape}, primary color: ${config.colorHex}, style: ${config.facialFeature} expression, clothing: ${config.clothing}, accessory: ${config.accessory}. 8K render --ar 9:16`;
    navigator.clipboard.writeText(desc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card rounded-[2.5rem] p-8 w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-8 shadow-2xl relative overflow-hidden">
      {/* Decorative floating shapes */}
      <div className="absolute top-[-10%] right-[-10%] w-[30%] h-[30%] bg-pink-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* LEFT: Live Interactive Preview Card */}
      <div className="w-full md:w-5/12 flex flex-col gap-6 items-center">
        <div className="w-full relative glass-card p-6 rounded-[2rem] flex flex-col items-center border border-white/60 bg-white/70 shadow-xl overflow-hidden group">
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button 
              onClick={randomize} 
              className="p-3 bg-white hover:bg-pink-50 text-[#FF4D8D] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center border border-pink-100 font-bold text-xs gap-1.5 playful-button btn-randomize"
              title="Randomize Avatar"
            >
              <Dices className="w-4 h-4" /> Random
            </button>
          </div>

          <div className="w-full aspect-square max-w-[280px] bg-gradient-to-tr from-blue-50/70 to-pink-50/70 rounded-[2.5rem] border-4 border-white shadow-inner flex items-center justify-center relative p-2 overflow-hidden mx-auto">
            {/* Dynamic rotating sparks backgrounds */}
            <div className="absolute inset-0 flex items-center justify-center filter blur-xl opacity-30 select-none animate-pulse">
              <div className="w-36 h-36 rounded-full bg-blue-400" />
              <div className="w-36 h-36 rounded-full bg-pink-400 translate-x-8" />
            </div>

            {/* Breathing animation around SVG */}
            <motion.div 
              className="w-full h-full p-2 relative z-10 select-none cursor-pointer"
              animate={{
                y: [0, -6, 0],
                rotate: [0, 1.5, -1.5, 0],
                scale: [1, 1.015, 0.99, 1]
              }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {renderAvatarSVG()}
            </motion.div>
          </div>

          {/* Interactive Character Name Input */}
          <div className="w-full mt-4 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 border-b-2 border-pink-100 focus-within:border-pink-500 transition-colors py-1 max-w-[200px]">
              <input 
                type="text" 
                value={config.name}
                id="avatar-name"
                onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Name your object..."
                className="text-center font-black text-2xl text-[#1E293B] bg-transparent outline-none w-full placeholder:text-gray-300"
              />
            </div>
            <p className="text-xs font-black text-pink-500 uppercase tracking-widest flex items-center gap-1 mt-1">
              <Sparkles className="w-3.5 h-3.5" /> Customized Avatar
            </p>
          </div>
        </div>

        {/* Action Quick Row */}
        <div className="w-full grid grid-cols-2 gap-3">
          <button 
            type="button"
            onClick={copyPromptText}
            className="p-4 bg-white hover:bg-gray-50 text-[#1E293B] border-2 border-blue-50 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all shadow-sm active:scale-98"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <StarIcon className="w-4 h-4 text-orange-400" />}
            {copied ? "Prompt Copied" : "Copy Prompt Specs"}
          </button>
          
          <button 
            type="button"
            onClick={() => {
              // Trigger PNG/SVG download
              const svgEl = document.getElementById("custom-avatar-svg");
              if (svgEl) {
                const svgString = new XMLSerializer().serializeToString(svgEl);
                const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `${config.name}-character.svg`;
                link.click();
                URL.revokeObjectURL(url);
              }
            }}
            className="p-4 bg-white hover:bg-gray-50 text-[#1E293B] border-2 border-blue-50 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all shadow-sm active:scale-98"
          >
            <Download className="w-4 h-4 text-blue-500" /> Download SVG
          </button>
        </div>
      </div>

      {/* RIGHT: Option Selecting Panels */}
      <div className="w-full md:w-7/12 flex flex-col justify-between">
        <div className="flex flex-col gap-5">
          {/* Top Panel Tabs */}
          <div className="flex p-1.5 bg-gray-100 rounded-2xl gap-1">
            {[
              { id: "body", label: "Body & Color", icon: <Palette className="w-4 h-4" /> },
              { id: "face", label: "Facial Expressions", icon: <Smile className="w-4 h-4" /> },
              { id: "clothes", label: "Clothing", icon: <Shirt className="w-4 h-4" /> },
              { id: "acc", label: "Accessories", icon: <Crown className="w-4 h-4" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === tab.id 
                    ? "bg-white text-blue-600 shadow-md transform scale-[1.02]" 
                    : "text-[#64748B] hover:text-[#1E293B] hover:bg-white/40"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Window */}
          <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4">
            {activeTab === "body" && (
              <div className="flex flex-col gap-6">
                {/* Shapes */}
                <div>
                  <h4 className="font-extrabold text-[#1E293B] mb-3 text-sm tracking-wider uppercase">Choose Base Shape</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {BODY_SHAPES.map(shape => (
                      <button
                        key={shape.id}
                        onClick={() => setConfig(prev => ({ ...prev, bodyShape: shape.id as any }))}
                        className={`p-4 rounded-2xl text-left border-2 transition-all flex flex-col gap-1 ${
                          config.bodyShape === shape.id 
                            ? "bg-blue-50 border-blue-500 shadow-sm" 
                            : "bg-white border-blue-50 hover:border-blue-200"
                        }`}
                      >
                        <span className="font-bold text-[#1E293B] text-sm flex items-center gap-2">
                          <Bot className={`w-4 h-4 ${config.bodyShape === shape.id ? 'text-blue-500' : 'text-gray-400'}`} />
                          {shape.label}
                        </span>
                        <span className="text-[10px] text-[#64748B] leading-normal">{shape.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colors */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-extrabold text-[#1E293B] text-sm tracking-wider uppercase">Pick Vibrant Color</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500">Hex:</span>
                      <input 
                        type="color" 
                        value={config.colorHex}
                        onChange={(e) => setConfig(prev => ({ ...prev, colorHex: e.target.value.toUpperCase() }))}
                        className="w-8 h-8 rounded-full border border-gray-300 cursor-pointer overflow-hidden leading-none p-0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color.hex}
                        onClick={() => setConfig(prev => ({ ...prev, colorHex: color.hex }))}
                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 h-14 relative ${
                          config.colorHex === color.hex 
                            ? "border-blue-500 shadow-md scale-105" 
                            : "border-transparent hover:scale-[1.03]"
                        }`}
                        title={color.name}
                        style={{ backgroundColor: color.hex }}
                      >
                        {config.colorHex === color.hex && (
                          <span className="absolute inset-0 m-auto w-5 h-5 bg-white/90 rounded-full flex items-center justify-center text-blue-600">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "face" && (
              <div className="flex flex-col gap-3">
                <h4 className="font-extrabold text-[#1E293B] text-sm tracking-wider uppercase mb-1">Pick Facial Expression</h4>
                <div className="grid grid-cols-1 gap-3">
                  {FACIAL_FEATURES.map(face => (
                    <button
                      key={face.id}
                      onClick={() => setConfig(prev => ({ ...prev, facialFeature: face.id as any }))}
                      className={`p-4 rounded-2xl text-left border-2 transition-all flex items-center justify-between ${
                        config.facialFeature === face.id 
                          ? "bg-blue-50 border-blue-500 shadow-sm" 
                          : "bg-white border-blue-50 hover:border-blue-200"
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-extrabold text-[#1E293B] text-sm">{face.label}</span>
                        <span className="text-[11px] text-[#64748B]">{face.desc}</span>
                      </div>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        config.facialFeature === face.id ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
                      }`}>
                        <Smile className="w-5 h-5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "clothes" && (
              <div className="flex flex-col gap-3">
                <h4 className="font-extrabold text-[#1E293B] text-sm tracking-wider uppercase mb-1">Select Wardrobe Style</h4>
                <div className="grid grid-cols-1 gap-3">
                  {CLOTHING_OPTIONS.map(cloth => (
                    <button
                      key={cloth.id}
                      onClick={() => setConfig(prev => ({ ...prev, clothing: cloth.id as any }))}
                      className={`p-4 rounded-2xl text-left border-2 transition-all flex items-center justify-between ${
                        config.clothing === cloth.id 
                          ? "bg-blue-50 border-blue-500 shadow-sm" 
                          : "bg-white border-blue-50 hover:border-blue-200"
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-extrabold text-[#1E293B] text-sm">{cloth.label}</span>
                        <span className="text-[11px] text-[#64748B]">{cloth.desc}</span>
                      </div>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        config.clothing === cloth.id ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
                      }`}>
                        <Shirt className="w-5 h-5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "acc" && (
              <div className="flex flex-col gap-3">
                <h4 className="font-extrabold text-[#1E293B] text-sm tracking-wider uppercase mb-1">Pick Accessory Upgrade</h4>
                <div className="grid grid-cols-1 gap-3">
                  {ACCESSORIES_OPTIONS.map(acc => (
                    <button
                      key={acc.id}
                      onClick={() => setConfig(prev => ({ ...prev, accessory: acc.id as any }))}
                      className={`p-4 rounded-2xl text-left border-2 transition-all flex items-center justify-between ${
                        config.accessory === acc.id 
                          ? "bg-blue-50 border-blue-500 shadow-sm" 
                          : "bg-white border-blue-50 hover:border-blue-200"
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-extrabold text-[#1E293B] text-sm">{acc.label}</span>
                        <span className="text-[11px] text-[#64748B]">{acc.desc}</span>
                      </div>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        config.accessory === acc.id ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
                      }`}>
                        {acc.id === "glasses" ? <Glasses className="w-5 h-5" /> : <Crown className="w-5 h-5" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM: Use Character and Close layout */}
        <div className="mt-8 flex gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="py-5 px-6 border-2 border-gray-200 hover:border-gray-300 text-gray-600 rounded-3xl font-bold transition-all flex-1 text-base playful-button"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => onUseCharacter(config)}
            disabled={!config.name.trim()}
            className="py-5 px-8 bg-[#FF4D8D] hover:bg-[#E6397A] disabled:opacity-50 text-white font-extrabold rounded-3xl transition-all flex-[2] text-base flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 playful-button md:w-auto overflow-hidden text-ellipsis whitespace-nowrap btn-creator-save"
          >
            <Sparkles className="w-5 h-5" /> Gunakan Karakter ini & Lanjut →
          </button>
        </div>
      </div>
    </div>
  );
}
