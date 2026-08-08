import React, { useRef, useEffect } from 'react';

export const OtpInputBox = ({ value, onChange, onEnterSubmit, disabled }) => {
  const inputRefs = useRef([]);

  // Create array of 6 characters
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  useEffect(() => {
    // Auto-focus first input box when rendered
    if (inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [disabled]);

  const handleChange = (index, e) => {
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

  const handleKeyDown = (index, e) => {
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

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().replace(/\D/g, '').slice(0, 6);
    if (pasteData) {
      onChange(pasteData);
      const focusIndex = Math.min(pasteData.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="grid grid-cols-6 gap-2 sm:gap-2.5 md:gap-3 w-full max-w-[360px] mx-auto my-5 box-border justify-items-center items-center">
      {Array.from({ length: 6 }).map((_, index) => (
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
          className={`box-border w-[42px] h-[42px] md:w-[46px] md:h-[46px] sm:w-[48px] sm:h-[48px] text-center text-lg sm:text-xl font-mono font-black rounded-xl border-2 transition-all duration-200 shadow-sm outline-none ${
            digits[index]
              ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 shadow-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-200'
              : 'border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-900 focus:ring-4 focus:ring-indigo-500/15'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      ))}
    </div>
  );
};

export default OtpInputBox;
