import json

with open('scripts/cebu_silhouette_d.txt') as f:
    path_d = f.read().strip()

# Create several variations matching Watch Cebu theme
# Theme: Slate 900 (#0F172A), Slate 800 (#1E293B), Electric Cyan (#38BDF8), Civic Amber (#F59E0B), Emerald (#10B981)

html_content = f'''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Watch Cebu - Logo Concept Explorations</title>
<style>
  body {{
    background: #0B1120;
    color: #F8FAFC;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 40px;
    margin: 0;
  }}
  h1 {{ font-size: 24px; font-weight: 800; letter-spacing: 1px; margin-bottom: 8px; }}
  p {{ color: #94A3B8; font-size: 14px; margin-bottom: 32px; }}
  .grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 24px;
  }}
  .card {{
    background: #0F172A;
    border: 1px solid #1E293B;
    border-radius: 16px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  }}
  .card h3 {{
    font-size: 16px;
    margin: 16px 0 6px 0;
    color: #F1F5F9;
  }}
  .card p {{
    font-size: 12px;
    color: #64748B;
    margin: 0 0 16px 0;
  }}
  .header-preview {{
    width: 100%;
    background: #0F172A;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
  }}
  .header-preview .title {{
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 1px;
    color: #FFFFFF;
  }}
</style>
</head>
<body>
  <h1>Watch Cebu — Cebu Silhouette Logo Explorations</h1>
  <p>Vector silhouette extracted from 123RF royalty-free map, cleaned, simplified, and calibrated to the Watch Cebu dark control-room palette.</p>

  <div class="grid">
    <!-- Option A: Clean Minimal Cyan -->
    <div class="card">
      <svg viewBox="0 0 100 100" width="160" height="160">
        <defs>
          <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38BDF8" />
            <stop offset="100%" stop-color="#0284C7" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill="#1E293B" stroke="#334155" stroke-width="1.5" />
        <path d="{path_d}" fill="url(#cyanGrad)" />
      </svg>
      <h3>Option A: Electric Cyan</h3>
      <p>Clean, high-visibility, matches modern civic & geospatial themes.</p>
      <div class="header-preview">
        <svg viewBox="0 0 100 100" width="22" height="22">
          <path d="{path_d}" fill="#38BDF8" />
        </svg>
        <span class="title">WATCH CEBU</span>
      </div>
    </div>

    <!-- Option B: Civic Watch Pulse (Radar Rings + Metro Cebu Focal Ping) -->
    <div class="card">
      <svg viewBox="0 0 100 100" width="160" height="160">
        <defs>
          <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38BDF8" />
            <stop offset="100%" stop-color="#818CF8" />
          </linearGradient>
          <radialGradient id="pingGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#EF4444" stop-opacity="1" />
            <stop offset="100%" stop-color="#EF4444" stop-opacity="0" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill="#0F172A" stroke="#334155" stroke-width="1.5" />
        <!-- Radar rings -->
        <circle cx="62" cy="58" r="28" fill="none" stroke="#334155" stroke-width="0.75" stroke-dasharray="2 2" opacity="0.6" />
        <circle cx="62" cy="58" r="16" fill="none" stroke="#334155" stroke-width="0.75" opacity="0.4" />
        <!-- Cebu silhouette -->
        <path d="{path_d}" fill="url(#radarGrad)" opacity="0.95" />
        <!-- Metro Cebu focal pulse at Cebu City coordinates -->
        <circle cx="62" cy="58" r="6" fill="url(#pingGlow)" opacity="0.6" />
        <circle cx="62" cy="58" r="2.2" fill="#EF4444" />
      </svg>
      <h3>Option B: Civic Radar Watch</h3>
      <p>Cebu silhouette + subtle monitoring radar rings and Metro Cebu pulse ping.</p>
      <div class="header-preview">
        <svg viewBox="0 0 100 100" width="22" height="22">
          <path d="{path_d}" fill="#38BDF8" />
          <circle cx="62" cy="58" r="3.5" fill="#EF4444" />
        </svg>
        <span class="title">WATCH CEBU</span>
      </div>
    </div>

    <!-- Option C: Golden Amber / Alert Glow -->
    <div class="card">
      <svg viewBox="0 0 100 100" width="160" height="160">
        <defs>
          <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FACC15" />
            <stop offset="100%" stop-color="#EA580C" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill="#0F172A" stroke="#334155" stroke-width="1.5" />
        <path d="{path_d}" fill="url(#amberGrad)" />
      </svg>
      <h3>Option C: Civic Amber Warning</h3>
      <p>Warm amber alert tone, matching utility/hazard advisory colors.</p>
      <div class="header-preview">
        <svg viewBox="0 0 100 100" width="22" height="22">
          <path d="{path_d}" fill="#F59E0B" />
        </svg>
        <span class="title">WATCH CEBU</span>
      </div>
    </div>

    <!-- Option D: Minimal Monochrome / Slate Accent -->
    <div class="card">
      <svg viewBox="0 0 100 100" width="160" height="160">
        <rect width="100" height="100" rx="22" fill="#0F172A" stroke="#334155" stroke-width="1.5" />
        <path d="{path_d}" fill="#F8FAFC" />
      </svg>
      <h3>Option D: Pure High-Contrast White</h3>
      <p>100% minimalist, maximum contrast against dark slate backgrounds.</p>
      <div class="header-preview">
        <svg viewBox="0 0 100 100" width="22" height="22">
          <path d="{path_d}" fill="#F8FAFC" />
        </svg>
        <span class="title">WATCH CEBU</span>
      </div>
    </div>
  </div>
</body>
</html>
'''

with open('verification-artifacts/logo_preview.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print('Saved preview to verification-artifacts/logo_preview.html')
