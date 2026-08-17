import React, { useRef, useEffect } from 'react';

interface OtpInputBoxProps {
  value: string;
  onChange: (val: string) => void;
  onEnterSubmit?: () => void;
  disabled?: boolean;
}

export const OtpInputBox: React.FC<OtpInputBoxProps> = ({
  value = '',
  onChange,
  onEnterSubmit,
  disabled = false,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Create array of 6 characters
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  useEffect(() => {
    // Auto-focus first empty box or box 0 when rendered
    if (!disabled) {
      const firstEmptyIndex = digits.findIndex((d) => !d);
      const focusIndex = firstEmptyIndex !== -1 ? firstEmptyIndex : 0;
      inputRefs.current[focusIndex]?.focus();
    }
  }, [disabled]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const digit = val.substring(val.length - 1).replace(/\D/g, '');

    const newDigits = [...digits];
    newDigits[index] = digit;
    const newOtp = newDigits.join('');
    onChange(newOtp);

    // Auto-advance to next box if digit was typed
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Focus previous box on backspace if current is empty
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      if (onEnterSubmit && value.length === 6) {
        onEnterSubmit();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().replace(/\D/g, '').slice(0, 6);
    if (pasteData) {
      onChange(pasteData);
      const focusIndex = Math.min(pasteData.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="flex items-center justify-between gap-1.5 sm:gap-2.5 w-full max-w-[340px] sm:max-w-[360px] mx-auto my-3 justify-items-center">
      {Array.from({ length: 6 }).map((_, index) => {
        const isFilled = Boolean(digits[index]);
        return (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digits[index] || ''}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className={`w-10 h-11 sm:w-12 sm:h-12 text-center text-lg sm:text-xl font-mono font-extrabold rounded-xl border-2 transition-all duration-200 shadow-sm outline-none ${
              isFilled
                ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-indigo-100'
                : 'border-slate-300 bg-white text-slate-900 focus:border-indigo-600 focus:bg-indigo-50/30 focus:ring-4 focus:ring-indigo-500/20'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ color: isFilled ? '#312e81' : '#0f172a', WebkitTextFillColor: isFilled ? '#312e81' : '#0f172a' }}
          />
        );
      })}
    </div>
  );
};

export default OtpInputBox;
