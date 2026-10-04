import * as React from 'react';
import { cn } from '@/lib/utils';

// shadcn/ui Input. h-11 keeps the 44px minimum touch target.
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-[46px] w-full rounded-[10px] border border-input bg-secondary px-3.5 py-2 text-base transition-[border-color,box-shadow,background-color] duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/85 hover:border-primary focus-visible:border-primary focus-visible:bg-card focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
