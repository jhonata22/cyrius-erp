import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const ExpandableText = ({ text, maxLength = 120 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    if (textRef.current) {
      // Check if the text content is longer than the max length
      setIsOverflowing(textRef.current.textContent.length > maxLength);
    }
  }, [text, maxLength]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (!text) {
    return <p className="text-sm text-slate-500 italic">Resolução não detalhada.</p>;
  }

  const truncatedText = isExpanded ? text : `${text.substring(0, maxLength)}${isOverflowing && !isExpanded ? '...' : ''}`;

  return (
    <div>
      <p ref={textRef} className="text-emerald-800 text-sm font-medium whitespace-pre-wrap">
        {truncatedText}
      </p>
      {isOverflowing && (
        <button 
          onClick={toggleExpanded} 
          className="mt-2 text-[#7C69AF] text-xs font-bold flex items-center gap-1 hover:underline"
        >
          {isExpanded ? 'Ver menos' : 'Ver mais'} 
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      )}
    </div>
  );
};

export default ExpandableText;
