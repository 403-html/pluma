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
    <div className="form-group">
      <label htmlFor={id} className="form-label">
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
