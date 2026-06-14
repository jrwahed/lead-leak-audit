# Lead Leak Audit — حاسبة تسريب الليدز

أداة ويب تفاعلية مجانية لأصحاب الشركات. ارفع ملف الليدز أو دخّل الأرقام يدوي، واعرف فوراً فين بيضيع أكبر عدد عملاء وكام فلوس بتخسر شهرياً.

**Privacy-first**: التحليل بالكامل client-side — الملف لا يترفع على أي سيرفر.

## Tech Stack
- Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- PapaParse (CSV) + SheetJS (Excel) — client-side parsing
- RTL / Arabic

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

### Option 1: Vercel CLI
```bash
npm i -g vercel
vercel
```

### Option 2: GitHub
1. Push this repo to GitHub
2. Go to vercel.com/new
3. Import the repo and deploy

### Environment Variables (Vercel Dashboard > Settings > Environment Variables)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_LEAD_WEBHOOK_URL` | No | POST endpoint for lead capture form (e.g. Make/Zapier webhook URL) |

If not set, form submissions log to the browser console.

## Customization
- **About section**: Edit name, bio, and links in `src/app/page.tsx` (search for "محمد وحيد")
- **Profile photo**: Replace `public/me.jpg`
- **Benchmark close rate**: Change `benchmarkClose = 0.05` in the `analyze` function
- **Default deal value**: Change the default `3000` in the input state
