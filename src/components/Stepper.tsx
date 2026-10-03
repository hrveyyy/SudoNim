export interface StepperStep {
  key: string;
  label: string;
}

export interface StepperProps {
  steps: StepperStep[];
  /** The key of the current/active step. */
  current: string;
  /** Keys considered complete (shown filled). */
  done?: string[];
}

/**
 * Horizontal progress stepper (e.g. referral status). Each step shows a label,
 * never relying on color alone — the current step is also marked by aria-current
 * and a filled index.
 */
export function Stepper({ steps, current, done = [] }: StepperProps) {
  return (
    <ol className="flex flex-wrap items-center gap-2" role="list">
      {steps.map((step, i) => {
        const isDone = done.includes(step.key);
        const isCurrent = step.key === current;
        const tone = isCurrent
          ? 'bg-primary text-white'
          : isDone
            ? 'bg-screened-green text-white'
            : 'bg-surface text-text-muted border border-border';
        return (
          <li key={step.key} className="flex items-center gap-2">
            <span
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex items-center gap-1.5 rounded-cl px-2.5 py-1 text-xs font-medium ${tone}`}
            >
              <span className="font-semibold">{i + 1}</span>
              {step.label}
            </span>
            {i < steps.length - 1 && <span aria-hidden className="text-text-muted">›</span>}
          </li>
        );
      })}
    </ol>
  );
}
