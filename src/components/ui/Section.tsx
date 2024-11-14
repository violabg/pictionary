import { cn } from "@/lib/utils";
import { ElementType } from "react";

interface SectionProps {
  as?: ElementType;
  className?: string;
  children: React.ReactNode;
}

export function Section({
  as: Component = "div",
  className,
  children,
}: SectionProps) {
  return (
    <Component className={cn("bg-gray-800 p-2 rounded-md", className)}>
      {children}
    </Component>
  );
}
