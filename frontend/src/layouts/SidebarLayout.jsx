import React from 'react';

export function SidebarLayout({ sidebar, header, children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Sidebar container */}
      <div className="w-64 shrink-0 flex flex-col">
        {sidebar}
      </div>

      {/* Main panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header container */}
        <div className="h-16 shrink-0 flex items-center">
          {header}
        </div>
        
        {/* View content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

export default SidebarLayout;
