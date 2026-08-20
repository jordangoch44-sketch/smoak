import { Orbitron } from "next/font/google";
import "@/styles/founding-50.css";

const foundingCountdown = Orbitron({
  variable: "--font-founding-countdown",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export default function Founding50Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={foundingCountdown.variable}>{children}</div>;
}
