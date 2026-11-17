import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Noto_Sans_SC, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans-latin',
  display: 'swap',
});

const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans-sc',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '教师获奖材料管理系统',
  description: '专为教师打造的本地离线获奖材料管理台账，支持快速查找、路径登记、失效检测与一键导出。',
  openGraph: {
    title: '教师获奖材料管理系统',
    description: '专为教师打造的本地离线获奖材料管理台账，支持快速查找、路径登记、失效检测与一键导出。',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '教师获奖材料管理系统',
    description: '专为教师打造的本地离线获奖材料管理台账，支持快速查找、路径登记、失效检测与一键导出。',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-CN"
      className={`${plusJakarta.variable} ${notoSansSC.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="bg-slate-50 text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900"
      >
        {children}
      </body>
    </html>
  );
}
