"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
  label: string;
  reason: string;
  icon?: ReactNode;
  variant?: "default" | "outline";
  size?: "default" | "sm";
};

export function DisabledAction({
  label,
  reason,
  icon,
  variant = "default",
  size = "default",
}: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="disabled-action" tabIndex={0}>
          <Button type="button" variant={variant} size={size} disabled>
            {icon}
            {label}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-64">
        {reason}
      </TooltipContent>
    </Tooltip>
  );
}
