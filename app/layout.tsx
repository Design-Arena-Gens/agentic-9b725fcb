import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartTeammates by Skyline",
  description:
    "SmartTeammates: настройка урона и скорости для умных тиммейтов. Интерактивная симуляция мод-опций."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
