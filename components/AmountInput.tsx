"use client";

import { useEffect, useRef, useState } from "react";

type AmountInputProps = {
  name: string;
  defaultValue?: number | string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  min?: number;
};

function sanitizeToNumberString(input: string): string {
  if (!input) return "0.00";
  // Remove commas and spaces
  let s = input.replace(/[,\s]/g, "");
  // Keep only digits and dots
  s = s.replace(/[^0-9.\-]/g, "");
  // Handle multiple dots: keep first dot only
  const firstDot = s.indexOf(".");
  if (firstDot >= 0) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }
  // If just a dot or minus, treat as zero
  if (s === "." || s === "-" || s === "-.") return "0.00";
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

function formatWithCommas(numberString: string) {
  const n = Number(numberString);
  if (!Number.isFinite(n)) return "0.00";
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function AmountInput({ name, defaultValue, required, placeholder, className, min }: AmountInputProps) {
  const initialNumeric = typeof defaultValue === "number" ? defaultValue.toFixed(2) : sanitizeToNumberString(String(defaultValue ?? "0"));
  const [numericValue, setNumericValue] = useState<string>(initialNumeric);
  const [visibleValue, setVisibleValue] = useState<string>(formatWithCommas(initialNumeric));
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setNumericValue(initialNumeric);
    setVisibleValue(formatWithCommas(initialNumeric));
  }, [defaultValue]);

  const handleFocus = () => {
    // show raw numeric without commas for easier editing
    setVisibleValue(numericValue);
    // select all after focus
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setVisibleValue(v);
    // try to update numeric if possible
    const cleaned = sanitizeToNumberString(v);
    setNumericValue(cleaned);
  };

  const handleBlur = () => {
    const cleaned = sanitizeToNumberString(visibleValue);
    setNumericValue(cleaned);
    setVisibleValue(formatWithCommas(cleaned));
  };

  return (
    <>
      <input name={name} type="hidden" value={numericValue} />
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={visibleValue}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-label={name}
        className={className}
        data-amount-input
      />
    </>
  );
}
