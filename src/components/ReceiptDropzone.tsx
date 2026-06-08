import React, { useCallback, useState } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onFileSelect: (file: File, base64: string) => void;
}

export function ReceiptDropzone({ onFileSelect }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('Veuillez sélectionner une image ou un PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onFileSelect(file, reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [onFileSelect]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`relative h-64 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center p-8 text-center cursor-pointer
        ${isDragging ? 'border-[#16A34A] bg-[#16A34A]/5' : 'border-[#1B2B1B]/10 hover:border-[#16A34A]/30'}`}
      onClick={() => document.getElementById('file-input')?.click()}
      id="receipt-dropzone"
    >
      <input
        id="file-input"
        type="file"
        className="hidden"
        accept="image/*,application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      
      <div className="w-12 h-12 bg-[#1B2B1B] text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-green-900/10">
        <Upload size={20} className="text-[#16A34A]" />
      </div>
      
      <h3 className="font-medium text-lg mb-1 text-[#1B2B1B]">Déposez votre reçu ici</h3>
      <p className="text-sm text-[#1B2B1B]/50 max-w-xs">
        Ou cliquez pour parcourir vos fichiers. JPG, PNG ou PDF supportés.
      </p>

      {isDragging && (
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           className="absolute inset-0 bg-[#16A34A]/5 rounded-xl pointer-events-none"
        />
      )}
    </div>
  );
}
