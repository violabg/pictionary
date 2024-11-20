import { Slider } from "@/components/ui/slider";

type Props = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

export function SizeSlider({ value, min, max, onChange }: Props) {
  return (
    <Slider
      className="w-full"
      value={[value]}
      min={min}
      max={max}
      step={1}
      onValueChange={(values) => onChange(values[0])}
    />
  );
}
