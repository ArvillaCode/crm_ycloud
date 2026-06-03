import React from 'react';

export function Button({ children, onClick, variant = 'primary', className = '', ...props }) {
  const baseStyle = "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50";
  const variants = {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/10 active:scale-95",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-95 border border-slate-700",
    danger: "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/10 active:scale-95",
  };

  return (
    <button
      onClick={onClick}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
