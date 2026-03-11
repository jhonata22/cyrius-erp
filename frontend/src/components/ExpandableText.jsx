import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function ExpandableText({ text, maxLength = 100, buttonClassName }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) {
    return null;
  }

  const needsTruncation = text.length > maxLength;

  return (
    <div>
      <p className={`text-sm ${!isExpanded ? `line-clamp-3` : ''}`}>
        {text}
      </p>
      {needsTruncation && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`mt-2 text-xs font-black flex items-center gap-1 hover:underline active:scale-95 transition-all ${buttonClassName || ''}`}
        >
          {isExpanded ? (
            <>Menos detalhes <ChevronUp size={14} /></>
          ) : (
            <>Ver mais detalhes <ChevronDown size={14} /></>
          )}
        </button>
      )}
    </div>
  );
}
