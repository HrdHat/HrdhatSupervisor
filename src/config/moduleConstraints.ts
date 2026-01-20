/**
 * Module Constraints Configuration
 *
 * This file contains the business rules and constraints for form modules.
 * These should NOT be stored in database templates - they belong in the frontend.
 *
 * Benefits:
 * - Easy to update without database migrations
 * - Single source of truth for all templates
 * - Cleaner, lighter database templates
 * - Better separation of concerns
 */

export const MODULE_CONSTRAINTS = {
  // Photo Module Constraints
  photos: {
    maxPhotos: 5,
    maxFileSize: 5242880, // 5MB in bytes
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    storageTable: 'form_photos',
    storageBucket: 'form-photos',
    captionMaxLength: 200,
    compressionQuality: 0.8, // JPEG compression quality
    // UI behavior
    uploadButtonText: 'Select Photos (up to 5)',
    dragDropText: 'Drop photos here or click to select multiple photos',
    previewSize: { width: 150, height: 150 },
  },

  // Signature Module Constraints
  signatures: {
    maxFileSize: 102400, // 100KB in bytes
    fileFormat: 'png',
    storageTable: 'form_signatures',
    storageBucket: 'form-signatures',
    signaturesRequired: false, // Phase 1: signatures are optional
    immutableOnceCreated: true, // Audit compliance
    // Available signer roles
    signerRoles: [
      'worker',
      'supervisor',
      'foreman',
      'safety_officer',
      'management',
      'apprentice',
      'subcontractor',
      'inspector',
    ],
    // UI behavior
    canvasWidth: 400,
    canvasHeight: 200,
    strokeColor: '#000000',
    strokeWidth: 2,
    backgroundColor: '#ffffff',
  },

  // General field constraints
  general: {
    textFieldMaxLength: 200,
    textAreaMaxLength: 1000,
    helperTextMaxLength: 150,
    formNumberPattern: /^\d{8}-\d{2}$/, // YYYYMMDD-NN
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm',
  },
} as const;

// Type exports for TypeScript
export type PhotoConstraints = typeof MODULE_CONSTRAINTS.photos;
export type SignatureConstraints = typeof MODULE_CONSTRAINTS.signatures;
export type GeneralConstraints = typeof MODULE_CONSTRAINTS.general;

// Helper functions
export const getMaxFileSize = (moduleType: 'photos' | 'signatures'): number => {
  return MODULE_CONSTRAINTS[moduleType].maxFileSize;
};

export const isValidFileType = (file: File, moduleType: 'photos'): boolean => {
  return MODULE_CONSTRAINTS[moduleType].allowedTypes.includes(file.type as never);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
