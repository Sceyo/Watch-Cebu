with open('scripts/cebu_silhouette_d.txt') as f:
    path_d = f.read().strip()

svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="cebuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#0284C7" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background rounded rectangle (maskable safe area compliant) -->
  <rect width="512" height="512" rx="112" fill="url(#bg)" />
  <rect width="496" height="496" x="8" y="8" rx="104" fill="none" stroke="#1E293B" stroke-width="4" />

  <!-- Radar / Coordinate circular rings -->
  <circle cx="318" cy="297" r="144" fill="none" stroke="#334155" stroke-width="2" stroke-dasharray="6 6" opacity="0.5" />
  <circle cx="318" cy="297" r="82" fill="none" stroke="#334155" stroke-width="2" opacity="0.4" />

  <!-- Cebu Island Silhouette -->
  <g transform="scale(5.12)">
    <path d="{path_d}" fill="url(#cebuGrad)" filter="url(#glow)" />
  </g>

  <!-- Metro Cebu Focal Pulse Core -->
  <circle cx="318" cy="297" r="16" fill="#EF4444" opacity="0.4" filter="url(#glow)" />
  <circle cx="318" cy="297" r="7" fill="#EF4444" />
  <circle cx="318" cy="297" r="3" fill="#FFFFFF" />

  <!-- Brand text badge -->
  <rect x="146" y="430" width="220" height="36" rx="18" fill="#1E293B" stroke="#475569" stroke-width="1.5" />
  <text x="256" y="454" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
        font-size="16" font-weight="800" fill="#F8FAFC" letter-spacing="3" text-anchor="middle">WATCH CEBU</text>
</svg>
'''

with open('public/icons/icon.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)

print('Updated public/icons/icon.svg successfully!')
