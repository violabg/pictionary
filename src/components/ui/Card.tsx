import { cn } from "@/lib/utils";
import { ElementType } from "react";

interface CardProps {
  as?: ElementType;
  className?: string;
  children: React.ReactNode;
}

export function Card({
  as: Component = "div",
  className,
  children,
}: CardProps) {
  return (
    <Component className={cn("bg-gray-950 p-4 rounded-lg", className)}>
      {children}
    </Component>
  );
}
