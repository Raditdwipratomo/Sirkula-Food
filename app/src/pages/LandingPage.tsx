import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CloudRain,
  Coins,
  Flame,
  Globe2,
  HeartHandshake,
  Lightbulb,
  Menu,
  PieChart as PieChartIcon,
  Recycle,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  Sprout,
  TrendingUp,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './LandingPage.css';
import { LogoMark } from '@/components/illustrations';
import { LEFTOVER_SOURCES, PATHWAYS, WASTE_REASONS } from '@/domain/constants';
import { useAuth } from '@/features/auth/AuthContext';
import {
  fetchPublicImpact,
  type PublicImpactSummary,
} from '@/features/public-impact/service';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

const NAV_ITEMS = [
  { id: 'hero-content', label: 'Beranda' },
  { id: 'alur-sirkular', label: 'Cara kerja' },
  { id: 'dampak-nyata', label: 'Ringkasan data' },
  { id: 'edukasi-flw', label: 'Fakta sisa pangan' },
  { id: 'program-sirkular', label: 'Cara pemanfaatan' },
  { id: 'analitik', label: 'Grafik data' },
];

const CIRCULAR_STEPS = [
  {
    number: '01',
    tag: 'PENCATATAN',
    title: 'Catat sisa makanan',
    description:
      'Catat jenis, jumlah, sumber, dan alasan sisa makanan agar jumlahnya mudah dipantau dari waktu ke waktu.',
    photo:
      'https://images.pexels.com/photos/7262910/pexels-photo-7262910.jpeg?auto=compress&cs=tinysrgb&w=1000',
    photoAlt: 'Mencatat dan memilah sisa bahan makanan di dapur',
    icon: ClipboardList,
  },
  {
    number: '02',
    tag: 'ANALISIS',
    title: 'Pahami pola dan penyebabnya',
    description:
      'Lihat ringkasan dan tren dari catatan. AI Gemini membantu menjelaskan pola serta memberi saran tindak lanjut berdasarkan data tersebut.',
    photo:
      'https://images.pexels.com/photos/12935084/pexels-photo-12935084.jpeg?auto=compress&cs=tinysrgb&w=1000',
    photoAlt: 'Layar digital di dapur restoran untuk memantau data dan pola sisa makanan',
    icon: Bot,
  },
  {
    number: '03',
    tag: 'PEMANFAATAN',
    title: 'Pilih cara pemanfaatan',
    description:
      'Dokumentasikan penanganan sisa organik melalui pilihan seperti kompos, maggot BSF, pakan ternak, eco-enzyme, atau biogas.',
    photo:
      'https://images.pexels.com/photos/31416063/pexels-photo-31416063.jpeg?auto=compress&cs=tinysrgb&w=1000',
    photoAlt: 'Pengolahan sisa sayur dan buah menjadi kompos organik',
    icon: Recycle,
  },
];

const FLW_FACTS = [
  {
    title: 'Skala Global',
    detail: '± 1,3 miliar ton pangan terbuang setiap tahun (FAO).',
    icon: Globe2,
    bg: '#E3F4E9',
    color: '#16783F',
  },
  {
    title: 'Indonesia',
    detail: '23–48 juta ton/tahun Food Loss & Waste (Bappenas, 2021).',
    icon: TrendingUp,
    bg: '#FFF4D6',
    color: '#B4690E',
  },
  {
    title: 'Per Kapita',
    detail: '115–184 kg pangan/jiwa/tahun (setara 1–2 kwintal per orang).',
    icon: Users,
    bg: '#DCF1F4',
    color: '#14707F',
  },
  {
    title: 'Komposisi Sampah',
    detail: '± 40% dari total timbulan sampah nasional adalah sisa makanan (SIPSN, 2024).',
    icon: PieChartIcon,
    bg: '#FCE6E3',
    color: '#A32B1F',
  },
];

const ROLE_MINI_PHOTOS = [
  {
    label: 'Cegah & Donasi',
    sub: 'Makanan utuh aman',
    photo:
      'https://images.pexels.com/photos/6995247/pexels-photo-6995247.jpeg?auto=compress&cs=tinysrgb&w=600',
    alt: 'Kotak makanan utuh yang disiapkan untuk disalurkan secara aman',
  },
  {
    label: 'Pakan & BSF',
    sub: 'Sisa piring & lauk',
    photo:
      'https://images.pexels.com/photos/2255459/pexels-photo-2255459.jpeg?auto=compress&cs=tinysrgb&w=600',
    alt: 'Pemanfaatan sisa organik untuk pakan ternak unggas dan biokonversi',
  },
  {
    label: 'Kompos & Biogas',
    sub: 'Sayur & kulit buah',
    photo:
      'https://images.pexels.com/photos/4503273/pexels-photo-4503273.jpeg?auto=compress&cs=tinysrgb&w=600',
    alt: 'Pengolahan sisa tanaman menjadi pupuk kompos subur',
  },
];

const CIRCULAR_PROGRAMS = [
  {
    title: 'Donasi Pangan & Olah Kembali',
    badge: 'Khusus Makanan Utuh',
    description:
      'Makanan utuh yang belum tersentuh dan masih layak konsumsi disalurkan secara aman atau diolah kembali menjadi menu baru di dapur.',
    photo:
      'https://images.pexels.com/photos/6995247/pexels-photo-6995247.jpeg?auto=compress&cs=tinysrgb&w=900',
    photoAlt: 'Makanan utuh dikemas rapi untuk donasi pangan aman',
    icon: HeartHandshake,
    accent: '#16783F',
    badgeBg: '#E3F4E9',
  },
  {
    title: 'Pakan Ternak & Biokonversi Maggot BSF',
    badge: 'Sisa Karbohidrat, Protein & Piring',
    description:
      'Sisa nasi, roti, lauk, dan sisa makan di piring diubah menjadi pakan unggas/ikan atau diurai oleh larva Black Soldier Fly (BSF).',
    photo:
      'https://images.pexels.com/photos/2255459/pexels-photo-2255459.jpeg?auto=compress&cs=tinysrgb&w=900',
    photoAlt: 'Peternakan unggas yang memanfaatkan pakan organik',
    icon: Recycle,
    accent: '#8A5200',
    badgeBg: '#FFF0D2',
  },
  {
    title: 'Pupuk Kompos & POC / Eco-Enzyme',
    badge: 'Sayuran, Ampas & Kulit Buah',
    description:
      'Potongan sayur, ampas teh/kopi, dan kulit buah segar difermentasi menjadi kompos padat Takakura atau cairan Eco-Enzyme penyubur tanaman.',
    photo:
      'https://images.pexels.com/photos/4503273/pexels-photo-4503273.jpeg?auto=compress&cs=tinysrgb&w=900',
    photoAlt: 'Tangan memegang tanah kompos organik dengan tunas tanaman hijau',
    icon: Sprout,
    accent: '#5C4A8A',
    badgeBg: '#EAE4F6',
  },
  {
    title: 'Energi Biogas Biodigester',
    badge: 'Fermentasi Anaerobik',
    description:
      'Sisa organik berminyak atau basi difermentasi secara kedap udara di biodigester menjadi energi gas metana ramah lingkungan.',
    photo:
      'https://images.pexels.com/photos/3735218/pexels-photo-3735218.jpeg?auto=compress&cs=tinysrgb&w=900',
    photoAlt: 'Instalasi pengolahan organik ramah lingkungan dan energi bersih',
    icon: Flame,
    accent: '#14707F',
    badgeBg: '#DCF1F4',
  },
];

const HERO_SLIDES = [
  {
    id: 'dapur',
    src: 'https://images.pexels.com/photos/7262910/pexels-photo-7262910.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'Pemilahan dan penimbangan sisa makanan di dapur',
    tag: 'Catat Sisa Dapur',
  },
  {
    id: 'kompos',
    src: 'https://images.pexels.com/photos/4503273/pexels-photo-4503273.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'Pengolahan sisa sayur dan kulit buah menjadi kompos subur',
    tag: 'Kompos & POC Organik',
  },
  {
    id: 'donasi',
    src: 'https://images.pexels.com/photos/6995247/pexels-photo-6995247.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'Penyaluran porsi makanan utuh aman untuk donasi pangan',
    tag: 'Donasi Pangan Aman',
  },
  {
    id: 'ternak',
    src: 'https://images.pexels.com/photos/2255459/pexels-photo-2255459.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'Pemanfaatan sisa piring dan organik untuk pakan ternak',
    tag: 'Pakan Ternak & Maggot BSF',
  },
  {
    id: 'sirkular',
    src: 'https://images.pexels.com/photos/31416063/pexels-photo-31416063.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'Pemilahan limbah organik segar untuk siklus sirkular',
    tag: 'Pengolahan Sirkular',
  },
];

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits }).format(value);
}

