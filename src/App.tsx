/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw, 
  Copy, 
  Check, 
  Video, 
  Image as ImageIcon,
  Mic,
  Camera,
  Users,
  Layers,
  Smile,
  Zap,
  Globe,
  Monitor,
  Apple,
  Carrot,
  Smartphone,
  Pizza,
  History,
  Download,
  Loader2,
  Edit3,
  Play,
  Volume2,
  Trash2,
  LogOut,
  LogIn,
  Gamepad2,
  Star,
  Heart,
  Glasses,
  Crown,
  Dog,
  Fish,
  Rocket,
  Car,
  Pencil,
  Trophy,
  Music,
  Home,
  Trees,
  Shirt,
  Stethoscope,
  HelpCircle,
  Sun,
  Moon,
  Lock,
  Key,
  Eye,
  EyeOff,
  Settings
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import ReactMarkdown from "react-markdown";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, deleteDoc, doc, serverTimestamp, getDocFromServer, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import firebaseConfig from "@/firebase-applet-config.json";
import CharacterCreator, { AvatarConfig } from "@/src/components/CharacterCreator";
import TutorialMode from "@/src/components/TutorialMode";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

// Firestore Error and Connection Handling
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Types
type Category = "Fruits" | "Vegetables" | "Gadgets" | "Junk Food";

interface StepOption {
  id: number;
  label: string;
  tooltip?: string;
  icon?: React.ReactNode;
  color?: string;
}

interface Selection {
  category: string | null;
  object: string | null;
  template: string | null;
  accessory: string | null;
  ratio: string | null;
  language: string | null;
  npcMode: string | null;
  storyDepth: string | null;
  emotionStyle: string | null;
  hookIntensity: string | null;
  voicePersona: string | null;
  cameraMovement: string | null;
}

const TEMPLATES: StepOption[] = [
  { id: 1, label: "POV Story", tooltip: "Karakter berbicara langsung ke penonton (POV).", icon: <Users className="w-6 h-6" />, color: "emerald" },
  { id: 2, label: "Did You Know?", tooltip: "Fakta unik dan edukatif yang mengejutkan.", icon: <Sparkles className="w-6 h-6" />, color: "violet" },
  { id: 3, label: "Life Hack", tooltip: "Tips praktis dari sudut pandang objek.", icon: <Zap className="w-6 h-6" />, color: "blue" },
  { id: 4, label: "Day in Life", tooltip: "Rutinitas harian objek di dalam tubuh/lingkungan.", icon: <History className="w-6 h-6" />, color: "cyan" },
  { id: 5, label: "Nope (Standard)", tooltip: "Gunakan alur cerita standar.", icon: <Layers className="w-6 h-6 opacity-50" />, color: "pink" },
];

const ACCESSORIES: StepOption[] = [
  { id: 1, label: "Cool Glasses", tooltip: "Karakter memakai kacamata hitam keren.", icon: <Glasses className="w-6 h-6" />, color: "emerald" },
  { id: 2, label: "Golden Crown", tooltip: "Karakter memakai mahkota emas mewah.", icon: <Crown className="w-6 h-6" />, color: "violet" },
  { id: 3, label: "Wizard Hat", tooltip: "Karakter memakai topi penyihir misterius.", icon: <Star className="w-6 h-6" />, color: "blue" },
  { id: 4, label: "Red Bowtie", tooltip: "Karakter memakai dasi kupu-kupu merah lucu.", icon: <Heart className="w-6 h-6" />, color: "cyan" },
  { id: 5, label: "No Accessory", tooltip: "Karakter tampil apa adanya.", icon: <Smile className="w-6 h-6 opacity-50" />, color: "pink" },
];

const CATEGORIES: StepOption[] = [
  { id: 1, label: "Fruits", tooltip: "Buah-buahan segar dengan penjelasan nutrisi.", icon: <Apple className="w-6 h-6" />, color: "emerald" },
  { id: 2, label: "Vegetables", tooltip: "Sayuran sehat untuk edukasi pola makan.", icon: <Carrot className="w-6 h-6" />, color: "violet" },
  { id: 3, label: "Gadgets", tooltip: "Teknologi dan gadget modern dalam dunia digital.", icon: <Smartphone className="w-6 h-6" />, color: "blue" },
  { id: 4, label: "Junk Food", tooltip: "Makanan cepat saji yang berperan sebagai karakter antagonis lucu.", icon: <Pizza className="w-6 h-6" />, color: "cyan" },
  { id: 5, label: "Animals", tooltip: "Hewan ternak dan peliharaan yang lucu.", icon: <Dog className="w-6 h-6" />, color: "pink" },
  { id: 6, label: "Sea Life", tooltip: "Makhluk bawah laut yang menakjubkan.", icon: <Fish className="w-6 h-6" />, color: "amber" },
  { id: 7, label: "Space", tooltip: "Objek luar angkasa dan petualangan galaksi.", icon: <Rocket className="w-6 h-6" />, color: "emerald" },
  { id: 8, label: "Vehicles", tooltip: "Alat transportasi darat, laut, dan udara.", icon: <Car className="w-6 h-6" />, color: "violet" },
  { id: 9, label: "Stationery", tooltip: "Peralatan sekolah dan alat tulis.", icon: <Pencil className="w-6 h-6" />, color: "blue" },
  { id: 10, label: "Sports", tooltip: "Peralatan olahraga dan aktivitas fisik.", icon: <Trophy className="w-6 h-6" />, color: "cyan" },
  { id: 11, label: "Music", tooltip: "Alat musik dan harmoni suara.", icon: <Music className="w-6 h-6" />, color: "pink" },
  { id: 12, label: "Household", tooltip: "Benda-benda unik di dalam rumah.", icon: <Home className="w-6 h-6" />, color: "amber" },
  { id: 13, label: "Nature", tooltip: "Elemen alam dan lingkungan hidup.", icon: <Trees className="w-6 h-6" />, color: "emerald" },
  { id: 14, label: "Clothing", tooltip: "Pakaian dan aksesoris fashion.", icon: <Shirt className="w-6 h-6" />, color: "violet" },
  { id: 15, label: "Medical", tooltip: "Peralatan medis dan kesehatan.", icon: <Stethoscope className="w-6 h-6" />, color: "blue" },
  { id: 16, label: "Enter your own category", tooltip: "Buat kategori objek Anda sendiri.", icon: <Layers className="w-6 h-6" />, color: "pink" },
];

const OBJECTS: Record<string, string[]> = {
  Fruits: ["Apple", "Banana", "Orange", "Strawberry", "Avocado", "Mango", "Watermelon", "Blueberry", "Pineapple", "Grapes", "Enter your own object"],
  Vegetables: ["Broccoli", "Carrot", "Spinach", "Tomato", "Eggplant", "Cabbage", "Chili Pepper", "Cucumber", "Onion", "Garlic", "Enter your own object"],
  Gadgets: ["Smartphone", "Laptop", "Alarm Clock", "Headphones", "Game Console", "Smartwatch", "Camera", "Tablet", "Keyboard", "Robot Assistant", "Enter your own object"],
  "Junk Food": ["Burger", "French Fries", "Fried Chicken", "Soda", "Donut", "Pizza", "Chips", "Chocolate", "Hotdog", "Ice Cream", "Enter your own object"],
  Animals: ["Cow", "Chicken", "Pig", "Sheep", "Horse", "Duck", "Goat", "Rabbit", "Turkey", "Donkey", "Enter your own object"],
  "Sea Life": ["Shark", "Whale", "Dolphin", "Octopus", "Seahorse", "Turtle", "Crab", "Jellyfish", "Starfish", "Lobster", "Enter your own object"],
  Space: ["Planet", "Star", "Astronaut", "Rocket", "Alien", "UFO", "Moon", "Sun", "Comet", "Satellite", "Enter your own object"],
  Vehicles: ["Car", "Airplane", "Boat", "Train", "Bicycle", "Motorcycle", "Helicopter", "Bus", "Truck", "Submarine", "Enter your own object"],
  Stationery: ["Pencil", "Pen", "Eraser", "Ruler", "Notebook", "Scissors", "Glue", "Stapler", "Calculator", "Backpack", "Enter your own object"],
  Sports: ["Soccer Ball", "Basketball", "Tennis Racket", "Baseball Bat", "Golf Club", "Bowling Ball", "Boxing Glove", "Skateboard", "Surfboard", "Bicycle", "Enter your own object"],
  Music: ["Piano", "Guitar", "Violin", "Drums", "Trumpet", "Flute", "Saxophone", "Harp", "Accordion", "Cello", "Enter your own object"],
  Household: ["Lamp", "Chair", "Table", "Clock", "Bed", "Mirror", "Sofa", "Television", "Fan", "Toaster", "Enter your own object"],
  Nature: ["Tree", "Flower", "Mountain", "Cloud", "Rain", "Sun", "Rainbow", "Volcano", "River", "Leaf", "Enter your own object"],
  Clothing: ["Hat", "Shirt", "Pants", "Dress", "Shoes", "Glasses", "Umbrella", "Watch", "Scarf", "Gloves", "Enter your own object"],
  Medical: ["Stethoscope", "Microscope", "Syringe", "First Aid Kit", "Pill", "Thermometer", "Bandage", "Hospital Bed", "Ambulance", "X-Ray", "Enter your own object"],
};

const RATIOS: StepOption[] = [
  { id: 1, label: "16:9 (Landscape)", tooltip: "Format landscape untuk YouTube atau TV.", icon: <Monitor className="w-5 h-5" /> },
  { id: 2, label: "9:16 (Portrait/Shorts)", tooltip: "Format portrait untuk TikTok, Reels, atau Shorts.", icon: <Smartphone className="w-5 h-5" /> },
];

const LANGUAGES: StepOption[] = [
  { id: 1, label: "Native US English", tooltip: "Seluruh konten dan dialog dalam Bahasa Inggris.", icon: <Globe className="w-5 h-5" /> },
  { id: 2, label: "Informal Indonesian", tooltip: "Seluruh konten dan dialog dalam Bahasa Indonesia informal.", icon: <Globe className="w-5 h-5" /> },
  { id: 3, label: "Prompt English, Dialog Indonesian", tooltip: "Prompt AI dalam Bahasa Inggris, dialog karakter dalam Bahasa Indonesia.", icon: <Globe className="w-5 h-5" /> },
];

const NPC_MODES: StepOption[] = [
  { id: 1, label: "With NPCs", tooltip: "Menampilkan manusia animasi di latar belakang untuk peragaan.", icon: <Users className="w-5 h-5" /> },
  { id: 2, label: "No NPCs", tooltip: "Hanya fokus pada objek utama tanpa karakter manusia.", icon: <Users className="w-5 h-5 opacity-50" /> },
];

const STORY_DEPTHS: StepOption[] = [
  { id: 1, label: "Short story (4–5 scenes)", tooltip: "Cerita singkat, cocok untuk hook cepat." },
  { id: 2, label: "Medium story (6–7 scenes)", tooltip: "Cerita standar dengan penjelasan lebih detail." },
  { id: 3, label: "Long story (8–10 scenes)", tooltip: "Cerita mendalam untuk konten edukasi lengkap." },
  { id: 4, label: "Nope (skip)", tooltip: "Biarkan AI menentukan panjang cerita terbaik." },
];

const EMOTION_STYLES: StepOption[] = [
  { id: 1, label: "Playful & funny", tooltip: "Karakter yang ceria dan banyak bercanda." },
  { id: 2, label: "Calm educational", tooltip: "Gaya bicara yang tenang dan sangat edukatif." },
  { id: 3, label: "Heroic helper", tooltip: "Karakter yang bersemangat membantu dan menyelamatkan." },
  { id: 4, label: "Slightly dramatic", tooltip: "Sedikit berlebihan dan penuh emosi untuk daya tarik." },
  { id: 5, label: "Nope (skip)", tooltip: "Biarkan AI memilih emosi yang paling cocok." },
];

const HOOK_INTENSITIES: StepOption[] = [
  { id: 1, label: "Soft hook", tooltip: "Pembukaan yang ramah dan santai." },
  { id: 2, label: "Curiosity hook", tooltip: "Memancing rasa penasaran penonton di awal." },
  { id: 3, label: "Strong viral hook", tooltip: "Pembukaan yang sangat menarik perhatian (viral style)." },
  { id: 4, label: "Nope (auto hook)", tooltip: "Gunakan hook standar yang efektif." },
];

const VOICE_PERSONAS: StepOption[] = [
  { id: 1, label: "Young female educator (warm & friendly)", tooltip: "Suara wanita muda yang hangat dan ramah." },
  { id: 2, label: "Young male educator (calm & informative)", tooltip: "Suara pria muda yang tenang dan informatif." },
  { id: 3, label: "Energetic young female narrator", tooltip: "Suara wanita yang penuh semangat dan ceria." },
  { id: 4, label: "Calm documentary male voice", tooltip: "Suara pria dewasa dengan gaya narasi dokumenter." },
  { id: 5, label: "Nope (auto voice)", tooltip: "Pilih suara yang paling sesuai dengan karakter." },
];

