import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '观澜 · 20万量化实验室',
  description: '人民币20万元模拟盘：真实公开数据、透明选股规则、逐日决策与绩效记录。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
      </body>
    </html>
  );
}
