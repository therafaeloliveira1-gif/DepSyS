#!/usr/bin/env python3
"""
Generador Maestro Oficial de Iconos y Logotipos para DepSyS
Motos Mendes S.A.
Genera vectores SVG de precisión milimétrica y renderiza vistas PNG en alta resolución.
"""

import os
import math
import subprocess

def get_regular_hex_points(cx, cy, r, elong_y=0):
    """
    Genera los 6 puntos de un hexágono vertical elongado.
    Ángulos simétricos de 30° / 60° / 120°.
    """
    dx = r * math.cos(math.radians(30)) # r * 0.866025
    dy = r * math.sin(math.radians(30)) # r * 0.5
    
    half_straight = dy + (elong_y / 2)
    top_y = cy - r - (elong_y / 2)
    bot_y = cy + r + (elong_y / 2)
    
    p1 = f"{cx:.2f},{top_y:.2f}"
    p2 = f"{cx + dx:.2f},{cy - half_straight:.2f}"
    p3 = f"{cx + dx:.2f},{cy + half_straight:.2f}"
    p4 = f"{cx:.2f},{bot_y:.2f}"
    p5 = f"{cx - dx:.2f},{cy + half_straight:.2f}"
    p6 = f"{cx - dx:.2f},{cy - half_straight:.2f}"
    
    return f"{p1} {p2} {p3} {p4} {p5} {p6}"

def generate_svg_icon_red(size=512, rounded_corners=True):
    """Icono cuadrado oficial Rojo Motos Mendes (#e60000) - Referencia 1"""
    cx = size / 2
    cy = 205
    r_hex = 146
    elong = 14
    stroke_hex = 25
    
    rw = 66
    rh = 34
    gap = 36
    stroke_layers = 19
    top_layer_y = cy - 40
    
    rx_val = "108" if rounded_corners else "0"
    
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@900&amp;display=swap');
    </style>
    <filter id="icon-depth" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#7a0000" flood-opacity="0.45"/>
    </filter>
  </defs>

  <!-- Fondo Rojo Institucional Motos Mendes -->
  <rect width="{size}" height="{size}" rx="{rx_val}" fill="#e60000" />

  <g filter="url(#icon-depth)">
    <!-- Hexágono Exterior Blanco -->
    <polygon points="{get_regular_hex_points(cx, cy, r_hex, elong)}" 
             fill="none" 
             stroke="#ffffff" 
             stroke-width="{stroke_hex}" 
             stroke-linejoin="round" 
             stroke-linecap="round" />

    <!-- Capa 1: Rombo Isométrico Superior -->
    <polygon points="{cx:.2f},{top_layer_y - rh:.2f} {cx + rw:.2f},{top_layer_y:.2f} {cx:.2f},{top_layer_y + rh:.2f} {cx - rw:.2f},{top_layer_y:.2f}" 
             fill="none" 
             stroke="#ffffff" 
             stroke-width="{stroke_layers}" 
             stroke-linejoin="round" 
             stroke-linecap="round" />

    <!-- Capa 2: Chevron Isométrico 1 -->
    <polyline points="{cx - rw:.2f},{top_layer_y + gap:.2f} {cx:.2f},{top_layer_y + rh + gap:.2f} {cx + rw:.2f},{top_layer_y + gap:.2f}" 
              fill="none" 
              stroke="#ffffff" 
              stroke-width="{stroke_layers}" 
              stroke-linejoin="round" 
              stroke-linecap="round" />

    <!-- Capa 3: Chevron Isométrico 2 -->
    <polyline points="{cx - rw:.2f},{top_layer_y + gap * 2:.2f} {cx:.2f},{top_layer_y + rh + gap * 2:.2f} {cx + rw:.2f},{top_layer_y + gap * 2:.2f}" 
              fill="none" 
              stroke="#ffffff" 
              stroke-width="{stroke_layers}" 
              stroke-linejoin="round" 
              stroke-linecap="round" />
  </g>

  <!-- Tipografía Oficial DEPSYS -->
  <text x="{cx}" y="438" 
        font-family="'Montserrat', 'Arial Black', system-ui, sans-serif" 
        font-size="60" 
        font-weight="900" 
        letter-spacing="7" 
        fill="#ffffff" 
        text-anchor="middle">DEPSYS</text>
