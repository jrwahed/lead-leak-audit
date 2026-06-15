"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

/* ───────────── Types ───────────── */
interface LeadData {
  leads: number;
  contacted: number;
  booked: number;
  deals: number;
  avgDeal: number;
}

interface AnalysisResult {
  data: LeadData;
  contactRate: number;
  bookRate: number;
  closeFromBook: number;
  overallClose: number;
  leak1: number;
  leak2: number;
  leak3: number;
  biggestLeak: 1 | 2 | 3;
  benchmarkClose: number;
  expectedDeals: number;
  lostDeals: number;
  monthlyLoss: number;
  yearlyLoss: number;
}

/* ───────────── Helpers ───────────── */
function fmt(n: number): string {
  return Math.round(n).toLocaleString("ar-EG");
}
function pct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

function analyze(d: LeadData): AnalysisResult {
  const contactRate = d.leads > 0 ? d.contacted / d.leads : 0;
  const bookRate = d.contacted > 0 ? d.booked / d.contacted : 0;
  const closeFromBook = d.booked > 0 ? d.deals / d.booked : 0;
  const overallClose = d.leads > 0 ? d.deals / d.leads : 0;

  const leak1 = d.leads - d.contacted;
  const leak2 = d.contacted - d.booked;
  const leak3 = d.booked - d.deals;

  let biggestLeak: 1 | 2 | 3 = 1;
  if (leak2 >= leak1 && leak2 >= leak3) biggestLeak = 2;
  else if (leak3 >= leak1 && leak3 >= leak2) biggestLeak = 3;

  const benchmarkClose = 0.05;
  const expectedDeals = d.leads * benchmarkClose;
  const lostDeals = Math.max(0, expectedDeals - d.deals);
  const monthlyLoss = lostDeals * d.avgDeal;
  const yearlyLoss = monthlyLoss * 12;

  return {
    data: d,
    contactRate,
    bookRate,
    closeFromBook,
    overallClose,
    leak1,
    leak2,
    leak3,
    biggestLeak,
    benchmarkClose,
    expectedDeals,
    lostDeals,
    monthlyLoss,
    yearlyLoss,
  };
}

const leakLabels: Record<1 | 2 | 3, string> = {
  1: "ضاعوا قبل التواصل",
  2: "اتكلمنا معاهم بس ما حجزوش",
  3: "حجزوا بس ما قفلوش",
};

const leakAdvice: Record<1 | 2 | 3, string> = {
  1: "أكبر مشكلتك السرعة والمتابعة. الليد لازم يترد عليه في دقايق مش ساعات، ومحتاج متابعة تلقائية تفضل تلاحقه.",
  2: "بتكلم عملاء بس مش بتقفل ميعاد. محتاج سكريبت بيع أقوى، عروض واضحة، و retargeting يرجعهم.",
  3: "بتوصل للحجز وبتخسر عند الإغلاق. محتاج تأكيد وتذكير تلقائي قبل الميعاد + تحسين العرض والسعر.",
};

/* ───────────── CountUp Hook ───────────── */
function useCountUp(target: number, duration = 1500): number {
  const [val, setVal] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * target));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return val;
}

function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  className = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const animated = useCountUp(value);
  return (
    <span className={className}>
      {prefix}
      {fmt(animated)}
      {suffix}
    </span>
  );
}

