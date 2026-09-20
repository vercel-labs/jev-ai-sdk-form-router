import { cn } from "cn";
import { Loader2Icon } from "lucide-react";

const Spinner = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <Loader2Icon
    data-slot="spinner"
    aria-hidden="true"
    className={cn("size-4 animate-spin motion-reduce:animate-none", className)}
    {...props}
  />
);

export { Spinner };
