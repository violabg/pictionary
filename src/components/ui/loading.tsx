import { Loader } from "lucide-react";

interface LoadingProps {
  label?: string;
}

export function Loading({ label = "Loading..." }: LoadingProps) {
  return (
    <div className="flex justify-center items-center gap-2 p-4">
      <Loader className="w-4 h-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}
