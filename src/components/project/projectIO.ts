/**
 * Project Export/Import Utilities
 * 
 * Handles serialization and deserialization of the entire project state,
 * including template image, fields, mappings, spreadsheet data, and settings.
 */

import { Field, FieldMapping, FileNameMapping, CSVRow } from '../types/fieldTypes';

// Project file format version for forward compatibility
const PROJECT_FORMAT_VERSION = 1;

/**
 * The serialized project structure saved to/loaded from JSON files.
 */
export interface ProjectData {
  version: number;
  exportedAt: string;
  appName: string;

  // Template image as base64 data URL
  templateImage: {
    dataUrl: string;
    fileName: string;
    mimeType: string;
  } | null;

  // Field definitions (text fields + QR code fields)
  fields: Field[];

  // Field-to-CSV-column mappings
  fieldMappings: FieldMapping[];

  // File name mapping settings
  fileNameMapping: FileNameMapping;

  // Spreadsheet data
  spreadsheet: {
    csvData: CSVRow[] | null;
    csvHeaders: string[];
  };
}

/**
 * Convert a File object to a base64 data URL string.
 */
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Convert a base64 data URL string back to a File object.
 */
const dataUrlToFile = (dataUrl: string, fileName: string, mimeType: string): File => {
  const arr = dataUrl.split(',');
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new File([u8arr], fileName, { type: mimeType });
};

/**
 * Export the current project state to a downloadable JSON file.
 */
export const exportProject = async (
  templateImage: File | null,
  fields: Field[],
  fieldMappings: FieldMapping[],
  fileNameMapping: FileNameMapping,
  csvData: CSVRow[] | null,
  csvHeaders: string[],
): Promise<void> => {
  try {
    let templateImageData: ProjectData['templateImage'] = null;

    if (templateImage) {
      const dataUrl = await fileToDataUrl(templateImage);
      templateImageData = {
        dataUrl,
        fileName: templateImage.name,
        mimeType: templateImage.type || 'image/png',
      };
    }

    const projectData: ProjectData = {
      version: PROJECT_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      appName: 'image-mailmerge-rev',
      templateImage: templateImageData,
      fields,
      fieldMappings,
      fileNameMapping,
      spreadsheet: {
        csvData,
        csvHeaders,
      },
    };

    const jsonString = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.download = `mailmerge-project-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting project:', error);
    throw new Error('Failed to export project: ' + (error as Error).message);
  }
};

/**
 * Validate the structure of an imported project file.
 */
const validateProjectData = (data: any): data is ProjectData => {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.version !== 'number') return false;
  if (data.appName !== 'image-mailmerge-rev') return false;
  if (!Array.isArray(data.fields)) return false;
  if (!Array.isArray(data.fieldMappings)) return false;
  if (!data.fileNameMapping || typeof data.fileNameMapping !== 'object') return false;
  if (!data.spreadsheet || typeof data.spreadsheet !== 'object') return false;
  return true;
};

/**
 * Result of importing a project file.
 */
export interface ImportResult {
  templateImage: File | null;
  imageUrl: string;
  fields: Field[];
  fieldMappings: FieldMapping[];
  fileNameMapping: FileNameMapping;
  csvData: CSVRow[] | null;
  csvHeaders: string[];
}

/**
 * Import a project from a JSON file and return the restored state.
 */
export const importProject = async (file: File): Promise<ImportResult> => {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!validateProjectData(data)) {
      throw new Error(
        'Invalid project file format. Please select a valid Mail Merge project file (.json) that was exported from this application.'
      );
    }

    let templateImage: File | null = null;
    let imageUrl = '';

    if (data.templateImage) {
      templateImage = dataUrlToFile(
        data.templateImage.dataUrl,
        data.templateImage.fileName,
        data.templateImage.mimeType
      );
      imageUrl = URL.createObjectURL(templateImage);
    }

    // Ensure backward compatibility: add default properties to fields that lack them
    const migratedFields = data.fields.map((field: any) => {
      if (field.type === 'text') {
        return {
          ...field,
          strokeColor: field.strokeColor ?? '#000000',
          strokeWidth: field.strokeWidth ?? 0,
          isBold: field.isBold ?? false,
          isItalic: field.isItalic ?? false,
          isUnderline: field.isUnderline ?? false,
          isStrikethrough: field.isStrikethrough ?? false,
        };
      }
      if (field.type === 'photo') {
        return {
          ...field,
          imageOffsetX: field.imageOffsetX ?? 0,
          imageOffsetY: field.imageOffsetY ?? 0,
        };
      }
      return field;
    });

    return {
      templateImage,
      imageUrl,
      fields: migratedFields,
      fieldMappings: data.fieldMappings,
      fileNameMapping: data.fileNameMapping,
      csvData: data.spreadsheet.csvData,
      csvHeaders: data.spreadsheet.csvHeaders,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('The selected file is not a valid JSON file.');
    }
    throw error;
  }
};
