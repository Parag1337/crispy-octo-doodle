import React from "react";
import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface VierpCardProps {
  title: string;
  to: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  gradientFrom?: string;
  gradientTo?: string;
}

const VierpCard: React.FC<VierpCardProps> = ({
  title,
  to,
  icon: Icon,
  iconColor = "text-[#f59e0b]",
  iconBg = "bg-[#fef3c7]",
  gradientFrom = "from-[#e2e8f0]",
  gradientTo = "to-[#ffffff]"
}) => {
  return (
    <Link
      to={to}
      className="group relative flex flex-col items-center w-full bg-[var(--card-bg)] rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[var(--border)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1"
      style={{ minHeight: "180px" }}
    >
      {/* Top Gradient Background */}
      <div className={`absolute top-0 left-0 right-0 h-[65%] bg-gradient-to-b ${gradientFrom} ${gradientTo} opacity-80 dark:opacity-20 transition-opacity`} />
      
      {/* Wavy SVG Divider */}
      <div className="absolute left-0 right-0 w-full overflow-hidden leading-[0]" style={{ top: "64%" }}>
        <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[calc(100%+1.3px)] h-[25px]">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C71.39,23.3,143.43,62.19,208.6,83.18,246.39,95.3,283.9,103.11,321.39,56.44Z" className="fill-[var(--card-bg)]"></path>
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full h-full pt-6 pb-4 px-4">
        <h3 className="text-base font-bold text-[var(--text-strong)] text-center h-10 line-clamp-2">{title}</h3>
        
        {/* Floating Icon inside a circle */}
        <div className={`mt-auto mb-2 flex items-center justify-center w-[60px] h-[60px] rounded-full border-[5px] border-[var(--card-bg)] shadow-sm transition-transform duration-300 group-hover:scale-110 ${iconBg}`}>
          <Icon className={`${iconColor}`} size={24} />
        </div>
      </div>
    </Link>
  );
};

export default VierpCard;
