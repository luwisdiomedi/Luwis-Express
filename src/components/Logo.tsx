import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizes = {
    sm: { text: 'text-sm', sub: 'text-[6px]', icon: 'w-8 h-8', gap: 'gap-2' },
    md: { text: 'text-lg', sub: 'text-[8px]', icon: 'w-10 h-10', gap: 'gap-3' },
    lg: { text: 'text-3xl', sub: 'text-xs', icon: 'w-16 h-16', gap: 'gap-4' }
  };

  const currentSize = sizes[size];

  return (
    <div className={`flex items-center ${currentSize.gap} ${className}`}>
      <div className={`${currentSize.icon} relative flex-shrink-0`}>
        {/* Simplified SVG Icon recreation of Luwis Express Logo */}
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
          {/* Orange Semi-circle background */}
          <circle cx="50" cy="50" r="40" fill="#FF4D00" opacity="0.9" />
          
          {/* Navy blue bird/road shape */}
          <path 
            d="M20 30 C 15 45, 40 60, 50 60 C 60 60, 85 45, 80 30 L 80 80 L 20 80 Z" 
            fill="#002B5B" 
          />
          
          {/* Road arrow pointing up */}
          <path 
            d="M30 85 L 55 25 L 65 25 L 40 85 Z" 
            fill="#002B5B" 
          />
          
          {/* Road markings */}
          <path d="M43 75 L 45 65" stroke="white" strokeWidth="2" strokeDasharray="4" />
          <path d="M47 55 L 49 45" stroke="white" strokeWidth="2" strokeDasharray="4" />
          
          {/* Arrow head */}
          <path d="M55 25 L 65 15 L 75 25 Z" fill="#002B5B" />
        </svg>
      </div>
      <div className="flex flex-col leading-tight">
        <div className={`${currentSize.text} font-display font-black tracking-tighter flex items-baseline gap-1`}>
          <span className="text-[#002B5B]">LUWIS</span>
          <span className="text-[#FF4D00] italic uppercase">EXPRESS</span>
        </div>
        <div className={`${currentSize.sub} font-sans font-bold text-[#002B5B] tracking-[0.2em] uppercase opacity-80 whitespace-nowrap`}>
          Speed. Reliability. Service.
        </div>
      </div>
    </div>
  );
}
