import { useInView } from '../hooks/useScroll';

/**
 * Scroll reveal wrapper.
 * variant: 'clip' (text slides up out of a mask, for headings) | 'scale' | 'left' | 'right' | 'fade'
 */
export default function Reveal({ as: Tag = 'div', variant = 'fade', delay = 0, className = '', style, children, ...rest }) {
  const [ref, seen] = useInView({ threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  const cls = `rv rv-${variant === 'clip' ? 'mask' : variant} ${seen ? 'in' : ''} ${className}`.trim();
  return (
    <Tag ref={ref} className={cls} style={{ '--d': `${delay}ms`, ...style }} {...rest}>
      {variant === 'clip' ? <span className="rv-mask-in">{children}</span> : children}
    </Tag>
  );
}
