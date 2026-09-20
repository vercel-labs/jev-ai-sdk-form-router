import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RouterForm } from "@/components/router-form";
import { examples, isExampleId } from "@/lib/examples";
import { isEmailConfigured } from "@/lib/submission";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ example: string }>;
}

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { example } = await params;
  return {
    title: isExampleId(example) ? examples[example].title : "Not found",
  };
};

const ExamplePage = async ({ params }: PageProps) => {
  const { example: id } = await params;
  if (!isExampleId(id)) {
    notFound();
  }
  const example = examples[id];
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto flex max-w-6xl flex-col gap-7 px-5 py-8 sm:px-8 sm:py-10"
    >
      <nav
        aria-label="Form examples"
        className="flex gap-1 overflow-x-auto border-b"
      >
        {[examples.leads, examples.contact, examples.issues].map((item) => (
          <Link
            key={item.id}
            href={`/${item.id}`}
            scroll={false}
            aria-current={item.id === id ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring flex shrink-0 items-center border-b-2 px-3 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset sm:px-4",
              item.id === id
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent"
            )}
          >
            {item.title}
          </Link>
        ))}
      </nav>
      <RouterForm
        key={id}
        example={example}
        emailConfigured={isEmailConfigured(example)}
      />
    </main>
  );
};

export default ExamplePage;
