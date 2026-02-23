import { Input } from "@/components/ui/input";

type FormFieldProps = {
  id: string;
  label: string;
  type: 'email' | 'password' | 'text';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function FormField({ id, label, type, value, onChange, placeholder }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        placeholder={placeholder}
      />
    </div>
  );
}
