import React, { useState } from 'react';

import { SavedSignature } from './SavedSignature';
import { SignatureCaptureModal } from './SignatureCaptureModal';

interface SignatureModuleProps {
  moduleData: SignatureEntry[];
  onChange: (moduleData: SignatureEntry[]) => void;
  formId: string;
  isLocked?: boolean;
}

interface SignatureEntry {
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
}

export const SignatureModule: React.FC<SignatureModuleProps> = ({
  moduleData,
  onChange,
  formId,
  isLocked = false,
}) => {
  // moduleData IS the signatures array directly
  const signatures: SignatureEntry[] = Array.isArray(moduleData)
    ? moduleData
    : [];
  
  const supervisorSignature = signatures.find(
    s => s.signerType === 'supervisor'
  );
  const workerSignatures = signatures.filter(s => s.signerType === 'worker');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSignerType, setModalSignerType] = useState<
    'worker' | 'supervisor'
  >('worker');

  const openSignatureModal = (signerType: 'worker' | 'supervisor') => {
    setModalSignerType(signerType);
    setIsModalOpen(true);
  };
  const closeSignatureModal = () => setIsModalOpen(false);

  // Handle signature save from modal
  const handleSignatureSave = (signatureData: SignatureEntry) => {
    // Since moduleData is the signatures array directly, just append to it
    const updatedSignatures = [...signatures, signatureData];
    onChange(updatedSignatures);
    closeSignatureModal();
  };

  if (isLocked) {
    // Locked/read-only rendering
    return (
      <div className="space-y-4">
        <div className="supervisor-signatures">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Supervisor Signature
          </h3>
          {supervisorSignature ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex flex-col space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Name:</span>{' '}
                  {supervisorSignature.signerName}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Role:</span>{' '}
                  {supervisorSignature.signerRole}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Signed:</span>{' '}
                  {new Date(supervisorSignature.timestamp).toLocaleString()}
                </div>
                <img
                  src={supervisorSignature.storageUrl}
                  alt="Supervisor signature"
                  className="max-w-[200px] max-h-[100px] border border-gray-300 rounded"
                />
              </div>
            </div>
          ) : (
            <div className="text-gray-500 italic">No supervisor signature</div>
          )}
        </div>

        <div className="worker-signatures">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Worker Signatures ({workerSignatures.length})
          </h3>
          {workerSignatures.length > 0 ? (
            <div className="space-y-3">
              {workerSignatures.map((signature, index) => (
                <div
                  key={signature.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex flex-col space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Name:</span>{' '}
                      {signature.signerName}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Role:</span>{' '}
                      {signature.signerRole}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Signed:</span>{' '}
                      {new Date(signature.timestamp).toLocaleString()}
                    </div>
                    <img
                      src={signature.storageUrl}
                      alt={`Worker signature ${index + 1}`}
                      className="max-w-[200px] max-h-[100px] border border-gray-300 rounded"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 italic">No worker signatures</div>
          )}
        </div>

        <div className="pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <p>
              Signatures:{' '}
              {supervisorSignature ? '1 Supervisor' : '0 Supervisor'},{' '}
              {workerSignatures.length} Worker
              {workerSignatures.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Normal editable rendering continues...
  return (
    <div className="w-full p-4 space-y-6">
      {/* Supervisor Signature Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span role="img" aria-label="supervisor">
              Supervisor Signature
            </span>
          </h3>
          {!supervisorSignature && (
            <button
              onClick={() => openSignatureModal('supervisor')}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add Supervisor Signature
            </button>
          )}
        </div>
        {supervisorSignature ? (
          <SavedSignature
            id={supervisorSignature.id}
            name={supervisorSignature.signerName}
            signature={supervisorSignature.storageUrl}
            date={supervisorSignature.timestamp}
            role={supervisorSignature.signerRole}
          />
        ) : (
          <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
            <div className="text-gray-500">
              <span
                role="img"
                aria-label="signature"
                className="text-2xl block mb-2"
              >
                ✍️
              </span>
              <p className="text-sm">No supervisor signature added yet</p>
            </div>
          </div>
        )}
      </div>
      {/* Worker Signatures Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span role="img" aria-label="workers">
              Worker Signatures
            </span>
          </h3>
          <button
            onClick={() => openSignatureModal('worker')}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Add Worker Signature
          </button>
        </div>
        {workerSignatures.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workerSignatures.map(signature => (
              <SavedSignature
                key={signature.id}
                id={signature.id}
                name={signature.signerName}
                signature={signature.storageUrl}
                date={signature.timestamp}
                role={signature.signerRole}
              />
            ))}
          </div>
        ) : (
          <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
            <div className="text-gray-500">
              <span
                role="img"
                aria-label="signature"
                className="text-2xl block mb-2"
              >
                ✍️
              </span>
              <p className="text-sm">No worker signatures added yet</p>
            </div>
          </div>
        )}

        {/* Additional Add Worker Signature button after signatures */}
        {workerSignatures.length > 0 && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => openSignatureModal('worker')}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Add Another Worker Signature
            </button>
          </div>
        )}

        {/* Signature Count */}
        {workerSignatures.length > 0 && (
          <div className="text-sm text-gray-500 text-center">
            {workerSignatures.length} worker signature
            {workerSignatures.length !== 1 ? 's' : ''} added
          </div>
        )}
      </div>
      {/* Module Summary */}
      <div className="pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <p>
            Signatures: {supervisorSignature ? '1 Supervisor' : '0 Supervisor'},{' '}
            {workerSignatures.length} Worker
            {workerSignatures.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      {/* Signature Capture Modal */}
      <SignatureCaptureModal
        isOpen={isModalOpen}
        onClose={closeSignatureModal}
        onSave={handleSignatureSave}
        signerType={modalSignerType}
        formId={formId}
      />
    </div>
  );
};

export type { SignatureEntry };
