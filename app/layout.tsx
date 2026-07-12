import type { Metadata } from "next";
import Analytics from "./Analytics";
import MotionLayer from "./MotionLayer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://well-climate.ru"),
  title: "Климатические системы для коммерческих объектов — Well-Climate",
  description: "Проектирование, расчёт, поставка, монтаж и сервис VRF/VRV, чиллеров, фанкойлов и вентиляции для коммерческих объектов Москвы и Московской области.",
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "ru_RU", url: "/", siteName: "Well-Climate", title: "Климатические системы для коммерческих объектов", description: "Расчёт, поставка, монтаж, пусконаладка и сервис — в одних руках.", images: [{ url: "/og-well-climate.jpg", width: 1200, height: 630, alt: "Инженерные климатические системы Well-Climate" }] },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const metrikaId = process.env.YANDEX_METRIKA_ID?.trim();
  return <html lang="ru"><body><Analytics counterId={metrikaId} /><MotionLayer />{children}</body></html>;
}