function formatSnapshot(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function LandingPage() {
  const { user } = useAuth();
  const [impact, setImpact] = useState<PublicImpactSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashId = window.location.hash.replace('#', '');
      const valid = [
        'hero-content',
        'alur-sirkular',
        'dampak-nyata',
        'edukasi-flw',
        'program-sirkular',
        'analitik',
      ];
      if (valid.includes(hashId)) return hashId;
    }
    return 'hero-content';
  });
  const pageRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let mounted = true;
    let inFlight = false;
    const controller = new AbortController();
    const loadImpact = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const nextImpact = await fetchPublicImpact(controller.signal);
        if (mounted) {
          setImpact(nextImpact);
          setError(null);
        }
      } catch (loadError) {
        if (
          mounted &&
          !(loadError instanceof DOMException && loadError.name === 'AbortError')
        ) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Statistik belum tersedia.'
          );
        }
      } finally {
        inFlight = false;
        if (mounted) setIsLoading(false);
      }
    };

    void loadImpact();
    const intervalId = window.setInterval(() => void loadImpact(), 30_000);
    return () => {
      mounted = false;
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [refreshKey]);

  // Sync active section based on scroll position & hash
  useEffect(() => {
    const sectionIds = [
      'hero-content',
      'alur-sirkular',
      'dampak-nyata',
      'edukasi-flw',
      'program-sirkular',
      'analitik',
    ];

    const handleScroll = () => {
      // If user has scrolled almost to the bottom of the page, activate the last section
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 100
      ) {
        setActiveSection('analitik');
        return;
      }

      // If at the very top, activate hero-content
      if (window.scrollY < 100) {
        setActiveSection('hero-content');
        return;
      }

      const headerOffset = 130;
      let current = 'hero-content';
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= headerOffset) {
            current = id;
          }
        }
      }
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    id: string
  ) => {
    e.preventDefault();
    setActiveSection(id);
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
      window.history.replaceState(null, '', `#${id}`);
    }
  };

  // GSAP Entrance & ScrollTrigger Animations (Silky-smooth expo.out + zero CSS transform conflict)
  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    ScrollTrigger.config({ ignoreMobileResize: true });

    const releaseForHover = (selector: string) => {
      const elements = root.querySelectorAll<HTMLElement>(selector);
      elements.forEach((el) => {
        el.dataset.gsapDone = 'true';
      });
      gsap.set(elements, { clearProps: 'transform,willChange' });
    };

    const ctx = gsap.context(() => {
      gsap.defaults({ ease: 'expo.out', force3D: true });

      // 1. Hero Entrance Timeline
      const heroTl = gsap.timeline();
      heroTl
        .fromTo(
          '[data-gsap="hero-badge"]',
          { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, duration: 0.85 }
        )
        .fromTo(
          '[data-gsap="hero-title"]',
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 1.0 },
          '-=0.68'
        )
        .fromTo(
          '[data-gsap="hero-underline"]',
          { strokeDasharray: 200, strokeDashoffset: 200 },
          { strokeDashoffset: 0, duration: 1.15, ease: 'power3.out' },
          '-=0.65'
        )
        .fromTo(
          '[data-gsap="hero-desc"]',
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.9 },
          '-=0.85'
        )
        .fromTo(
          '[data-gsap="hero-cta"]',
          { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, duration: 0.85 },
          '-=0.72'
        )
        .fromTo(
          '[data-gsap="hero-trust"] > div',
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08 },
          '-=0.68'
        )
        .fromTo(
          '[data-gsap="hero-photo"]',
          { autoAlpha: 0, scale: 0.965, y: 22 },
          { autoAlpha: 1, scale: 1, y: 0, duration: 1.15 },
          '-=1.05'
        )
        .fromTo(
          '[data-gsap="hero-photo-img"]',
          { scale: 1.08 },
          {
            scale: 1,
            duration: 1.45,
            onComplete: () => releaseForHover('[data-gsap="hero-photo-img"]'),
          },
          '-=1.15'
        )
        .fromTo(
          '[data-gsap="hero-status"]',
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.85 },
          '-=0.95'
        );

      // 2. Step Cards (01, 02, 03) Scroll Reveal
      gsap.fromTo(
        '[data-gsap="step-header"]',
        { autoAlpha: 0, y: 22 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.95,
          scrollTrigger: {
            trigger: '#alur-sirkular',
            start: 'top 84%',
            once: true,
          },
        }
      );

      const stepTl = gsap.timeline({
        scrollTrigger: {
          trigger: '[data-gsap="step-grid"]',
          start: 'top 85%',
          once: true,
        },
        onComplete: () => {
          releaseForHover('[data-gsap="step-card"]');
          releaseForHover('[data-gsap="step-photo"]');
        },
      });

      stepTl
        .fromTo(
          '[data-gsap="step-card"]',
          { autoAlpha: 0, y: 28 },
          { autoAlpha: 1, y: 0, duration: 1.0, stagger: 0.12 }
        )
        .fromTo(
          '[data-gsap="step-photo"]',
          { scale: 1.08 },
          { scale: 1, duration: 1.3, stagger: 0.12 },
          0
        );

      // 3. Dampak Nyata (Documentary Photo + White Impact Ledger)
      const impactTl = gsap.timeline({
        scrollTrigger: {
          trigger: '#dampak-nyata',
          start: 'top 82%',
          once: true,
        },
      });

      impactTl
        .fromTo(
          '[data-gsap="impact-card"]',
          { autoAlpha: 0, y: 26 },
          { autoAlpha: 1, y: 0, duration: 1.05, stagger: 0.14 }
        )
        .fromTo(
          '[data-gsap="impact-photo"]',
          { scale: 1.08 },
          { scale: 1, duration: 1.35 },
          0
        )
        .fromTo(
          '[data-gsap="impact-stat"]',
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.85, stagger: 0.09 },
          '-=0.75'
        )
        .fromTo(
          '[data-gsap="impact-progress"]',
          { scaleX: 0, transformOrigin: 'left center' },
          { scaleX: 1, duration: 1.25, ease: 'expo.out' },
          '-=0.65'
        );

      // 4. Edukasi FLW Split & 3-Column National Ledger
      gsap.fromTo(
        '[data-gsap="flw-split"]',
        { autoAlpha: 0, y: 26 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 1.0,
          stagger: 0.14,
          scrollTrigger: {
            trigger: '#edukasi-flw',
            start: 'top 82%',
            once: true,
          },
        }
      );

      gsap.fromTo(
        '[data-gsap="flw-header"]',
        { autoAlpha: 0, y: 20 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
          scrollTrigger: {
            trigger: '[data-gsap="flw-header"]',
            start: 'top 86%',
            once: true,
          },
        }
      );

      gsap.fromTo(
        '[data-gsap="flw-card"]',
        { autoAlpha: 0, y: 22 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.95,
          stagger: 0.11,
          scrollTrigger: {
            trigger: '[data-gsap="flw-grid"]',
            start: 'top 85%',
            once: true,
          },
        }
      );

      // 5. 7 Jalur Pengolahan Sirkular Photo Cards
      gsap.fromTo(
        '[data-gsap="program-header"]',
        { autoAlpha: 0, y: 22 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.95,
          scrollTrigger: {
            trigger: '#program-sirkular',
            start: 'top 84%',
            once: true,
          },
        }
      );

      const programTl = gsap.timeline({
        scrollTrigger: {
          trigger: '[data-gsap="program-grid"]',
          start: 'top 85%',
          once: true,
        },
        onComplete: () => {
          releaseForHover('[data-gsap="program-card"]');
          releaseForHover('[data-gsap="program-photo"]');
        },
      });

      programTl
        .fromTo(
          '[data-gsap="program-card"]',
          { autoAlpha: 0, y: 26 },
          { autoAlpha: 1, y: 0, duration: 1.0, stagger: 0.1 }
        )
        .fromTo(
          '[data-gsap="program-photo"]',
          { scale: 1.08 },
          { scale: 1, duration: 1.3, stagger: 0.1 },
          0
        );

      // 6. Public Analytics Section & Closing CTA Banner
      gsap.fromTo(
        '[data-gsap="analytics-box"]',
        { autoAlpha: 0, y: 24 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 1.0,
          scrollTrigger: {
            trigger: '#analitik',
            start: 'top 84%',
            once: true,
          },
        }
      );

      const ctaTl = gsap.timeline({
        scrollTrigger: {
          trigger: '[data-gsap="cta-banner"]',
          start: 'top 86%',
          once: true,
        },
      });

      ctaTl
        .fromTo(
          '[data-gsap="cta-banner"]',
          { autoAlpha: 0, scale: 0.985, y: 22 },
          { autoAlpha: 1, scale: 1, y: 0, duration: 1.05 }
        )
        .fromTo(
          '[data-gsap="cta-photo"]',
          { scale: 1.08 },
          { scale: 1, duration: 1.35 },
          0
        );
    }, root);

    return () => ctx.revert();
  }, []);

  const startPath = user ? '/app/catat' : '/auth?mode=register';
  const loginPath = user ? '/app' : '/auth?mode=login';

  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    if (isHeroPaused) return;
    const timer = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isHeroPaused]);

  const handlePrevSlide = () => {
    setCurrentHeroSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentHeroSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (diff > 40) {
      handleNextSlide();
    } else if (diff < -40) {
      handlePrevSlide();
    }
    touchStartXRef.current = null;
  };

  const heroDivertedText = impact
    ? `${formatNumber(impact.divertedKg, 1)} kg`
    : '11,2 kg';
  const heroTotalText = impact
    ? `${formatNumber(impact.totalWasteKg, 1)} kg`
    : '18,5 kg';
  const heroRate =
    impact && impact.totalWasteKg > 0
      ? Math.min(100, Math.round((impact.divertedKg / impact.totalWasteKg) * 100))
      : 68;

  const impactPathwayList = useMemo(() => {
    const map = new Map<string, number>();
    for (const day of impact?.dailyAnalytics ?? []) {
      for (const item of day.pathwayBreakdown) {
        map.set(item.pathway, (map.get(item.pathway) ?? 0) + item.weightKg);
      }
    }
    return Array.from(map.entries())
      .map(([key, weightKg]) => ({
        key,
        label:
          key === 'buang_prosedur'
            ? 'Biogas'
            : (PATHWAYS[key as keyof typeof PATHWAYS]?.shortLabel ?? key),
        weightKg,
      }))
      .filter((x) => x.weightKg > 0)
      .sort((a, b) => b.weightKg - a.weightKg)
      .slice(0, 4);
  }, [impact]);

  return (
    <main ref={pageRef} id="main" className="landing-page min-h-screen">
      <a
        href="#hero-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-sf-dark focus:shadow-lg"
      >
        Langsung ke konten utama
      </a>

      {/* Sticky Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-[#dce8df]/80 bg-[#f7faf8]/90 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-5 sm:px-8 lg:h-[80px] lg:px-12">
          <Link
            to="/"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setActiveSection('hero-content');
              window.history.replaceState(null, '', window.location.pathname);
            }}
            aria-label="SirkulaFood beranda"
            className="inline-flex items-center gap-2.5 group"
          >
            <LogoMark className="size-9 transition-transform group-hover:scale-105" />
            <span className="text-xl font-bold tracking-tight text-[#0b3b24]">
              Sirkula<span className="text-primary">Food</span>
            </span>
          </Link>

          <nav
            className="hidden items-center gap-1 rounded-full border border-[#dce8df] bg-white/80 p-1.5 text-[13px] font-medium text-[#3d5245] shadow-2xs lg:flex"
            aria-label="Navigasi utama"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => handleNavClick(e, item.id)}
                  className={`rounded-full px-3.5 py-1.5 transition-all ${
                    isActive
                      ? 'bg-[#e6f0e9] font-bold text-[#0b3b24] shadow-xs'
                      : 'text-[#3d5245] hover:bg-[#eff6f1] hover:text-[#0b3b24]'
                  }`}
                  aria-current={isActive ? 'location' : undefined}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to={loginPath}
              className="rounded-full px-4 py-2 text-[13px] font-semibold text-[#1e3528] transition-colors hover:bg-[#e6f0e9] hover:text-[#0b3b24]"
            >
              {user ? 'Dashboard' : 'Masuk'}
            </Link>
            <Link
              to={startPath}
              className="inline-flex h-10 items-center rounded-full bg-[#0b3b24] px-5 text-[13px] font-semibold text-white shadow-xs transition-all hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {user ? 'Catat sisa makanan' : 'Mulai mencatat'}
            </Link>
          </div>

          <button
            className="grid size-10 place-items-center rounded-xl border border-border bg-white text-sf-dark md:hidden"
            type="button"
            aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav
            className="grid gap-1.5 border-t border-border bg-white px-5 py-4 shadow-lg md:hidden"
            aria-label="Navigasi mobile"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    handleNavClick(e, item.id);
                  }}
                  className={`rounded-xl px-3.5 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-[#e6f0e9] font-bold text-[#0b3b24]'
                      : 'font-medium text-[#3d5245] hover:bg-sf-mint hover:text-[#0b3b24]'
                  }`}
                  aria-current={isActive ? 'location' : undefined}
                >
                  {item.label}
                </a>
              );
            })}
            <div className="mt-2 grid grid-cols-2 gap-2.5 border-t border-border pt-3">
              <Link
                className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-[#f7faf8] text-sm font-semibold text-sf-dark"
                to={loginPath}
                onClick={() => setMobileMenuOpen(false)}
              >
                {user ? 'Dashboard' : 'Masuk'}
              </Link>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#0b3b24] text-sm font-semibold text-white"
                to={startPath}
                onClick={() => setMobileMenuOpen(false)}
              >
                {user ? 'Catat sisa' : 'Mulai mencatat'}
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* Section 1: Hero Section */}
      <section id="hero-content" className="sf-hero-bg scroll-mt-[80px] overflow-hidden">
        <div className="mx-auto grid max-w-[1320px] items-center gap-10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14 lg:px-12 lg:py-16">
          <div className="max-w-[610px]">
            <div
              data-gsap="hero-badge"
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#bfe0c9] bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-[#16783F] shadow-2xs"
            >
              <Sprout className="size-3.5 shrink-0" aria-hidden="true" />
              <span>Pencatatan dan pengelolaan sisa makanan</span>
            </div>

            <h1
              data-gsap="hero-title"
              className="text-[36px] font-extrabold leading-[1.12] tracking-tight text-[#0c2617] sm:text-[50px] lg:text-[56px]"
            >
              Catat dan Kelola Sisa Makanan{' '}
              <span className="relative inline-block text-[#16783F]">
                Lebih Mudah
                <svg
                  className="-bottom-2 left-0 w-full text-[#74c69d]"
                  viewBox="0 0 180 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    data-gsap="hero-underline"
                    d="M3 9.5C22 3.5 41 13.5 60 7.5C79 1.5 98 12.5 117 6.5C136 0.5 155 11.5 177 5.5"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            <p
              data-gsap="hero-desc"
              className="mt-6 max-w-[530px] text-[15px] leading-relaxed text-[#485d50] sm:text-[17px]"
            >
              Catat jumlah dan penyebab sisa makanan, pantau perubahannya, lalu dokumentasikan pemanfaatannya. SirkulaFood menyajikan ringkasan data dan wawasan AI untuk membantu Anda menentukan langkah berikutnya.
            </p>

            <div
              data-gsap="hero-cta"
              className="mt-8 flex flex-wrap items-center gap-3.5"
            >
              <Link
                to={startPath}
                className="inline-flex h-12 items-center gap-2.5 rounded-full bg-[#0b3b24] px-6 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Utensils className="size-4" aria-hidden="true" />
                <span>{user ? 'Catat sisa makanan' : 'Mulai catat sisa makanan'}</span>
              </Link>
              <a
                href="#alur-sirkular"
                onClick={(e) => handleNavClick(e, 'alur-sirkular')}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-[#c5d9cb] bg-white px-5 text-sm font-semibold text-[#0b3b24] transition-colors hover:bg-[#eaf4ed]"
              >
                <span>Lihat cara kerja</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>

            <div
              data-gsap="hero-trust"
              className="mt-8 grid grid-cols-3 gap-3 border-t border-[#d8e6dc] pt-6 sm:gap-5"
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#dcf2e4] text-[#16783F]">
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold text-[#0f2418]">Catat Cepat</p>
                  <p className="text-[11px] text-[#5b6b61]">Berat & sumber sisa</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#dcf2e4] text-[#16783F]">
                  <Sparkles className="size-3.5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold text-[#0f2418]">AI Gemini</p>
                  <p className="text-[11px] text-[#5b6b61]">Pola & saran cegah</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#dcf2e4] text-[#16783F]">
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold text-[#0f2418]">7 Jalur Sirkular</p>
                  <p className="text-[11px] text-[#5b6b61]">Aman & terukur</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Framed Photo Card with Auto-sliding Carousel & Unobstructed Visuals */}
          <div
            data-gsap="hero-photo"
            className="relative mx-auto w-full max-w-[520px] lg:max-w-none"
          >
            <div
              className="sf-hero-showcase group/showcase"
              onMouseEnter={() => setIsHeroPaused(true)}
              onMouseLeave={() => setIsHeroPaused(false)}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Photo Viewport — 100% Clean & Unobstructed Photography */}
              <div className="sf-hero-showcase-inner">
                {/* Horizontal Auto-sliding Photo Track */}
                <div
                  className="flex h-full w-full will-change-transform transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    transform: `translateX(-${currentHeroSlide * 100}%)`,
                  }}
                  aria-live="polite"
                >
                  {HERO_SLIDES.map((slide, idx) => (
                    <div
                      key={slide.id}
                      className="relative h-full w-full shrink-0 select-none overflow-hidden"
                    >
                      <img
                        data-gsap="hero-photo-img"
                        src={slide.src}
                        alt={slide.alt}
                        className="sf-hero-showcase-img"
                        fetchPriority={idx === 0 ? 'high' : 'auto'}
                        loading={idx === 0 ? 'eager' : 'lazy'}
                      />
                    </div>
                  ))}
                </div>

                {/* Subtle Bottom Gradient for Caption & Pagination Legibility */}
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent"
                  aria-hidden="true"
                />

                {/* Active Photo Topic Tag Pill (Minimal, non-blocking) */}
                <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 z-10 pointer-events-none">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold text-white/95 backdrop-blur-md border border-white/15">
                    <span className="size-1.5 rounded-full bg-[#74e39a]" />
                    <span>{HERO_SLIDES[currentHeroSlide].tag}</span>
                  </span>
                </div>

                {/* Minimalist Slide Pagination Indicators */}
                <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 z-10 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1.5 backdrop-blur-md border border-white/15">
                  {HERO_SLIDES.map((slide, i) => (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setCurrentHeroSlide(i)}
                      aria-label={`Buka foto ${i + 1}: ${slide.tag}`}
                      className={cn(
                        'h-1.5 rounded-full transition-all duration-300',
                        currentHeroSlide === i
                          ? 'w-5 sm:w-6 bg-[#74e39a]'
                          : 'w-1.5 bg-white/40 hover:bg-white/75'
                      )}
                    />
                  ))}
                </div>

                {/* Subtle Hover Controls */}
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  aria-label="Foto sebelumnya"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 grid size-8 sm:size-9 place-items-center rounded-full bg-white/85 hover:bg-white text-[#072617] shadow-md backdrop-blur-xs opacity-0 transition-all duration-200 group-hover/showcase:opacity-100 focus:opacity-100 hover:scale-105"
                >
                  <ChevronLeft className="size-4 sm:size-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextSlide}
                  aria-label="Foto berikutnya"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 grid size-8 sm:size-9 place-items-center rounded-full bg-white/85 hover:bg-white text-[#072617] shadow-md backdrop-blur-xs opacity-0 transition-all duration-200 group-hover/showcase:opacity-100 focus:opacity-100 hover:scale-105"
                >
                  <ChevronRight className="size-4 sm:size-5" />
                </button>
              </div>

              {/* Dedicated Status Console Docked Below the Photo (Does NOT block the photo) */}
              <div
                data-gsap="hero-status"
                className="mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-[16px] bg-[#041a0f] border border-white/10 px-3.5 py-2.5 sm:px-4"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white/10 text-[#74e39a]">
                    <Scale className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="relative flex size-2 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#74e39a] opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-[#74e39a]" />
                      </span>
                      <p className="text-xs font-bold text-white tracking-tight truncate">
                        Sistem Sirkular Beroperasi
                      </p>
                    </div>
                    <p className="text-[11px] text-[#8fd9a8] truncate">
                      7 jalur pengolahan limbah organik terintegrasi
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto rounded-xl bg-white/5 border border-white/10 px-3 py-1.5">
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-white">
                      {heroDivertedText}{' '}
                      <span className="text-[10px] font-normal text-white/60">
                        / {heroTotalText}
                      </span>
                    </p>
                    <p className="text-[10px] font-semibold text-[#74e39a]">
                      {heroRate}% Terkelola
                    </p>
                  </div>
                  <div className="w-12 h-1.5 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-[#74e39a] transition-all duration-500"
                      style={{ width: `${heroRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Alur Sirkular Terstruktur (3 Step Photo Cards 01, 02, 03) */}
      <section
        id="alur-sirkular"
        className="scroll-mt-[80px] border-t border-[#e2ece5] bg-white py-16 sm:py-24"
      >
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <div
            data-gsap="step-header"
            className="flex flex-col justify-between gap-4 md:flex-row md:items-end"
          >
            <div className="max-w-[560px]">
              <p className="text-sm font-semibold text-[#16783F]">
                Kelola sisa makanan dalam tiga langkah
              </p>
              <h2 className="mt-2 text-3xl font-extrabold leading-[1.15] tracking-tight text-[#0c2617] sm:text-[40px]">
                Dari pencatatan hingga tindak lanjut
              </h2>
            </div>
            <p className="max-w-[440px] text-sm leading-relaxed text-[#52645a]">
              Mulai dengan mencatat sisa makanan, pahami polanya, lalu dokumentasikan cara penanganannya.
            </p>
          </div>

          <div
            data-gsap="step-grid"
            className="mt-11 grid gap-6 md:grid-cols-3"
          >
            {CIRCULAR_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.number}
                  data-gsap="step-card"
                  className="sf-step-card flex flex-col justify-between p-6"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="grid size-11 place-items-center rounded-2xl bg-[#c9ebd3] text-[#0b3b24]">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="text-3xl font-extrabold text-[#c7d6cc]">
                        {step.number}
                      </span>
                    </div>

                    <div className="sf-step-photo-wrap mt-5">
                      <img
                        data-gsap="step-photo"
                        src={step.photo}
                        alt={step.photoAlt}
                        className="sf-step-photo"
                        loading="lazy"
                      />
                    </div>

                    <div className="mt-5">
                      <span className="inline-block rounded-md bg-[#c9ebd3] px-2.5 py-1 text-[11px] font-bold text-[#0b3b24]">
                        {step.tag}
                      </span>
                      <h3 className="mt-3 text-xl font-bold text-[#0c2617]">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-[#52645a] sm:text-[13px]">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 3: Dampak Nyata yang Tercatat (Editorial Documentary + Live White Ledger) */}
      <section
        id="dampak-nyata"
        className="sf-forest-band scroll-mt-[80px] text-white"
      >
        <div className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-22 lg:px-12">
          <div className="grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
            {/* Left Column: Narrative + Real Documentary Photo */}
            <div data-gsap="impact-card" className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-[#8ce9af]">
                  Rekapitulasi data publik
                </p>
                <h2 className="mt-2 text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-[40px]">
                  Ringkasan sisa makanan yang tercatat
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#c6ddd0] sm:text-base">
                  Lihat jumlah sisa makanan yang tercatat dan penanganannya dalam satu ringkasan. Angka diperbarui mengikuti data yang tersedia di aplikasi.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#072818]">
                <img
                  data-gsap="impact-photo"
                  src="https://images.pexels.com/photos/31416063/pexels-photo-31416063.jpeg?auto=compress&cs=tinysrgb&w=1200"
                  alt="Pemilahan sisa sayuran dapur untuk diolah menjadi kompos"
                  className="h-56 w-full object-cover sm:h-64"
                  loading="lazy"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#062214]/90 via-[#062214]/25 to-transparent"
                  aria-hidden="true"
                />
                <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-4 text-xs text-white">
                  <p className="font-medium text-[#e2f2e8]">
                    Pencatatan terhubung langsung dengan tindakan olah kompos, maggot BSF, pakan ternak, dan biogas.
                  </p>
                  <Link
                    to={startPath}
                    className="shrink-0 rounded-full bg-white px-4 py-2 font-bold text-[#0b3b24] transition-colors hover:bg-[#d8f3dc]"
                  >
                    Ikut mencatat
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column: High-Contrast White Impact Ledger */}
            <div
              data-gsap="impact-card"
              className="rounded-3xl border border-[#dce8df] bg-white p-6 text-[#14231a] shadow-2xl sm:p-8 lg:p-9"
            >
              {/* Ledger Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4eee7] pb-4">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-[#16783F]" />
                  <span className="text-xs font-bold text-[#0f2418]">
                    Ringkasan sisa makanan
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#5b6b61]">
                  <span>
                    {impact
                      ? `Diperbarui ${formatSnapshot(impact.snapshotAt)} WIB`
                      : 'Memuat data...'}
                  </span>
                  {!isLoading && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsLoading(true);
                        setRefreshKey((k) => k + 1);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#d0e2d5] bg-[#f4f9f5] px-2.5 py-1 font-semibold text-[#0b3b24] transition-colors hover:bg-[#e3f4e9]"
                    >
                      <RefreshCw className="size-3" aria-hidden="true" />
                      <span>Segarkan</span>
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <p
                  className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-900"
                  role="status"
                >
                  {error}
                </p>
              )}

              {/* 3 Main Tabular Figures with Clean Hairline Dividers */}
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:divide-x sm:divide-[#e4eee7]">
                <div data-gsap="impact-stat" className="min-w-0 sm:pr-3 lg:pr-5">
                  <p className="text-xs font-medium text-[#5b6b61]">
                    Sisa makanan tercatat
                  </p>
                  <p
                    className="mt-2 text-2xl font-extrabold tracking-tight text-[#0f2418] tabular-nums whitespace-nowrap sm:text-3xl lg:text-4xl"
                    aria-live="polite"
                  >
                    {impact ? (
                      <>
                        <span>{formatNumber(impact.totalWasteKg, 1)}</span>
                        <span className="ml-1 text-base font-bold text-[#5b6b61] sm:text-lg lg:text-xl">
                          kg
                        </span>
                      </>
                    ) : isLoading ? (
                      '…'
                    ) : (
                      '—'
                    )}
                  </p>
                  <p className="mt-1.5 text-[11px] text-[#66786d]">
                    Total berat dari seluruh catatan
                  </p>
                </div>

                <div data-gsap="impact-stat" className="min-w-0 sm:px-3 lg:px-5">
                  <p className="text-xs font-medium text-[#5b6b61]">
                    Dimanfaatkan kembali
                  </p>
                  <p
                    className="mt-2 text-2xl font-extrabold tracking-tight text-[#16783F] tabular-nums whitespace-nowrap sm:text-3xl lg:text-4xl"
                    aria-live="polite"
                  >
                    {impact ? (
                      <>
                        <span>{formatNumber(impact.divertedKg, 1)}</span>
                        <span className="ml-1 text-base font-bold text-[#16783F]/85 sm:text-lg lg:text-xl">
                          kg
                        </span>
                      </>
                    ) : isLoading ? (
                      '…'
                    ) : (
                      '—'
                    )}
                  </p>
                  <p className="mt-1.5 text-[11px] text-[#66786d]">
                    Telah disalurkan ke jalur sirkular
                  </p>
                </div>

                <div data-gsap="impact-stat" className="min-w-0 sm:pl-3 lg:pl-5">
                  <p className="text-xs font-medium text-[#5b6b61]">
                    Porsi makanan dipantau
                  </p>
                  <p
                    className="mt-2 text-2xl font-extrabold tracking-tight text-[#0f2418] tabular-nums whitespace-nowrap sm:text-3xl lg:text-4xl"
                    aria-live="polite"
                  >
                    {impact
                      ? formatNumber(impact.servedPortions)
                      : isLoading
                        ? '…'
                        : '—'}
                  </p>
                  <p className="mt-1.5 text-[11px] text-[#66786d]">
                    Akumulasi porsi yang disajikan
                  </p>
                </div>
              </div>

              {/* Proportional Progress Bar: Rasio Pemanfaatan Sirkular */}
              <div className="mt-7 rounded-2xl border border-[#e2ece5] bg-[#f6faf7] p-4 sm:p-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0f2418]">
                    Tingkat keterolahan limbah sirkular
                  </span>
                  <span className="font-extrabold text-[#16783F] tabular-nums">
                    {heroRate}% terkelola
                  </span>
                </div>
                <div className="mt-2.5 flex h-3 w-full overflow-hidden rounded-full bg-[#dce8df]">
                  <div
                    data-gsap="impact-progress"
                    className="h-full bg-[#16783F] transition-[width] duration-700 ease-out"
                    style={{ width: `${heroRate}%` }}
                  />
                </div>

                {impactPathwayList.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-2.5 pt-1 sm:grid-cols-4">
                    {impactPathwayList.map((item) => (
                      <div
                        key={item.key}
                        className="rounded-xl border border-[#e2ece5] bg-white px-3 py-2"
                      >
                        <p className="truncate text-[11px] font-medium text-[#5b6b61]">
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-xs font-bold text-[#0f2418] tabular-nums">
                          {formatNumber(item.weightKg, 1)} kg
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Honest Data Provenance Note */}
              <p className="mt-5 text-xs leading-relaxed text-[#5b6b61]">
                {impact?.sampleLogCount
                  ? `Catatan: Angka di atas mencakup ${formatNumber(impact.sampleLogCount)} catatan simulasi untuk keperluan demonstrasi aplikasi dan ditandai secara terpisah dari data operasional.`
                  : 'Angka dihitung langsung dari catatan pengguna tanpa taksiran karangan.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Urgensi Nasional — Tahukah Kamu & Dampak FLW */}
      <section
        id="edukasi-flw"
        className="scroll-mt-[80px] bg-[#f4f9f5] py-16 sm:py-24"
      >
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          {/* Part A: Tahukah Kamu? Pangan terbuang masih sangat besar */}
          <div className="grid items-stretch gap-8 lg:grid-cols-12 lg:gap-10">
            <div
              data-gsap="flw-split"
              className="rounded-3xl border border-[#dce8df] bg-white p-6 shadow-xs sm:p-9 lg:col-span-7"
            >
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#16783F]/40 bg-[#eff8f2] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#16783F]">
                <Lightbulb className="size-4" aria-hidden="true" />
                <span>Tahukah Kamu?</span>
              </span>

              <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-[#0c2617] sm:text-3xl">
                Pangan terbuang masih sangat besar
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-[#4a5d52]">
                Menurut <strong>Food and Agriculture Organization (FAO)</strong>, secara global{' '}
                <strong>sepertiga</strong> dari pangan yang diproduksi atau sekitar{' '}
                <strong>1,3 miliar ton</strong> pangan terbuang setiap tahun. Di Indonesia,{' '}
                <strong>Food Loss and Waste (FLW)</strong> mencapai{' '}
                <strong>23–48 juta ton/tahun</strong>. Jika dihitung per jiwa, menyumbang{' '}
                <strong>115–184 kg/jiwa/tahun</strong>—setara <strong>1–2 kwintal</strong> pangan per orang setiap tahun (Bappenas, 2021). Pada tahun 2024, sekitar{' '}
                <strong>40%</strong> dari total timbulan sampah merupakan <em>sisa makanan</em> (SIPSN, 2024).
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {FLW_FACTS.map((fact) => {
                  const Icon = fact.icon;
                  return (
                    <div
                      key={fact.title}
                      className="flex items-start gap-3.5 rounded-2xl border border-[#e6efe8] bg-[#fafdfb] p-3.5"
                    >
                      <span
                        className="grid size-10 shrink-0 place-items-center rounded-full"
                        style={{ backgroundColor: fact.bg, color: fact.color }}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-[#0f2418]">
                          {fact.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-[#52645a]">
                          {fact.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-6 border-t border-[#e6efe8] pt-4 text-[11px] text-[#66786d]">
                <strong>Sumber data:</strong> Bappenas (2021) – Laporan Kajian Food Loss and Waste di Indonesia; SIPSN KLHK (2024) – Sistem Informasi Pengelolaan Sampah Nasional.
              </p>
            </div>

            {/* Right Visual Showcase Card with Real Photos */}
            <div
              data-gsap="flw-split"
              className="flex flex-col justify-between rounded-3xl border border-[#cde2d3] bg-gradient-to-br from-[#e3f4e9] via-[#f0f9f3] to-white p-6 sm:p-8 lg:col-span-5"
            >
              <div>
                <span className="inline-block rounded-full bg-[#16783F] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                  Peran SirkulaFood
                </span>
                <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-[#0c2617]">
                  Mengapa Pencatatan & Pengolahan Sirkular Itu Penting?
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#42574b]">
                  Sebagian besar sisa makanan berakhir di TPA dan menghasilkan gas metana karena tidak terpilah sejak awal. Dengan memisahkan <strong>makanan utuh</strong>, <strong>sisa dapur</strong>, dan <strong>sisa piring</strong>, setiap gram organik dapat diarahkan ke jalur yang tepat.
                </p>
              </div>

              <div className="my-6 grid grid-cols-3 gap-3">
                {ROLE_MINI_PHOTOS.map((item) => (
                  <div
                    key={item.label}
                    className="overflow-hidden rounded-2xl border border-white/80 bg-white p-2 shadow-xs"
                  >
                    <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#dfece3]">
                      <img
                        src={item.photo}
                        alt={item.alt}
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <p className="mt-2 text-center text-[11px] font-bold text-[#0f2418]">
                      {item.label}
                    </p>
                    <p className="text-center text-[10px] text-[#5b6b61]">
                      {item.sub}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl bg-[#0b3b24] p-4 text-xs leading-relaxed text-[#d9eee0]">
                <p className="font-bold text-white">
                  Prinsip Keamanan Pangan SirkulaFood:
                </p>
                <p className="mt-1">
                  Sisa makan di piring <strong>dilarang keras</strong> untuk konsumsi manusia dan otomatis diarahkan ke jalur biokonversi (Maggot BSF, Pakan Ternak, Kompos, atau Biogas).
                </p>
              </div>
            </div>
          </div>

          {/* Part B: Dampak Food Loss & Waste di Indonesia (Clean Structured Data Ledger) */}
          <div className="mt-14">
            <div
              data-gsap="flw-header"
              className="flex flex-col justify-between gap-4 md:flex-row md:items-end"
            >
              <div>
                <p className="text-sm font-semibold text-[#16783F]">
                  Kajian nasional Bappenas & Badan Pangan Nasional
                </p>
                <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#0c2617] sm:text-3xl">
                  Dampak susut dan sisa pangan di Indonesia
                </h2>
              </div>
              <p className="max-w-[440px] text-xs leading-relaxed text-[#52645a] sm:text-sm">
                Skala dampak sosial, lingkungan, dan ekonomi akibat pangan yang terbuang setiap tahun di Indonesia.
              </p>
            </div>

            <div
              data-gsap="flw-grid"
              className="mt-7 overflow-hidden rounded-3xl border border-[#dce8df] bg-white shadow-2xs"
            >
              <div className="grid divide-y divide-[#e4eee7] md:grid-cols-3 md:divide-x md:divide-y-0">
                {/* Item 1 */}
                <div data-gsap="flw-card" className="p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#52645a]">
                      Potensi pemanfaatan sosial
                    </span>
                    <span className="grid size-9 place-items-center rounded-xl bg-[#e3f4e9] text-[#16783F]">
                      <Users className="size-4" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-extrabold tracking-tight text-[#0f2418] tabular-nums sm:text-4xl">
                    61–125 Juta
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#16783F]">
                    Orang dapat diberi makan (29–47% populasi)
                  </p>
                  <p className="mt-2.5 text-xs leading-relaxed text-[#5b6b61]">
                    Pangan berlebih yang diselamatkan berpotensi memenuhi kebutuhan gizi masyarakat di 62 kabupaten/kota rentan rawan pangan.
                  </p>
                </div>

                {/* Item 2 */}
                <div data-gsap="flw-card" className="p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#52645a]">
                      Beban emisi lingkungan
                    </span>
                    <span className="grid size-9 place-items-center rounded-xl bg-[#dcf1f4] text-[#14707F]">
                      <CloudRain className="size-4" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-extrabold tracking-tight text-[#0f2418] tabular-nums sm:text-4xl">
                    1.702,9 Mt CO₂e
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#14707F]">
                    Setara 7,29% emisi gas rumah kaca nasional
                  </p>
                  <p className="mt-2.5 text-xs leading-relaxed text-[#5b6b61]">
                    Timbunan organik yang membusuk tanpa pengolahan sirkular menghasilkan gas metana yang mempercepat perubahan iklim.
                  </p>
                </div>

                {/* Item 3 */}
                <div data-gsap="flw-card" className="p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#52645a]">
                      Kerugian ekonomi tahunan
                    </span>
                    <span className="grid size-9 place-items-center rounded-xl bg-[#fff0d2] text-[#8a5200]">
                      <Coins className="size-4" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-extrabold tracking-tight text-[#0f2418] tabular-nums sm:text-4xl">
                    Rp 213–551 T
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#8a5200]">
                    Kerugian per tahun (setara 4–5% PDB Indonesia)
                  </p>
                  <p className="mt-2.5 text-xs leading-relaxed text-[#5b6b61]">
                    Nilai ekonomi yang hilang dari rantai pasok hingga meja makan menurut Laporan Kajian FLW Bappenas (2021).
                  </p>
                </div>
              </div>

              <div className="border-t border-[#e4eee7] bg-[#f8fbf9] px-6 py-3.5 text-[11px] text-[#5b6b61] sm:px-8">
                <strong>Rujukan resmi:</strong> Bappenas (2021), <em>Laporan Kajian Food Loss and Waste di Indonesia</em> & Badan Pangan Nasional (2024), <em>Peta Ketahanan dan Kerentanan Pangan (FSVA)</em>.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: 7 Jalur Pengolahan Limbah Organik SirkulaFood (With Relevant Real Photographs) */}
      <section
        id="program-sirkular"
        className="scroll-mt-[80px] border-t border-[#dce8df] bg-white py-16 sm:py-24"
      >
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <div
            data-gsap="program-header"
            className="flex flex-col justify-between gap-4 md:flex-row md:items-end"
          >
            <div className="max-w-[580px]">
              <p className="text-sm font-semibold text-[#16783F]">
                Ekonomi sirkular pangan
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0c2617] sm:text-[40px]">
                7 jalur pengolahan limbah organik SirkulaFood
              </h2>
            </div>
            <p className="max-w-[440px] text-sm text-[#52645a]">
              Setiap sisa makanan memiliki karakteristik berbeda. SirkulaFood memetakan sumber sisa, kondisi fisik, dan jenis bahan ke opsi pengolahan yang tepat.
            </p>
          </div>

          <div
            data-gsap="program-grid"
            className="mt-10 grid gap-6 md:grid-cols-2"
          >
            {CIRCULAR_PROGRAMS.map((prog) => {
              const Icon = prog.icon;
              return (
                <article
                  key={prog.title}
                  data-gsap="program-card"
                  className="sf-program-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6"
                >
                  <div className="sf-program-photo-wrap h-48 w-full shrink-0 sm:h-40 sm:w-44">
                    <img
                      data-gsap="program-photo"
                      src={prog.photo}
                      alt={prog.photoAlt}
                      className="sf-program-photo"
                      loading="lazy"
                    />
                    <span
                      className="absolute left-3 top-3 grid size-8 place-items-center rounded-xl bg-white/95 shadow-sm backdrop-blur-xs"
                      style={{ color: prog.accent }}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <span
                      className="inline-block rounded-full px-3 py-1 text-[11px] font-bold"
                      style={{ backgroundColor: prog.badgeBg, color: prog.accent }}
                    >
                      {prog.badge}
                    </span>
                    <h3 className="text-lg font-bold text-[#0c2617] sm:text-xl">
                      {prog.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-[#52645a] sm:text-[13px]">
                      {prog.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 6: Interactive Public Analytics Section */}
      <PublicAnalyticsSection impact={impact} isLoading={isLoading} />

      {/* Section 7: Closing Split CTA Section */}
      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <div
            data-gsap="cta-banner"
            className="sf-forest-band grid items-center gap-8 overflow-hidden rounded-3xl p-7 text-white shadow-xl sm:p-10 lg:grid-cols-[1.15fr_0.85fr] lg:p-12"
          >
            <div>
              <p className="text-sm font-semibold text-[#8ce9af]">
                Mulai dari satu catatan hari ini
              </p>
              <h2 className="mt-2 max-w-[580px] text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-[38px]">
                Mulai kelola sisa makanan Anda hari ini
              </h2>
              <p className="mt-3 max-w-[520px] text-sm leading-relaxed text-[#cbe2d4] sm:text-base">
                Catat sisa makanan, pahami pola yang muncul, dan simpan tindak lanjutnya. Semua catatan dan ringkasan dapat dikelola dalam satu aplikasi.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3.5">
                <Link
                  to={startPath}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-[#74e39a] px-6 text-sm font-bold text-[#062817] transition-colors hover:bg-[#8ef0af]"
                >
                  <Utensils className="size-4" aria-hidden="true" />
                  <span>{user ? 'Catat sisa makanan' : 'Daftar dan mulai mencatat'}</span>
                </Link>
                <Link
                  to={loginPath}
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/20"
                >
                  <span>{user ? 'Lihat ringkasan' : 'Sudah punya akun? Masuk'}</span>
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#072818]">
              <img
                data-gsap="cta-photo"
                src="https://images.pexels.com/photos/4503273/pexels-photo-4503273.jpeg?auto=compress&cs=tinysrgb&w=1000"
                alt="Kompos organik hasil pengolahan sisa makanan yang menyuburkan tanaman"
                className="h-56 w-full object-cover sm:h-64"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#dce8df] bg-[#f2f7f3] text-[#4a5d52]">
        <div className="mx-auto max-w-[1320px] px-5 py-12 sm:px-8 lg:px-12">
          <div className="grid gap-8 md:grid-cols-[1.2fr_1fr_1fr]">
            <div className="space-y-3">
              <Link to="/" className="inline-flex items-center gap-2.5">
                <LogoMark className="size-8" />
                <span className="text-lg font-bold tracking-tight text-[#0b3b24]">
                  Sirkula<span className="text-primary">Food</span>
                </span>
              </Link>
              <p className="max-w-[360px] text-xs leading-relaxed text-[#52645a]">
                SirkulaFood membantu Anda mencatat sisa makanan, memahami polanya, dan mendokumentasikan cara pemanfaatannya.
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <p className="font-bold uppercase tracking-wider text-[#0f2418]">
                Navigasi Cepat
              </p>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#alur-sirkular"
                    onClick={(e) => handleNavClick(e, 'alur-sirkular')}
                    className="hover:text-primary"
                  >
                    Cara kerja
                  </a>
                </li>
                <li>
                  <a
                    href="#dampak-nyata"
                    onClick={(e) => handleNavClick(e, 'dampak-nyata')}
                    className="hover:text-primary"
                  >
                    Ringkasan data
                  </a>
                </li>
                <li>
                  <a
                    href="#edukasi-flw"
                    onClick={(e) => handleNavClick(e, 'edukasi-flw')}
                    className="hover:text-primary"
                  >
                    Fakta sisa pangan
                  </a>
                </li>
                <li>
                  <a
                    href="#program-sirkular"
                    onClick={(e) => handleNavClick(e, 'program-sirkular')}
                    className="hover:text-primary"
                  >
                    Cara pemanfaatan
                  </a>
                </li>
                <li>
                  <a
                    href="#analitik"
                    onClick={(e) => handleNavClick(e, 'analitik')}
                    className="hover:text-primary"
                  >
                    Grafik data
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5 text-xs">
              <p className="font-bold uppercase tracking-wider text-[#0f2418]">
                Akses Aplikasi
              </p>
              <p className="leading-relaxed text-[#52645a]">
                Masuk atau buat akun untuk mulai mencatat dan melihat ringkasan data Anda.
              </p>
              <div className="pt-1">
                <Link
                  to={loginPath}
                  className="inline-flex items-center gap-1.5 font-bold text-primary hover:text-sf-dark"
                >
                  <span>{user ? 'Buka ringkasan' : 'Masuk atau daftar'}</span>
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col justify-between gap-3 border-t border-[#d8e6dc] pt-6 text-[11px] text-[#66786d] sm:flex-row sm:items-center">
            <p>© 2026 SirkulaFood Indonesia. Inisiatif Pengelolaan Limbah Organik Berkelanjutan.</p>
            <p>
              Kredit foto:{' '}
              <a
                className="underline hover:text-primary"
                href="https://www.pexels.com/photo/crop-unrecognizable-housewife-throwing-waste-while-cooking-in-kitchen-7262910/"
                target="_blank"
                rel="noreferrer"
              >
                Sarah Chai
              </a>
              ,{' '}
              <a
                className="underline hover:text-primary"
                href="https://www.pexels.com/photo/12935084/"
                target="_blank"
                rel="noreferrer"
              >
                iMin Technology
              </a>
              ,{' '}
              <a
                className="underline hover:text-primary"
                href="https://www.pexels.com/photo/volunteers-packing-food-for-donation-6995247/"
                target="_blank"
                rel="noreferrer"
              >
                Julia M Cameron
              </a>
              , &{' '}
              <a
                className="underline hover:text-primary"
                href="https://www.pexels.com/photo/organic-waste-composting-in-kitchen-setting-31416063/"
                target="_blank"
                rel="noreferrer"
              >
                Letícia Alvares (Pexels)
              </a>
              .
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

type ChartKind = 'trend' | 'utilization' | 'reasons' | 'sources' | 'pathways';
type Period = '7' | '30' | '90' | '365' | 'all';

const chartColors = [
  '#16783F',
  '#2FA566',
  '#52B788',
  '#14707F',
  '#6F997A',
  '#8A5200',
  '#5C4A8A',
];
const chartOptions: Array<{ value: ChartKind; label: string }> = [
  { value: 'trend', label: 'Perubahan jumlah sisa' },
  { value: 'utilization', label: 'Status penanganan' },
  { value: 'reasons', label: 'Penyebab yang dicatat' },
  { value: 'sources', label: 'Sumber sisa' },
  { value: 'pathways', label: 'Cara penanganan' },
];

function PublicAnalyticsSection({
  impact,
  isLoading,
}: {
  impact: PublicImpactSummary | null;
  isLoading: boolean;
}) {
  const [chartKind, setChartKind] = useState<ChartKind>('trend');
  const [period, setPeriod] = useState<Period>('30');
  const filteredDays = useMemo(() => {
    const days = impact?.dailyAnalytics ?? [];
    if (period === 'all' || !impact) return days;
    const count = Number(period);
    const end = new Date(impact.snapshotAt);
    const start = new Date(end.getTime() - (count - 1) * 86_400_000);
    const startKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(start);
    return days.filter((day) => day.date >= startKey);
  }, [impact, period]);

  const chartData = useMemo(() => {
    const grouped = new Map<string, { count: number; weightKg: number }>();
    for (const day of filteredDays) {
      const entries =
        chartKind === 'reasons'
          ? day.reasonBreakdown
          : chartKind === 'sources'
            ? day.sourceBreakdown
            : day.pathwayBreakdown;
      for (const item of entries) {
        const key =
          'reason' in item
            ? item.reason
            : 'source' in item
              ? item.source
              : item.pathway;
        const current = grouped.get(key) ?? { count: 0, weightKg: 0 };
        current.count += item.count;
        current.weightKg += 'weightKg' in item ? item.weightKg : item.wasteKg;
        grouped.set(key, current);
      }
    }
    const labelFor = (key: string) =>
      chartKind === 'reasons'
        ? (WASTE_REASONS[key as keyof typeof WASTE_REASONS]?.label ?? key)
        : chartKind === 'sources'
          ? (LEFTOVER_SOURCES[key as keyof typeof LEFTOVER_SOURCES]?.shortLabel ?? key)
          : key === 'buang_prosedur'
            ? 'Biogas'
            : (PATHWAYS[key as keyof typeof PATHWAYS]?.shortLabel ?? key);
    return Array.from(grouped.entries()).map(([key, value]) => ({
      key,
      name: labelFor(key),
      ...value,
    }));
  }, [chartKind, filteredDays]);

  const totals = useMemo(
    () =>
      filteredDays.reduce(
        (value, day) => ({
          wasteKg: value.wasteKg + day.wasteKg,
          divertedKg: value.divertedKg + day.divertedKg,
          disposedKg: value.disposedKg + day.disposedKg,
          servedPortions: value.servedPortions + day.servedPortions,
        }),
        { wasteKg: 0, divertedKg: 0, disposedKg: 0, servedPortions: 0 }
      ),
    [filteredDays]
  );

  const trendData = useMemo(() => {
    const byDate = new Map(filteredDays.map((day) => [day.date, day]));
    const jakartaDate = (value: Date) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(value);
    const lastKey =
      period === 'all'
        ? filteredDays.at(-1)?.date
        : impact
          ? jakartaDate(new Date(impact.snapshotAt))
          : undefined;
    const firstKey =
      period === 'all'
        ? filteredDays[0]?.date
        : lastKey
          ? new Date(
              new Date(`${lastKey}T00:00:00Z`).getTime() -
                (Number(period) - 1) * 86_400_000
            )
              .toISOString()
              .slice(0, 10)
          : undefined;
    if (!firstKey || !lastKey) return [];

    const points = [];
    for (
      let cursor = new Date(`${firstKey}T00:00:00Z`);
      cursor <= new Date(`${lastKey}T00:00:00Z`);
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    ) {
      const date = cursor.toISOString().slice(0, 10);
      const day = byDate.get(date);
      points.push({
        date,
        dateLabel: new Intl.DateTimeFormat('id-ID', {
          day: 'numeric',
          month: 'short',
          timeZone: 'UTC',
        }).format(cursor),
        wasteKg: day?.wasteKg ?? 0,
        divertedKg: day?.divertedKg ?? 0,
        pendingKg: Math.max(
          0,
          (day?.wasteKg ?? 0) - (day?.divertedKg ?? 0) - (day?.disposedKg ?? 0)
        ),
      });
    }
    return points;
  }, [filteredDays, impact, period]);

  const utilizationData = [
    {
      name: 'Dimanfaatkan',
      value: Number(totals.divertedKg.toFixed(2)),
      fill: '#16783F',
    },
    {
      name: 'Biogas / Fermentasi',
      value: Number(totals.disposedKg.toFixed(2)),
      fill: '#52B788',
    },
    {
      name: 'Belum ada penanganan',
      value: Number(
        Math.max(
          0,
          totals.wasteKg - totals.divertedKg - totals.disposedKg
        ).toFixed(2)
      ),
      fill: '#DCE8DF',
    },
  ].filter((item) => item.value > 0);

  const periodLabel: Record<Period, string> = {
    '7': '7 hari terakhir',
    '30': '30 hari terakhir',
    '90': '90 hari terakhir',
    '365': '12 bulan terakhir',
    all: 'Semua catatan',
  };
  const noData = !isLoading && filteredDays.length === 0;
  const utilizationPercent =
    totals.wasteKg > 0 ? Math.round((totals.divertedKg / totals.wasteKg) * 100) : 0;
  const topItem = chartData
    .slice()
    .sort((a, b) =>
      chartKind === 'reasons' ? b.count - a.count : b.weightKg - a.weightKg
    )[0];
  const categoryCount = chartData.reduce((sum, item) => sum + item.count, 0);
  const categoryWeight = chartData.reduce((sum, item) => sum + item.weightKg, 0);

  return (
    <section
      id="analitik"
      className="scroll-mt-[80px] border-y border-[#dce8df] bg-[#f2f7f3]"
    >
      <div
        data-gsap="analytics-box"
        className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-22 lg:px-12"
      >
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Eksplorasi Data SirkulaFood
            </p>
            <h2 className="mt-2.5 max-w-[700px] text-3xl font-extrabold leading-tight tracking-tight text-[#0c2617] sm:text-[40px]">
              Pantau Pola & Perubahan dari Waktu ke Waktu
            </h2>
            <p className="mt-2.5 max-w-[620px] text-sm leading-relaxed text-[#52645a]">
              Pilih jenis grafik dan rentang periode untuk melihat tren timbulan sisa makanan, tingkat pemanfaatan sirkular, penyebab, serta sumbernya.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[400px]">
            <label className="grid gap-1.5 text-xs font-bold text-[#0f2418]">
              Jenis grafik
              <select
                value={chartKind}
                onChange={(event) => setChartKind(event.target.value as ChartKind)}
                className="h-11 rounded-xl border border-[#cde0d2] bg-white px-3.5 text-sm font-medium text-foreground shadow-2xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {chartOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-[#0f2418]">
              Periode
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value as Period)}
                className="h-11 rounded-xl border border-[#cde0d2] bg-white px-3.5 text-sm font-medium text-foreground shadow-2xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {(Object.keys(periodLabel) as Period[]).map((key) => (
                  <option key={key} value={key}>
                    {periodLabel[key]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-9 grid gap-6 xl:grid-cols-[minmax(0,1fr)_270px]">
          <div className="min-h-[390px] rounded-3xl border border-[#dce8df] bg-white p-4 shadow-xs sm:min-h-[470px] sm:p-7">
            {isLoading ? (
              <div className="grid h-[340px] place-items-center text-sm text-muted-foreground">
                Memuat ringkasan analitik…
              </div>
            ) : noData ? (
              <div className="grid h-[340px] place-items-center text-center text-sm text-muted-foreground">
                Belum ada data untuk periode ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={420}>
                {chartKind === 'trend' ? (
                  <LineChart
                    data={trendData}
                    margin={{ top: 18, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid stroke="#E4ECE6" vertical={false} />
                    <XAxis
                      dataKey="dateLabel"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#66776b', fontSize: 12 }}
                      minTickGap={26}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#66776b', fontSize: 12 }}
                      width={48}
                      unit=" kg"
                    />
                    <Tooltip
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.date ?? ''
                      }
                      formatter={(value, name) => [
                        `${formatNumber(Number(value), 2)} kg`,
                        name,
                      ]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="wasteKg"
                      name="Jumlah sisa"
                      stroke="#16783F"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="divertedKg"
                      name="Dimanfaatkan kembali"
                      stroke="#2FA566"
                      strokeWidth={2.5}
                      dot={{ r: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pendingKg"
                      name="Belum ditangani"
                      stroke="#97A99A"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={false}
                    />
                  </LineChart>
                ) : chartKind === 'utilization' ? (
                  <PieChart>
                    <Pie
                      data={utilizationData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="56%"
                      outerRadius="78%"
                      paddingAngle={3}
                      stroke="#fff"
                      strokeWidth={3}
                    >
                      {utilizationData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                      <Label
                        value={`${utilizationPercent}%`}
                        position="center"
                        fill="#0F4D2E"
                        fontSize={32}
                        fontWeight={700}
                      />
                    </Pie>
                    <Tooltip
                      formatter={(value) => [
                        `${formatNumber(Number(value), 2)} kg`,
                        'Berat',
                      ]}
                    />
                    <Legend verticalAlign="bottom" height={42} />
                  </PieChart>
                ) : (
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 8, right: 30, left: 12, bottom: 4 }}
                  >
                    <CartesianGrid stroke="#E4ECE6" horizontal={false} />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#66776b', fontSize: 12 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#0F4D2E', fontSize: 12 }}
                      width={150}
                    />
                    <Tooltip
                      formatter={(value, _name, item) =>
                        chartKind === 'reasons'
                          ? [
                              `${value} catatan · ${formatNumber(Number(item.payload.weightKg), 2)} kg`,
                              'Penyebab',
                            ]
                          : [`${formatNumber(Number(value), 2)} kg`, 'Berat']
                      }
                    />
                    <Bar
                      dataKey={chartKind === 'reasons' ? 'count' : 'weightKg'}
                      name={
                        chartKind === 'reasons' ? 'Jumlah catatan' : 'Berat sisa'
                      }
                      radius={[0, 6, 6, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={entry.key}
                          fill={chartColors[index % chartColors.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>

          <aside className="content-start rounded-3xl bg-[#072c19] p-6 text-white shadow-md">
            <p className="text-xs font-bold uppercase tracking-wider text-[#8ce9af]">
              Sorotan Periode
            </p>
            <p className="mt-1 text-xs text-[#a9c1ae]">{periodLabel[period]}</p>
            {chartKind === 'utilization' ? (
              <div className="mt-6 space-y-5">
                {utilizationData.map((item) => {
                  const percentage = totals.wasteKg
                    ? Math.round((item.value / totals.wasteKg) * 100)
                    : 0;
                  return (
                    <div key={item.name} className="flex items-start gap-3">
                      <span
                        className="mt-1 size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-5 text-[#e4eee5]">
                          {item.name}
                        </p>
                        <div className="mt-1 flex items-baseline justify-between gap-2">
                          <span className="text-xs text-[#a9c1ae]">
                            {formatNumber(item.value, 2)} kg
                          </span>
                          <span className="text-lg font-bold text-[#74e39a]">
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : chartKind === 'trend' ? (
              filteredDays.length ? (
                <div className="mt-6 space-y-5">
                  <div>
                    <p className="text-xs text-[#c3d4c7]">
                      Rata-rata sisa per hari
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-[#74e39a] whitespace-nowrap">
                      {formatNumber(
                        trendData.length ? totals.wasteKg / trendData.length : 0,
                        2
                      )}{' '}
                      kg
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#c3d4c7]">
                      Hari dengan sisa tertinggi
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-white whitespace-nowrap">
                      {formatNumber(
                        Math.max(...trendData.map((day) => day.wasteKg)),
                        2
                      )}{' '}
                      kg
                    </p>
                    <p className="mt-1 text-xs text-[#a9c1ae]">
                      {new Intl.DateTimeFormat('id-ID', {
                        dateStyle: 'medium',
                        timeZone: 'UTC',
                      }).format(
                        new Date(
                          `${trendData.reduce((peak, day) => (day.wasteKg > peak.wasteKg ? day : peak), trendData[0]).date}T12:00:00Z`
                        )
                      )}
                    </p>
                  </div>
                  <div className="border-t border-white/15 pt-4 text-xs leading-relaxed text-[#a9c1ae]">
                    Grafik membandingkan jumlah sisa tercatat, berat yang dimanfaatkan kembali, dan yang belum ditangani.
                  </div>
                </div>
              ) : (
                <p className="mt-6 text-sm text-[#c3d4c7]">
                  Belum ada catatan dalam periode ini.
                </p>
              )
            ) : (
              <div className="mt-6 space-y-5">
                {topItem ? (
                  <>
                    <div>
                      <p className="text-xs text-[#c3d4c7]">
                        {chartKind === 'reasons'
                          ? 'Paling sering dicatat'
                          : chartKind === 'sources'
                            ? 'Sumber sisa terbesar'
                            : 'Penanganan terbanyak'}
                      </p>
                      <p className="mt-2 text-lg font-bold leading-6 text-white">
                        {topItem.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#c3d4c7]">
                        {chartKind === 'reasons'
                          ? 'Bagian dari semua catatan'
                          : 'Bagian dari berat tercatat'}
                      </p>
                      <p className="mt-1 text-3xl font-extrabold text-[#74e39a]">
                        {chartKind === 'reasons'
                          ? `${categoryCount ? Math.round((topItem.count / categoryCount) * 100) : 0}%`
                          : `${categoryWeight ? Math.round((topItem.weightKg / categoryWeight) * 100) : 0}%`}
                      </p>
                      <p className="mt-1 text-xs text-[#a9c1ae]">
                        {chartKind === 'reasons'
                          ? `${formatNumber(topItem.count)} catatan`
                          : `${formatNumber(topItem.weightKg, 2)} kg`}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="mt-6 text-sm text-[#c3d4c7]">
                    Belum ada catatan dalam periode ini.
                  </p>
                )}
                <p className="border-t border-white/15 pt-4 text-xs leading-5 text-[#a9c1ae]">
                  Peringkat ini merangkum catatan pada periode pilihan secara deterministik.
                </p>
              </div>
            )}
          </aside>
        </div>

        <p className="mt-4 text-xs leading-5 text-[#52645a]">
          {impact?.sampleLogCount
            ? `Termasuk ${formatNumber(impact.sampleLogCount)} catatan contoh simulasi demo. Angka simulasi dilabeli secara eksplisit agar terpisah dari dampak operasional nyata.`
            : 'Penyebab mengikuti keterangan yang dipilih saat mencatat dan belum tentu menjelaskan alasan tunggal.'}
        </p>
      </div>
    </section>
  );
}
