import { Slider } from "@/components/ui/slider";

type SizeSliderProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

export function SizeSlider({ value, min, max, onChange }: SizeSliderProps) {
  return (
    <Slider
      className="w-20"
      value={[value]}
      min={min}
      max={max}
      step={1}
      onValueChange={(values) => onChange(values[0])}
    />
  );
}