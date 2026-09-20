"use client";

import { cn } from "cn";
import * as React from "react";

const Label = ({
  className,
  htmlFor,
  ...props
}: React.ComponentProps<"label">) => (
  <label
    data-slot="label"
    htmlFor={htmlFor}
    className={cn(
      "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
      className
    )}
    {...props}
  />
);

export { Label };