/* ───────────── Funnel Component ───────────── */
function Funnel({ result }: { result: AnalysisResult }) {
  const { data, contactRate, bookRate, closeFromBook } = result;
  const stages = [
    { label: "إجمالي الليدز", count: data.leads, rate: null, color: "bg-[#0E7C66]/10 border-[#0E7C66]/20" },
    { label: "تم التواصل", count: data.contacted, rate: contactRate, color: "bg-[#0E7C66]/20 border-[#0E7C66]/30" },
    { label: "حجز / اهتمام", count: data.booked, rate: bookRate, color: "bg-[#B08D57]/20 border-[#B08D57]/30" },
    { label: "قفل صفقة", count: data.deals, rate: closeFromBook, color: "bg-[#0E7C66]/30 border-[#0E7C66]/40" },
  ];

  return (
    <div className="space-y-3">
      {stages.map((s, i) => {
        const width = data.leads > 0 ? Math.max(12, (s.count / data.leads) * 100) : 100;
        return (
          <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 150}ms` }}>
            <div className="flex justify-between items-baseline mb-1 text-sm">
              <span className="font-medium text-[#1C1B29]">{s.label}</span>
              <span className="text-[#6B6A7A]">
                {fmt(s.count)}
                {s.rate !== null && (
                  <span className="mr-2 text-xs">({pct(s.rate)})</span>
                )}
              </span>
            </div>
            <div className="w-full bg-[#E8E6E1]/30 rounded-full h-8 sm:h-10 overflow-hidden">
              <div
                className={`h-full rounded-full border ${s.color} transition-all duration-1000 ease-out flex items-center justify-center`}
                style={{ width: `${width}%` }}
              >
                <span className="text-xs font-semibold text-[#1C1B29]/60">{fmt(s.count)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────── Results Section ───────────── */
function Results({ result }: { result: AnalysisResult }) {
  return (
    <section id="results" className="animate-slide-down">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Funnel */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#E8E6E1]">
          <h3 className="text-xl font-bold mb-6">مسار العملاء (Funnel)</h3>
          <Funnel result={result} />
        </div>

        {/* Biggest Leak Card */}
        <div className="bg-[#FDF0EC] border border-[#C0563B]/20 rounded-2xl p-6 md:p-8 shadow-sm animate-fade-in" style={{ animationDelay: "600ms" }}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#C0563B]/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[#C0563B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-[#C0563B] font-semibold mb-1">أكبر تسريب عندك</p>
              <p className="text-2xl font-bold text-[#1C1B29] mb-1">
                {leakLabels[result.biggestLeak]}
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-[#C0563B]">
                <AnimatedNumber
                  value={
                    result.biggestLeak === 1
                      ? result.leak1
                      : result.biggestLeak === 2
                      ? result.leak2
                      : result.leak3
                  }
                />{" "}
                <span className="text-sm sm:text-lg font-medium">عميل ضايع</span>
              </p>
            </div>
          </div>
        </div>

        {/* Key Numbers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E8E6E1] text-center animate-fade-in" style={{ animationDelay: "300ms" }}>
            <p className="text-sm text-[#6B6A7A] mb-2">نسبة إغلاقك</p>
            <p className="text-3xl sm:text-4xl font-bold text-[#C0563B] mb-1">{pct(result.overallClose)}</p>
            <p className="text-sm text-[#0E7C66] font-medium">المفروض: {pct(result.benchmarkClose)}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E8E6E1] text-center animate-fade-in" style={{ animationDelay: "450ms" }}>
            <p className="text-sm text-[#6B6A7A] mb-2">صفقات بتخسرها شهرياً</p>
            <p className="text-3xl sm:text-4xl font-bold text-[#C0563B]">
              <AnimatedNumber value={Math.round(result.lostDeals)} />
            </p>
            <p className="text-sm text-[#6B6A7A]">صفقة</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E8E6E1] text-center animate-fade-in" style={{ animationDelay: "600ms" }}>
            <p className="text-sm text-[#6B6A7A] mb-2">فلوس ضايعة شهرياً</p>
            <p className="text-3xl sm:text-4xl font-bold text-[#C0563B]">
              <AnimatedNumber value={Math.round(result.monthlyLoss)} suffix=" ج.م" />
            </p>
            <p className="text-sm text-[#6B6A7A]">
              سنوياً: <AnimatedNumber value={Math.round(result.yearlyLoss)} suffix=" ج.م" />
            </p>
          </div>
        </div>

        {/* Advice */}
        <div className="bg-[#E8F5F1] border border-[#0E7C66]/20 rounded-2xl p-6 md:p-8 shadow-sm animate-fade-in" style={{ animationDelay: "750ms" }}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#0E7C66]/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[#0E7C66]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.674M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-[#0E7C66] font-semibold mb-2">التوصية</p>
              <p className="text-lg text-[#1C1B29] leading-relaxed">{leakAdvice[result.biggestLeak]}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Lead Capture Form ───────────── */
function LeadCapture({ result }: { result: AnalysisResult }) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [company, setCompany] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !whatsapp.trim()) return;
    setSending(true);

    const payload = {
      name: name.trim(),
      whatsapp: whatsapp.trim(),
      company: company.trim(),
      analysis: {
        leads: result.data.leads,
        contacted: result.data.contacted,
        booked: result.data.booked,
        deals: result.data.deals,
        avgDeal: result.data.avgDeal,
        overallCloseRate: result.overallClose,
        biggestLeak: result.biggestLeak,
        biggestLeakLabel: leakLabels[result.biggestLeak],
        monthlyLoss: Math.round(result.monthlyLoss),
        yearlyLoss: Math.round(result.yearlyLoss),
      },
      timestamp: new Date().toISOString(),
    };

    const webhookUrl = process.env.NEXT_PUBLIC_LEAD_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        console.warn("Webhook failed, logged locally:", payload);
      }
    } else {
      console.log("Lead captured (no webhook configured):", payload);
    }

    setSent(true);
    setSending(false);
  };

  if (sent) {
    return (
      <section className="max-w-xl mx-auto text-center py-12 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-[#0E7C66]/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#0E7C66]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold mb-2">وصلتني، هتواصل معاك قريب</h3>
        <p className="text-[#6B6A7A]">الأرقام بتاعتك ماراحتش لحد. ده بس بياناتك للتواصل.</p>
      </section>
    );
  }

  return (
    <section className="max-w-xl mx-auto animate-fade-in">
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#E8E6E1]">
        <h3 className="text-2xl font-bold mb-2 text-center">
          ده اللي بتخسره. عايز أساعدك توقف التسريب ده؟
        </h3>
        <p className="text-[#6B6A7A] text-center mb-6 text-sm leading-relaxed">
          لو عايزني أساعدك في جمع البيانات وتحليلها بشكل أدق، ابعتلي بياناتك وأنا هبعتلك تقرير التسريب الكامل — وهنشوف مع بعض إزاي أقدر أساعدك.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">الاسم *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FAF8F4] focus:outline-none focus:ring-2 focus:ring-[#0E7C66]/30 focus:border-[#0E7C66] transition"
              placeholder="اسمك"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">رقم الواتساب *</label>
            <input
              type="tel"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FAF8F4] focus:outline-none focus:ring-2 focus:ring-[#0E7C66]/30 focus:border-[#0E7C66] transition"
              placeholder="01xxxxxxxxx"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">اسم الشركة (اختياري)</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FAF8F4] focus:outline-none focus:ring-2 focus:ring-[#0E7C66]/30 focus:border-[#0E7C66] transition"
              placeholder="اسم شركتك"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="w-full py-3.5 rounded-xl bg-[#0E7C66] text-white font-semibold text-lg hover:bg-[#0E7C66]/90 transition disabled:opacity-60"
          >
            {sending ? "جاري الإرسال..." : "ابعتلي تقرير التسريب الكامل"}
          </button>
          <p className="text-xs text-[#6B6A7A] text-center">
            بياناتك في أمان — ده بس عشان أقدر أتواصل معاك وأساعدك.
          </p>
        </form>
      </div>
    </section>
  );
}

/* ───────────── File Upload Logic ───────────── */
interface FileState {
  rows: Record<string, string>[];
  columns: string[];
  statusCol: string | null;
  statusValues: ValueWithCount[];
  columnScores: { col: string; score: number; uniqueCount: number; fillRate: number }[];
}

interface ValueWithCount {
  value: string;
  count: number;
}

const HIGH_PRIORITY_HINTS = [
  "فيد باك", "فيدباك", "feedback", "حالة الليد", "حاله الليد",
  "lead status", "status", "lead_status", "المتابعة", "متابعة",
  "follow", "stage", "مرحلة", "نتيجة", "result", "outcome",
];

const LOW_PRIORITY_HINTS = [
  "حالة", "حاله", "state",
];

function scoreColumn(
  col: string,
  rows: Record<string, string>[],
): { score: number; uniqueCount: number; fillRate: number } {
  const lower = col.toLowerCase().trim();

  let score = 0;
  if (HIGH_PRIORITY_HINTS.some((h) => lower.includes(h))) score += 100;
  else if (LOW_PRIORITY_HINTS.some((h) => lower === h || lower.includes(h))) score += 30;

  let filled = 0;
  const vals = new Set<string>();
  for (const row of rows) {
    const v = (row[col] || "").trim();
    if (v) { filled++; vals.add(v); }
  }

  const fillRate = rows.length > 0 ? filled / rows.length : 0;
  const uniqueCount = vals.size;

  if (fillRate > 0.3) score += 20;
  if (fillRate > 0.6) score += 10;

  if (uniqueCount >= 3 && uniqueCount <= 30) score += 30;
  else if (uniqueCount > 30 && uniqueCount <= 80) score += 15;
  else if (uniqueCount > 80) score += 5;

  if (uniqueCount >= 2 && uniqueCount <= 15 && fillRate > 0.5) score += 25;

  return { score, uniqueCount, fillRate };
}

function detectStatusColumn(
  columns: string[],
  rows: Record<string, string>[],
): { best: string | null; scores: { col: string; score: number; uniqueCount: number; fillRate: number }[] } {
  const scores = columns.map((col) => ({ col, ...scoreColumn(col, rows) }));
  scores.sort((a, b) => b.score - a.score);

  const best = scores.length > 0 && scores[0].score >= 40 ? scores[0].col : null;
  return { best, scores };
}

function getValuesWithCounts(rows: Record<string, string>[], col: string): ValueWithCount[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const v = (row[col] || "").trim();
    if (v) map.set(v, (map.get(v) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

/* ───────────── Main Page ───────────── */
export default function Home() {
  const [tab, setTab] = useState<"file" | "manual">("manual");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Manual inputs
  const [leads, setLeads] = useState("");
  const [contacted, setContacted] = useState("");
  const [booked, setBooked] = useState("");
  const [deals, setDeals] = useState("");
  const [avgDeal, setAvgDeal] = useState("3000");

  // File state
  const [fileState, setFileState] = useState<FileState | null>(null);
  const [selectedStatusCol, setSelectedStatusCol] = useState<string>("");
  const [mappingStep, setMappingStep] = useState(false);
  const [contactedVals, setContactedVals] = useState<string[]>([]);
  const [bookedVals, setBookedVals] = useState<string[]>([]);
  const [closedVals, setClosedVals] = useState<string[]>([]);
  const [fileAvgDeal, setFileAvgDeal] = useState("3000");
  const [dragOver, setDragOver] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToResults = useCallback(() => {
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const L = parseInt(leads) || 0;
    const C = parseInt(contacted) || 0;
    const B = parseInt(booked) || 0;
    const D = parseInt(deals) || 0;
    const P = parseFloat(avgDeal) || 3000;
    if (L <= 0) return;
    setResult(analyze({ leads: L, contacted: C, booked: B, deals: D, avgDeal: P }));
    scrollToResults();
  };

  const processFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          const rows = res.data as Record<string, string>[];
          const columns = res.meta.fields || [];
          finishFileParse(rows, columns);
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        finishFileParse(rows, columns);
      };
      reader.readAsArrayBuffer(file);
    }
  }, []);

  const finishFileParse = (rows: Record<string, string>[], columns: string[]) => {
    const { best, scores } = detectStatusColumn(columns, rows);
    const statusValues = best ? getValuesWithCounts(rows, best) : [];
    setFileState({ rows, columns, statusCol: best, statusValues, columnScores: scores });
    setSelectedStatusCol(best || "");
    setMappingStep(false);
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleStatusColSelect = (col: string) => {
    if (!fileState) return;
    setSelectedStatusCol(col);
    const vals = getValuesWithCounts(fileState.rows, col);
    setFileState({ ...fileState, statusCol: col, statusValues: vals });
    setMappingStep(true);
    setContactedVals([]);
    setBookedVals([]);
    setClosedVals([]);
    setValSearch("");
  };
  const [valSearch, setValSearch] = useState("");

  const toggleVal = (arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const handleFileAnalyze = () => {
    if (!fileState || !selectedStatusCol) return;
    const totalLeads = fileState.rows.length;
    let cCount = 0, bCount = 0, dCount = 0;
    for (const row of fileState.rows) {
      const v = (row[selectedStatusCol] || "").trim();
      if (contactedVals.includes(v)) cCount++;
      if (bookedVals.includes(v)) bCount++;
      if (closedVals.includes(v)) dCount++;
    }
    const P = parseFloat(fileAvgDeal) || 3000;
    setResult(analyze({ leads: totalLeads, contacted: cCount, booked: bCount, deals: dCount, avgDeal: P }));
    scrollToResults();
  };

  const downloadTemplate = () => {
    const header = "الاسم,الموبايل,المصدر,حالة الليد,ملاحظات";
    const rows = [
      "أحمد محمد,01012345678,فيسبوك إعلان,رد واهتم,طلب عرض سعر",
      "سارة علي,01198765432,واتساب,حجز موعد,ميعاد يوم الأحد",
      "محمود حسن,01234567890,موقع الشركة,مردش,اتصلنا 3 مرات",
      "نورا أحمد,01567890123,انستجرام,قفل صفقة,دفع وتم التسليم",
      "خالد إبراهيم,01098765432,تحويل عميل,رد واهتم,عايز يشوف المكان",
      "منى سعيد,01187654321,فيسبوك إعلان,كنسل,غيّر رأيه",
      "عمر طارق,01276543210,جوجل إعلان,حجز موعد,أكد الميعاد",
      "ياسمين فؤاد,01365432109,موقع الشركة,قفل صفقة,عقد + دفعة أولى",
    ];
    const csv = "﻿" + header + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lead-leak-audit-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="flex-1">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0E7C66]/[0.03] to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 pt-10 pb-8 sm:pt-16 sm:pb-12 md:pt-24 md:pb-16 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0E7C66]/5 border border-[#0E7C66]/10 text-[#0E7C66] text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-[#0E7C66] animate-pulse" />
            أداة مجانية — التحليل جوه متصفحك بالكامل
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4 tracking-tight">
            شركتك بتخسر عملاء كل يوم
            <br />
            <span className="text-[#C0563B]">في مكان مش شايفه.</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-[#6B6A7A] max-w-2xl mx-auto mb-8 leading-relaxed">
            في دقيقة واحدة، اعرف فين بيروح أكبر عدد عملاء، كام فلوس بتخسر، وإيه أول خطوة تصلّح بيها.
          </p>
          <a
            href="#input"
            className="inline-flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-4 rounded-xl bg-[#0E7C66] text-white font-semibold text-base sm:text-lg hover:bg-[#0E7C66]/90 transition shadow-lg shadow-[#0E7C66]/20"
          >
            ابدأ التحليل
            <svg className="w-5 h-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </section>

      {/* Spacer for mobile scroll target */}
      <div className="h-4 md:h-0" />

      {/* ── Input Section ── */}
      <section id="input" className="max-w-2xl mx-auto px-4 pb-12">
        {/* Tabs */}
        <div className="flex bg-white rounded-xl border border-[#E8E6E1] p-1 mb-6">
          <button
            onClick={() => setTab("file")}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold transition ${
              tab === "file" ? "bg-[#0E7C66] text-white shadow-sm" : "text-[#6B6A7A] hover:text-[#1C1B29]"
            }`}
          >
            ارفع ملفك
          </button>
          <button
            onClick={() => setTab("manual")}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold transition ${
              tab === "manual" ? "bg-[#0E7C66] text-white shadow-sm" : "text-[#6B6A7A] hover:text-[#1C1B29]"
            }`}
          >
            دخّل الأرقام يدوي
          </button>
        </div>

        {/* Tab: File */}
        {tab === "file" && (
          <div className="space-y-4 animate-fade-in">
            {/* Privacy Banner */}
            <div className="bg-[#E8F5F1] border border-[#0E7C66]/15 rounded-xl p-4 flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-[#0E7C66]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-[#0E7C66]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-sm text-[#1C1B29] leading-relaxed">
                <strong className="text-[#0E7C66]">بياناتك في أمان تام.</strong> الملف بيتحلل جوه متصفحك بالكامل — مش بيترفع على أي سيرفر، مش بيتحفظ في أي مكان، ومحدش (ولا أنا نفسي) بيقدر يشوفه. اقفل الصفحة، يختفي كل حاجة.
              </p>
            </div>

            {!fileState ? (
              <div className="space-y-4">
                {/* Guide Toggle + Template */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowGuide(!showGuide)}
                    className="text-sm font-medium text-[#0E7C66] hover:underline flex items-center gap-1.5"
                  >
                    <svg className={`w-4 h-4 transition-transform ${showGuide ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    إزاي أجهّز الشيت؟
                  </button>
                  <button
                    onClick={downloadTemplate}
                    className="text-sm font-medium text-[#B08D57] hover:underline flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    حمّل تمبلت جاهز
                  </button>
                </div>

                {/* Guide Content */}
                {showGuide && (
                  <div className="bg-white rounded-2xl border border-[#E8E6E1] overflow-hidden animate-fade-in">
                    {/* Step by step */}
                    <div className="p-5 space-y-5">
                      <div>
                        <h4 className="font-bold text-base mb-3">الشيت بتاعك لازم يكون فيه عمود واحد على الأقل فيه &quot;حالة الليد&quot;</h4>
                        <p className="text-sm text-[#6B6A7A] leading-relaxed mb-4">
                          أي شيت فيه بيانات ليدز هينفع — مش مهم عدد الأعمدة أو أسماءها. المهم يكون فيه عمود بيوصف إيه اللي حصل مع كل ليد (رد، مردش، حجز، قفل، كنسل... إلخ). الأداة هتطلب منك تختار العمود ده وتصنّف القيم.
                        </p>
                      </div>

                      {/* Visual Example Table */}
                      <div>
                        <p className="text-sm font-semibold mb-2">مثال — شكل الشيت الممتاز:</p>
                        <div className="overflow-x-auto -mx-5 px-5">
                          <table className="w-full text-sm border-collapse min-w-[500px]">
                            <thead>
                              <tr className="bg-[#FAF8F4]">
                                <th className="border border-[#E8E6E1] px-3 py-2 text-start font-semibold">الاسم</th>
                                <th className="border border-[#E8E6E1] px-3 py-2 text-start font-semibold">الموبايل</th>
                                <th className="border border-[#E8E6E1] px-3 py-2 text-start font-semibold">المصدر</th>
                                <th className="border border-[#E8E6E1] px-3 py-2 text-start font-semibold bg-[#0E7C66]/5">
                                  <span className="text-[#0E7C66]">حالة الليد</span> ← ده العمود المهم
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border border-[#E8E6E1] px-3 py-1.5">أحمد محمد</td>
                                <td className="border border-[#E8E6E1] px-3 py-1.5" dir="ltr">0101234xxxx</td>
                                <td className="border border-[#E8E6E1] px-3 py-1.5">فيسبوك</td>
                                <td className="border border-[#E8E6E1] px-3 py-1.5 bg-[#0E7C66]/5 text-[#0E7C66] font-medium">رد واهتم</td>
                              </tr>
                              <tr>
                                <td className="border border-[#E8E6E1] px-3 py-1.5">سارة علي</td>
                                <td className="border border-[#E8E6E1] px-3 py-1.5" dir="ltr">0119876xxxx</td>
                                <td className="border border-[#E8E6E1] px-3 py-1.5">انستجرام</td>
                                <td className="border border-[#E8E6E1] px-3 py-1.5 bg-[#B08D57]/5 text-[#B08D57] font-medium">حجز موعد</td>
                              </tr>
                              <tr>
                                <td className="border border-[#E8E6E1] px-3 py-1.5">محمود حسن</td>
                                <td className="border border-[#E8E6E1] px-3 py-1.5" dir="ltr">0123456xxxx</td>
                                <td className="border border-[#E8E6E1] px-3 py-1.5">جوجل</td>
                                <td className="border border-[#E8E6E1] px-3 py-1.5 bg-[#C0563B]/5 text-[#C0563B] font-medium">مردش</td>
                              </tr>
                              <tr>
                                <td className="border border-[#E8E6E1] px-3 py-1.5">نورا أحمد</td>
                                <td className="border border-[#E8E6E1] px-3 py-1.5" dir="ltr">0156789xxxx</td>
                                <td className="border border-[#E8E6E1] px-3 py-1.5">موقع</td>
                                <td className="border border-[#E8E6E1] px-3 py-1.5 bg-[#0E7C66]/10 text-[#0E7C66] font-bold">قفل صفقة</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* What works */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[#E8F5F1] rounded-xl p-4">
                          <p className="text-sm font-semibold text-[#0E7C66] mb-2">بينفع</p>
                          <ul className="text-sm text-[#1C1B29] space-y-1.5">
                            <li className="flex items-start gap-2"><span className="text-[#0E7C66] mt-0.5">&#10003;</span> أي عدد أعمدة — المهم عمود الحالة</li>
                            <li className="flex items-start gap-2"><span className="text-[#0E7C66] mt-0.5">&#10003;</span> أسماء أعمدة عربي أو إنجليزي</li>
                            <li className="flex items-start gap-2"><span className="text-[#0E7C66] mt-0.5">&#10003;</span> قيم حالة حرة (مردش، هيجي، كنسل، closed...)</li>
                            <li className="flex items-start gap-2"><span className="text-[#0E7C66] mt-0.5">&#10003;</span> CSV أو Excel (.xlsx)</li>
                            <li className="flex items-start gap-2"><span className="text-[#0E7C66] mt-0.5">&#10003;</span> تصدير من أي CRM أو Google Sheets</li>
                          </ul>
                        </div>
                        <div className="bg-[#FDF0EC] rounded-xl p-4">
                          <p className="text-sm font-semibold text-[#C0563B] mb-2">مش هينفع</p>
                          <ul className="text-sm text-[#1C1B29] space-y-1.5">
                            <li className="flex items-start gap-2"><span className="text-[#C0563B] mt-0.5">&#10007;</span> شيت فاضي أو بدون بيانات</li>
                            <li className="flex items-start gap-2"><span className="text-[#C0563B] mt-0.5">&#10007;</span> شيت مفيهوش عمود حالة خالص</li>
                            <li className="flex items-start gap-2"><span className="text-[#C0563B] mt-0.5">&#10007;</span> ملفات PDF أو صور</li>
                          </ul>
                        </div>
                      </div>

                      {/* Steps */}
                      <div>
                        <p className="text-sm font-semibold mb-3">الخطوات:</p>
                        <div className="flex flex-col gap-2.5">
                          {[
                            { n: "1", t: "ارفع الملف", d: "CSV أو Excel" },
                            { n: "2", t: "اختار عمود الحالة", d: "الأداة هتقترحلك الأنسب" },
                            { n: "3", t: "صنّف القيم", d: "حدد كل قيمة = تواصل / حجز / صفقة" },
                            { n: "4", t: "شوف النتيجة", d: "الفانل + التسريب + التوصية" },
                          ].map((s) => (
                            <div key={s.n} className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-[#0E7C66] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{s.n}</div>
                              <div>
                                <span className="font-medium text-sm">{s.t}</span>
                                <span className="text-xs text-[#6B6A7A] mr-2">— {s.d}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Drop Zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition ${
                    dragOver ? "border-[#0E7C66] bg-[#0E7C66]/5" : "border-[#E8E6E1] hover:border-[#0E7C66]/50 bg-white"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <div className="w-16 h-16 rounded-2xl bg-[#0E7C66]/5 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-[#0E7C66]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold mb-1">اسحب الملف هنا أو اضغط للاختيار</p>
                  <p className="text-sm text-[#6B6A7A]">CSV أو Excel — مفيش حاجة بتترفع</p>
                </div>
              </div>
            ) : !mappingStep ? (
              /* ── Step 1: Column Picker ── */
              <div className="bg-white rounded-2xl p-6 border border-[#E8E6E1] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{fmt(fileState.rows.length)} صف (ليد)</p>
                    <p className="text-sm text-[#6B6A7A]">{fileState.columns.length} عمود — اختار العمود اللي فيه حالة الليد أو الفيدباك</p>
                  </div>
                  <button onClick={() => { setFileState(null); setMappingStep(false); }} className="text-sm text-[#C0563B] hover:underline">
                    غيّر الملف
                  </button>
                </div>
                <div className="space-y-2">
                  {fileState.columnScores
                    .filter((cs) => cs.fillRate > 0.01)
                    .map((cs) => {
                      const isRecommended = cs.score >= 40;
                      const isSelected = selectedStatusCol === cs.col;
                      return (
                        <button
                          key={cs.col}
                          onClick={() => {
                            setSelectedStatusCol(cs.col);
                          }}
                          className={`w-full text-start px-4 py-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-[#0E7C66]/5 border-[#0E7C66] ring-1 ring-[#0E7C66]/30"
                              : "border-[#E8E6E1] hover:border-[#0E7C66]/40"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                              isSelected ? "border-[#0E7C66]" : "border-[#E8E6E1]"
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-[#0E7C66]" />}
                            </div>
                            <span className="font-medium truncate">{cs.col}</span>
                            {isRecommended && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-[#0E7C66]/10 text-[#0E7C66] font-medium flex-shrink-0">
                                مقترح
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[#6B6A7A] flex-shrink-0">
                            {cs.uniqueCount} قيمة · {Math.round(cs.fillRate * 100)}% مملوء
                          </span>
                        </button>
                      );
                    })}
                </div>
                <button
                  onClick={() => {
                    if (selectedStatusCol) handleStatusColSelect(selectedStatusCol);
                  }}
                  disabled={!selectedStatusCol}
                  className="w-full py-3 rounded-xl bg-[#0E7C66] text-white font-semibold hover:bg-[#0E7C66]/90 transition disabled:opacity-40"
                >
                  التالي — صنّف القيم
                </button>
                <button
                  onClick={() => setTab("manual")}
                  className="text-sm text-[#6B6A7A] hover:text-[#0E7C66] transition w-full text-center"
                >
                  مش لاقي عمود مناسب؟ جرّب الإدخال اليدوي
                </button>
              </div>
            ) : (
              /* ── Step 2: Value Mapping ── */
              <div className="bg-white rounded-2xl p-6 border border-[#E8E6E1] space-y-5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">
                    {fmt(fileState.rows.length)} ليد — عمود: &quot;{selectedStatusCol}&quot;
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => setMappingStep(false)} className="text-sm text-[#0E7C66] hover:underline">
                      غيّر العمود
                    </button>
                    <button onClick={() => { setFileState(null); setMappingStep(false); }} className="text-sm text-[#C0563B] hover:underline">
                      غيّر الملف
                    </button>
                  </div>
                </div>

                <p className="text-sm text-[#6B6A7A]">
                  صنّف القيم على المراحل دي (ممكن تختار أكتر من قيمة لكل مرحلة). الأرقام جنب كل قيمة = عدد الليدز فيها.
                </p>

                {/* Search filter */}
                {fileState.statusValues.length > 15 && (
                  <input
                    type="text"
                    value={valSearch}
                    onChange={(e) => setValSearch(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E8E6E1] bg-[#FAF8F4] focus:outline-none focus:ring-2 focus:ring-[#0E7C66]/30 focus:border-[#0E7C66] transition text-sm"
                    placeholder="ابحث في القيم..."
                  />
                )}

                {(() => {
                  const filtered = fileState.statusValues.filter(
                    (sv) => !valSearch || sv.value.includes(valSearch)
                  );
                  const selectedVals = new Set([...contactedVals, ...bookedVals, ...closedVals]);
                  const selectedItems = filtered.filter((sv) => selectedVals.has(sv.value));
                  const unselectedItems = filtered.filter((sv) => !selectedVals.has(sv.value));

                  const renderValButton = (sv: ValueWithCount) => {
                    const inContacted = contactedVals.includes(sv.value);
                    const inBooked = bookedVals.includes(sv.value);
                    const inClosed = closedVals.includes(sv.value);
                    let style = "border-[#E8E6E1]";
                    let badge = "";
                    if (inContacted) { style = "bg-[#0E7C66]/10 border-[#0E7C66] text-[#0E7C66]"; badge = "تواصل"; }
                    if (inBooked) { style = "bg-[#B08D57]/10 border-[#B08D57] text-[#B08D57]"; badge = "حجز"; }
                    if (inClosed) { style = "bg-[#0E7C66]/20 border-[#0E7C66] text-[#0E7C66] font-semibold"; badge = "صفقة"; }

                    return (
                      <div key={sv.value} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${style}`}>
                        <span className="flex-1 truncate">{sv.value}</span>
                        <span className="text-xs opacity-60 flex-shrink-0">({sv.count})</span>
                        {badge && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/60 flex-shrink-0">{badge}</span>}
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => {
                              if (inBooked) toggleVal(bookedVals, setBookedVals, sv.value);
                              if (inClosed) toggleVal(closedVals, setClosedVals, sv.value);
                              toggleVal(contactedVals, setContactedVals, sv.value);
                            }}
                            title="تواصل"
                            className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center transition ${
                              inContacted ? "bg-[#0E7C66] text-white" : "bg-[#E8E6E1]/50 hover:bg-[#0E7C66]/20 text-[#6B6A7A]"
                            }`}
                          >ت</button>
                          <button
                            onClick={() => {
                              if (inContacted) toggleVal(contactedVals, setContactedVals, sv.value);
                              if (inClosed) toggleVal(closedVals, setClosedVals, sv.value);
                              toggleVal(bookedVals, setBookedVals, sv.value);
                            }}
                            title="حجز"
                            className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center transition ${
                              inBooked ? "bg-[#B08D57] text-white" : "bg-[#E8E6E1]/50 hover:bg-[#B08D57]/20 text-[#6B6A7A]"
                            }`}
                          >ح</button>
                          <button
                            onClick={() => {
                              if (inContacted) toggleVal(contactedVals, setContactedVals, sv.value);
                              if (inBooked) toggleVal(bookedVals, setBookedVals, sv.value);
                              toggleVal(closedVals, setClosedVals, sv.value);
                            }}
                            title="صفقة"
                            className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center transition ${
                              inClosed ? "bg-[#1C1B29] text-white" : "bg-[#E8E6E1]/50 hover:bg-[#1C1B29]/10 text-[#6B6A7A]"
                            }`}
                          >ص</button>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {/* Legend */}
                      <div className="flex gap-4 text-xs text-[#6B6A7A] pb-2 border-b border-[#E8E6E1] sticky top-0 bg-white z-10 pt-1">
                        <span><strong className="text-[#0E7C66]">ت</strong> = تم التواصل</span>
                        <span><strong className="text-[#B08D57]">ح</strong> = حجز/اهتمام</span>
                        <span><strong className="text-[#1C1B29]">ص</strong> = قفل صفقة</span>
                      </div>
                      {selectedItems.map(renderValButton)}
                      {unselectedItems.map(renderValButton)}
                    </div>
                  );
                })()}

                {/* Summary of selections */}
                {(contactedVals.length > 0 || bookedVals.length > 0 || closedVals.length > 0) && (
                  <div className="bg-[#FAF8F4] rounded-xl p-4 space-y-1.5 text-sm">
                    {contactedVals.length > 0 && (
                      <p><span className="text-[#0E7C66] font-semibold">تواصل:</span> {contactedVals.length} قيمة ({fmt(fileState.rows.filter(r => contactedVals.includes((r[selectedStatusCol] || "").trim())).length)} ليد)</p>
                    )}
                    {bookedVals.length > 0 && (
                      <p><span className="text-[#B08D57] font-semibold">حجز:</span> {bookedVals.length} قيمة ({fmt(fileState.rows.filter(r => bookedVals.includes((r[selectedStatusCol] || "").trim())).length)} ليد)</p>
                    )}
                    {closedVals.length > 0 && (
                      <p><span className="text-[#1C1B29] font-semibold">صفقة:</span> {closedVals.length} قيمة ({fmt(fileState.rows.filter(r => closedVals.includes((r[selectedStatusCol] || "").trim())).length)} ليد)</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">متوسط ربح الصفقة (ج.م)</label>
                  <input
                    type="number"
                    value={fileAvgDeal}
                    onChange={(e) => setFileAvgDeal(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FAF8F4] focus:outline-none focus:ring-2 focus:ring-[#0E7C66]/30 focus:border-[#0E7C66] transition"
                    dir="ltr"
                  />
                </div>

                <button
                  onClick={handleFileAnalyze}
                  disabled={contactedVals.length === 0 && bookedVals.length === 0 && closedVals.length === 0}
                  className="w-full py-3.5 rounded-xl bg-[#0E7C66] text-white font-semibold text-lg hover:bg-[#0E7C66]/90 transition disabled:opacity-40"
                >
                  حلّل البيانات
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab: Manual */}
        {tab === "manual" && (
          <form onSubmit={handleManualSubmit} className="animate-fade-in">
            <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#E8E6E1] shadow-sm space-y-4">
              <p className="text-sm text-[#6B6A7A] mb-2">أرقام الشهر الأخير:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">عدد الليدز الكلي</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={leads}
                    onChange={(e) => setLeads(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FAF8F4] focus:outline-none focus:ring-2 focus:ring-[#0E7C66]/30 focus:border-[#0E7C66] transition text-base"
                    placeholder="مثلاً 500"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">اللي اتكلمت معاهم</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={contacted}
                    onChange={(e) => setContacted(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FAF8F4] focus:outline-none focus:ring-2 focus:ring-[#0E7C66]/30 focus:border-[#0E7C66] transition text-base"
                    placeholder="مثلاً 350"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">اللي حجزوا / أبدوا اهتمام</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={booked}
                    onChange={(e) => setBooked(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FAF8F4] focus:outline-none focus:ring-2 focus:ring-[#0E7C66]/30 focus:border-[#0E7C66] transition text-base"
                    placeholder="مثلاً 80"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الصفقات اللي قفلت</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={deals}
                    onChange={(e) => setDeals(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FAF8F4] focus:outline-none focus:ring-2 focus:ring-[#0E7C66]/30 focus:border-[#0E7C66] transition text-base"
                    placeholder="مثلاً 20"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">متوسط ربح الصفقة (ج.م) — اختياري</label>
                <input
                  type="number"
                  value={avgDeal}
                  onChange={(e) => setAvgDeal(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FAF8F4] focus:outline-none focus:ring-2 focus:ring-[#0E7C66]/30 focus:border-[#0E7C66] transition"
                  placeholder="3000"
                  dir="ltr"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#0E7C66] text-white font-semibold text-lg hover:bg-[#0E7C66]/90 transition shadow-lg shadow-[#0E7C66]/20"
              >
                حلّل الأرقام
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ── Results ── */}
      {result && (
        <div ref={resultRef} className="px-4 pb-12">
          <Results result={result} />
          <div className="mt-12">
            <LeadCapture result={result} />
          </div>
        </div>
      )}

      {/* ── About Section ── */}
      <section className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
        <div className="bg-white rounded-2xl p-6 md:p-10 border border-[#E8E6E1] shadow-sm">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-[#0E7C66]/10 to-[#B08D57]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/me.png"
                alt="محمد وحيد"
                className="w-full h-full object-cover rounded-2xl"
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  el.style.display = "none";
                  el.parentElement!.innerHTML = '<span class="text-3xl font-bold text-[#0E7C66]">م.و</span>';
                }}
              />
            </div>
            <div className="text-center md:text-start flex-1">
              <h3 className="text-2xl font-bold mb-1">محمد وحيد</h3>
              <p className="text-[#0E7C66] font-medium text-sm mb-4">AI-Powered Growth Systems Builder</p>
              <p className="text-[#6B6A7A] leading-relaxed mb-5">
                بساعد الشركات تبني أنظمة AI وأتمتة بتزوّد الإيرادات وتوقف ضياع العملاء. بنيت أنظمة إدارة ليدز ومبيعات شغّالة في شركات كتير بقطاعات مختلفة. شغلي إني أحوّل الداتا المتكدّسة في شركتك لقرارات بتجيب فلوس — مش مجرد أدوات، أنظمة كاملة بتشتغل وتطلّع نتيجة.
              </p>

              {/* How I can help */}
              <div className="bg-[#FAF8F4] rounded-xl p-4 mb-5">
                <p className="font-semibold text-sm mb-3">إزاي أقدر أساعدك؟</p>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#0E7C66]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[#0E7C66] text-xs font-bold">1</span>
                    </div>
                    <p className="text-sm text-[#1C1B29]"><strong>جمع وتنظيم البيانات</strong> — لو بياناتك متفرقة أو مش منظمة، بساعدك تجمعها في مكان واحد وتبقى جاهزة للتحليل.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#0E7C66]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[#0E7C66] text-xs font-bold">2</span>
                    </div>
                    <p className="text-sm text-[#1C1B29]"><strong>تحليل أدق وأعمق</strong> — تحليل مفصّل لكل مرحلة في الفانل بتاعك: فين بالظبط بيحصل التسريب، ليه، وإيه الأرقام الحقيقية.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#0E7C66]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[#0E7C66] text-xs font-bold">3</span>
                    </div>
                    <p className="text-sm text-[#1C1B29]"><strong>خطة عملية لقفل التسريب</strong> — مش بس هقولك المشكلة، هبنيلك نظام متابعة وأتمتة يوقف الخسارة ويزوّد الإغلاق.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-center md:justify-start">
                <a
                  href="https://wa.me/201148627137"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0E7C66] text-white text-sm font-semibold hover:bg-[#0E7C66]/90 transition shadow-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  ابعتلي واتساب
                </a>
                <a
                  href="https://www.linkedin.com/in/moohamedwaheed/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#E8E6E1] text-sm font-medium hover:border-[#0E7C66]/50 hover:text-[#0E7C66] transition"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#E8E6E1] py-6 text-center text-sm text-[#6B6A7A]">
        <p>Lead Leak Audit — بناء محمد وحيد &copy; {new Date().getFullYear()}</p>
      </footer>
    </main>
  );
}
