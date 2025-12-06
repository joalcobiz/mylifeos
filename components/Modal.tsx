import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showClose?: boolean;
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  size = 'md',
  showClose = true
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isFull = size === 'full';

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[98vw] md:max-w-[95vw] lg:max-w-[1400px]'
  };

  const modalContent = (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center ${isFull ? 'p-2 md:p-4' : 'p-4'}`}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div 
        className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm" 
        onClick={onClose} 
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      <div 
        className={`relative bg-white w-full ${sizeStyles[size]} flex flex-col transform transition-all duration-300 animate-enter rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.4)]`}
        style={{ 
          maxHeight: isFull ? 'calc(100vh - 32px)' : 'calc(100vh - 80px)',
          zIndex: 10000
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between border-b border-gray-100 flex-shrink-0 ${isFull ? 'px-4 md:px-6 lg:px-8 py-4 md:py-5' : 'px-6 py-4'}`}>
          <h3 className={`font-semibold text-gray-900 ${isFull ? 'text-lg md:text-xl lg:text-2xl' : 'text-lg'}`}>{title}</h3>
          {showClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
            >
              <X className={isFull ? 'w-5 h-5 md:w-6 md:h-6' : 'w-5 h-5'} />
            </button>
          )}
        </div>
        
        <div className={`overflow-y-auto flex-1 custom-scrollbar ${isFull ? 'p-4 md:p-6 lg:p-8' : 'p-6'}`}>
          {children}
        </div>

        {footer && (
          <div className="px-6 py-4 bg-gray-50/50 rounded-b-2xl border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
