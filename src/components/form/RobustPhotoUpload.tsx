import React, { useRef, useState } from 'react';

import { MODULE_CONSTRAINTS } from '@/config/moduleConstraints';
import { supabase } from '@/config/supabaseClient';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';

// TypeScript type for photo slots (only for upload progress/errors)
type PhotoSlot = {
  id: string; // Unique identifier for this slot
  file?: File; // The file to upload
  status: 'empty' | 'uploading' | 'uploaded' | 'error';
  progress: number; // Upload progress 0-100
  error?: string; // Error message if failed
};

interface PhotoData {
  photos?: Array<{
    id: string;
    storage_url: string;
    caption: string;
    uploaded_at?: string;
  }>;
}

interface RobustPhotoUploadProps {
  formId: string;
  moduleData: PhotoData;
  onChange: (data: PhotoData | ((prev: PhotoData) => PhotoData)) => void;
  isLocked?: boolean;
}

export const RobustPhotoUpload: React.FC<RobustPhotoUploadProps> = ({
  formId,
  moduleData,
  onChange,
  isLocked = false,
}) => {
  // Always call all hooks in the same order
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadSlots, setUploadSlots] = useState<PhotoSlot[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const uploadQueueRef = useRef<PhotoSlot[]>([]);
  const isUploadingRef = useRef(false);
  const [localCaptions, setLocalCaptions] = useState<Record<string, string>>(
    {}
  );

  // Initialize local captions when photos change
  React.useEffect(() => {
    if (!isLocked) {
      const captions: Record<string, string> = {};
      (moduleData?.photos || []).forEach((photo) => {
        captions[photo.id] = photo.caption || '';
      });
      setLocalCaptions(captions);
    }
  }, [moduleData?.photos, isLocked]);

  // Parse existing photos from moduleData (from database)
  const existingPhotos = Array.isArray(moduleData?.photos) ? moduleData.photos : [];

  if (isLocked) {
    // Locked/read-only rendering
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Photos ({existingPhotos.length})
        </h3>
        {existingPhotos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {existingPhotos.map((photo, index) => (
              <div
                key={photo.id || index}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4"
              >
                <img
                  src={photo.storage_url}
                  alt={photo.caption || `Photo ${index + 1}`}
                  className="w-full h-32 object-cover rounded mb-2"
                />
                {photo.caption && (
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">Caption:</span>{' '}
                    {photo.caption}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  Added:{' '}
                  {photo.uploaded_at
                    ? new Date(photo.uploaded_at).toLocaleDateString()
                    : 'Unknown'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 italic">No photos uploaded</div>
        )}
      </div>
    );
  }

  // Normal editable rendering continues - remove duplicate hook declarations

  // File validation
  const validateFile = (file: File): string | null => {
    const constraints = MODULE_CONSTRAINTS.photos;
    if (!constraints.allowedTypes.includes(file.type as never)) {
      return 'Invalid file type. Please select JPEG, PNG, or WebP images.';
    }
    if (file.size > constraints.maxFileSize) {
      return `File too large. Maximum size is ${constraints.maxFileSize / 1024 / 1024}MB.`;
    }
    return null;
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    const constraints = MODULE_CONSTRAINTS.photos;
    const currentPhotoCount = moduleData?.photos?.length || 0;
    const availableSlots = constraints.maxPhotos - currentPhotoCount;
    if (files.length > availableSlots) {
      alert(
        `You can only upload ${availableSlots} more photo(s). Maximum is ${constraints.maxPhotos}.`
      );
      return;
    }
    // Create upload slots for each selected file
    const newSlots: PhotoSlot[] = files.map(file => {
      const error = validateFile(file);
      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        status: error ? 'error' : 'empty',
        progress: 0,
        error: error || undefined,
      };
    });
    setUploadSlots(prev => [...prev, ...newSlots]);
    // Add valid slots to the upload queue
    const validSlots = newSlots.filter(slot => !slot.error);
    if (validSlots.length > 0) {
      uploadQueueRef.current = [...uploadQueueRef.current, ...validSlots];
      if (!isUploadingRef.current) {
        startSequentialUpload();
      }
    }
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Sequential upload function using useRef queue
  const startSequentialUpload = async () => {
    setIsUploading(true);
    isUploadingRef.current = true;

    // Track all successfully uploaded photos locally to avoid race conditions
    const uploadedPhotos: Array<{
      id: string;
      storage_url: string;
      caption: string;
      uploaded_at: string;
    }> = [];

    while (uploadQueueRef.current.length > 0) {
      const slot = uploadQueueRef.current[0];
      try {
        setUploadSlots(prev =>
          prev.map(s =>
            s.id === slot.id ? { ...s, status: 'uploading' as const } : s
          )
        );
        if (!slot.file || !user) {
          throw new Error('Missing file or user');
        }
        // Generate storage path
        const timestamp = Date.now();
        const uuid = crypto.randomUUID();
        const fileExt = slot.file.name.split('.').pop() || 'jpg';
        const storagePath = `form-photos/${formId}/${timestamp}_${uuid}.${fileExt}`;
        logger.log('Uploading photo:', {
          storagePath,
          fileSize: slot.file.size,
        });
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from(MODULE_CONSTRAINTS.photos.storageBucket)
          .upload(storagePath, slot.file, {
            cacheControl: '3600',
            upsert: false,
          });
        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }
        logger.log('Photo uploaded to storage:', storagePath);
        // Get public URL
        const { data: urlData } = supabase.storage
          .from(MODULE_CONSTRAINTS.photos.storageBucket)
          .getPublicUrl(storagePath);
        const storageUrl = urlData.publicUrl;
        // Create database record
        const { data: dbData, error: dbError } = await supabase
          .from(MODULE_CONSTRAINTS.photos.storageTable)
          .insert({
            form_instance_id: formId,
            storage_path: storagePath,
            file_size: slot.file.size,
            caption: '',
          })
          .select()
          .single();
        if (dbError) {
          // If DB insert fails, try to delete the uploaded file
          await supabase.storage
            .from(MODULE_CONSTRAINTS.photos.storageBucket)
            .remove([storagePath]);
          throw new Error(`Database error: ${dbError.message}`);
        }
        logger.log('Photo record created in database:', dbData);

        // Add to local tracking array instead of calling onChange immediately
        uploadedPhotos.push({
          id: dbData.id,
          storage_url: storageUrl,
          caption: '',
          uploaded_at: dbData.uploaded_at,
        });

        // Mark slot as uploaded
        setUploadSlots(prev =>
          prev.map(s =>
            s.id === slot.id ? { ...s, status: 'uploaded' as const } : s
          )
        );
      } catch (error) {
        logger.error('Photo upload failed:', error);
        setUploadSlots(prev =>
          prev.map(s =>
            s.id === slot.id
              ? {
                  ...s,
                  status: 'error' as const,
                  error:
                    error instanceof Error ? error.message : 'Upload failed',
                }
              : s
          )
        );
      }
      // Remove the processed slot from the queue
      uploadQueueRef.current.shift();
    }

    // Update JSON once with all uploaded photos to avoid race conditions
    if (uploadedPhotos.length > 0) {
      onChange((prevModuleData: PhotoData) => ({
        ...prevModuleData,
        photos: [...(prevModuleData?.photos || []), ...uploadedPhotos],
      }));
    }

    setIsUploading(false);
    isUploadingRef.current = false;
    // Remove all finished slots
    setUploadSlots([]);

    // Reconcile JSON with DB after all uploads (as a safety net)
    try {
      const { data: dbPhotos, error: fetchError } = await supabase
        .from(MODULE_CONSTRAINTS.photos.storageTable)
        .select('id, storage_path, caption, uploaded_at')
        .eq('form_instance_id', formId)
        .order('uploaded_at', { ascending: true });
      if (!fetchError && Array.isArray(dbPhotos)) {
        // Use functional update to ensure we're working with the latest state
        onChange((prevModuleData: PhotoData) => {
          const prevIds = new Set(
            (prevModuleData?.photos || []).map((p) => p.id)
          );
          const missing = dbPhotos.filter(
            (dbPhoto) => !prevIds.has(dbPhoto.id)
          );
          if (missing.length === 0) return prevModuleData;
          return {
            ...prevModuleData,
            photos: [
              ...(prevModuleData?.photos || []),
              ...missing.map((dbPhoto) => {
                const { data: urlData } = supabase.storage
                  .from(MODULE_CONSTRAINTS.photos.storageBucket)
                  .getPublicUrl(dbPhoto.storage_path);
                return {
                  id: dbPhoto.id,
                  storage_url: urlData.publicUrl,
                  caption: dbPhoto.caption || '',
                  uploaded_at: dbPhoto.uploaded_at,
                };
              }),
            ],
          };
        });
      }
    } catch (reconcileError) {
      logger.error('Error reconciling photo JSON with DB:', reconcileError);
    }
  };

  // Delete photo
  const deletePhoto = async (photoId: string, storageUrl: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;
    let storagePath = '';
    try {
      // Extract storage path from storage_url
      // Example: https://[project].supabase.co/storage/v1/object/public/form-photos/....
      const urlParts = storageUrl.split('/object/public/');
      storagePath = urlParts.length > 1 ? urlParts[1] : '';
      if (storagePath) {
        // Delete from Supabase Storage
        const { error: storageError } = await supabase.storage
          .from(MODULE_CONSTRAINTS.photos.storageBucket)
          .remove([storagePath]);
        if (storageError) {
          logger.error('Error deleting file from storage:', storageError);
          alert('Failed to delete photo file from storage.');
        }
      }
      // Delete from form_photos table
      const { error: dbError } = await supabase
        .from(MODULE_CONSTRAINTS.photos.storageTable)
        .delete()
        .eq('id', photoId);
      if (dbError) {
        logger.error('Error deleting photo record from DB:', dbError);
        alert('Failed to delete photo record from database.');
      }
      // Remove from JSON
      const updatedPhotos = (moduleData?.photos || []).filter(
        (photo) => photo.id !== photoId
      );
      onChange({ ...moduleData, photos: updatedPhotos });
      logger.log('Photo deleted successfully');
    } catch (error) {
      logger.error('Error deleting photo:', error);
      alert('Failed to delete photo. Please try again.');
    }
  };

  // Caption update with local state to prevent re-rendering issues
  const handleCaptionChange = (photoId: string, caption: string) => {
    // Update local state immediately for responsive typing
    setLocalCaptions(prev => ({
      ...prev,
      [photoId]: caption,
    }));
  };

  // Sync caption to parent state when input loses focus
  const handleCaptionBlur = (photoId: string) => {
    const caption = localCaptions[photoId] || '';
    onChange((prevModuleData: PhotoData) => ({
      ...prevModuleData,
      photos: (prevModuleData?.photos || []).map((photo) =>
        photo.id === photoId ? { ...photo, caption } : photo
      ),
    }));
  };

  // Remove failed upload slot
  const removeFailedSlot = (slotId: string) => {
    setUploadSlots(prev => prev.filter(slot => slot.id !== slotId));
  };

  const uploadedCount = moduleData?.photos?.length || 0;
  const canUploadMore = uploadedCount < MODULE_CONSTRAINTS.photos.maxPhotos;

  return (
    <div className="w-full p-4">
      {/* Upload area */}
      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={MODULE_CONSTRAINTS.photos.allowedExtensions.join(',')}
          onChange={handleFileSelect}
          disabled={!canUploadMore || isUploading}
          className="hidden"
          id="photo-upload-input"
          aria-label="Select photos to upload"
        />
        <label
          htmlFor="photo-upload-input"
          className={`
            block w-full p-8 border-2 border-dashed rounded-lg text-center cursor-pointer
            transition-colors duration-200
            ${
              canUploadMore && !isUploading
                ? 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
            }
          `}
          aria-label={
            canUploadMore ? 'Click to select photos' : 'Maximum photos reached'
          }
        >
          <div className="space-y-2">
            <div className="text-4xl" aria-hidden="true">
              📷
            </div>
            <p className="text-gray-700 font-medium">
              {canUploadMore
                ? `Click to select photos (${uploadedCount}/${MODULE_CONSTRAINTS.photos.maxPhotos})`
                : 'Maximum photos reached'}
            </p>
            <p className="text-sm text-gray-500">
              JPEG, PNG, or WebP • Max{' '}
              {MODULE_CONSTRAINTS.photos.maxFileSize / 1024 / 1024}MB per photo
            </p>
          </div>
        </label>
      </div>
      {/* Photo grid - always render from moduleData.photos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Render successful photos */}
        {(moduleData?.photos || []).map((photo) => (
          <div
            key={photo.id}
            className="relative bg-white border border-gray-200 rounded-lg overflow-hidden"
          >
            <div className="aspect-square relative bg-gray-100">
              <img
                src={photo.storage_url}
                alt="Uploaded content"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => deletePhoto(photo.id, photo.storage_url)}
                className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                aria-label="Delete photo"
              >
                ×
              </button>
            </div>
            {/* Caption area */}
            <div className="p-2">
              <textarea
                placeholder="Add caption..."
                value={localCaptions[photo.id] || ''}
                onChange={e => handleCaptionChange(photo.id, e.target.value)}
                onBlur={() => handleCaptionBlur(photo.id)}
                className="w-full p-2 text-sm border border-gray-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={2}
              />
            </div>
          </div>
        ))}
        {/* Render failed uploads as error blocks */}
        {uploadSlots
          .filter(slot => slot.status === 'error')
          .map(slot => (
            <div
              key={slot.id}
              className="relative bg-red-100 border border-red-400 rounded-lg overflow-hidden flex items-center justify-center aspect-square"
            >
              <span className="text-red-700 font-semibold text-center px-2">
                Failed to upload photo.
                <br />
                {slot.error || 'Unknown error'}
              </span>
              <button
                onClick={() => removeFailedSlot(slot.id)}
                className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                aria-label="Remove failed upload"
              >
                ×
              </button>
            </div>
          ))}
      </div>
      {/* Upload progress/errors for in-progress uploads */}
      {uploadSlots.some(slot => slot.status !== 'uploaded') && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2">Uploading...</h4>
          <ul>
            {uploadSlots.map(slot => (
              <li key={slot.id} className="mb-1">
                {slot.file?.name} - {slot.status}
                {slot.error && (
                  <span className="text-red-600 ml-2">{slot.error}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
