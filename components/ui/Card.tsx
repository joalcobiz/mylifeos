import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'gradient' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  variant = 'default',
  padding = 'md',
  hover = false,
  onClick
}) => {
  const baseStyles = 'rounded-2xl transition-all duration-300';
  
  const variantStyles = {
    default: 'bg-white border border-gray-100 shadow-sm',
    glass: 'bg-white/80 backdrop-blur-xl border border-white/20 shadow-lg',
    gradient: 'bg-gradient-to-br from-white to-gray-50 border border-gray-100 shadow-md',
    outline: 'bg-transparent border-2 border-gray-200'
  };
  
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6 md:p-8'
  };
  
  const hoverStyles = hover ? 'hover:shadow-lg hover:scale-[1.02] hover:border-primary/20 cursor-pointer' : '';
  
  return (
    <div 
      className={`${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${hoverStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
