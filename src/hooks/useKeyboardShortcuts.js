import { useEffect } from 'react';

/**
 * Atajos de teclado para operaciones en mesa sin requerir mouse:
 * - Espacio: Iniciar o pausar cronómetro de revisión.
 * - Enter: Finalizar revisión / Tomar siguiente nota.
 * - Flechas Arriba/Abajo: Seleccionar pedido de la cola.
 */
export function useKeyboardShortcuts({
  onSpace,
  onEnter,
  onArrowUp,
  onArrowDown,
  enabled = true
}) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e) {
      // Ignorar si el usuario está escribiendo en un input o textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (onSpace) onSpace();
      } else if (e.code === 'Enter') {
        e.preventDefault();
        if (onEnter) onEnter();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        if (onArrowUp) onArrowUp();
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        if (onArrowDown) onArrowDown();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onSpace, onEnter, onArrowUp, onArrowDown]);
}
