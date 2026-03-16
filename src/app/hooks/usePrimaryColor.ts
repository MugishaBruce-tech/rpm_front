import { useState, useEffect } from 'react';
import { colorService } from '../services/colorService';

export function usePrimaryColor() {
  const [primaryColor, setPrimaryColor] = useState('#168c17');

  useEffect(() => {
    // Get initial color
    setPrimaryColor(colorService.getColorScheme());

    // Listen for color changes
    const handleColorChange = (event: any) => {
      setPrimaryColor(event.detail.color);
    };

    window.addEventListener('colorSchemeChanged', handleColorChange);
    return () => window.removeEventListener('colorSchemeChanged', handleColorChange);
  }, []);

  return primaryColor;
}
