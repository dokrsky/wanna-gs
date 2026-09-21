import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "원하GS | 우리 동네 상품 요청",
  description: "말로 남기는 우리 동네 GS 상품 요청 데모",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
