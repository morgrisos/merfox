import React from 'react';

interface ContainerProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * Shared layout container component for consistent page width, centering, and padding.
 * 
 * Responsibilities:
 * - max-width: 1280px
 * - Horizontal centering (mx-auto)
 * - Responsive padding
 * 
 * Usage:
 * <Container>
 *   <h1>Page Content</h1>
 *   ...
 * </Container>
 * 
 * IMPORTANT: When applying to existing pages, remove duplicate:
 * - max-w-* classes
 * - mx-auto
 * - px-* and py-* padding classes
 */
export function Container({ children, className = '' }: ContainerProps) {
    return (
        <div className={`max-w-[1280px] mx-auto px-6 lg:px-8 py-8 ${className}`}>
            {children}
        </div>
    );
}