const CAMERA_MOVEMENTS: StepOption[] = [
  { id: 1, label: "Static character focus", tooltip: "Kamera tetap fokus pada karakter." },
  { id: 2, label: "Slow cinematic push-in", tooltip: "Kamera perlahan mendekat ke arah karakter." },
  { id: 3, label: "Gentle orbit camera", tooltip: "Kamera berputar mengelilingi karakter secara halus." },
  { id: 4, label: "Dynamic side tracking", tooltip: "Kamera bergerak menyamping mengikuti aksi." },
  { id: 5, label: "Nope (auto camera)", tooltip: "Gunakan pergerakan kamera sinematik otomatis." },
];

interface SceneCardProps {
  idx: number;
  scene: string;
  imagePrompt: string;
  videoPrompt: string;
  dialogue: string;
  copiedSceneIdx: number | null;
  copySceneToClipboard: (scene: string, idx: number) => void;
  generateSceneImage: (prompt: string, idx: number) => void;
  generatingSceneIdx: number | null;
  sceneImages: { [key: number]: string };
  downloadSceneImage: (url: string, idx: number) => void;
  playingSceneIdx: number | null;
  stopVoice: () => void;
  playVoice: (text: string, isFromApp?: boolean, idx?: number) => void;
}

function SceneCard({
  idx,
  scene,
  imagePrompt,
  videoPrompt,
  dialogue,
  copiedSceneIdx,
  copySceneToClipboard,
  generateSceneImage,
  generatingSceneIdx,
  sceneImages,
  downloadSceneImage,
  playingSceneIdx,
  stopVoice,
  playVoice,
}: SceneCardProps) {
  const [activeTab, setActiveTab] = useState<"image" | "video" | "voice">("image");
  const [copiedText, setCopiedText] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5 bg-[#F8FAFC]/60 dark:bg-slate-900/40 rounded-3xl border-2 border-blue-100/40 dark:border-slate-800/55 shadow-sm hover:shadow-md transition-all">
      {/* Scene Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-50/50 dark:border-slate-800/45">
        <h3 className="text-lg font-black text-[#1E293B] dark:text-slate-100 flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center text-sm shadow-md shadow-blue-500/10">🎬</span>
          Scene {idx + 1}
        </h3>
        <button 
          onClick={() => copySceneToClipboard(`🎬 ${scene}`, idx)}
          className={cn(
            "self-start sm:self-auto py-2 px-3.5 rounded-xl transition-all flex items-center gap-2 text-xs font-black shadow-sm border",
            copiedSceneIdx === idx 
              ? "bg-emerald-500 text-white border-emerald-600" 
              : "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-slate-800"
          )}
        >
          {copiedSceneIdx === idx ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copiedSceneIdx === idx ? "Copied!" : "Salin Scene"}
        </button>
      </div>

      {/* Segmented Control / Tabs Navigation with cute responsive styling */}
      <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 shadow-inner">
        <button
          onClick={() => setActiveTab("image")}
          className={cn(
            "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 text-center font-black text-[10px] sm:text-xs rounded-xl transition-all duration-200",
            activeTab === "image"
              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-900/40"
          )}
        >
          <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
          <span>Gambar</span>
        </button>

        <button
          onClick={() => setActiveTab("video")}
          className={cn(
            "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 text-center font-black text-[10px] sm:text-xs rounded-xl transition-all duration-200",
            activeTab === "video"
              ? "bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-900/40"
          )}
        >
          <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-500" />
          <span>Video</span>
        </button>

        <button
          onClick={() => setActiveTab("voice")}
          className={cn(
            "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 text-center font-black text-[10px] sm:text-xs rounded-xl transition-all duration-200",
            activeTab === "voice"
              ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-900/40"
          )}
        >
          <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
          <span>Suara</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="mt-1 transition-all duration-300">
        <AnimatePresence mode="wait">
          {activeTab === "image" && (
            <motion.div
              key="image-tab"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-3.5"
            >
              {imagePrompt ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-[11px] font-black text-[#3b82f6] dark:text-blue-400 uppercase tracking-widest">Image Prompt</span>
                      <button 
                        onClick={() => handleCopy(imagePrompt)}
                        className="text-slate-400 hover:text-blue-500 transition-colors p-1"
                        title="Salin Prompt Gambar"
                      >
                        {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <button 
                      onClick={() => generateSceneImage(imagePrompt, idx)}
                      disabled={generatingSceneIdx === idx}
                      className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-[10px] sm:text-[11px] font-black rounded-full shadow-sm hover:shadow-md transition-all disabled:opacity-50 playful-button"
                    >
                      {generatingSceneIdx === idx ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                      )}
                      <span>Generate</span>
                    </button>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-blue-50 dark:border-slate-800/80 shadow-inner leading-relaxed text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                    {imagePrompt}
                  </div>

                  {/* Scene Image Preview */}
                  {sceneImages[idx] && (
                    <div className="relative group/scene-img rounded-2xl overflow-hidden border-4 border-white dark:border-slate-900 shadow-xl aspect-video bg-blue-100 dark:bg-slate-950 max-w-lg mx-auto w-full transition-transform hover:scale-[1.01]">
                      <img 
                        src={sceneImages[idx]} 
                        alt={`Scene ${idx + 1}`} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/scene-img:opacity-100 transition-all flex items-center justify-center">
                        <button 
                          onClick={() => downloadSceneImage(sceneImages[idx], idx)}
                          className="p-3.5 bg-white text-blue-600 rounded-full hover:scale-110 transition-all shadow-2xl"
                          title="Download Image"
                        >
                          <Download className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-4">Tidak ada prompt gambar untuk scene ini.</p>
              )}
            </motion.div>
          )}

          {activeTab === "video" && (
            <motion.div
              key="video-tab"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-3.5"
            >
              {videoPrompt ? (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-[11px] font-black text-pink-500 dark:text-pink-400 uppercase tracking-widest">Video Prompt</span>
                    <button 
                      onClick={() => handleCopy(videoPrompt)}
                      className="text-slate-400 hover:text-pink-500 transition-colors p-1"
                      title="Salin Prompt Video"
                    >
                      {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-pink-50 dark:border-pink-950/40 shadow-inner leading-relaxed text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                    {videoPrompt}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-4">Tidak ada prompt video untuk scene ini.</p>
              )}
            </motion.div>
          )}

          {activeTab === "voice" && (
            <motion.div
              key="voice-tab"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-3.5"
            >
              {dialogue ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Dialogue</span>
                      <button 
                        onClick={() => handleCopy(dialogue)}
                        className="text-slate-400 hover:text-emerald-500 transition-colors p-1"
                        title="Salin Dialog"
                      >
                        {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        if (playingSceneIdx === idx) {
                          stopVoice();
                        } else {
                          playVoice(dialogue, false, idx);
                        }
                      }}
                      className={cn(
                        "p-2 px-3.5 gap-1.5 text-xs font-black rounded-full flex items-center transition-all shadow-sm playful-button",
                        playingSceneIdx === idx 
                          ? "bg-emerald-500 text-white" 
                          : "bg-[#ECFDF5] dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100"
                      )}
                      title="Dengarkan pengisi suara"
                    >
                      {playingSceneIdx === idx ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
                      <span>{playingSceneIdx === idx ? "Mendengarkan..." : "Putar Suara"}</span>
                    </button>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 bg-[#ECFDF5]/60 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100/60 dark:border-emerald-900/40 italic shadow-inner">
                    "{dialogue}"
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-4">Tidak ada dialog atau suara untuk scene ini.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("talking_objects_dark_mode") === "true";
  });
  
  // Auto-saved state restoration using lazy initialization
  const [step, setStep] = useState<number>(() => {
    const saved = localStorage.getItem("talking_objects_step");
    return saved ? parseInt(saved, 10) : 1;
  });

  const [selections, setSelections] = useState<Selection>(() => {
    const saved = localStorage.getItem("talking_objects_selections");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved selections", e);
      }
    }
    return {
      category: null,
      object: null,
      template: null,
      accessory: null,
      ratio: null,
      language: null,
      npcMode: null,
      storyDepth: null,
      emotionStyle: null,
      hookIntensity: null,
      voicePersona: null,
      cameraMovement: null,
    };
  });

  const [customCategory, setCustomCategory] = useState<string>(() => {
    return localStorage.getItem("talking_objects_customCategory") || "";
  });

  const [customObject, setCustomObject] = useState<string>(() => {
    return localStorage.getItem("talking_objects_customObject") || "";
  });

  const [customAvatar, setCustomAvatar] = useState<AvatarConfig | null>(() => {
    const saved = localStorage.getItem("talking_objects_customAvatar");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved customAvatar", e);
      }
    }
    return null;
  });

  const [creatorActive, setCreatorActive] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [fullAudioBlob, setFullAudioBlob] = useState<Blob | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sceneImages, setSceneImages] = useState<Record<number, string>>({});
  const [generatingSceneIdx, setGeneratingSceneIdx] = useState<number | null>(null);
  const [copiedSceneIdx, setCopiedSceneIdx] = useState<number | null>(null);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(() => {
    return localStorage.getItem("talking_objects_active_story_id");
  });

  useEffect(() => {
    if (activeStoryId) {
      localStorage.setItem("talking_objects_active_story_id", activeStoryId);
    } else {
      localStorage.removeItem("talking_objects_active_story_id");
    }
  }, [activeStoryId]);

  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem("user_gemini_api_key") || "";
  });
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const [isSavingKey, setIsSavingKey] = useState<boolean>(false);
  const [hasPaid, setHasPaid] = useState<boolean | null>(null);
  const [checkingPayment, setCheckingPayment] = useState<boolean>(false);
  const [generatingLink, setGeneratingLink] = useState<boolean>(false);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Mayar webhook setup and simulation states
  const [simEmail, setSimEmail] = useState<string>("");
  const [simStatus, setSimStatus] = useState<string>("success");
  const [simAmount, setSimAmount] = useState<number>(150000);
  const [simResponse, setSimResponse] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState<boolean>(false);

  const getGeminiClient = () => {
    const key = geminiApiKey || process.env.GEMINI_API_KEY || "";
    return new GoogleGenAI({ apiKey: key });
  };

  const ai = getGeminiClient();

  const [hasKey, setHasKey] = useState(true);

  useEffect(() => {
    const hasSeen = localStorage.getItem("hasSeenTutorialPro");
    if (!hasSeen) {
      setShowTutorial(true);
      localStorage.setItem("hasSeenTutorialPro", "true");
    }
  }, []);

  // Auto-save selection and wizard state on change
  useEffect(() => {
    localStorage.setItem("talking_objects_selections", JSON.stringify(selections));
  }, [selections]);

  useEffect(() => {
    localStorage.setItem("talking_objects_customCategory", customCategory);
  }, [customCategory]);

  useEffect(() => {
    localStorage.setItem("talking_objects_customObject", customObject);
  }, [customObject]);

  useEffect(() => {
    if (customAvatar) {
      localStorage.setItem("talking_objects_customAvatar", JSON.stringify(customAvatar));
    } else {
      localStorage.removeItem("talking_objects_customAvatar");
    }
  }, [customAvatar]);

  useEffect(() => {
    localStorage.setItem("talking_objects_step", String(step));
  }, [step]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("talking_objects_dark_mode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    if (step === 13 && user && !result && !isGenerating) {
      generateStory(selections);
    }
  }, [step, user, result, isGenerating, selections]);

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [inputKey, setInputKey] = useState<string>(geminiApiKey);

  useEffect(() => {
    if (showKeyModal) {
      setInputKey(geminiApiKey);
    }
  }, [showKeyModal, geminiApiKey]);

  const handleSaveApiKey = async (keyToSave: string) => {
    const trimmed = keyToSave.trim();
    if (!trimmed) {
      setError("Silakan masukkan Gemini API Key Anda.");
      return;
    }
    
    setIsSavingKey(true);
    try {
      localStorage.setItem("user_gemini_api_key", trimmed);
      setGeminiApiKey(trimmed);
      
      if (user) {
        try {
          const configRef = doc(db, "user_configs", user.uid);
          await setDoc(configRef, {
            geminiApiKey: trimmed,
            updatedAt: serverTimestamp()
          });
        } catch (dbErr) {
          console.error("Gagal menyimpan ke Firestore:", dbErr);
        }
      }
      
      setShowKeyModal(false);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError("Terjadi kesalahan saat menyimpan kunci API Anda.");
    } finally {
      setIsSavingKey(false);
    }
  };

  const openKeyDialog = async () => {
    setShowKeyModal(true);
  };

  const checkPaymentStatus = async (currentUser: User | null) => {
    if (!currentUser || !currentUser.email) {
      setHasPaid(null);
      return;
    }
    
    const emailLower = currentUser.email.toLowerCase().trim();
    const cacheKey = `premium_paid_${emailLower}`;
    
    // Quick cache check to provide zero-wait loads for paid users after login
    const isCachedPaid = localStorage.getItem(cacheKey);
    if (isCachedPaid === "true") {
      setHasPaid(true);
    }
    
    setCheckingPayment(true);
    try {
      // 1. Core check: Query our backend payment status endpoint (handles Firestore and in-memory fallback)
      try {
        const response = await fetch(`/api/payment/status?email=${encodeURIComponent(emailLower)}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.success && !data.dbFailed) {
            if (data.isPaid) {
              localStorage.setItem(cacheKey, "true");
              setHasPaid(true);
              setCheckingPayment(false);
              return;
            } else {
              // Server reported not paid yet - do not return early, cascade to direct client-side checking to ensure absolutely no false-negatives
              console.log("Server status reported unpaid; cascading to double check direct client-side Firestore...");
            }
          } else if (data && data.dbFailed) {
            console.warn("Backend status verification reported Firestore Admin query permission issue. Falling back to direct client-side Firestore verification:", data.error);
          }
        }
      } catch (backendFetchErr) {
        console.warn("Backend payment status API check failed, falling back to direct client-side Firestore:", backendFetchErr);
      }

      // 2. Direct client-side Firestore query fallback
      const pRef = doc(db, "payments", emailLower);
      const pSnap = await getDoc(pRef);
      if (pSnap.exists()) {
        const pData = pSnap.data();
        if (pData && pData.isPaid) {
          localStorage.setItem(cacheKey, "true");
          setHasPaid(true);
        } else {
          localStorage.removeItem(cacheKey);
          setHasPaid(false);
        }
      } else {
        localStorage.removeItem(cacheKey);
        setHasPaid(false);
      }
    } catch (err: any) {
      console.error("Gagal mengecek status pembayaran:", err);
      // Keep cached status if query fails to preserve robust offline experience
      if (isCachedPaid === "true") {
        setHasPaid(true);
      } else {
        setError("Gagal melakukan verifikasi status pembayaran: " + (err?.message || String(err)));
        setHasPaid(false);
      }
    } finally {
      setCheckingPayment(false);
    }
  };

  const simulatePaymentSuccess = async (customEmail?: string, customStatus?: string, customAmount?: number) => {
    const targetEmail = (customEmail || simEmail || user?.email || "").trim();
    if (!targetEmail) {
      setError("Masukkan email pelanggan terlebih dahulu untuk memulai simulasi.");
      return;
    }
    const targetStatus = customStatus || simStatus || "success";
    const targetAmount = customAmount !== undefined ? customAmount : simAmount;

    setCheckingPayment(true);
    setSimResponse(null);
    try {
      const idToken = user ? await user.getIdToken(true) : "";
      const response = await fetch("/api/webhook/mayar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { "x-firebase-id-token": idToken } : {}),
        },
        body: JSON.stringify({
          customer_email: targetEmail,
          payment_status: targetStatus,
          amount: targetAmount,
          payment_id: "simulated_" + Date.now()
        })
      });
      const data = await response.json();
      if (response.ok) {
        if (targetStatus === "success") {
          const emailLower = targetEmail.toLowerCase().trim();
          localStorage.setItem(`premium_paid_${emailLower}`, "true");
          // High reliability direct client-side Firestore synchronization
          try {
            const clientRef = doc(db, "payments", emailLower);
            await setDoc(clientRef, {
              email: emailLower,
              isPaid: true,
              status: "success",
              amount: targetAmount,
              paymentId: "simulated_" + Date.now(),
              updatedAt: serverTimestamp()
            }, { merge: true });
            console.log("Direct client-side Firebase simulated payment write succeeded!");
          } catch (writeErr) {
            console.warn("Direct client-side simulated payment write failed:", writeErr);
          }
          setError(null);
          if (user && user.email.toLowerCase().trim() === emailLower) {
            await checkPaymentStatus(user);
          }
        }
        setSimResponse(`Sukses! Response server: ${JSON.stringify(data, null, 2)}`);
      } else {
        setSimResponse(`Error server (${response.status}): ${JSON.stringify(data || {}, null, 2)}`);
      }
    } catch (err: any) {
      console.error("Simulation failed:", err);
      setSimResponse("Error pengiriman: " + (err.message || String(err)));
    } finally {
      setCheckingPayment(false);
    }
  };

  const handlePayNow = async () => {
    if (!user || !user.email) return;
    setGeneratingLink(true);
    setError(null);
    try {
      const idToken = await user.getIdToken(true);
      const response = await fetch("/api/payment/create-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-firebase-id-token": idToken,
        },
        body: JSON.stringify({
          email: user.email,
          name: user.displayName || user.email.split("@")[0],
          amount: 150000,
        })
      });
      const data = await response.json();
      if (response.ok && data.link) {
        window.location.href = data.link;
      } else {
        setError("Gagal membuat link pembayaran: " + (data.error || "Terjadi kesalahan"));
      }
    } catch (err: any) {
      console.error("Gagal membuat link pembayaran Mayar:", err);
      setError("Gagal membuat link pembayaran Mayar: " + (err.message || String(err)));
    } finally {
      setGeneratingLink(false);
    }
  };

  // Auto-activate and write payment status when redirected from Mayar.id
  useEffect(() => {
    if (!user || !user.email) return;

    const queryParams = new URLSearchParams(window.location.search);
    const paymentStatus = queryParams.get("status") || queryParams.get("payment_status");
    const paymentId = queryParams.get("payment_id"); // DO NOT fallback to 'id' to avoid matching platform layout IDs

    if (paymentStatus === "success" || paymentStatus === "paid" || paymentStatus === "settled" || paymentId) {
      setCheckingPayment(true);
      const autoSynchronizePayment = async () => {
        try {
          const idToken = await user.getIdToken(true);
          console.log("Automatic checkout redirect detected! Synchronizing payment status on server...");
          const syncResponse = await fetch("/api/webhook/mayar", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-firebase-id-token": idToken,
            },
            body: JSON.stringify({
              customer_email: user.email,
              payment_status: "success",
              amount: 150000,
              payment_id: paymentId || "mayar_redirect_" + Date.now()
            })
          });
          
          if (syncResponse.ok) {
            console.log("Redirect payment successfully synchronized on server.");
            localStorage.setItem(`premium_paid_${user.email.toLowerCase().trim()}`, "true");
            setHasPaid(true);
          } else {
            console.warn("Server side redirect sync warning:", await syncResponse.text());
          }

          // Guaranteed client-side Firestore save fallback on successful checkout redirect
          try {
            const emailLower = user.email.toLowerCase().trim();
            const clientRef = doc(db, "payments", emailLower);
            await setDoc(clientRef, {
              email: emailLower,
              isPaid: true,
              status: "success",
              amount: 150000,
              paymentId: paymentId || "mayar_redirect_" + Date.now(),
              updatedAt: serverTimestamp()
            }, { merge: true });
            console.log("Direct client-side redirect payment status check write succeeded!");
            localStorage.setItem(`premium_paid_${emailLower}`, "true");
            setHasPaid(true);
          } catch (clientWriteErr) {
            console.error("Direct client-side redirect payment write failed:", clientWriteErr);
          }
        } catch (syncErr) {
          console.error("Error during automatic sync on redirect:", syncErr);
        } finally {
          // Final validation check to match exact status
          await checkPaymentStatus(user);
          // Clean up URL query parameters from browser bar
          const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
          window.history.replaceState({ path: cleanUrl }, "", cleanUrl);
        }
      };

      autoSynchronizePayment();
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        fetchHistory(u.uid);
        checkPaymentStatus(u);
        // Load API key from Firestore
        try {
          const configRef = doc(db, "user_configs", u.uid);
          const configSnap = await getDoc(configRef);
          if (configSnap.exists()) {
            const data = configSnap.data();
            if (data.geminiApiKey) {
              setGeminiApiKey(data.geminiApiKey);
              localStorage.setItem("user_gemini_api_key", data.geminiApiKey);
              setError(null);
            }
          }
        } catch (err) {
          console.error("Gagal memuat api key dari cloud:", err);
        }
      } else {
        setHasPaid(null);
      }
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  // Cek saat loading aplikasi jika belum ada api key tersimpan buat form informasi melayang
  useEffect(() => {
    if (authInitialized) {
      if (!geminiApiKey && !localStorage.getItem("user_gemini_api_key")) {
        setShowKeyModal(true);
      }
    }
  }, [authInitialized, geminiApiKey]);

  const fetchHistory = async (uid: string) => {
    try {
      const q = query(collection(db, "stories"), where("userId", "==", uid), orderBy("createdAt", "desc"));
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, "stories");
        return;
      }
      const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setHistory(docs);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  const handleUseCustomCharacter = (config: AvatarConfig) => {
    setCustomAvatar(config);
    setSelections(prev => ({
      ...prev,
      category: `Custom (${config.bodyShape})`,
      object: config.name,
      accessory: config.accessory,
    }));
    setStep(3);
    setCreatorActive(false);
  };

  const login = async () => {
    const provider = new GoogleAuthProvider();
    setError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err?.code === "auth/popup-closed-by-user") {
        setError("Login gagal karena jendela popup ditutup sebelum selesai. Pastikan Anda menyelesaikan login di jendela popup. Jika tertutup otomatis, disarankan klik tombol 'Open in new tab' di kanan atas preview lalu coba login kembali.");
      } else if (err?.code === "auth/blocked-by-client" || err?.message?.includes("popup")) {
        setError("Login diblokir oleh browser (popup blocker). Harap izinkan popup di pengaturan browser Anda, atau buka aplikasi di tab baru.");
      } else {
        setError(`Gagal Login: ${err?.message || err}. Sangat disarankan untuk membuka aplikasi di tab baru karena adanya batasan iframe browser.`);
      }
    }
  };

  const logout = async () => {
    setLoggingOut(true);
    try {
      if (user && user.email) {
        localStorage.removeItem(`premium_paid_${user.email.toLowerCase().trim()}`);
      }
      // Instant UI feedback: Reset user states immediately so it feels snappy
      setUser(null);
      setHasPaid(null);
      await auth.signOut();
    } catch (err) {
      console.error("Gagal melakukan log out:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSelect = (value: string | number) => {
    setError(null);
    switch (step) {
      case 1:
        const cat = CATEGORIES.find(c => c.id === value)?.label || null;
        if (cat === "Enter your own category") {
          setSelections(prev => ({ ...prev, category: "CUSTOM" }));
        } else {
          setSelections(prev => ({ ...prev, category: cat }));
          setStep(2);
        }
        break;
      case 2:
        if (selections.category === "CUSTOM") return;
        const objList = OBJECTS[selections.category!] || [];
        const obj = objList[(value as number) - 1];
        if (obj === "Enter your own object") {
          setSelections(prev => ({ ...prev, object: "CUSTOM" }));
        } else {
          setSelections(prev => ({ ...prev, object: obj }));
          setStep(3); // Go to Template step
        }
        break;
      case 3: // Template
        setSelections(prev => ({ ...prev, template: TEMPLATES.find(t => t.id === value)?.label || null }));
        setStep(4);
        break;
      case 4: // Accessory
        setSelections(prev => ({ ...prev, accessory: ACCESSORIES.find(a => a.id === value)?.label || null }));
        setStep(5);
        break;
      case 5: // Ratio
        setSelections(prev => ({ ...prev, ratio: RATIOS.find(r => r.id === value)?.label || null }));
        setStep(6);
        break;
      case 6: // Language
        setSelections(prev => ({ ...prev, language: LANGUAGES.find(l => l.id === value)?.label || null }));
        setStep(7);
        break;
      case 7: // NPC
        setSelections(prev => ({ ...prev, npcMode: NPC_MODES.find(n => n.id === value)?.label || null }));
        setStep(8);
        break;
      case 8: // Depth
        setSelections(prev => ({ ...prev, storyDepth: STORY_DEPTHS.find(s => s.id === value)?.label || null }));
        setStep(9);
        break;
      case 9: // Emotion
        setSelections(prev => ({ ...prev, emotionStyle: EMOTION_STYLES.find(e => e.id === value)?.label || null }));
        setStep(10);
        break;
      case 10: // Hook
        setSelections(prev => ({ ...prev, hookIntensity: HOOK_INTENSITIES.find(h => h.id === value)?.label || null }));
        setStep(11);
        break;
      case 11: // Voice
        setSelections(prev => ({ ...prev, voicePersona: VOICE_PERSONAS.find(v => v.id === value)?.label || null }));
        setStep(12);
        break;
      case 12: // Camera
        const cam = CAMERA_MOVEMENTS.find(c => c.id === value)?.label || null;
        setSelections(prev => ({ ...prev, cameraMovement: cam }));
        setStep(13);
        break;
    }
  };

  const [playingSceneIdx, setPlayingSceneIdx] = useState<number | null>(null);
  const [isPlayingFullScript, setIsPlayingFullScript] = useState(false);
  const isPlayingFullScriptRef = useRef(false);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playVoice = async (text: string, isSample = false, index: number | null = null, returnBlob = false) => {
    if (isVoicePlaying && !returnBlob) {
      stopVoice();
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure cleanup
    }
    
    if (!returnBlob) setIsVoicePlaying(true);
    if (index !== null && !returnBlob) setPlayingSceneIdx(index);
    
    try {
      const voiceName = selections.voicePersona?.includes("female") ? "Kore" : "Puck";
      const genAI = getGeminiClient();
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binaryString = window.atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        if (returnBlob) {
          return bytes;
        }

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        audioContextRef.current = audioContext;
        const audioBuffer = audioContext.createBuffer(1, len / 2, 24000);
        const channelData = audioBuffer.getChannelData(0);
        
        const view = new DataView(bytes.buffer);
        for (let i = 0; i < len / 2; i++) {
          channelData[i] = view.getInt16(i * 2, true) / 32768;
        }
        
        const source = audioContext.createBufferSource();
        audioSourceRef.current = source;
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        
        return new Promise<void>((resolve) => {
          source.onended = () => {
            setIsVoicePlaying(false);
            setPlayingSceneIdx(null);
            audioSourceRef.current = null;
            resolve();
          };
          source.start();
        });
      }
    } catch (err) {
      console.error("Voice playback failed:", err);
      if (!returnBlob) {
        setIsVoicePlaying(false);
        setPlayingSceneIdx(null);
      }
    }
  };

  const downloadFullAudio = async () => {
    setIsGeneratingAudio(true);
    try {
      const scenes = result?.split("🎬").filter(s => s.trim()) || [];
      const audioChunks: Uint8Array[] = [];
      
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const dialogue = scene.match(/💬 Dialogue: (.*)/)?.[1] || "";
        if (dialogue) {
          const bytes = await playVoice(dialogue, false, i, true) as Uint8Array;
          if (bytes) audioChunks.push(bytes);
        }
      }

      if (audioChunks.length > 0) {
        // Concatenate chunks (WAV headers might be an issue if we just concat raw PCM, 
        // but since we are getting raw PCM from the API, we can wrap it in a single WAV)
        const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const merged = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of audioChunks) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }

        // Create WAV header
        const wavHeader = new ArrayBuffer(44);
        const view = new DataView(wavHeader);
        
        const writeString = (offset: number, string: string) => {
          for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
          }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + totalLength, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, 1, true); // Mono
        view.setUint32(24, 24000, true); // Sample Rate
        view.setUint32(28, 24000 * 2, true); // Byte Rate
        view.setUint16(32, 2, true); // Block Align
        view.setUint16(34, 16, true); // Bits per Sample
        writeString(36, 'data');
        view.setUint32(40, totalLength, true);

        const blob = new Blob([wavHeader, merged], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TalkingObject_FullAudio_${Date.now()}.wav`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Audio generation failed:", err);
      setError("Gagal membuat file audio.");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const stopVoice = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      audioSourceRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // Ignore
      }
      audioContextRef.current = null;
    }
    setIsVoicePlaying(false);
    setPlayingSceneIdx(null);
    setIsPlayingFullScript(false);
    isPlayingFullScriptRef.current = false;
  };

  const playFullScript = async () => {
    if (isPlayingFullScriptRef.current) {
      stopVoice();
      return;
    }

    setIsPlayingFullScript(true);
    isPlayingFullScriptRef.current = true;
    const scenes = result?.split("🎬").filter(s => s.trim()) || [];
    
    for (let i = 0; i < scenes.length; i++) {
      if (!isPlayingFullScriptRef.current) break; // Check if stopped
      const scene = scenes[i];
      const dialogue = scene.match(/💬 Dialogue: (.*)/)?.[1] || "";
      if (dialogue) {
        setPlayingSceneIdx(i);
        await playVoice(dialogue, false, i);
      }
    }
    setIsPlayingFullScript(false);
    isPlayingFullScriptRef.current = false;
  };

  const playVoiceSample = () => {
    const text = `Halo! Saya adalah karakter ${selections.object || "objek"} Anda. Saya siap mengajar dengan gaya ${selections.emotionStyle || "ceria"}!`;
    playVoice(text, true);
  };

  const generateCharacterImage = async (obj: string) => {
    if (!obj) return;
    setIsGeneratingImage(true);
    setCharacterImage(null);
    try {
      let prompt = `3D Pixar style character of a cute ${obj} ${selections.accessory && selections.accessory !== "No Accessory" ? `wearing ${selections.accessory}` : ""}, big expressive eyes, small mouth, soft proportions, glossy textures, cinematic lighting, white background.`;
      
      if (customAvatar) {
        prompt = `3D Pixar style character of a cute 3D ${customAvatar.bodyShape} named "${customAvatar.name}", primary color is vivid "${customAvatar.colorHex}", has a cute ${customAvatar.facialFeature} styling, wearing ${customAvatar.clothing !== 'none' ? customAvatar.clothing : 'minimal outfits'} and accessory: ${customAvatar.accessory !== 'none' ? customAvatar.accessory : 'clean look'}, ultra glossy finish, big expressive anime eyes, small smiling mouth, cute soft render proportions, cinematic studio lighting, solid clean white background.`;
      }
      
      const genAI = getGeminiClient();
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: "9:16"
          }
        }
      });

      const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (part?.inlineData) {
        const mimeType = part.inlineData.mimeType || "image/png";
        setCharacterImage(`data:${mimeType};base64,${part.inlineData.data}`);
      } else {
        console.warn("No image data in response", response);
      }
    } catch (err) {
      console.error("Image generation failed:", err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const generateStory = async (finalSelections: Selection) => {
    setIsGenerating(true);
    setResult(null);
    setError(null);
    const objName = finalSelections.object === "CUSTOM" ? customObject : finalSelections.object;
    if (objName) generateCharacterImage(objName);

    try {
      const isMixedLang = finalSelections.language === "Prompt English, Dialog Indonesian";
      const avatarDetails = customAvatar 
        ? `
        - Mascot Name: ${customAvatar.name}
        - Shape/Body Type: 3D cute ${customAvatar.bodyShape}
        - Primary Color Hex: ${customAvatar.colorHex}
        - Facial Expression/Vibe: ${customAvatar.facialFeature} eyes and mouth
        - Clothing/Garment worn: ${customAvatar.clothing}
        - Head Accessory: ${customAvatar.accessory}`
        : `
        - Category: ${finalSelections.category === "CUSTOM" ? customCategory : finalSelections.category}
        - Object: ${objName}
        - Accessory: ${finalSelections.accessory}`;

      const prompt = `
        You are an AI generator that creates cute 3D animated educational object prompts optimized for short-form video creation.
        
        USER SELECTIONS:
        ${avatarDetails}
        - Video Ratio: ${finalSelections.ratio}
        - Language Mode: ${finalSelections.language}
        - NPC Mode: ${finalSelections.npcMode}
        - Story Depth: ${finalSelections.storyDepth}
        - Emotion Style: ${finalSelections.emotionStyle}
        - Hook Intensity: ${finalSelections.hookIntensity}
        - Voice Persona: ${finalSelections.voicePersona}
        - Camera Movement: ${finalSelections.cameraMovement}

        FOLLOW THESE RULES STRICTLY:
        1. Generate a multi-scene cinematic sequence (4-10 scenes).
        2. Visual Style: Pixar-style 3D animated characters, big expressive eyes, small mouth, soft proportions, glossy textures, cinematic lighting.
        3. Character Consistency: The main character MUST maintain identical shape, size, color, and features across ALL scenes. Describe the character consistently in every Image Prompt.
        4. Character: The main object character speaks with a consistent voice identity.
        5. NPCs: If enabled, stylized human NPCs appear in background for "Bad" and "Fix" scenes.
        6. Environment: Fruits/Veg/Junk Food inside human body (bloodstream, digestive, etc.). Gadgets inside tech environments.
        7. Junk Food: If category is Junk Food, the object is a cute villain.
        8. Mechanism: Benefits must include biological explanation (nutrient -> body target -> visible effect).
        9. Risks: Bad explanation must follow (source -> body effect -> consequence).
        10. Language Rule: 
           ${isMixedLang 
             ? "The Image Prompt and Video Prompt descriptions MUST be in English. The spoken dialogue (what the character says) MUST be in Indonesian." 
             : `Use ONLY the selected language (${finalSelections.language}) for everything including prompts and dialogue.`}
        11. Output Format for EACH scene:
            🎬 Scene [Number] — [Beat]
            🖼 Image Prompt: [prompt]
            🎥 Video Prompt: [prompt]
            💬 Dialogue: [The character's spoken lines in the selected language]

        End every Image Prompt with: 8K render --ar 9:16
      `;

      const genAI = getGeminiClient();
      const response = await genAI.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });

      const storyText = response.text || "Failed to generate story.";
      setResult(storyText);
      setStep(13); // Result step

      if (user) {
        try {
          const docRef = await addDoc(collection(db, "stories"), {
            userId: user.uid,
            title: `${objName} - ${finalSelections.template}`,
            selections: finalSelections,
            result: storyText,
            createdAt: serverTimestamp(),
          });
          setActiveStoryId(docRef.id);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, "stories");
        }
        fetchHistory(user.uid);
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while generating the story. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToJSON = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify({ selections, result }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `story-${Date.now()}.json`;
    a.click();
  };

  const exportToCSV = () => {
    if (!result) return;
    const scenes = result.split("🎬").filter(s => s.trim());
    const rows = scenes.map(s => {
      const sceneTitle = s.split("\n")[0].trim();
      const imagePrompt = s.match(/🖼 Image Prompt: (.*)/)?.[1] || "";
      const videoPrompt = s.match(/🎥 Video Prompt: (.*)/)?.[1] || "";
      const dialogue = s.match(/💬 Dialogue: (.*)/)?.[1] || "";
      return [`"${sceneTitle}"`, `"${imagePrompt}"`, `"${videoPrompt}"`, `"${dialogue}"`].join(",");
    });
    const csv = "Scene,Image Prompt,Video Prompt,Dialogue\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `story-${Date.now()}.csv`;
    a.click();
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const generateSceneImage = async (prompt: string, index: number) => {
    setGeneratingSceneIdx(index);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: "9:16"
          }
        }
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64 = part.inlineData.data;
          setSceneImages(prev => ({ ...prev, [index]: `data:image/png;base64,${base64}` }));
          break;
        }
      }
    } catch (err) {
      console.error("Scene image generation failed:", err);
      setError("Gagal membuat gambar scene. Silakan coba lagi.");
    } finally {
      setGeneratingSceneIdx(null);
    }
  };

  const downloadSceneImage = (imageUrl: string, index: number) => {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `scene-${index + 1}-${Date.now()}.png`;
    a.click();
  };

  const copySceneToClipboard = (scene: string, index: number) => {
    navigator.clipboard.writeText(scene);
    setCopiedSceneIdx(index);
    setTimeout(() => setCopiedSceneIdx(null), 2000);
  };

  const reset = () => {
    setStep(1);
    setSelections({
      category: null,
      object: null,
      template: null,
      accessory: null,
      ratio: null,
      language: null,
      npcMode: null,
      storyDepth: null,
      emotionStyle: null,
      hookIntensity: null,
      voicePersona: null,
      cameraMovement: null,
    });
    setCustomCategory("");
    setCustomObject("");
    setCustomAvatar(null);
    setResult(null);
    setSceneImages({});
    setCharacterImage(null);
    setError(null);
    setActiveStoryId(null);
  };

  const renderStep = () => {
    if (creatorActive) {
      return (
        <div className="flex flex-col items-center gap-10 w-full max-w-5xl mx-auto pb-32">
          <div className="text-center space-y-2">
            <p className="text-[#6366F1] font-black uppercase tracking-[0.4em] text-sm">3D Custom Mascot</p>
            <h2 className="text-5xl md:text-6xl font-black tracking-tight text-[#1E293B]">Character Creator 👾</h2>
            <p className="text-[#64748B] text-xl font-medium">Buat dan sesuaikan desain karakter film Pixar Anda sendiri secara visual</p>
          </div>
          <CharacterCreator 
            onUseCharacter={handleUseCustomCharacter} 
            onClose={() => setCreatorActive(false)}
            initialConfig={customAvatar || undefined}
          />
        </div>
      );
    }

    switch (step) {
      case 1:
        if (selections.category === "CUSTOM") {
          return (
            <StepContainer title="Custom Category" subtitle="Enter your own object category" label="Custom Category">
              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="e.g. Animals, Furniture, Vehicles..."
                  className="w-full p-5 bg-white border-2 border-blue-100 rounded-3xl text-[#1E293B] focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-lg font-medium"
                  autoFocus
                />
                <button
                  onClick={() => customCategory.trim() && setStep(2)}
                  disabled={!customCategory.trim()}
                  className="w-full p-5 bg-[#FF4D8D] hover:bg-[#E6397A] disabled:opacity-50 text-white font-bold rounded-3xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 playful-button"
                >
                  Continue <ChevronRight className="w-5 h-5" />
                </button>
                <button onClick={() => setSelections(prev => ({ ...prev, category: null }))} className="text-[#64748B] hover:text-[#1E293B] text-sm font-medium">
                  Go back
                </button>
              </div>
            </StepContainer>
          );
        }
        return (
          <StepContainer title="Kategori Menarik" subtitle="Pilih kategori objek untuk cerita Anda" label="Pilih Kategori">
            {/* Elegant Mode Switcher */}
            <div className="flex justify-center mb-10 gap-3 max-w-sm mx-auto p-1.5 bg-gray-150/70 bg-slate-100 rounded-[2rem] border border-blue-50">
              <button 
                type="button"
                onClick={() => setCreatorActive(false)}
                className={cn(
                  "flex-1 py-3.5 px-6 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all playful-button",
                  "bg-white text-blue-600 shadow-md border border-blue-50"
                )}
              >
                🎬 Kategori
              </button>
              <button 
                type="button"
                onClick={() => setCreatorActive(true)}
                className={cn(
                  "flex-1 py-3.5 px-6 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all playful-button text-[#64748B] hover:text-[#1E293B] btn-toggle-creator"
                )}
              >
                👾 Creator Mode
              </button>
            </div>
            <OptionGrid options={CATEGORIES} onSelect={handleSelect} />
          </StepContainer>
        );
      case 2:
        if (selections.category === "CUSTOM" || selections.object === "CUSTOM") {
          return (
            <StepContainer title="Custom Object" subtitle="Enter your own object name" label="Custom Object">
              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  value={customObject}
                  onChange={(e) => setCustomObject(e.target.value)}
                  placeholder="e.g. Durian, Broccoli, Drone..."
                  className="w-full p-5 bg-white border-2 border-blue-100 rounded-3xl text-[#1E293B] focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-lg font-medium"
                  autoFocus
                />
                <button
                  onClick={() => customObject.trim() && setStep(3)}
                  disabled={!customObject.trim()}
                  className="w-full p-5 bg-[#FF4D8D] hover:bg-[#E6397A] disabled:opacity-50 text-white font-bold rounded-3xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 playful-button"
                >
                  Continue <ChevronRight className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => {
                    if (selections.object === "CUSTOM" && selections.category !== "CUSTOM") {
                      setSelections(prev => ({ ...prev, object: null }));
                    } else {
                      setStep(1);
                    }
                  }} 
                  className="text-[#64748B] hover:text-[#1E293B] text-sm font-medium"
                >
                  Go back
                </button>
              </div>
            </StepContainer>
          );
        }
        const objList = OBJECTS[selections.category!] || [];
        return (
          <StepContainer title="Pilih Karakter" subtitle={`Pilih salah satu ${selections.category?.slice(0, -1)} yang seru`} label="Karakter Unik">
            <OptionGrid 
              options={objList.map((obj, i) => ({ id: i + 1, label: obj }))} 
              onSelect={handleSelect} 
            />
          </StepContainer>
        );
      case 3:
        return (
          <StepContainer title="Template Viral" subtitle="Pilih kerangka cerita yang menarik" label="Alur Cerita">
            <OptionGrid options={TEMPLATES} onSelect={handleSelect} />
          </StepContainer>
        );
      case 4:
        return (
          <StepContainer title="Aksesoris" subtitle="Tambahkan gaya unik ke karakter Anda" label="Gaya Karakter">
            <OptionGrid options={ACCESSORIES} onSelect={handleSelect} />
          </StepContainer>
        );
      case 5:
        return (
          <StepContainer title="Rasio Video" subtitle="Pilih format layar yang sesuai" label="Format Layar">
            <OptionGrid options={RATIOS} onSelect={handleSelect} />
          </StepContainer>
        );
      case 6:
        return (
          <StepContainer title="Bahasa" subtitle="Pilih bahasa untuk konten Anda" label="Pilihan Bahasa">
            <OptionGrid options={LANGUAGES} onSelect={handleSelect} />
          </StepContainer>
        );
      case 7:
        return (
          <StepContainer title="Mode NPC" subtitle="Sertakan manusia animasi di latar belakang?" label="Karakter Tambahan">
            <OptionGrid options={NPC_MODES} onSelect={handleSelect} />
          </StepContainer>
        );
      case 8:
        return (
          <StepContainer title="Kedalaman Cerita" subtitle="Pilih panjang narasi cerita" label="Panjang Video">
            <OptionGrid options={STORY_DEPTHS} onSelect={handleSelect} />
          </StepContainer>
        );
      case 9:
        return (
          <StepContainer title="Gaya Emosi" subtitle="Pilih suasana hati karakter" label="Suasana Hati">
            <OptionGrid options={EMOTION_STYLES} onSelect={handleSelect} />
          </StepContainer>
        );
      case 10:
        return (
          <StepContainer title="Intensitas Hook" subtitle="Pilih kekuatan pembukaan video" label="Daya Tarik">
            <OptionGrid options={HOOK_INTENSITIES} onSelect={handleSelect} />
          </StepContainer>
        );
      case 11:
        return (
          <StepContainer title="Persona Suara" subtitle="Pilih suara narator yang pas" label="Narator AI">
            <div className="w-full flex flex-col gap-6">
              <OptionGrid options={VOICE_PERSONAS} onSelect={handleSelect} />
              {selections.voicePersona && (
                <button 
                  onClick={playVoiceSample}
                  disabled={isVoicePlaying}
                  className="flex items-center justify-center gap-2 p-6 bg-blue-500 text-white rounded-3xl hover:bg-blue-600 transition-all font-black playful-button disabled:opacity-50 shadow-xl shadow-blue-500/20"
                >
                  {isVoicePlaying ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Volume2 className="w-6 h-6" />}
                  Dengarkan Sampel Suara
                </button>
              )}
            </div>
          </StepContainer>
        );
      case 12:
        return (
          <StepContainer title="Gerakan Kamera" subtitle="Pilih gaya kamera sinematik" label="Sinematografi">
            <OptionGrid options={CAMERA_MOVEMENTS} onSelect={handleSelect} />
          </StepContainer>
        );
      case 13:
        if (!user) {
          return (
            <div className="flex flex-col items-center justify-center p-8 p-12 bg-white dark:bg-slate-900/60 rounded-[2.5rem] border-2 border-blue-100/40 dark:border-slate-800/60 shadow-xl max-w-lg mx-auto text-center gap-6 relative mt-10">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/40 rounded-3xl flex items-center justify-center text-blue-500 shadow-xl shadow-blue-500/10">
                <Lock className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-[#1E293B] dark:text-white">Login Diperlukan 🔒</h2>
                <p className="text-[#64748B] dark:text-slate-400 font-semibold leading-relaxed">
                  Silakan login terlebih dahulu menggunakan Google untuk menyimpan seluruh perubahan dan project Talking Object Anda secara otomatis ke cloud database.
                </p>
              </div>
              <button 
                onClick={login}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-500/20 transition-all playful-button"
              >
                <LogIn className="w-5 h-5 shrink-0" />
                <span>Login dengan Google</span>
              </button>
              <button 
                onClick={() => setStep(12)} 
                className="text-xs font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors uppercase tracking-widest mt-2"
              >
                ← Kembali ke Pemilihan Kamera
              </button>
            </div>
          );
        }
        return (
          <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Character Preview */}
              <div className="w-full md:w-1/3 flex flex-col gap-4">
                <div className="glass-card rounded-[2.5rem] p-6 flex flex-col items-center text-center">
                  <h3 className="text-xl font-bold text-blue-600 mb-4">Character Preview</h3>
                  <div className="w-full aspect-square bg-blue-50 rounded-[2rem] overflow-hidden border-4 border-white shadow-inner flex items-center justify-center relative group/img">
                    {customAvatar ? (
                      <div className="w-full h-full p-4 flex flex-col items-center justify-center">
                        <svg viewBox="0 0 120 120" className="w-[85%] h-[85%] drop-shadow-xl animate-pulse">
                          <defs>
                            <linearGradient id="bodyGradPreview" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.2" />
                              <stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
                            </linearGradient>
                          </defs>

                          {/* Float shadow */}
                          <ellipse cx="60" cy="110" rx="25" ry="5" fill="#000" opacity="0.15" />

                          {/* Body shape rendering matching user configurator */}
                          {customAvatar.bodyShape === "sphere" && (
                            <circle cx="60" cy="60" r="42" fill={customAvatar.colorHex} stroke="#1E293B" strokeWidth="2.5" />
                          )}
                          {customAvatar.bodyShape === "box" && (
                            <rect x="22" y="22" width="76" height="76" rx="16" fill={customAvatar.colorHex} stroke="#1E293B" strokeWidth="2.5" />
                          )}
                          {customAvatar.bodyShape === "capsule" && (
                            <rect x="26" y="16" width="68" height="88" rx="34" fill={customAvatar.colorHex} stroke="#1E293B" strokeWidth="2.5" />
                          )}
                          {customAvatar.bodyShape === "star" && (
                            <polygon points="60,10 75,40 108,45 84,68 90,101 60,85 30,101 36,68 12,45 45,40" fill={customAvatar.colorHex} stroke="#1E293B" strokeWidth="2.5" />
                          )}
                          {customAvatar.bodyShape === "cylinder" && (
                            <path d="M 30 30 C 30 20, 90 20, 90 30 L 90 90 C 90 100, 30 100, 30 90 Z" fill={customAvatar.colorHex} stroke="#1E293B" strokeWidth="2.5" />
                          )}

                          {/* Facial Feature styles */}
                          {customAvatar.facialFeature === "anime" && (
                            <>
                              {/* Big cute eyes */}
                              <circle cx="44" cy="54" r="8" fill="#1E293B" />
                              <circle cx="76" cy="54" r="8" fill="#1E293B" />
                              <circle cx="42" cy="50" r="3" fill="#FFFFFF" />
                              <circle cx="74" cy="50" r="3" fill="#FFFFFF" />
                              {/* Smiling mouth */}
                              <path d="M 50 66 Q 60 76 70 66" stroke="#1E293B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                            </>
                          )}
                          {customAvatar.facialFeature === "googly" && (
                            <>
                              {/* Googly eyes */}
                              <circle cx="44" cy="52" r="10" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2" />
                              <circle cx="76" cy="52" r="11" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2" />
                              <circle cx="46" cy="50" r="4.5" fill="#1E293B" />
                              <circle cx="74" cy="52" r="5" fill="#1E293B" />
                              {/* Tongue mouth */}
                              <path d="M 52 64 Q 60 64 68 64 Q 60 78 52 64 Z" fill="#EF4444" stroke="#1E293B" strokeWidth="2" />
                            </>
                          )}
                          {customAvatar.facialFeature === "wink" && (
                            <>
                              <path d="M 36 54 Q 44 46 52 54" stroke="#1E293B" strokeWidth="3" fill="none" strokeLinecap="round" />
                              <circle cx="76" cy="54" r="8" fill="#1E293B" />
                              <circle cx="74" cy="50" r="3" fill="#FFFFFF" />
                              <path d="M 50 68 Q 60 74 70 68" stroke="#1E293B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                            </>
                          )}
                          {customAvatar.facialFeature === "sleepy" && (
                            <>
                              <path d="M 36 56 Q 44 50 52 56" stroke="#1E293B" strokeWidth="3" fill="none" strokeLinecap="round" />
                              <path d="M 68 56 Q 76 50 84 56" stroke="#1E293B" strokeWidth="3" fill="none" strokeLinecap="round" />
                              <circle cx="60" cy="70" r="4" fill="#1E293B" />
                            </>
                          )}
                          {customAvatar.facialFeature === "surprised" && (
                            <>
                              <circle cx="44" cy="52" r="7" fill="#1E293B" />
                              <circle cx="76" cy="52" r="7" fill="#1E293B" />
                              <circle cx="42" cy="49" r="2" fill="#FFFFFF" />
                              <circle cx="74" cy="49" r="2" fill="#FFFFFF" />
                              <circle cx="60" cy="68" r="6" fill="#1E293B" />
                            </>
                          )}

                          {/* Clothing worn overlay */}
                          {customAvatar.clothing === "bowtie" && (
                            <path d="M 48 83 L 72 95 L 72 83 L 48 95 Z" fill="#EF4444" stroke="#1E293B" strokeWidth="2" />
                          )}
                          {customAvatar.clothing === "cloak" && (
                            <path d="M 30 84 Q 60 76 90 84 L 85 106 L 35 106 Z" fill="#6366F1" stroke="#1E293B" strokeWidth="2" />
                          )}
                          {customAvatar.clothing === "scarf" && (
                            <>
                              <path d="M 34 82 Q 60 90 86 82 L 80 90 Q 60 98 40 90 Z" fill="#FBBF24" stroke="#1E293B" strokeWidth="2" />
                              <path d="M 40 90 L 45 108 L 35 108 Z" fill="#D97706" />
                            </>
                          )}
                          {customAvatar.clothing === "jacket" && (
                            <path d="M 34 84 L 86 84 L 80 108 L 40 108 Z" fill="#3B82F6" stroke="#1E293B" strokeWidth="2" />
                          )}
                          {customAvatar.clothing === "cape" && (
                            <path d="M 36 85 Q 60 90 84 85 L 94 108 L 26 108 Z" fill="#EF4444" stroke="#1E293B" strokeWidth="2" opacity="0.9" />
                          )}

                          {/* Accessories worn overlay */}
                          {customAvatar.accessory === "crown" && (
                            <path d="M 42 22 L 48 34 L 60 20 L 72 34 L 78 22 L 72 38 L 48 38 Z" fill="#FBBF24" stroke="#D97706" strokeWidth="2" />
                          )}
                          {customAvatar.accessory === "wizard" && (
                            <path d="M 34 34 L 60 4 L 86 34 Z M 26 34 Q 60 38 94 34 Z" fill="#6366F1" stroke="#4F46E5" strokeWidth="2" />
                          )}
                          {customAvatar.accessory === "cat" && (
                            <>
                              <polygon points="32,32 50,38 34,16" fill="#F43F5E" stroke="#1E293B" strokeWidth="2" />
                              <polygon points="88,32 70,38 86,16" fill="#F43F5E" stroke="#1E293B" strokeWidth="2" />
                            </>
                          )}
                          {customAvatar.accessory === "glasses" && (
                            <path d="M 34 48 L 86 48 M 36 48 Q 48 62 48 48 Q 60 48 72 48 Q 84 62 84 48" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
                          )}
                          {customAvatar.accessory === "propeller" && (
                            <>
                              <path d="M 40 32 C 40 24, 80 24, 80 32 Z" fill="#EF4444" stroke="#1E293B" strokeWidth="2" />
                              <line x1="60" y1="24" x2="60" y2="12" stroke="#1E293B" strokeWidth="3" />
                              <path d="M 45 12 L 75 12" stroke="#FBBF24" strokeWidth="4.5" strokeLinecap="round" />
                            </>
                          )}
                        </svg>

                        {/* Button overlay to toggling or switching to standard Imagen render optionally */}
                        {characterImage ? (
                          <button
                            onClick={() => setCustomAvatar(null)}
                            className="mt-2 text-xs font-bold text-gray-500 hover:text-blue-500 transition-all hover:underline"
                          >
                            Lihat Render AI Imagen 3D
                          </button>
                        ) : (
                          <button
                            onClick={() => generateCharacterImage(selections.object === "CUSTOM" ? customObject : selections.object!)}
                            className="mt-2 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-600 text-[10px] font-bold rounded-lg transition-all"
                          >
                            Generate Photo-Real AI Image
                          </button>
                        )}
                      </div>
                    ) : isGeneratingImage ? (
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                        <span className="text-xs text-blue-400 font-medium">Rendering...</span>
                      </div>
                    ) : characterImage ? (
                      <>
                        <img src={characterImage} alt="Character" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => generateCharacterImage(selections.object === "CUSTOM" ? customObject : selections.object!)}
                          className="absolute bottom-4 right-4 p-3 bg-white/90 backdrop-blur-sm text-blue-500 rounded-xl opacity-0 group-hover/img:opacity-100 transition-all shadow-lg hover:bg-white"
                          title="Regenerate Image"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <ImageIcon className="w-12 h-12 text-blue-200" />
                        <button 
                          onClick={() => generateCharacterImage(selections.object === "CUSTOM" ? customObject : selections.object!)}
                          className="px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-all playful-button"
                        >
                          Generate Image
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex flex-col gap-1">
                    <p className="text-lg font-bold text-[#1E293B]">{selections.object === "CUSTOM" ? customObject : selections.object}</p>
                    <p className="text-xs text-blue-400 font-bold uppercase tracking-widest">{selections.accessory}</p>
                  </div>
                </div>

                <div className="glass-card rounded-[2.5rem] p-6 flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-[#64748B] uppercase tracking-widest">Quick Actions</h3>
                  <button onClick={exportToJSON} className="w-full p-4 bg-blue-500 text-white rounded-2xl hover:bg-blue-600 transition-all font-bold flex items-center justify-center gap-2 playful-button">
                    <Download className="w-5 h-5" /> Export JSON
                  </button>
                  <button onClick={exportToCSV} className="w-full p-4 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all font-bold flex items-center justify-center gap-2 playful-button">
                    <Download className="w-5 h-5" /> Export CSV
                  </button>
                </div>
              </div>

              {/* Result Editor */}
              <div className="w-full md:w-2/3 flex flex-col gap-5">
                <div className="glass-card rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 flex flex-col gap-6">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-2 border-b border-gray-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-pink-100 dark:bg-pink-950/40 rounded-2xl text-[#FF4D8D]">
                        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-[#1E293B] dark:text-white">
                        Generated Script
                      </h2>
                    </div>
                    
                    {/* Beautiful Tactile Action Buttons - Matches the photo reference perfectly */}
                    <div className="grid grid-cols-2 xs:flex xs:flex-wrap sm:flex gap-2.5 w-full lg:w-auto">
                      <button 
                        onClick={playFullScript}
                        className={cn(
                          "flex-1 xs:flex-none py-3 px-4 sm:px-5 rounded-2xl transition-all playful-button flex flex-col sm:flex-row items-center justify-center gap-2 font-black text-xs sm:text-sm border shadow-sm",
                          isPlayingFullScript 
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/10" 
                            : "bg-[#EBFDF5] dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-100/60 dark:border-emerald-900/60"
                        )}
                      >
                        <Volume2 className={cn("w-4 h-4 sm:w-5 h-5 shrink-0 text-emerald-500", isPlayingFullScript && "animate-bounce text-white")} />
                        <div className="flex flex-col items-center sm:items-start text-center leading-tight">
                          <span className="text-[10px] sm:text-xs">Play Full</span>
                          <span className="text-[9px] opacity-75 font-bold">Script</span>
                        </div>
                      </button>

                      <button 
                        onClick={downloadFullAudio}
                        disabled={isGeneratingAudio}
                        className="flex-1 xs:flex-none py-3 px-4 sm:px-5 bg-[#FFFBEB] dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100/60 dark:border-amber-900/60 rounded-2xl hover:bg-[#FEF6D0] dark:hover:bg-amber-950/55 transition-all playful-button flex flex-col sm:flex-row items-center justify-center gap-2 font-black text-xs sm:text-sm disabled:opacity-50 shadow-sm leading-tight"
                      >
                        {isGeneratingAudio ? (
                          <Loader2 className="w-4 h-4 sm:w-5 h-5 animate-spin text-amber-500" />
                        ) : (
                          <Download className="w-4 h-4 sm:w-5 h-5 text-amber-500" />
                        )}
                        <div className="flex flex-col items-center sm:items-start text-center leading-tight">
                          <span className="text-[10px] sm:text-xs">Download</span>
                          <span className="text-[9px] opacity-75 font-bold">Audio</span>
                        </div>
                      </button>

                      <button 
                        onClick={async () => {
                          if (isEditing) {
                            if (user && activeStoryId) {
                              try {
                                await updateDoc(doc(db, "stories", activeStoryId), {
                                  result: result,
                                });
                                fetchHistory(user.uid);
                              } catch (err) {
                                handleFirestoreError(err, OperationType.UPDATE, `stories/${activeStoryId}`);
                              }
                            }
                          }
                          setIsEditing(!isEditing);
                        }} 
                        className={cn(
                          "flex-1 xs:flex-none py-3 px-4 sm:px-5 rounded-2xl transition-all playful-button flex flex-col sm:flex-row items-center justify-center gap-2 font-black text-xs sm:text-sm border shadow-sm",
                          isEditing 
                            ? "bg-blue-500 text-white border-blue-600 shadow-md shadow-blue-500/10" 
                            : "bg-[#EFF6FF] dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/55 text-blue-700 dark:text-blue-400 border-blue-100/60 dark:border-blue-900/60"
                        )}
                      >
                        {isEditing ? <Check className="w-4 h-4 sm:w-5 h-5" /> : <Edit3 className="w-4 h-4 sm:w-5 h-5 text-blue-500" />}
                        <div className="flex flex-col items-center sm:items-start text-center leading-tight">
                          <span className="text-[10px] sm:text-xs">{isEditing ? "Complete" : "Edit"}</span>
                          <span className="text-[9px] opacity-75 font-bold">Script</span>
                        </div>
                      </button>

                      {/* Small Utility control buttons: Copy & Refresh */}
                      <div className="col-span-2 xs:col-auto flex gap-2.5 justify-center">
                        <button 
                          onClick={copyToClipboard} 
                          className="flex-1 xs:flex-none p-4 sm:p-5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/60 dark:border-indigo-900/60 rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-all playful-button flex items-center justify-center shadow-sm"
                          title="Salin Naskah Lengkap"
                        >
                          {copied ? <Check className="w-5 h-5 text-emerald-500 animate-scale" /> : <Copy className="w-5 h-5" />}
                        </button>
                        
                        <button 
                          onClick={reset} 
                          className="flex-1 xs:flex-none p-4 sm:p-5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100/60 dark:border-rose-900/60 rounded-2xl hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-all playful-button flex items-center justify-center shadow-sm"
                          title="Reset & Mulai Baru"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-950/40 border-2 border-blue-50/50 dark:border-slate-900/80 rounded-[2rem] p-4 sm:p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    {isEditing ? (
                      <textarea 
                        value={result || ""} 
                        onChange={(e) => setResult(e.target.value)}
                        className="w-full h-full min-h-[400px] bg-transparent text-[#334155] dark:text-slate-300 font-medium resize-none focus:outline-none leading-relaxed text-sm p-2"
                        autoFocus
                      />
                    ) : (
                      <div className="flex flex-col gap-6 sm:gap-8">
                        {result?.split("🎬").filter(s => s.trim()).map((scene, idx) => {
                          const lines = scene.split("\n").filter(l => l.trim());
                          const imagePrompt = scene.match(/🖼 Image Prompt: (.*)/)?.[1] || "";
                          const videoPrompt = scene.match(/🎥 Video Prompt: (.*)/)?.[1] || "";
                          const dialogue = scene.match(/💬 Dialogue: (.*)/)?.[1] || "";

                          return (
                            <SceneCard
                              key={idx}
                              idx={idx}
                              scene={scene}
                              imagePrompt={imagePrompt}
                              videoPrompt={videoPrompt}
                              dialogue={dialogue}
                              copiedSceneIdx={copiedSceneIdx}
                              copySceneToClipboard={copySceneToClipboard}
                              generateSceneImage={generateSceneImage}
                              generatingSceneIdx={generatingSceneIdx}
                              sceneImages={sceneImages}
                              downloadSceneImage={downloadSceneImage}
                              playingSceneIdx={playingSceneIdx}
                              stopVoice={stopVoice}
                              playVoice={playVoice}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070B13] text-[#1E293B] dark:text-slate-100 font-sans selection:bg-pink-500/20 dot-pattern transition-colors duration-300">
      {/* Background Shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200/40 dark:bg-blue-950/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-200/40 dark:bg-pink-950/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Header */}
      <header className="relative z-20 p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-center justify-between glass-card m-4 rounded-[2rem]">
        <div className="flex items-center gap-3">
          {/* Rounded pink 3D-styled camera icon */}
          <div className="relative w-11 h-11 sm:w-14 sm:h-14 bg-gradient-to-br from-[#FF5E9D] to-[#FF2A73] rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-lg shadow-pink-500/25 shrink-0 select-none">
            {/* Soft glossy 3D highlight dot */}
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/80 rounded-full blur-[0.5px]" />
            <Video className="w-6 h-6 sm:w-7 sm:h-7 text-white filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" />
          </div>
          <div className="flex flex-col select-none">
            {/* NexoraAi Brand Row */}
            <div className="flex items-baseline leading-none">
              <span className="text-xl sm:text-2xl font-black text-[#1E293B] dark:text-white tracking-tight">Nexora</span>
              <span className="text-xl sm:text-2xl font-black text-[#FF4D8D] tracking-tight">Ai</span>
            </div>
            {/* TALKING OBJECT 3D PRO Badge Row */}
            <div className="flex items-center gap-1 mt-1 leading-none">
              <span className="text-[10px] sm:text-xs font-black text-slate-800 dark:text-slate-100 tracking-wider">TALKING OBJECT</span>
              <span className="text-[10px] sm:text-xs font-black text-indigo-500 dark:text-indigo-400">3D</span>
              <span className="bg-[#FF4D8D] text-white text-[8px] sm:text-[9px] font-black px-1 py-0.5 rounded sm:rounded-md">PRO</span>
            </div>
            {/* Subtitle tag */}
            <span className="text-[7.5px] sm:text-[8.5px] text-[#94A3B8] dark:text-[#64748B] font-extrabold uppercase tracking-[0.3em] mt-1 leading-none">
              3D AI Generator
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          {/* Theme Toggle Button */}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-amber-400 border-2 border-slate-200/60 dark:border-slate-700/80 rounded-2xl transition-all shadow-sm flex items-center justify-center"
            title={darkMode ? "Mode Terang" : "Mode Gelap"}
            id="theme-toggle-btn"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 animate-pulse" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          <button 
            onClick={() => setShowKeyModal(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 border-2 rounded-2xl text-xs font-black transition-all playful-button",
              geminiApiKey 
                ? "bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 border-emerald-150/40 dark:border-emerald-900/40"
                : "bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-600 dark:text-amber-400 border-amber-150/40 dark:border-amber-900/40 animate-pulse"
            )}
            title="Set Gemini API Key"
          >
            <Key className="w-4 h-4" /> 
            <span>{geminiApiKey ? "API Key Aktif" : "Set API Key"}</span>
          </button>

          <button 
            onClick={() => setShowTutorial(true)}
            className="flex items-center gap-2 px-4 py-3 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-[#6336F1] dark:text-indigo-400 border-2 border-indigo-150/40 dark:border-indigo-900/40 rounded-2xl text-xs font-black transition-all playful-button"
            title="Start Interactive Tutorial"
          >
            <HelpCircle className="w-4 h-4 text-indigo-500 animate-bounce font-black" /> Panduan
          </button>
          {user ? (
            <>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="p-3 bg-white border-2 border-blue-100 rounded-2xl text-blue-500 hover:bg-blue-50 transition-all playful-button"
              >
                <History className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 bg-white border-2 border-blue-100 p-1.5 rounded-2xl">
                <div className="flex items-center gap-2 pl-1 select-none">
                  <img src={user.photoURL || ""} alt="User" className="w-8 h-8 rounded-xl border-2 border-white shrink-0" referrerPolicy="no-referrer" />
                  <span className="text-sm font-bold text-[#1E293B] hidden sm:block max-w-[80px] truncate">{user.displayName?.split(" ")[0]}</span>
                </div>
                <button 
                  onClick={logout} 
                  disabled={loggingOut}
                  className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
                  title="Keluar / Logout"
                >
                  {loggingOut ? (
                    <Loader2 className="w-4.5 h-4.5 animate-spin text-red-500" />
                  ) : (
                    <LogOut className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
            </>
          ) : (
            <button onClick={login} className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-2xl font-bold hover:bg-blue-600 transition-all playful-button">
              <LogIn className="w-5 h-5" /> Login
            </button>
          )}
        </div>
      </header>

      {/* History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl p-8 flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-[#1E293B] flex items-center gap-2">
                  <History className="w-7 h-7 text-blue-500" /> Riwayat
                </h2>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-4 opacity-40">
                    <Sparkles className="w-12 h-12" />
                    <p className="font-bold">Belum ada riwayat generate.</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="p-5 bg-blue-50 border-2 border-blue-100 rounded-3xl flex flex-col gap-3 group">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-blue-500 uppercase tracking-widest">
                          {(() => {
                            if (!item.createdAt) return "";
                            if (typeof item.createdAt === "string") return new Date(item.createdAt).toLocaleDateString();
                            if (item.createdAt && typeof item.createdAt.toDate === "function") return item.createdAt.toDate().toLocaleDateString();
                            if (item.createdAt && item.createdAt.seconds) return new Date(item.createdAt.seconds * 1000).toLocaleDateString();
                            return new Date(item.createdAt).toLocaleDateString();
                          })()}
                        </span>
                        <button 
                          onClick={async () => {
                            try {
                              await deleteDoc(doc(db, "stories", item.id));
                            } catch (err) {
                              handleFirestoreError(err, OperationType.DELETE, `stories/${item.id}`);
                            }
                            fetchHistory(user!.uid);
                          }}
                          className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="font-bold text-[#1E293B]">{item.title}</p>
                      <button 
                        onClick={() => {
                          setResult(item.result);
                          setSelections(item.selections);
                          setActiveStoryId(item.id);
                          setStep(13);
                          setShowHistory(false);
                        }}
                        className="text-sm font-bold text-blue-600 hover:underline text-left"
                      >
                        Lihat Hasil →
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-140px)] p-6">
        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex flex-col items-center gap-8 text-center"
            >
              <div className="relative">
                <div className="w-32 h-32 border-8 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Gamepad2 className="w-12 h-12 text-pink-500 animate-bounce" />
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-black mb-3 text-[#1E293B]">Sedang Meracik Cerita...</h2>
                <p className="text-[#64748B] max-w-md font-medium">
                  Kami sedang membuat visual Pixar, dialog edukatif, dan pergerakan kamera yang seru!
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {["Menganalisis Nutrisi...", "Mendesain Karakter...", "Menyiapkan Kamera...", "Mengasah Hook Viral..."].map((t, i) => (
                  <span key={i} className="px-4 py-2 bg-white border-2 border-blue-100 rounded-2xl text-xs font-bold text-blue-500 shadow-sm">
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={!user ? "login-card" : (hasPaid === false ? "payment-wall" : step)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full"
            >
              {!user ? (
                <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-white dark:bg-slate-900/60 rounded-[2.5rem] border-2 border-blue-100/40 dark:border-slate-800/60 shadow-xl max-w-2xl mx-auto text-center gap-6 relative mt-6">
                  <div className="flex flex-col items-center gap-4 select-none">
                    {/* Pink 3D Icon but larger */}
                    <div className="relative w-20 h-20 bg-gradient-to-br from-[#FF5E9D] to-[#FF2A73] rounded-3xl flex items-center justify-center shadow-2xl shadow-pink-500/30 transform rotate-3 animate-pulse">
                      <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-white/80 rounded-full blur-[0.5px]" />
                      <Video className="w-10 h-10 text-white filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.15)]" />
                    </div>
                    
                    <div className="flex flex-col items-center text-center mt-2">
                      <div className="flex items-baseline leading-none">
                        <span className="text-3xl sm:text-4xl font-black text-[#1E293B] dark:text-white tracking-tight">Nexora</span>
                        <span className="text-3xl sm:text-4xl font-black text-[#FF4D8D] tracking-tight">Ai</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 leading-none">
                        <span className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 tracking-wider">TALKING OBJECT</span>
                        <span className="text-sm sm:text-base font-black text-indigo-500 dark:text-indigo-400">3D</span>
                        <span className="bg-[#FF4D8D] text-white text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-md uppercase">PRO</span>
                      </div>
                      <span className="text-[10px] sm:text-xs text-[#94A3B8] dark:text-[#64748B] font-extrabold uppercase tracking-[0.4em] mt-2">
                        3D AI Generator
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-[#64748B] dark:text-slate-400 font-semibold leading-relaxed max-w-md mx-auto">
                      Harap masuk terlebih dahulu menggunakan akun Google Anda untuk merancang karakter, memverifikasi status berlangganan, dan menyimpan riwayat proyek 3D Anda di cloud.
                    </p>
                  </div>

                  <button 
                    onClick={login}
                    className="w-full sm:w-auto min-w-[240px] flex items-center justify-center gap-3 py-4 px-8 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-500/20 transition-all playful-button text-base cursor-pointer"
                  >
                    <LogIn className="w-5 h-5" />
                    <span>Masuk dengan Google</span>
                  </button>

                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                    *Mendukung sinkronisasi instan demi kemudahan akses naskah & model 3D di berbagai perangkat.
                  </p>
                </div>
              ) : hasPaid === null ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900/60 rounded-[2.5rem] border-2 border-blue-100/40 dark:border-slate-800/60 shadow-xl max-w-lg mx-auto text-center gap-4">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                  <p className="font-bold text-[#1E293B] dark:text-white">Memverifikasi Status Berlangganan...</p>
                </div>
              ) : hasPaid === false ? (
                <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-white dark:bg-slate-900/60 rounded-[2.5rem] border-2 border-blue-100/40 dark:border-slate-800/60 shadow-xl max-w-2xl mx-auto text-center gap-6 relative mt-6">
                  <div className="flex flex-col items-center gap-4 select-none">
                    {/* Pink 3D Icon with Crown badge */}
                    <div className="relative w-20 h-20 bg-gradient-to-br from-[#FF5E9D] to-[#FF2A73] rounded-3xl flex items-center justify-center shadow-2xl shadow-pink-500/30 transform -rotate-3">
                      <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-white/80 rounded-full blur-[0.5px]" />
                      <Video className="w-10 h-10 text-white filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.15)]" />
                      <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-900 p-1.5 rounded-xl shadow-lg border-2 border-white dark:border-slate-900 animate-bounce">
                        <Crown className="w-4 h-4" />
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center text-center mt-2">
                      <div className="flex items-baseline leading-none">
                        <span className="text-2xl sm:text-3xl font-black text-[#1E293B] dark:text-white tracking-tight">Nexora</span>
                        <span className="text-2xl sm:text-3xl font-black text-[#FF4D8D] tracking-tight">Ai</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 leading-none">
                        <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 tracking-wider">TALKING OBJECT</span>
                        <span className="text-xs sm:text-sm font-black text-indigo-500 dark:text-indigo-400">3D</span>
                        <span className="bg-[#FF4D8D] text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded sm:rounded-md uppercase">PRO</span>
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-[#94A3B8] dark:text-[#64748B] font-extrabold uppercase tracking-[0.4em] mt-2">
                        Premium Member Access
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-[#64748B] dark:text-slate-400 font-semibold leading-relaxed max-w-md mx-auto">
                      Rancang objek 3D Pixar, buat skrip percakapan edukatif, dan hasilkan video viral short-form tanpa batas menggunakan kecerdasan buatan Gemini AI.
                    </p>
                  </div>

                  <div className="w-full bg-blue-50/50 dark:bg-slate-800/40 p-5 rounded-2xl border border-blue-100/40 dark:border-slate-800 flex flex-col items-center gap-3">
                    <span className="text-xs font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest bg-blue-100/60 dark:bg-blue-900/40 px-3 py-1 rounded-full">
                      Email Pembelian Anda
                    </span>
                    <span className="font-bold text-[#1E293B] dark:text-white text-sm break-all">
                      {user.email}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
                    <button 
                      onClick={handlePayNow}
                      disabled={generatingLink || checkingPayment}
                      className="flex-1 flex items-center justify-center gap-3 py-4 px-6 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-500/20 transition-all playful-button disabled:opacity-50 cursor-pointer"
                    >
                      {generatingLink ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Zap className="w-5 h-5" />
                      )}
                      <span>{generatingLink ? "Membuat Link..." : "Bayar Sekarang (Mayar.id)"}</span>
                    </button>
                    
                    <button 
                      onClick={() => checkPaymentStatus(user)}
                      disabled={checkingPayment || generatingLink}
                      className="flex-1 flex items-center justify-center gap-2 py-4 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-black border-2 border-slate-200 dark:border-slate-700 transition-all playful-button disabled:opacity-50 cursor-pointer"
                    >
                      {checkingPayment ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-5 h-5" />
                      )}
                      <span>{checkingPayment ? "Mengecek..." : "Cek Status Pembayaran"}</span>
                    </button>
                  </div>

                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1">
                    *Setelah pembayaran sukses di Mayar.id, klik tombol <strong>Cek Status Pembayaran</strong> untuk langsung mengaktifkan fitur Anda.
                  </p>
                </div>
              ) : (
                renderStep()
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="mt-8 p-5 bg-red-50 border-2 border-red-100 rounded-3xl text-red-500 font-bold flex items-center justify-between gap-3 shadow-lg shadow-red-500/5">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 shrink-0 animate-bounce" />
              <span className="text-sm leading-relaxed">{error}</span>
            </div>
            <button 
              onClick={() => setError(null)}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl text-xs font-black transition-all shadow-sm shrink-0"
            >
              Tutup
            </button>
          </div>
        )}
      </main>

      {/* Footer Branding (Not floating) */}
      <footer className="w-full max-w-5xl mx-auto px-6 py-6 mt-8 mb-24 border-t border-gray-200/40 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-[#94A3B8] dark:text-[#64748B]">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <p className="text-xs font-semibold">
            © 2026 PT Tungkal Trans Indonesia. All rights reserved.
          </p>
          {user && user.email && (user.email.toLowerCase().trim() === "andry.mhd@gmail.com" || user.email.toLowerCase().trim() === "tapidrtui@gmail.com") && (
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-1 py-1 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-[#FF4D8D] rounded-xl text-[10px] font-extrabold cursor-pointer transition-all border border-slate-200/40 dark:border-slate-800 shadow-sm"
              title="Pengaturan Webhook Developer"
            >
              <Settings className="w-3 h-3" />
              <span>Pengaturan Webhook</span>
            </button>
          )}
        </div>
        <a 
          href="https://wa.me/6285830831654?text=Info%20produk%20NexoraAI" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs shadow-md shadow-emerald-500/10 transition-all playful-button"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.197 1.45 4.817 1.451 5.516 0 10.002-4.49 10.005-10.011.002-2.674-1.04-5.188-2.932-7.082C16.633 1.618 14.12 0.567 11.45 0.565 5.928.565 1.439 5.054 1.436 10.579c-.001 1.702.443 3.361 1.293 4.821l-.183.666-1.062 3.882 3.971-1.04c.642.348 1.344.53 2.052.53h.004z m10.974-7.485c-.302-.152-1.791-.883-2.068-.984-.277-.101-.48-.152-.68.152-.2.302-.776.984-.951 1.187-.176.203-.351.229-.653.076-.302-.151-1.275-.47-2.43-1.5-.897-.801-1.503-1.792-1.68-2.094-.176-.302-.019-.465.132-.616.136-.136.302-.353.454-.529.151-.177.202-.303.303-.505.101-.202.051-.38-.025-.53-.076-.152-.68-1.642-.931-2.247-.245-.589-.493-.509-.68-.519-.176-.009-.377-.01-.58-.01-.202 0-.53.076-.807.38-.277.302-1.057 1.033-1.057 2.522 0 1.488 1.082 2.923 1.233 3.125.151.202 2.13 3.253 5.16 4.561.72.311 1.282.497 1.719.637.724.23 1.384.197 1.906.119.58-.086 1.791-.73 2.043-1.436.252-.705.252-1.309.176-1.436-.076-.127-.277-.203-.58-.354z"/></svg>
          Kontak WA
        </a>
      </footer>

      {/* Footer Progress (Pure indicator, no float watermark) */}
      <footer className="fixed bottom-0 left-0 w-full p-4 flex flex-col items-center gap-3 z-20 pointer-events-none">
        {step < 13 && !isGenerating && (
          <>
            <div className="w-full max-w-sm sm:max-w-md h-3.5 bg-white dark:bg-slate-900 border-2 border-blue-50 dark:border-slate-800 rounded-full overflow-hidden shadow-inner pointer-events-auto">
              <motion.div 
                className="h-full bg-gradient-to-r from-pink-500 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${(step / 12) * 100}%` }}
              />
            </div>
            <div className="flex items-center gap-4 pointer-events-auto bg-white/90 dark:bg-slate-950/90 py-1.5 px-4 backdrop-blur-md rounded-2xl border border-blue-50/50 dark:border-slate-800/80 shadow-md">
              {step > 1 && (
                <button 
                  onClick={() => setStep(prev => prev - 1)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border-2 border-blue-100 dark:border-slate-800 rounded-xl text-xs font-bold text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all playful-button"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Kembali
                </button>
              )}
              <p className="text-[10px] font-black text-[#64748B] dark:text-slate-400 uppercase tracking-[0.2em]">Langkah {step} dari 12</p>
            </div>
          </>
        )}
      </footer>

      <AnimatePresence>
        {showKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => {
                if (geminiApiKey) setShowKeyModal(false);
              }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-[400px] p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-2xl flex flex-col gap-4 z-10 my-auto"
            >
              {geminiApiKey && (
                <button 
                  onClick={() => setShowKeyModal(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-all font-sans font-bold text-xs"
                >
                  ✕
                </button>
              )}

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/40 rounded-xl flex items-center justify-center text-amber-500 shadow-md shadow-amber-500/10 shrink-0">
                  <Key className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1E293B] dark:text-white leading-tight">Aktivasi Gemini API Key 🔑</h3>
                  <p className="text-[10px] font-bold text-amber-500 tracking-wider uppercase">Diperlukan untuk Menjalankan AI</p>
                </div>
              </div>

              <div className="text-[11px] sm:text-xs font-semibold text-[#64748B] dark:text-slate-400 leading-relaxed space-y-2">
                <p>
                  Aplikasi memproses kecerdasan, suara, dan visual 3D sendiri di browser langsung dengan API Key Anda sendiri (aman & gratis dari Google).
                </p>
                
                {/* Collapsible Quick Guide */}
                <div className="space-y-1.5">
                  <button 
                    type="button"
                    onClick={() => setShowGuide(!showGuide)}
                    className="w-full text-left flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800/80 rounded-xl text-[10px] sm:text-xs font-bold text-[#1E293B] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">💡 <span>Cara Dapatkan API Key Gratis</span></span>
                    <span className="text-[10px] text-slate-400 font-bold">{showGuide ? "Tutup ▲" : "Lihat ▼"}</span>
                  </button>

                  <AnimatePresence>
                    {showGuide && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 p-3 bg-slate-50/50 dark:bg-slate-850/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5"
                      >
                        <ol className="list-decimal pl-4 space-y-1 leading-relaxed">
                          <li>Buka <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-extrabold inline-flex items-center gap-0.5">Google AI Studio <Globe className="w-2.5 h-2.5" /></a></li>
                          <li>Login menggunakan Akun Google Anda.</li>
                          <li>Klik tombol <span className="font-extrabold text-[#1E293B] dark:text-slate-200">"Get API key"</span> di menu panel.</li>
                          <li>Klik <span className="font-extrabold text-[#1E293B] dark:text-slate-200">"Create API key in new project"</span>.</li>
                          <li>Salin kunci yang berawalan <code className="font-mono bg-slate-250/60 px-1 rounded dark:bg-slate-700/80 text-[10px]">AIzaSy...</code></li>
                        </ol>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Input Form */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-[#1E293B] dark:text-slate-200 uppercase tracking-wider block font-sans">Masukkan API Key Anda:</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full pr-10 p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none rounded-xl text-xs sm:text-sm font-semibold transition-all font-mono text-slate-800 dark:text-slate-100 placeholder-slate-400"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all flex items-center justify-center p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {user ? (
                  <p className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 leading-tight">
                    <span>✓ Tersinkronisasi dengan akun Google Anda ({user.displayName?.split(" ")[0]}), aman di cloud.</span>
                  </p>
                ) : (
                  <p className="text-[10px] font-bold text-amber-500 flex items-center gap-1 leading-tight">
                    <span>⚠️ Belum login. API key akan disimpan lokal. Login Google untuk sinkronisasi cloud.</span>
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-1">
                <button 
                  type="button"
                  disabled={isSavingKey || !inputKey.trim()}
                  onClick={() => handleSaveApiKey(inputKey)}
                  className="w-full p-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-center rounded-xl shadow-md transition-all speed-150 playful-button flex items-center justify-center gap-1.5 text-xs sm:text-sm"
                >
                  {isSavingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Simpan & Verifikasi Kunci</span>
                </button>

                {!geminiApiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowKeyModal(false);
                    }}
                    className="text-[10px] font-extrabold text-[#64748B] hover:text-[#1E293B] dark:hover:text-slate-300 transition-colors uppercase tracking-wider text-center mt-0.5"
                  >
                    Nanti saja (Jelajahi Dulu)
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowSettingsModal(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-xl p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-2xl flex flex-col gap-4 z-10 my-auto text-left"
            >
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-all font-sans font-bold text-xs cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/45 rounded-xl flex items-center justify-center text-blue-500 shadow-md shrink-0">
                  <Settings className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1E293B] dark:text-white leading-tight">Pengaturan Webhook Mayar.id ⚙️</h3>
                  <p className="text-[10px] font-bold text-blue-500 tracking-wider uppercase">Konfigurasi Pengembang & Sinkronisasi Pembayaran</p>
                </div>
              </div>

              <div className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed space-y-4">
                {/* Step 1 */}
                <div className="space-y-2">
                  <span className="text-xs font-black text-blue-500 uppercase tracking-wider block bg-blue-100/50 dark:bg-blue-950/40 px-3 py-1 rounded-lg w-max">
                    Langkah 1: Salin URL Webhook
                  </span>
                  <p className="text-xs leading-relaxed font-semibold">
                    Setel URL tujuan di bawah ini pada menu <strong className="text-slate-800 dark:text-slate-100">Developer &gt; Webhooks</strong> di Dashboard Mayar Anda.
                  </p>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-sm">
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-300 break-all select-all flex-1">
                      {window.location.origin}/api/webhook/mayar
                    </span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.origin + "/api/webhook/mayar");
                        setCopiedWebhook(true);
                        setTimeout(() => setCopiedWebhook(false), 2000);
                      }}
                      className="p-2 hover:bg-slate-150 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-500 transition-colors shrink-0 cursor-pointer"
                      title="Salin URL Webhook"
                    >
                      {copiedWebhook ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="space-y-2">
                  <span className="text-xs font-black text-blue-500 uppercase tracking-wider block bg-blue-100/50 dark:bg-blue-950/40 px-3 py-1 rounded-lg w-max">
                    Langkah 2: Konfigurasi Event
                  </span>
                  <ul className="space-y-1 list-disc list-inside font-semibold text-[11px]">
                    <li>Pilih tipe event: <strong className="text-blue-500 dark:text-blue-400">payment.success</strong></li>
                    <li>Pastikan format payload dikirim dalam format <strong className="text-blue-500 dark:text-blue-400">JSON</strong>.</li>
                  </ul>
                </div>

                {/* Simulation Panel */}
                <div className="border-t border-slate-200/60 dark:border-slate-800/40 pt-4 space-y-4">
                  <div className="flex items-center gap-2 text-[#FF4D8D]">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-wider">Uji Simulasi Pembayaran / Simulator Webhook</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">Email Akun Pelanggan</label>
                      <input 
                        type="email" 
                        placeholder="Email Penerima" 
                        value={simEmail || user?.email || ""}
                        onChange={(e) => setSimEmail(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-blue-500 focus:outline-none font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status Pembayaran</label>
                      <select 
                        value={simStatus}
                        onChange={(e) => setSimStatus(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-blue-500 focus:outline-none font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
                      >
                        <option value="success">Success / Paid (Akses Premium Aktif)</option>
                        <option value="pending">Pending / Unpaid (Akses Terkunci)</option>
                        <option value="failed">Failed / Expired (Akses Terkunci)</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    onClick={() => simulatePaymentSuccess()}
                    disabled={checkingPayment}
                    className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-black shadow-lg shadow-black/10 transition-all playful-button disabled:opacity-50 text-xs cursor-pointer"
                  >
                    {checkingPayment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>Kirim Webhook Simulasi ke Server</span>
                  </button>

                  {simResponse && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Log Response Server</span>
                      <pre className="font-mono text-[10px] text-slate-600 dark:text-slate-300 break-all whitespace-pre-wrap leading-relaxed max-h-[120px] overflow-y-auto text-left">
                        {simResponse}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showTutorial && (
        <TutorialMode 
          onClose={() => setShowTutorial(false)} 
          onOpenCreator={() => {
            setCreatorActive(true);
            setStep(1);
          }}
        />
      )}
    </div>
  );
}

function StepContainer({ title, subtitle, label = "Koleksi Permainan", children }: { title: string, subtitle: string, label?: string, children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-10 w-full max-w-4xl mx-auto pb-32">
      <div className="text-center space-y-2">
        <p className="text-[#6366F1] font-black uppercase tracking-[0.4em] text-sm">{label}</p>
        <h2 className="text-5xl md:text-6xl font-black tracking-tight text-[#1E293B]">{title}</h2>
        <p className="text-[#64748B] text-xl font-medium">{subtitle}</p>
      </div>
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}

function OptionGrid({ options, onSelect }: { options: StepOption[], onSelect: (id: number) => void }) {
  const colors = ["emerald", "violet", "blue", "cyan", "pink", "amber"];
  
  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
      {options.map((option, idx) => {
        const color = option.color || colors[idx % colors.length];
        
        const colorMap = {
          emerald: { border: "border-l-[#10B981]", bg: "bg-[#D1FAE5]", text: "text-[#059669]" },
          violet: { border: "border-l-[#8B5CF6]", bg: "bg-[#EDE9FE]", text: "text-[#7C3AED]" },
          blue: { border: "border-l-[#3B82F6]", bg: "bg-[#DBEAFE]", text: "text-[#2563EB]" },
          cyan: { border: "border-l-[#06B6D4]", bg: "bg-[#CFFAFE]", text: "text-[#0891B2]" },
          pink: { border: "border-l-[#EC4899]", bg: "bg-[#FCE7F3]", text: "text-[#DB2777]" },
          amber: { border: "border-l-[#F59E0B]", bg: "bg-[#FEF3C7]", text: "text-[#D97706]" },
        }[color as keyof typeof colorMap] || { border: "border-l-blue-500", bg: "bg-blue-50", text: "text-blue-600" };

        return (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={cn(
              "group relative flex items-center gap-6 p-6 bg-white rounded-[2rem] border-l-[12px] shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 text-left playful-button",
              colorMap.border
            )}
          >
            <div className={cn(
              "flex-shrink-0 w-20 h-20 rounded-[1.5rem] flex items-center justify-center transition-all",
              colorMap.bg
            )}>
              <div className={cn("transition-all group-hover:scale-110", colorMap.text)}>
                {option.icon || <span className="text-2xl font-black">{option.id}</span>}
              </div>
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-2xl font-black text-[#1E293B] group-hover:text-blue-600 transition-colors leading-tight">{option.label}</span>
              <span className="text-sm text-[#64748B] font-medium mt-1">
                {option.tooltip || `Pilihan ${option.id}`}
              </span>
            </div>
            <ChevronRight className="ml-auto w-6 h-6 text-[#CBD5E1] group-hover:text-blue-500 transition-all flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
