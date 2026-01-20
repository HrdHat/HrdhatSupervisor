import React from 'react';

interface SavedSignatureProps {
  id: string;
  name: string;
  signature: string; // storage URL
  date: string;
  role: string;
  onDelete?: (id: string) => void;
  showDeleteButton?: boolean;
}

export const SavedSignature: React.FC<SavedSignatureProps> = ({
  id,
  name,
  signature,
  date,
  role,
  onDelete,
  showDeleteButton = false,
}) => {
  const handleDelete = () => {
    if (
      onDelete &&
      confirm('Are you sure you want to delete this signature?')
    ) {
      onDelete(id);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-50 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="font-semibold">{name}</span>
        <span className="text-xs text-gray-500">({role})</span>
      </div>
      <img
        src={signature}
        alt="Signature"
        className="w-full h-24 object-contain bg-white border rounded"
      />
      <div className="text-xs text-gray-500">Signed: {formatDate(date)}</div>
      {showDeleteButton && (
        <button
          onClick={handleDelete}
          className="mt-2 px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
        >
          Delete
        </button>
      )}
    </div>
  );
};
