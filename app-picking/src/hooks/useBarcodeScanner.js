import { useEffect, useRef } from 'react';

/**
 * Hook para capturar ráfagas ultrarrápidas de lectores láser de código de barras
 * (Pistolas USB, escáneres Bluetooth, y PDAs Android como Zebra, Honeywell o Newland).
 *
 * @param {Function} onScan - Callback invocado con el código de barras limpio.
 * @param {Object} options - Configuración opcional.
 */
export function useBarcodeScanner(onScan, options = {}) {
  const {
    minChars = 3,
    maxIntervalMs = 60, // Límite de tiempo entre teclas para considerarlo ráfaga de lector
    enabled = true
  } = options;

  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e) {
      // Si el foco está en un input y se presiona Enter, dejamos que el form o input maneje
      const target = e.target;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minChars) {
          e.preventDefault();
          const scannedCode = bufferRef.current.trim();
          bufferRef.current = '';
          if (onScanRef.current) {
            onScanRef.current(scannedCode);
          }
        }
        return;
      }

      // Filtrar teclas modificadoras y no imprimibles
      if (e.key.length > 1) {
        return;
      }

      // Si el intervalo entre pulsaciones es muy largo y no estamos en un input, reiniciar buffer
      if (timeDiff > maxIntervalMs && !isInput) {
        bufferRef.current = '';
      }

      // Si no estamos en un input tradicional, capturar para el buffer del escáner
      if (!isInput) {
        bufferRef.current += e.key;
      }
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, minChars, maxIntervalMs]);
}
