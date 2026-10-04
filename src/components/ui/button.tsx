import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// shadcn/ui Button. Sizes keep a 44px minimum touch target (steering rule).
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-transparent text-sm font-semibold ring-offset-background transition-[color,background-color,border-color,box-shadow,transform] duration-150 motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_6px_16px_hsl(var(--primary)/0.3)] hover:bg-accent-foreground hover:shadow-[0_8px_20px_hsl(var(--primary)/0.36)] dark:hover:bg-primary/90',
        destructive:
          'border-referral/30 bg-referral-soft text-referral-ink hover:bg-referral/15',
        outline:
          'border-border-strong bg-card text-foreground hover:border-primary hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        ghost: 'hover:bg-secondary hover:text-foreground motion-safe:hover:translate-y-0',
        link: 'text-primary underline-offset-4 hover:underline motion-safe:hover:translate-y-0',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-11 px-3',
        lg: 'h-[50px] px-6 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
