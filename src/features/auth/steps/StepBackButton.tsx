import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface StepBackButtonProps {
  label: string;
  onClick: () => void;
}

/** Ghost "Back" control shown above each wizard card (44px touch target). */
export function StepBackButton({ label, onClick }: StepBackButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className="-ml-3 mb-3 w-fit text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft aria-hidden="true" />
      {label}
    </Button>
  );
}
