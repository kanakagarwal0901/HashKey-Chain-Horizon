export default function LiquidGlassFilters() {
  return (
    <svg
      className="sr-only"
      aria-hidden="true"
      width="0"
      height="0"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="liquid-optical-refraction" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02 0.02"
            numOctaves="2"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="2.5"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