</svg>'''
    return svg

def generate_svg_logo_horizontal(w=1120, h=330):
    """Logo Horizontal Oficial (Referencia 2: Doble hexágono + Orbitron)"""
    cx = 200
    cy = h / 2
    
    r_out = 132
    stroke_out = 8
    
    r_in = 84
    stroke_in = 14
    
    rw = 42
    rh = 22
    gap = 24
    stroke_layer = 12
    top_y = cy - 28
    
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@900&amp;family=Montserrat:wght@700&amp;display=swap');
    </style>
    <linearGradient id="titanium-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#121214"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Fondo Carbón Titanio Oficial (Zinc-950) -->
  <rect width="{w}" height="{h}" rx="28" fill="url(#titanium-bg)" stroke="#27272a" stroke-width="2" />

  <!-- SÍMBOLO EMBLEMA CONCÉNTRICO -->
  <g filter="url(#soft-glow)">
    <!-- Hexágono Exterior Fino Exterior -->
    <polygon points="{get_regular_hex_points(cx, cy, r_out, 10)}" 
             fill="none" 
             stroke="#ffffff" 
             stroke-width="{stroke_out}" 
             stroke-linejoin="round" 
             stroke-linecap="round" />

    <!-- Hexágono Fino Interior de Resonancia -->
    <polygon points="{get_regular_hex_points(cx, cy, r_out - 14, 8)}" 
             fill="none" 
             stroke="rgba(255, 255, 255, 0.35)" 
             stroke-width="2.5" 
             stroke-linejoin="round" 
             stroke-linecap="round" />

    <!-- Hexágono Interior Sólido -->
    <polygon points="{get_regular_hex_points(cx, cy, r_in, 6)}" 
             fill="#18181b" 
             stroke="#ffffff" 
             stroke-width="{stroke_in}" 
             stroke-linejoin="round" 
             stroke-linecap="round" />

    <!-- Capas Isométricas dentro del núcleo -->
    <polygon points="{cx:.2f},{top_y - rh:.2f} {cx + rw:.2f},{top_y:.2f} {cx:.2f},{top_y + rh:.2f} {cx - rw:.2f},{top_y:.2f}" 
             fill="none" 
             stroke="#ffffff" 
             stroke-width="{stroke_layer}" 
             stroke-linejoin="round" 
             stroke-linecap="round" />

    <polyline points="{cx - rw:.2f},{top_y + gap:.2f} {cx:.2f},{top_y + rh + gap:.2f} {cx + rw:.2f},{top_y + gap:.2f}" 
              fill="none" 
              stroke="#ffffff" 
              stroke-width="{stroke_layer}" 
              stroke-linejoin="round" 
              stroke-linecap="round" />

    <polyline points="{cx - rw:.2f},{top_y + gap * 2:.2f} {cx:.2f},{top_y + rh + gap * 2:.2f} {cx + rw:.2f},{top_y + gap * 2:.2f}" 
              fill="none" 
              stroke="#e60000" 
              stroke-width="{stroke_layer}" 
              stroke-linejoin="round" 
              stroke-linecap="round" />
  </g>

  <!-- TIPOGRAFÍA OFICIAL ORBITRON EXACTA DE LA REFERENCIA -->
  <text x="380" y="198" 
        font-family="'Orbitron', 'Chakra Petch', 'Montserrat', system-ui, sans-serif" 
        font-size="112" 
        font-weight="900" 
        letter-spacing="14" 
        fill="#ffffff">DEPSYS</text>

  <!-- Subtítulo Institucional Motos Mendes -->
  <text x="385" y="248" 
        font-family="'Montserrat', system-ui, sans-serif" 
        font-size="15" 
        font-weight="700" 
        letter-spacing="5" 
        fill="#a1a1aa">SISTEMA DE DEPÓSITO Y PICKING • MOTOS MENDES</text>

  <!-- Indicador Oficial -->
  <g transform="translate(940, 32)">
    <rect width="136" height="28" rx="14" fill="rgba(230,0,0,0.15)" stroke="#e60000" stroke-width="1.5" />
    <circle cx="16" cy="14" r="4.5" fill="#e60000" />
    <text x="28" y="19" font-family="'Montserrat', sans-serif" font-size="10.5" font-weight="800" letter-spacing="1.5" fill="#ffffff">INDUSTRIAL</text>
  </g>
</svg>'''
    return svg

