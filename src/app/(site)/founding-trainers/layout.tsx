import { Orbitron } from "next/font/google";
import "@/styles/founding-trainers.css";

const foundingCountdown = Orbitron({
  variable: "--font-founding-countdown",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export default function FoundingTrainersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={foundingCountdown.variable}>{children}</div>;
}
