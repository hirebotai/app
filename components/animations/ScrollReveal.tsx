'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import React, { forwardRef } from 'react';

interface ScrollRevealProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  once?: boolean;
}

export const ScrollReveal = forwardRef<HTMLDivElement, ScrollRevealProps>(
  ({ children, delay = 0, direction = 'up', once = true, className, style, ...props }, ref) => {
    const variants = {
      up: { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0 } },
      down: { hidden: { opacity: 0, y: -40 }, visible: { opacity: 1, y: 0 } },
      left: { hidden: { opacity: 0, x: 40 }, visible: { opacity: 1, x: 0 } },
      right: { hidden: { opacity: 0, x: -40 }, visible: { opacity: 1, x: 0 } },
    };

    return (
      <motion.div
        ref={ref}
        className={className}
        style={style}
        initial="hidden"
        whileInView="visible"
        viewport={{ once, margin: '-100px' }}
        variants={variants[direction]}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

ScrollReveal.displayName = 'ScrollReveal';

interface StaggerContainerProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  staggerDelay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export const StaggerContainer = forwardRef<HTMLDivElement, StaggerContainerProps>(
  ({ children, staggerDelay = 0.1, direction = 'up', className, style, ...props }, ref) => {
    const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay,
          delayChildren: 0.1,
        },
      },
    };

    const itemVariants = {
      up: { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } },
      down: { hidden: { opacity: 0, y: -30 }, visible: { opacity: 1, y: 0 } },
      left: { hidden: { opacity: 0, x: 30 }, visible: { opacity: 1, x: 0 } },
      right: { hidden: { opacity: 0, x: -30 }, visible: { opacity: 1, x: 0 } },
    };

    return (
      <motion.div
        ref={ref}
        className={className}
        style={style}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        {...props}
      >
        {React.Children.map(children, (child) =>
          React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement, {
                variants: itemVariants[direction],
                transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
              })
            : child
        )}
      </motion.div>
    );
  }
);

StaggerContainer.displayName = 'StaggerContainer';

export const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial="initial"
    animate="animate"
    exit="exit"
    variants={{
      initial: { opacity: 0, y: 20, filter: 'blur(8px)' },
      animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
      exit: { opacity: 0, y: -20, filter: 'blur(8px)' },
    }}
    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
);

export const Magnetic = ({ children }: { children: React.ReactElement }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      setPos({ x: x * 0.3, y: y * 0.3 });
    };

    const handleMouseLeave = () => setPos({ x: 0, y: 0 });

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <motion.div
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          transformOrigin: 'center center',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
};

export const FloatingOrb = ({
  size = 400,
  color = 'rgba(0, 229, 255, 0.3)',
  speed = 20,
}: { size?: number; color?: string; speed?: number }) => {
  const [time, setTime] = React.useState(0);

  React.useEffect(() => {
    let frame: number;
    const animate = () => {
      setTime((t) => t + 0.01);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  const x = Math.sin(time * speed * 0.001) * 30;
  const y = Math.cos(time * speed * 0.001 * 0.7) * 20;

  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <motion.div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 30% 30%, ${color}, transparent 70%)`,
          filter: 'blur(80px)',
          transform: `translate(${x}px, ${y}px)`,
        }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
};