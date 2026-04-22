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
  const [lockAspectRatio, setLockAspectRatio] = React.useState(false);
  const aspectRatioRef = React.useRef(field.width / field.height);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const bulkFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleWidthChange = (width: number) => {
    if (lockAspectRatio) {
      const height = Math.round(width / aspectRatioRef.current);
      onUpdate({ ...field, width, height: Math.max(10, height) });
    } else {
      onUpdate({ ...field, width });
    }
  };

  const handleHeightChange = (height: number) => {
    if (lockAspectRatio) {
      const width = Math.round(height * aspectRatioRef.current);
      onUpdate({ ...field, width: Math.max(10, width), height });
    } else {
      onUpdate({ ...field, height });
    }
  };

  const handleFrameChange = (frame: 'rectangle' | 'circle') => {
    onUpdate({ ...field, frame });
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
                className={`max-w-full max-h-24 object-contain border border-gray-300 bg-white ${
                  field.frame === 'circle' ? 'rounded-full' : 'rounded'
                }`}
                style={{ maxWidth: '120px' }}
              />
            </div>
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer">
                <div className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors text-center">
                  Change Image
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
            {field.demoText && (
              <p className="text-xs text-gray-500 truncate" title={field.demoText}>
                {field.demoText}
              </p>
            )}
          </div>
        ) : (
          <label className="cursor-pointer block">
            <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 text-center hover:border-purple-500 hover:bg-purple-50 transition-all">
              <svg className="w-8 h-8 mx-auto mb-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-purple-600 text-sm font-medium">Upload Image</span>
              <p className="text-gray-400 text-xs mt-1">PNG, JPG, GIF</p>
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

      {/* Photo Library (bulk upload for spreadsheet mapping) */}
      <div className="border border-purple-200 rounded-lg p-3 mb-3 bg-purple-50">
        <label className="block text-gray-700 text-xs font-medium mb-1">Photo Library</label>
        <p className="text-xs text-gray-500 mb-2">
          Upload all photos referenced in your spreadsheet. The spreadsheet column should contain the <strong>filename</strong> (e.g., <code>Rudy.png</code>).
        </p>
        
        <div className="flex gap-2 mb-2">
          <label className="flex-1 cursor-pointer">
            <div className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors text-center flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
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
          <div className="bg-white border border-purple-200 rounded-lg p-2">
            <p className="text-xs text-purple-700 font-medium mb-1">
              {photoLibrary.size} photo{photoLibrary.size !== 1 ? 's' : ''} loaded
            </p>
            <div className="max-h-24 overflow-y-auto">
              {Array.from(photoLibrary.keys()).map((filename) => (
                <div key={filename} className="flex items-center gap-1.5 py-0.5">
                  <img
                    src={photoLibrary.get(filename)!}
                    alt={filename}
                    className="w-4 h-4 object-cover rounded flex-shrink-0"
                  />
                  <span className="text-xs text-gray-600 truncate" title={filename}>
                    {filename}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Photo Dimensions Control */}
      <div className="border border-gray-200 rounded-lg p-3 mb-3 bg-gray-50">
        <label className="block text-gray-700 text-xs font-medium mb-2">Dimensions</label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="block text-gray-700 text-xs font-medium mb-1">
              Width: {field.width}px
            </label>
            <input
              type="range"
              min="10"
              max="1000"
              value={field.width}
              onChange={(e) => handleWidthChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer 
                [&::-webkit-slider-track]:bg-gray-300 [&::-webkit-slider-track]:h-2 [&::-webkit-slider-track]:rounded-md
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-purple-700 [&::-webkit-slider-thumb]:shadow-md
                [&::-webkit-slider-thumb:hover]:bg-purple-600
                [&::-moz-range-track]:bg-gray-300 [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-md [&::-moz-range-track]:border-0
                [&::-moz-range-thumb]:bg-purple-500 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-purple-700 [&::-moz-range-thumb]:shadow-md
                [&::-moz-range-thumb:hover]:bg-purple-600"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-xs font-medium mb-1">
              Width Value
            </label>
            <input
              type="number"
              value={field.width}
              onChange={(e) => handleWidthChange(parseInt(e.target.value) || 100)}
              min="10"
              max="2000"
              placeholder="Width"
              className="bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="block text-gray-700 text-xs font-medium mb-1">
              Height: {field.height}px
            </label>
            <input
              type="range"
              min="10"
              max="1000"
              value={field.height}
              onChange={(e) => handleHeightChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer 
                [&::-webkit-slider-track]:bg-gray-300 [&::-webkit-slider-track]:h-2 [&::-webkit-slider-track]:rounded-md
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-purple-700 [&::-webkit-slider-thumb]:shadow-md
                [&::-webkit-slider-thumb:hover]:bg-purple-600
                [&::-moz-range-track]:bg-gray-300 [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-md [&::-moz-range-track]:border-0
                [&::-moz-range-thumb]:bg-purple-500 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-purple-700 [&::-moz-range-thumb]:shadow-md
                [&::-moz-range-thumb:hover]:bg-purple-600"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-xs font-medium mb-1">
              Height Value
            </label>
            <input
              type="number"
              value={field.height}
              onChange={(e) => handleHeightChange(parseInt(e.target.value) || 100)}
              min="10"
              max="2000"
              placeholder="Height"
              className="bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>
        <label className="flex items-center text-xs text-gray-600 cursor-pointer mt-1">
          <input
            type="checkbox"
            checked={lockAspectRatio}
            onChange={(e) => {
              setLockAspectRatio(e.target.checked);
              if (e.target.checked) {
                aspectRatioRef.current = field.width / field.height;
              }
            }}
            className="w-3 h-3 text-purple-600 bg-white border-gray-300 rounded focus:ring-purple-500 focus:ring-2 mr-2"
          />
          Lock aspect ratio
        </label>
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
            title="Rectangle Frame"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
            </svg>
            Rectangle
          </button>
          <button
            onClick={() => handleFrameChange('circle')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
              ${field.frame === 'circle' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-purple-600 hover:bg-purple-100 border border-gray-300'}
            `}
            title="Circle Frame"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" strokeWidth="2" />
            </svg>
            Circle
          </button>
        </div>
        {field.frame === 'circle' && (
          <p className="text-xs text-gray-500 mt-2">
            Circle frame will use the smaller of width/height as diameter, cropping the image to fit.
          </p>
        )}
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
              onChange={(e) => {
                const x = Number(e.target.value);
                if (!Number.isNaN(x)) {
                  onUpdate({ ...field, x });
                }
              }}
              placeholder="X"
              step="any"
              className="bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Y</label>
            <input
              type="number"
              value={showDecimals ? field.y : Math.round(field.y)}
              onChange={(e) => {
                const y = Number(e.target.value);
                if (!Number.isNaN(y)) {
                  onUpdate({ ...field, y });
                }
              }}
              placeholder="Y"
              step="any"
              className="bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
    // No crossOrigin needed for data URLs and local files
    img.onload = () => {
      // Limit cache size
      if (photoImageCache.size >= 100) {
        const oldestKey = photoImageCache.keys().next().value;
        if (oldestKey) {
          photoImageCache.delete(oldestKey);
        }
      }
      photoImageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${src.substring(0, 100)}...`));
    };
    img.src = src;
  });
};

// Resolve a spreadsheet value to a data URL using the photo library
// Supports: full paths (D:/folder/photo.png), filenames (photo.png), and data URLs
export const resolvePhotoSource = (
  csvValue: string,
  photoLibrary: Map<string, string>,
  demoImageDataUrl: string
): string => {
  if (!csvValue || !csvValue.trim()) {
    return demoImageDataUrl || '';
  }

  const trimmed = csvValue.trim();

  // If it's already a data URL or a valid http(s) URL, use it directly
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Extract just the filename from the path
  const filename = extractFilename(trimmed);

  // Try exact filename match first
  if (photoLibrary.has(filename)) {
    return photoLibrary.get(filename)!;
  }

  // Try case-insensitive match
  const filenameLower = filename.toLowerCase();
  for (const [key, value] of photoLibrary) {
    if (key.toLowerCase() === filenameLower) {
      return value;
    }
  }

  // No match found — return empty to show placeholder instead of "Photo Error"
  console.warn(`Photo not found in library: "${filename}" (from "${trimmed}")`);
  return '';
};

// Draw photo on canvas with frame masking
export const drawPhotoOnCanvas = async (
  ctx: CanvasRenderingContext2D,
  field: PhotoFieldData,
  imageDataUrl: string
): Promise<void> => {
  if (!imageDataUrl || !imageDataUrl.trim()) return;

  try {
    const img = await loadImage(imageDataUrl);

    ctx.save();

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
      // Rectangle clip (for clean edges)
      ctx.beginPath();
      ctx.rect(field.x, field.y, field.width, field.height);
      ctx.closePath();
      ctx.clip();
    }

    // Draw the image scaled to fit the field dimensions
    ctx.drawImage(img, field.x, field.y, field.width, field.height);

    ctx.restore();
  } catch (error) {
    console.error('Error drawing photo:', error);
    // Draw error placeholder
    ctx.save();
    
    if (field.frame === 'circle') {
      const diameter = Math.min(field.width, field.height);
      const centerX = field.x + field.width / 2;
      const centerY = field.y + field.height / 2;
      const radius = diameter / 2;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }

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

// Clear the photo image cache
export const clearPhotoCache = () => {
  photoImageCache.clear();
};
