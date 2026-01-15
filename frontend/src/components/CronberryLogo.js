export const CronberryLogo = ({ className = "h-8 w-8" }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="cubeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#0B1F3A', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#1a3a5c', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      
      {/* Cube - 3D effect */}
      <g transform="translate(50, 50)">
        {/* Top face */}
        <polygon
          points="0,-25 25,-12.5 0,0 -25,-12.5"
          fill="#0B1F3A"
          opacity="0.9"
        />
        
        {/* Left face */}
        <polygon
          points="-25,-12.5 -25,12.5 0,25 0,0"
          fill="#0B1F3A"
          opacity="0.7"
        />
        
        {/* Right face */}
        <polygon
          points="0,0 0,25 25,12.5 25,-12.5"
          fill="#0B1F3A"
          opacity="0.85"
        />
        
        {/* Letter C */}
        <text
          x="-8"
          y="8"
          fontSize="28"
          fontWeight="bold"
          fontFamily="Inter, sans-serif"
          fill="#D81B60"
          style={{ userSelect: 'none' }}
        >
          C
        </text>
      </g>
      
      {/* Accent dot */}
      <circle cx="75" cy="25" r="4" fill="#D81B60" />
    </svg>
  );
};

export default CronberryLogo;