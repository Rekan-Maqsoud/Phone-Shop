import React from 'react';

export default function Toast({ message, onClose, actionLabel, onAction }) {
  const [hovered, setHovered] = React.useState(false);
  React.useEffect(() => {
    if (!message || hovered) return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose, hovered]);
  if (!message) return null;
  return (
    <div
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClose}
      tabIndex={0}
      style={{ minWidth: 220 }}
    >
      <span className="flex-1">{message}</span>
      {actionLabel && onAction && (
        <button
          onClick={e => { e.stopPropagation(); onAction(); }}
          className="ml-2 px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {actionLabel}
        </button>
      )}
      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        className="ml-2 text-gray-300 hover:text-white text-lg font-bold focus:outline-none"
        aria-label="Dismiss notification"
      >
        &times;
      </button>
    </div>
  );
}
