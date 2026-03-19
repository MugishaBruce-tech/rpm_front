export const COLOR_OPTIONS = [
  { id: 'green', name: 'Green', value: '#00a63e', description: 'Fresh and natural' },
    { id: 'green', name: 'Green', value: '#145d15ff', description: 'Fresh and natural' },
  { id: 'green', name: 'Green', value: '#075108ff', description: 'Fresh and natural' },
  { id: 'green', name: 'Green', value: '#174217ff', description: 'Fresh and natural' },
  { id: 'green', name: 'Green', value: '#0b680cff', description: 'Fresh and natural' },

  { id: 'blue', name: 'Blue', value: '#d3d3d3', description: 'Professional and trusted' },
  { id: 'purple', name: 'Purple', value: '#7c3aed', description: 'Modern and creative' },
  { id: 'red', name: 'Red', value: '#dc2626', description: 'Bold and energetic' },
  { id: 'amber', name: 'Amber', value: '#5c4010ff', description: 'Warm and welcoming' },
  { id: 'emerald', name: 'Emerald', value: '#059669', description: 'Vibrant and rich' },
  { id: 'teal', name: 'Teal', value: '#14b8a6', description: 'Calm and sophisticated' },
  { id: 'emerald', name: 'Emerald', value: '#a56c2b8f', description: 'Vibrant and richest' },
  { id: 'cyan', name: 'Cyan', value: '#0891b2', description: 'Cool and modern' },
  { id: 'indigo', name: 'Indigo', value: '#4f46e5', description: 'Deep and elegant' },
  { id: 'rose', name: 'Rose', value: '#e11d48', description: 'Romantic and bold' },
  { id: 'fuchsia', name: 'Fuchsia', value: '#d946ef', description: 'Vibrant and trendy' },
  { id: 'orange', name: 'Orange', value: '#ea580c', description: 'Warm and energetic' },
  { id: 'lime', name: 'Lime', value: '#84cc16', description: 'Fresh and vibrant' },
  { id: 'sky', name: 'Sky', value: '#0284c7', description: 'Light and airy' },
  { id: 'pink', name: 'Pink', value: '#ec4899', description: 'Soft and playful' },
  { id: 'violet', name: 'Violet', value: '#8b5cf6', description: 'Mystical and modern' },
  { id: 'slate', name: 'Slate', value: '#475569', description: 'Professional and neutral' },
  { id: 'stone', name: 'Stone', value: '#78716c', description: 'Warm and grounded' },
  { id: 'red-900', name: 'Deep Red', value: '#7f1d1d', description: 'Rich and powerful' },
  { id: 'blue-dark', name: 'Deep Blue', value: '#1e3a8a', description: 'Trustworthy and strong' },
   { id: 'blue-dark', name: 'Deep Blue', value: '#171b29ff', description: 'Dark blue' },
];

export const colorService = {
  getColorScheme: () => {
    const stored = localStorage.getItem('app-color-scheme');
    return stored || '#168c17';
  },

  setColorScheme: (color: string) => {
    localStorage.setItem('app-color-scheme', color);
    // Dispatch event to notify all listeners
    window.dispatchEvent(new CustomEvent('colorSchemeChanged', { detail: { color } }));
  },

  getColorOption: (colorValue: string) => {
    return COLOR_OPTIONS.find(opt => opt.value === colorValue);
  },
};
