import React from 'react';

export interface PhotoFieldData {
  type: 'photo';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  frame: 'rectangle' | 'circle';
  demoText: string; // kept for compatibility (unused for photo display)
  demoImageDataUrl: string; // base64 data URL of the uploaded demo image
}

export interface PhotoFieldProps {
  field: PhotoFieldData;
  onUpdate: (field: PhotoFieldData) => void;
  photoLibrary: Map<string, string>; // filename -> data URL
  onPhotoLibraryChange: (library: Map<string, string>) => void;
}

// Helper to convert File to data URL
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// Extract just the filename from a full path (handles Windows and Unix paths)
const extractFilename = (path: string): string => {
  // Handle Windows paths (backslash and forward slash)
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || path;
};

export const PhotoFieldEditor: React.FC<PhotoFieldProps> = ({
  field,
  onUpdate,
  photoLibrary,
  onPhotoLibraryChange
}) => {
  const [showDecimals, setShowDecimals] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const bulkFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSizeChange = (size: number) => {
    // For circle frame, we keep it square (width = height)
    // For rectangle, we'll just update both to the same size as a default proportional adjustment
    onUpdate({ ...field, width: size, height: size });
  };

  const handleWidthChange = (width: number) => {
    onUpdate({ ...field, width });
  };

  const handleHeightChange = (height: number) => {
    onUpdate({ ...field, height });
  };

  const handleFrameChange = (frame: 'rectangle' | 'circle') => {
    if (frame === 'circle') {
      // When switching to circle, make it square using the larger dimension
      const size = Math.max(field.width, field.height);
      onUpdate({ ...field, frame, width: size, height: size });
    } else {
      onUpdate({ ...field, frame });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      onUpdate({ ...field, demoImageDataUrl: dataUrl, demoText: file.name });
    } catch (error) {
      console.error('Error reading photo file:', error);
    }

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    onUpdate({ ...field, demoImageDataUrl: '', demoText: '' });
  };

  // Bulk upload handler for photo library
  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newLibrary = new Map(photoLibrary);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dataUrl = await fileToDataUrl(file);
        newLibrary.set(file.name, dataUrl);
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error);
      }
    }

    onPhotoLibraryChange(newLibrary);

    // Reset input so the same files can be re-selected
    if (bulkFileInputRef.current) {
      bulkFileInputRef.current.value = '';
    }
  };

  const handleClearLibrary = () => {
    onPhotoLibraryChange(new Map());
  };

  return (
    <>
      {/* Demo Image Upload (single image for preview when no spreadsheet mapping) */}
      <div className="border border-gray-200 rounded-lg p-3 mb-3 bg-gray-50">
        <label className="block text-gray-700 text-xs font-medium mb-2">Demo Image</label>
        
        {field.demoImageDataUrl ? (
          <div className="space-y-2">
            {/* Preview thumbnail */}
            <div className="relative inline-block">
              <img
                src={field.demoImageDataUrl}
                alt="Demo preview"
                className={`max-w-full max-h-24 object-cover border border-gray-300 bg-white ${
                  field.frame === 'circle' ? 'rounded-full' : 'rounded'
                }`}
                style={{ width: '80px', height: '80px' }}
              />
            </div>
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer">
                <div className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors text-center">
                  Change
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleRemoveImage}
                className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium py-1.5 px-3 rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <label className="cursor-pointer block">
            <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 text-center hover:border-purple-500 hover:bg-purple-50 transition-all">
              <svg className="w-8 h-8 mx-auto mb-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-purple-600 text-sm font-medium">Upload Image</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Photo Library */}
      <div className="border border-purple-200 rounded-lg p-3 mb-3 bg-purple-50">
        <label className="block text-gray-700 text-xs font-medium mb-1">Photo Library</label>
        <div className="flex gap-2 mb-2">
          <label className="flex-1 cursor-pointer">
            <div className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors text-center">
              Upload Photos
            </div>
            <input
              ref={bulkFileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleBulkUpload}
              className="hidden"
            />
          </label>
          {photoLibrary.size > 0 && (
            <button
              onClick={handleClearLibrary}
              className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium py-2 px-3 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        {photoLibrary.size > 0 && (
          <div className="text-xs text-purple-700 font-medium">
            {photoLibrary.size} photo{photoLibrary.size !== 1 ? 's' : ''} loaded
          </div>
        )}
      </div>

      {/* Photo Dimensions Control */}
      <div className="border border-gray-200 rounded-lg p-3 mb-3 bg-gray-50">
        <label className="block text-gray-700 text-xs font-medium mb-2">
          {field.frame === 'circle' ? 'Diameter' : 'Dimensions'}
        </label>
        
        {field.frame === 'circle' ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="10"
                max="1000"
                value={field.width}
                onChange={(e) => handleSizeChange(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <input
                type="number"
                value={field.width}
                onChange={(e) => handleSizeChange(parseInt(e.target.value) || 100)}
                className="bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded text-sm w-20 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-gray-500 text-[10px] uppercase mb-1">Width</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="10"
                  max="1000"
                  value={field.width}
                  onChange={(e) => handleWidthChange(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <input
                  type="number"
                  value={field.width}
                  onChange={(e) => handleWidthChange(parseInt(e.target.value) || 100)}
                  className="bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded text-sm w-20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-500 text-[10px] uppercase mb-1">Height</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="10"
                  max="1000"
                  value={field.height}
                  onChange={(e) => handleHeightChange(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <input
                  type="number"
                  value={field.height}
                  onChange={(e) => handleHeightChange(parseInt(e.target.value) || 100)}
                  className="bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded text-sm w-20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Frame Shape Control */}
      <div className="border border-gray-200 rounded-lg p-3 mb-3 bg-gray-50">
        <label className="block text-gray-700 text-xs font-medium mb-2">Frame Shape</label>
        <div className="flex gap-2">
          <button
            onClick={() => handleFrameChange('rectangle')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
              ${field.frame === 'rectangle' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-purple-600 hover:bg-purple-100 border border-gray-300'}
            `}
          >
            Rectangle
          </button>
          <button
            onClick={() => handleFrameChange('circle')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
              ${field.frame === 'circle' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-purple-600 hover:bg-purple-100 border border-gray-300'}
            `}
          >
            Circle
          </button>
        </div>
      </div>

      {/* Positioning */}
      <details className="border border-gray-200 rounded-lg p-3 mb-3 bg-gray-50">
        <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800 font-medium">Positioning</summary>
        <div className="mt-2 mb-2">
          <label className="flex items-center text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showDecimals}
              onChange={(e) => setShowDecimals(e.target.checked)}
              className="w-3 h-3 text-purple-600 bg-white border-gray-300 rounded focus:ring-purple-500 focus:ring-2 mr-2"
            />
            Show decimals
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">X</label>
            <input
              type="number"
              value={showDecimals ? field.x : Math.round(field.x)}
              onChange={(e) => onUpdate({ ...field, x: Number(e.target.value) })}
              className="bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Y</label>
            <input
              type="number"
              value={showDecimals ? field.y : Math.round(field.y)}
              onChange={(e) => onUpdate({ ...field, y: Number(e.target.value) })}
              className="bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </details>
    </>
  );
};

// Cache for loaded images
const photoImageCache = new Map<string, HTMLImageElement>();

const loadImage = (src: string): Promise<HTMLImageElement> => {
  const cached = photoImageCache.get(src);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (photoImageCache.size >= 100) {
        const oldestKey = photoImageCache.keys().next().value;
        if (oldestKey) photoImageCache.delete(oldestKey);
      }
      photoImageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${src.substring(0, 50)}...`));
    img.src = src;
  });
};

// Resolve a spreadsheet value to a data URL using the photo library
export const resolvePhotoSource = (
  csvValue: string,
  photoLibrary: Map<string, string>,
  demoImageDataUrl: string
): string => {
  if (!csvValue || !csvValue.trim()) return demoImageDataUrl || '';
  const trimmed = csvValue.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const filename = extractFilename(trimmed);
  if (photoLibrary.has(filename)) return photoLibrary.get(filename)!;
  const filenameLower = filename.toLowerCase();
  for (const [key, value] of photoLibrary) {
    if (key.toLowerCase() === filenameLower) return value;
  }
  return '';
};

// Draw photo on canvas with proportional fitting (object-fit: cover style)
export const drawPhotoOnCanvas = async (
  ctx: CanvasRenderingContext2D,
  field: PhotoFieldData,
  imageDataUrl: string
): Promise<void> => {
  if (!imageDataUrl || !imageDataUrl.trim()) return;

  try {
    const img = await loadImage(imageDataUrl);

    ctx.save();

    // Set up clipping path
    if (field.frame === 'circle') {
      const diameter = Math.min(field.width, field.height);
      const centerX = field.x + field.width / 2;
      const centerY = field.y + field.height / 2;
      const radius = diameter / 2;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    } else {
      ctx.beginPath();
      ctx.rect(field.x, field.y, field.width, field.height);
      ctx.closePath();
      ctx.clip();
    }

    // Proportional fitting (Cover style)
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const fieldAspect = field.width / field.height;
    
    let drawWidth, drawHeight, drawX, drawY;

    if (imgAspect > fieldAspect) {
      // Image is wider than field - scale by height
      drawHeight = field.height;
      drawWidth = field.height * imgAspect;
      drawX = field.x - (drawWidth - field.width) / 2;
      drawY = field.y;
    } else {
      // Image is taller than field - scale by width
      drawWidth = field.width;
      drawHeight = field.width / imgAspect;
      drawX = field.x;
      drawY = field.y - (drawHeight - field.height) / 2;
    }

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
  } catch (error) {
    console.error('Error drawing photo:', error);
    ctx.save();
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(field.x, field.y, field.width, field.height);
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Photo Error', field.x + field.width / 2, field.y + field.height / 2);
    ctx.restore();
  }
};

export const clearPhotoCache = () => {
  photoImageCache.clear();
};
