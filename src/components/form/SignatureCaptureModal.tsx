import React, { useState, useRef, useEffect } from 'react';

import { MODULE_CONSTRAINTS } from '@/config/moduleConstraints';
import { supabase } from '@/config/supabaseClient';
import { useAuthStore } from '@/stores/authStore';

interface SignatureCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureData: {
    id: string;
    storageUrl: string;
    signerName: string;
    signerType: 'worker' | 'supervisor';
    signerRole: string;
    timestamp: string;
    fileSize: number;
    signatureMetadata: {
      canvasWidth: number;
      canvasHeight: number;
    };
  }) => void;
  signerType: 'worker' | 'supervisor';
  formId: string;
}

export const SignatureCaptureModal: React.FC<SignatureCaptureModalProps> = ({
  isOpen,
  onClose,
  onSave,
  signerType,
  formId,
}) => {
  const { user } = useAuthStore();
  const [signerName, setSignerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasWidth = MODULE_CONSTRAINTS.signatures.canvasWidth;
  const canvasHeight = MODULE_CONSTRAINTS.signatures.canvasHeight;
  const strokeColor = MODULE_CONSTRAINTS.signatures.strokeColor;
  const strokeWidth = MODULE_CONSTRAINTS.signatures.strokeWidth;
  const backgroundColor = MODULE_CONSTRAINTS.signatures.backgroundColor;
  const maxFileSize = MODULE_CONSTRAINTS.signatures.maxFileSize;
  const fileFormat = MODULE_CONSTRAINTS.signatures.fileFormat;
  const storageBucket = MODULE_CONSTRAINTS.signatures.storageBucket;
  const storageTable = MODULE_CONSTRAINTS.signatures.storageTable;

  // Canvas drawing logic
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }, [isOpen, canvasWidth, canvasHeight, backgroundColor]);

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = 0,
      clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    const { x, y } = getCanvasPos(e);
    ctx.moveTo(x, y);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    setDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    setHasDrawn(false);
  };

  // Save signature
  const handleSave = async () => {
    setError('');
    // Required field validation
    if (!formId || typeof formId !== 'string' || formId.length !== 36) {
      setError('Invalid or missing form ID. Please reload the form.');
      setIsSaving(false);
      return;
    }
    if (!user?.id || typeof user.id !== 'string' || user.id.length !== 36) {
      setError('Invalid or missing user ID. Please re-login.');
      setIsSaving(false);
      return;
    }
    if (!signerName.trim()) {
      setError('Please enter your name');
      setIsSaving(false);
      return;
    }
    if (!signerType || !['worker', 'supervisor'].includes(signerType)) {
      setError('Invalid signer type.');
      setIsSaving(false);
      return;
    }
    if (!hasDrawn) {
      setError('Please provide a signature');
      setIsSaving(false);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      setError('Canvas not available');
      return;
    }
    setIsSaving(true);
    try {
      // Convert canvas to blob
      const blob: Blob | null = await new Promise(resolve =>
        canvas.toBlob(b => resolve(b), `image/${fileFormat}`, 1.0)
      );
      if (!blob) throw new Error('Failed to generate signature image');
      if (blob.size > maxFileSize) {
        setError('Signature file is too large. Please sign again.');
        setIsSaving(false);
        return;
      }
      // Generate unique file name
      const uuid = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      const fileName = `${formId}/${signerType}_${uuid}.${fileFormat}`;
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(storageBucket)
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: false,
        });
      if (uploadError) {
        console.error('Signature upload failed:', uploadError);
        setError('Failed to upload signature. Please try again.');
        setIsSaving(false);
        return;
      }
      console.log('Signature uploaded successfully to:', fileName);
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(storageBucket)
        .getPublicUrl(fileName);
      const storageUrl = urlData.publicUrl;
      console.log('Generated public URL:', storageUrl);
      // Insert DB record
      const { data: dbData, error: dbError } = await supabase
        .from(storageTable)
        .insert({
          form_instance_id: formId,
          storage_path: fileName,
          signer_name: signerName.trim(),
          signer_type: signerType,
          signer_role: signerType, // role is same as type for now
          file_size: blob.size,
          signed_at: timestamp,
          created_by: user.id,
        })
        .select()
        .single();
      if (dbError) {
        console.error('Supabase DB Error:', dbError);
        setError('Failed to save signature record.');
        setIsSaving(false);
        // Optionally: delete uploaded file
        await supabase.storage.from(storageBucket).remove([fileName]);
        return;
      }
      // Call onSave with all data
      onSave({
        id: dbData.id,
        storageUrl,
        signerName: signerName.trim(),
        signerType,
        signerRole: signerType,
        timestamp,
        fileSize: blob.size,
        signatureMetadata: {
          canvasWidth,
          canvasHeight,
        },
      });
      // Reset
      setSignerName('');
      handleClear();
      setIsSaving(false);
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-lg shadow-xl overflow-y-auto p-8 relative"
        style={{
          width: '350px',
          height: '450px',
          maxWidth: '100%',
          maxHeight: '90vh',
        }}
      >
        <h2 className="text-lg font-semibold mb-4 text-gray-900">
          Sign as {signerType.charAt(0).toUpperCase() + signerType.slice(1)}
        </h2>
        <div className="mb-4">
          <label
            className="block text-sm font-medium mb-1 text-gray-700"
            htmlFor="signerName"
          >
            Your Name
          </label>
          <input
            id="signerName"
            type="text"
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-400"
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
            disabled={isSaving}
          />
        </div>
        <div className="mb-4">
          <label
            className="block text-sm font-medium mb-1 text-gray-700"
            htmlFor="signature-canvas"
          >
            Signature
          </label>
          <div
            className="border rounded bg-gray-100 flex items-center justify-center mx-auto"
            style={{ maxWidth: 400 }}
          >
            <canvas
              id="signature-canvas"
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="block bg-white border rounded cursor-crosshair touch-none mx-auto"
              style={{ touchAction: 'none', maxWidth: '100%', height: 'auto' }}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />
          </div>
          <button
            type="button"
            className="mt-2 px-3 py-1 text-xs bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            onClick={handleClear}
            disabled={isSaving}
          >
            Clear
          </button>
        </div>
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Signature'}
          </button>
        </div>
      </div>
    </div>
  );
};
