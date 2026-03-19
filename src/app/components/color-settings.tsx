import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { toast } from 'sonner';
import { colorService, COLOR_OPTIONS } from '../services/colorService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Check } from 'lucide-react';

export function ColorSettings() {
  const intl = useIntl();
  const [selectedColor, setSelectedColor] = useState<string>('#168c17');

  useEffect(() => {
    setSelectedColor(colorService.getColorScheme());
  }, []);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
  };

  const handleSave = () => {
    colorService.setColorScheme(selectedColor);
    colorService.setColorScheme(selectedColor);
    toast.success(intl.formatMessage({ id: 'color_settings.update_success' }));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 min-h-[calc(100vh-120px)] flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{intl.formatMessage({ id: 'sidebar.color_settings' })}</h1>
        <p className="text-slate-600 text-sm mt-1">{intl.formatMessage({ id: 'color_settings.subtitle' })}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{intl.formatMessage({ id: 'color_settings.primary_color' })}</CardTitle>
          <CardDescription>
            {intl.formatMessage({ id: 'color_settings.select_desc' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {COLOR_OPTIONS.map((option) => (
              <div
                key={option.id}
                onClick={() => handleColorSelect(option.value)}
                className="p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md"
                style={{
                  borderColor: selectedColor === option.value ? option.value : '#e2e8f0',
                  borderWidth: selectedColor === option.value ? '2px' : '1px',
                  backgroundColor: selectedColor === option.value ? `${option.value}08` : '#f8fafc',
                }}
              >
                <div className="flex flex-col items-center text-center mb-3">
                  <div
                    className="w-12 h-12 rounded-lg shadow-sm mb-2"
                    style={{ backgroundColor: option.value }}
                  />
                  <h3 className="font-semibold text-sm text-slate-900">{option.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{option.description}</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-mono text-slate-600">{option.value}</span>
                  {selectedColor === option.value && (
                    <div className="p-1 rounded-full" style={{ backgroundColor: option.value }}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200">
            <Button
              onClick={handleSave}
              className="w-full text-white"
              style={{ backgroundColor: selectedColor }}
            >
              {intl.formatMessage({ id: 'color_settings.save_btn' })}
            </Button>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">{intl.formatMessage({ id: 'color_settings.preview' })}:</span> {intl.formatMessage({ id: 'color_settings.preview_desc' })}
            </p>
          </div>
        </CardContent>
      </Card>
      {/* FOOTER */}
      <div className="flex justify-center items-center text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1 mt-auto pt-10 opacity-40">
        <span>{intl.formatMessage({ id: 'opco.copyright' })}</span>
      </div>
    </div>
  );
}
