import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "원하GS(원하지쓰) | 우리 동네 상품 요청",
  description: "원하는 말은 상품으로, 모인 수요는 사장님의 쉬운 판단으로. 원하GS 화면 미리보기.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
