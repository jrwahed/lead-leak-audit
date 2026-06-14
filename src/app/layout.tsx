import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead Leak Audit — اكتشف فين بتضيع عملاءك",
  description:
    "أداة مجانية تحلل بيانات الليدز بتاعتك وتوريك فين بتخسر أكبر عدد عملاء وكام فلوس بتضيع كل شهر.",
  openGraph: {
    title: "Lead Leak Audit — اكتشف فين بتضيع عملاءك",
    description:
      "أداة مجانية تحلل بيانات الليدز بتاعتك وتوريك فين بتخسر أكبر عدد عملاء وكام فلوس بتضيع كل شهر.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
