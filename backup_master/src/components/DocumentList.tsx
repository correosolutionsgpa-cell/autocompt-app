import { DocumentEntry } from '../types';
import { FileText, ChevronRight } from 'lucide-react';

interface Props {
  documents: DocumentEntry[];
  onSelect: (doc: DocumentEntry) => void;
  activeId?: string;
}

export function DocumentList({ documents, onSelect, activeId }: Props) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-black/30 text-sm">
        <FileText size={32} className="mb-2 opacity-20" />
        <p>Aucun document traité</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#1B2B1B]/5" id="document-list">
      {documents.map((doc) => (
        <button
          key={doc.id}
          onClick={() => onSelect(doc)}
          className={`w-full text-left p-4 flex items-center justify-between transition-colors hover:bg-[#16A34A] hover:text-white group
            ${activeId === doc.id ? 'bg-[#16A34A] text-white' : ''}`}
        >
          <div className="space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-widest leading-none">
              {doc.result.vendor}
            </h4>
            <div className="flex items-center gap-3 font-mono text-[10px] opacity-60">
              <span>{doc.result.date}</span>
              <span>•</span>
              <span>{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(doc.result.grandTotal)}</span>
            </div>
          </div>
          <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ))}
    </div>
  );
}
