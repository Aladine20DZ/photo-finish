import React from 'react';
import { Card, CardProps } from './Card';

/**
 * @deprecated GlassCard is deprecated in favor of Card from the World Athletics "Track Pro" design system.
 * This wrapper re-exports Card to preserve backward compatibility without breaking existing views.
 */
export interface GlassCardProps extends CardProps {
  glow?: 'none' | 'cyan' | 'emerald' | 'amber' | 'rose';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <Card className={className} {...props}>
      {children}
    </Card>
  );
};
