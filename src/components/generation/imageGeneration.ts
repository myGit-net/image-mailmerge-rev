import JSZip from 'jszip';
import { drawFormattedText } from '../text/textFormatting';
import { drawQRCodeOnCanvas } from '../QRCodeField';
import { drawPhotoOnCanvas, resolvePhotoSource } from '../PhotoField';
import { Field, FieldMapping, FileNameMapping, CSVRow } from '../types/fieldTypes';

// Progress callback type
export type ProgressCallback = (progress: number, text: string) => void;

// Image generation result type
export interface ImageGenerationResult {
  success: boolean;
  error?: string;
  filesGenerated?: number;
}

// Preload fonts used by text fields to ensure they render correctly on canvas
export const preloadFonts = async (fields: Field[]): Promise<void> => {
  const fontFamilies = new Set<string>();
  for (const field of fields) {
    if (field.type === 'text' && field.fontFamily) {
      fontFamilies.add(field.fontFamily);
    }
  }

  // Wait for the document fonts to be ready first
  await document.fonts.ready;

  // Explicitly load each font family used by text fields
  const loadPromises: Promise<FontFace[]>[] = [];
  for (const family of fontFamilies) {
    // Extract the primary font name from the CSS font-family value
    const primaryFont = family.split(',')[0].trim().replace(/["']/g, '');
    for (const weight of ['400', '700']) {
      try {
        loadPromises.push(document.fonts.load(`${weight} 16px "${primaryFont}"`));
      } catch (e) {
        console.warn(`Could not request load for font: ${primaryFont} weight ${weight}`, e);
      }
    }
  }

  try {
    await Promise.all(loadPromises);
    console.log('All text field fonts preloaded successfully');
  } catch (e) {
    console.warn('Some fonts could not be preloaded:', e);
  }
};

// Generate images from template and CSV data
export const generateImages = async (
  templateImage: File,
  imageUrl: string,
  csvData: CSVRow[],
  fields: Field[],
  fieldMappings: FieldMapping[],
  fileNameMapping: FileNameMapping,
  onProgress?: ProgressCallback,
  photoLibrary?: Map<string, string>
): Promise<ImageGenerationResult> => {
  if (!templateImage || !csvData || !fields.length) {
    return { success: false, error: 'Missing required data' };
  }

  try {
    // Preload fonts before generating images
    await preloadFonts(fields);

    const zip = new JSZip();
    const totalRows = csvData.length;
    console.log(`Starting generation of ${totalRows} images`);

    for (let i = 0; i < totalRows; i++) {
      const row = csvData[i];
      
      // Update progress
      const percent = ((i + 1) / totalRows) * 100;
      onProgress?.(percent, `Processing image ${i + 1} of ${totalRows} (${Math.round(percent)}%)`);
      
      // Create canvas for this row
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Load and draw template image
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          resolve();
        };
        img.src = imageUrl;
      });

      // Draw fields with CSV data
      for (const field of fields) {
        const mapping = fieldMappings.find(m => m.fieldName === field.name);
        
        if (field.type === 'photo') {
          // For photo fields: resolve through photo library for filename matching
          const csvValue = mapping?.csvColumn ? row[mapping.csvColumn] || '' : '';
          const photoSrc = resolvePhotoSource(csvValue, photoLibrary || new Map(), field.demoImageDataUrl);
          if (photoSrc) {
            await drawPhotoOnCanvas(ctx, field, photoSrc);
          }
        } else {
          const text = mapping?.csvColumn ? row[mapping.csvColumn] || '' : field.demoText || '';
          
          if (text) {
            if (field.type === 'text') {
              drawFormattedText(
                ctx,
                text,
                field.x,
                field.y,
                field.fontSize,
                field.fontFamily,
                field.color,
                field.textAlign,
                field.strokeColor || '#000000',
                field.strokeWidth || 0,
                field.isBold || false,
                field.isItalic || false,
                field.isUnderline || false,
                field.isStrikethrough || false
              );
            } else if (field.type === 'qrcode') {
              await drawQRCodeOnCanvas(ctx, field, text);
            }
          }
        }
      }

      // Convert to blob and add to zip
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((blob) => resolve(blob!), 'image/png')
      );
      
      // Generate filename
      const fileName = generateFileName(i, row, fileNameMapping);
      
      // Add to zip with proper error handling
      try {
        zip.file(fileName, blob);
        console.log(`✓ Added file ${i + 1}/${totalRows}: ${fileName}, blob size: ${blob.size}`);
      } catch (error) {
        console.error(`Failed to add file ${fileName}:`, error);
      }

      // Allow UI to update and ensure blob is processed
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Generate ZIP file
    onProgress?.(100, 'Generating ZIP file...');
    console.log(`Generating ZIP with ${Object.keys(zip.files).length} files`);
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    console.log(`ZIP generated, size: ${zipBlob.size} bytes`);
    
    // Download zip
    downloadZipFile(zipBlob);

    return { success: true, filesGenerated: totalRows };

  } catch (error) {
    console.error('Error generating images:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Generate filename based on CSV data and mapping configuration
export const generateFileName = (
  index: number,
  row: CSVRow,
  fileNameMapping: FileNameMapping
): string => {
  let fileName = `image_${String(index + 1).padStart(4, '0')}.png`;
  
  if (fileNameMapping.csvColumn && row[fileNameMapping.csvColumn]) {
    const customName = String(row[fileNameMapping.csvColumn] ?? '').trim();
    if (customName) {
      // Sanitize filename and ensure .png extension
      let sanitizedName = customName.replace(/[<>:"/\\|?*]/g, '_');
      if (!sanitizedName.toLowerCase().endsWith('.png')) {
        sanitizedName += '.png';
      }
      // Include numbering prefix only if user wants it
      if (fileNameMapping.includeNumbering) {
        fileName = `${String(index + 1).padStart(4, '0')}_${sanitizedName}`;
      } else {
        fileName = sanitizedName;
      }
    }
  }
  
  return fileName;
};

// Download the generated ZIP file
export const downloadZipFile = (zipBlob: Blob): void => {
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mailmerge_images_${new Date().toISOString().slice(0,10)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
};
