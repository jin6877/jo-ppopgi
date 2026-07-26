import type { Metadata, Viewport } from "next";
// 서체는 전부 셀프호스트(next/font/google 네트워크 의존 제거). Gaegu 는 제비·숫자 전용 손글씨체.
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "@fontsource/gaegu/400.css";
import "@fontsource/gaegu/700.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://jo-ppopgi.vercel.app"),
  title: "조뽑기 통 — 제비 뽑아서 조 나누기",
  description:
    "이름을 넣고 한 명씩 눌러 통에서 제비를 뽑습니다. 종이에 조 번호를 적어 통에 넣던 그 방식 그대로라 조 인원이 저절로 균등하게 나뉩니다.",
  openGraph: {
    title: "조뽑기 통 — 제비 뽑아서 조 나누기",
    description:
      "이름을 넣고 한 명씩 눌러 통에서 제비를 뽑습니다. 종이 제비 방식 그대로, 조 인원은 저절로 균등하게.",
    type: "website",
    locale: "ko_KR",
  },
};

export const viewport: Viewport = {
  themeColor: "#f2ede1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
