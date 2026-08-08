import React from 'react';

interface HeroSectionProps {
  isDark: boolean;
  admissionCycle: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ isDark, admissionCycle }) => {
  return (
    <section className="w-full bg-[#F8FAFC] dark:bg-[#0b0f19] flex justify-center sticky top-[85px] md:top-[101px] z-0">
      <div 
        className="w-full relative animate-fade-in"
        style={{ containerType: 'inline-size' }}
      >
        <img
          src="/banner.png"
          alt="JCER Digital Portal Hero Banner"
          className="w-full h-auto block"
        />
        {/* Dynamic overlay to cover '2026-2027' in banner.png and display the current admission cycle */}
        <div 
          className="absolute bg-white flex items-center justify-start"
          style={{
            left: '13.8%',
            top: '48.2%',
            width: '9.5%',
            height: '4.8%',
            paddingLeft: '0.7cqw',
          }}
        >
          <span 
            style={{
              fontSize: '1.05cqw',
              fontWeight: 800,
              color: '#2563EB',
              lineHeight: 1,
              fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif'
            }}
          >
            {admissionCycle}
          </span>
        </div>
      </div>
    </section>
  );
};





