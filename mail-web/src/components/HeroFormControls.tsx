import { Label, ListBox, Select, Switch, SwitchGroup } from '@heroui/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export type HeroSelectOption = {
  label: ReactNode;
  value: string;
  textValue?: string;
  isDisabled?: boolean;
};

type HeroSelectFieldProps = {
  label?: ReactNode;
  value?: string | null;
  options: HeroSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  variant?: 'primary' | 'secondary';
};

export function HeroSelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
  className = 'w-full',
  triggerClassName,
  variant = 'secondary',
}: HeroSelectFieldProps) {
  return (
    <Select
      className={className}
      disabledKeys={options.filter((option) => option.isDisabled).map((option) => option.value)}
      onChange={(key: any) => {
        const next = Array.isArray(key) ? key[0] : key;
        onChange(String(next ?? ''));
      }}
      placeholder={placeholder}
      value={value || null}
      variant={variant}
    >
      {label ? <Label>{label}</Label> : null}
      <Select.Trigger className={triggerClassName}>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item id={option.value} key={option.value} textValue={option.textValue || String(option.label)}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

type HeroSwitchFieldProps<T extends string | number | boolean> = {
  label?: ReactNode;
  value: T;
  checkedValue: T;
  uncheckedValue: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
};

export function HeroSwitchField<T extends string | number | boolean>({
  label,
  value,
  checkedValue,
  uncheckedValue,
  onChange,
  className,
  size = 'sm',
  ariaLabel,
}: HeroSwitchFieldProps<T>) {
  return (
    <Switch
      aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}
      className={className}
      isSelected={value === checkedValue}
      onChange={(isSelected: boolean) => onChange(isSelected ? checkedValue : uncheckedValue)}
      size={size}
    >
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
      {label ? (
        <Switch.Content>
          <Label className="text-sm">{label}</Label>
        </Switch.Content>
      ) : null}
    </Switch>
  );
}

export function HeroSwitchGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <SwitchGroup className={className || 'gap-3'} orientation="horizontal">
      {children}
    </SwitchGroup>
  );
}

export function EnabledSwitch({
  value,
  onChange,
  enabledValue = 0,
  disabledValue = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  enabledValue?: number;
  disabledValue?: number;
}) {
  const { t } = useTranslation();

  return (
    <HeroSwitchField
      checkedValue={enabledValue}
      label={value === enabledValue ? t('enabled') : t('disabled')}
      onChange={onChange}
      uncheckedValue={disabledValue}
      value={value}
    />
  );
}
