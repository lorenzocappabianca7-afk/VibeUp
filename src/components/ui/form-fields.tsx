import { cn } from "@/lib/utils";

const inputClassName =
  "w-full rounded-xl border border-primary-black/10 bg-background px-4 py-3 text-sm text-primary-black placeholder:text-primary-black/40 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20";

interface FieldLabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}

export function FieldLabel({ htmlFor, children, hint }: FieldLabelProps) {
  return (
    <div className="mb-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-semibold text-primary-black"
      >
        {children}
      </label>
      {hint && (
        <p className="mt-0.5 text-xs text-primary-black/50">{hint}</p>
      )}
    </div>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  step?: string;
}

export function TextField({
  id,
  label,
  hint,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  min,
  step,
}: TextFieldProps) {
  return (
    <div>
      <FieldLabel htmlFor={id} hint={hint}>
        {label}
      </FieldLabel>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        step={step}
        className={inputClassName}
      />
    </div>
  );
}

interface TextAreaFieldProps {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}

export function TextAreaField({
  id,
  label,
  hint,
  value,
  onChange,
  placeholder,
  required,
  rows = 3,
}: TextAreaFieldProps) {
  return (
    <div>
      <FieldLabel htmlFor={id} hint={hint}>
        {label}
      </FieldLabel>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        rows={rows}
        className={cn(inputClassName, "resize-none")}
      />
    </div>
  );
}

interface SelectFieldProps {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}

export function SelectField({
  id,
  label,
  hint,
  value,
  onChange,
  options,
  required,
}: SelectFieldProps) {
  return (
    <div>
      <FieldLabel htmlFor={id} hint={hint}>
        {label}
      </FieldLabel>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={inputClassName}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
