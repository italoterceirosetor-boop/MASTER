import React from 'react';

// Logo da Master Contabilidade - SVG vetorial
export default function Logo({ size = 60 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 240"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Cúpula/geometria no topo - cinza */}
      <path
        d="M 100 20 L 160 80 L 100 60 L 40 80 Z"
        fill="#6B7280"
        stroke="#1F2937"
        strokeWidth="2"
      />
      {/* Forma principal (escudo/diamante) */}
      <path
        d="M 100 60 L 160 80 L 160 120 L 100 180 L 40 120 L 40 80 Z"
        fill="#1F2937"
        stroke="#1F2937"
        strokeWidth="2"
      />
      {/* Listras brancas no topo */}
      <rect x="55" y="85" width="90" height="6" fill="white" />
      <rect x="60" y="95" width="80" height="6" fill="white" />
      {/* Barras azuis à direita */}
      <rect x="145" y="115" width="8" height="50" fill="#1E5BAA" />
      <rect x="158" y="115" width="8" height="50" fill="#1E5BAA" />
      <rect x="171" y="115" width="8" height="50" fill="#1E5BAA" />
    </svg>
  );
}
