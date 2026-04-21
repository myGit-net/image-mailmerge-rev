import React from 'react';

export interface PhotoFieldData {
  type: 'photo';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  frame: 'rectangle' | 'circle';
  demoText: string; // URL or path to demo image
}

export interface PhotoFieldProps {
  field: PhotoFieldData;
  onUpdate: (field: PhotoFieldData) => void;
}

export const PhotoFieldEditor: React.FC<PhotoFieldProps> = ({
  field,
  onUpdate
}) => {
  const [showDecimals, setShowDecimals] = React.useState(false);
  const [lockAspectRatio, setLockAspectRatio] = React.useState(false);
  const aspectRatioRef = React.useRef(field.width / field.height);

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

  return (
    <>
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
    img.crossOrigin = 'anonymous';
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
      reject(new Error(`Failed to load image: ${src}`));
    };
    img.src = src;
  });
};

// Draw photo on canvas with frame masking
export const drawPhotoOnCanvas = async (
  ctx: CanvasRenderingContext2D,
  field: PhotoFieldData,
  imageUrl: string
): Promise<void> => {
  try {
    const img = await loadImage(imageUrl);

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
