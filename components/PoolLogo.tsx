import React, { CSSProperties } from 'react';

interface PoolLogoProps {
    /** Size of the logo in pixels. Default: 128 */
    size?: number;
    /** Primary color for the logo. Default: 'black' */
    color?: string;
    /** Secondary color variations. If not provided, will use opacity of primary color */
    colorVariant?: string;
    /** Enable floating/breathing animation. Default: false */
    animated?: boolean;
    /** CSS class name for additional styling */
    className?: string;
    /** Additional inline styles */
    style?: CSSProperties;
  /** Accessibility label */
  'aria-label'?: string;
}

/**
 * PoolLogo - Concept 4: Pebble Pool
 *
 * A reusable React component for the Pool logo representing:
 * - Calm shared workspace
 * - Organic collaboration
 * - Flow state
 *
 * @example
 * // Basic usage
 * <PoolLogo />
 *
 * @example
 * // Custom size and color
 * <PoolLogo size={256} color="#2c5aa0" animated />
 *
 * @example
 * // With custom variants
 * <PoolLogo size={64} color="#333" colorVariant="#666" />
 */
export const PoolLogo: React.FC<PoolLogoProps> = ({
    size = 128,
    color = 'black',
    colorVariant,
    animated = false,
    className = '',
    style = {},
    'aria-label': ariaLabel = 'Pool logo - Pebble Pool concept',
}) => {
    // Calculate variant colors based on primary color if not provided
    const variant1 = colorVariant || adjustColorBrightness(color, -20);
    const variant2 = colorVariant || adjustColorBrightness(color, -40);

    const animationStyle: CSSProperties = animated
        ? {
            animation: 'pool-float 6s ease-in-out infinite',
        }
        : {};

    return (
        <>
            {animated && <style>{keyframeAnimation}</style>}
            <svg
                width={size}
                height={size}
                viewBox="0 0 128 128"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={className}
                style={{
                    ...style,
                    ...animationStyle,
                }}
                aria-label={ariaLabel}
                role="img"
            >
                {/* Top-left pebble */}
                <ellipse cx="40" cy="44" rx="22" ry="16" fill={color} />

                {/* Top-right pebble (medium shade) */}
                <ellipse cx="78" cy="40" rx="18" ry="14" fill={variant1} />

                {/* Bottom-left pebble (dark shade) */}
                <ellipse cx="52" cy="84" rx="24" ry="18" fill={variant2} />

                {/* Bottom-right pebble */}
                <ellipse cx="88" cy="82" rx="20" ry="15" fill={color} />
            </svg>
        </>
    );
};

/**
 * Adjust color brightness for variants
 * Supports hex colors and rgb/rgba
 */
function adjustColorBrightness(color: string, amount: number): string {
    const usePound = color[0] === '#';
    const col = usePound ? color.slice(1) : color;

    // Handle hex colors
    if (col.length === 6) {
        const num = parseInt(col, 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
        const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount));
        return (usePound ? '#' : '') + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
    }

    // For other color formats, return as-is (can add support for rgb/rgba as needed)
    return color;
}

// Animation keyframes
const keyframeAnimation = `
  @keyframes pool-float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-6px);
    }
  }
`;

export default PoolLogo;