def generate_svg_symbol_mark(size=256):
    """Símbolo puro sin fondo (Transparente) para favicon y componentes"""
    cx = size / 2
    cy = size / 2
    r_hex = 100
    elong = 10
    stroke_hex = 18
    
    rw = 46
    rh = 24
    gap = 26
    stroke_layers = 14
    top_layer_y = cy - 28
    
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">
  <polygon points="{get_regular_hex_points(cx, cy, r_hex, elong)}" 
           fill="none" 
           stroke="#e60000" 
           stroke-width="{stroke_hex}" 
           stroke-linejoin="round" 
           stroke-linecap="round" />

  <polygon points="{cx:.2f},{top_layer_y - rh:.2f} {cx + rw:.2f},{top_layer_y:.2f} {cx:.2f},{top_layer_y + rh:.2f} {cx - rw:.2f},{top_layer_y:.2f}" 
           fill="none" 
           stroke="#ffffff" 
           stroke-width="{stroke_layers}" 
           stroke-linejoin="round" 
           stroke-linecap="round" />

  <polyline points="{cx - rw:.2f},{top_layer_y + gap:.2f} {cx:.2f},{top_layer_y + rh + gap:.2f} {cx + rw:.2f},{top_layer_y + gap:.2f}" 
            fill="none" 
            stroke="#ffffff" 
            stroke-width="{stroke_layers}" 
            stroke-linejoin="round" 
            stroke-linecap="round" />

  <polyline points="{cx - rw:.2f},{top_layer_y + gap * 2:.2f} {cx:.2f},{top_layer_y + rh + gap * 2:.2f} {cx + rw:.2f},{top_layer_y + gap * 2:.2f}" 
            fill="none" 
            stroke="#e60000" 
            stroke-width="{stroke_layers}" 
            stroke-linejoin="round" 
            stroke-linecap="round" />
</svg>'''
    return svg

def main():
    scratch_dir = "c:/WorkSpace/DepSyS/scratch"
    public_desktop = "c:/WorkSpace/DepSyS/DepSyS/public"
    public_picking = "c:/WorkSpace/DepSyS/app-picking/public"

    os.makedirs(scratch_dir, exist_ok=True)
    os.makedirs(public_desktop, exist_ok=True)
    os.makedirs(public_picking, exist_ok=True)

    red_svg_squircle = generate_svg_icon_red(512, rounded_corners=True)
    red_svg_square = generate_svg_icon_red(512, rounded_corners=False)
    horizontal_svg = generate_svg_logo_horizontal(1120, 330)
    symbol_mark_svg = generate_svg_symbol_mark(256)

    # Guardar en scratch
    with open(f"{scratch_dir}/depsys-icon-red.svg", "w", encoding="utf-8") as f:
        f.write(red_svg_squircle)
    with open(f"{scratch_dir}/depsys-icon-square.svg", "w", encoding="utf-8") as f:
        f.write(red_svg_square)
    with open(f"{scratch_dir}/depsys-logo-horizontal.svg", "w", encoding="utf-8") as f:
        f.write(horizontal_svg)
    with open(f"{scratch_dir}/depsys-symbol-mark.svg", "w", encoding="utf-8") as f:
        f.write(symbol_mark_svg)

    # Copiar a las apps cliente
    with open(f"{public_desktop}/favicon.svg", "w", encoding="utf-8") as f:
        f.write(symbol_mark_svg)
    with open(f"{public_desktop}/depsys-icon.svg", "w", encoding="utf-8") as f:
        f.write(red_svg_squircle)
    with open(f"{public_desktop}/depsys-logo-horizontal.svg", "w", encoding="utf-8") as f:
        f.write(horizontal_svg)
    with open(f"{public_picking}/favicon.svg", "w", encoding="utf-8") as f:
        f.write(symbol_mark_svg)
    with open(f"{public_picking}/depsys-icon.svg", "w", encoding="utf-8") as f:
        f.write(red_svg_squircle)

    print("✅ SVGs generados y desplegados.")

    # Renderizar PNGs
    edge_exe = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    if os.path.exists(edge_exe):
        subprocess.run([
            edge_exe, "--headless=new",
            f"--screenshot={scratch_dir}/depsys-icon-512.png",
            "--window-size=512,512",
            f"file:///{scratch_dir}/depsys-icon-red.svg"
        ], capture_output=True)
        subprocess.run([
            edge_exe, "--headless=new",
            f"--screenshot={scratch_dir}/depsys-logo-horizontal.png",
            "--window-size=1120,330",
            f"file:///{scratch_dir}/depsys-logo-horizontal.svg"
        ], capture_output=True)
        print("✅ Previews PNG renderizadas.")

if __name__ == "__main__":
    main()
