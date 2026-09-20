"use client";

import { RotateCcwIcon } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";

import { submitForm } from "@/app/actions";
import { RoutingResult } from "@/components/routing-result";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { Example, FormField } from "@/lib/examples";
import type { SubmissionResult } from "@/lib/submission";

const FormControl = ({
  field,
  value,
  errors,
  disabled,
  onChange,
}: {
  field: FormField;
  value: string;
  errors?: string[];
  disabled: boolean;
  onChange: (value: string) => void;
}) => {
  const props = {
    "aria-describedby": errors?.length ? `${field.name}-error` : undefined,
    "aria-invalid": Boolean(errors?.length),
    disabled,
    id: field.name,
    maxLength: field.maxLength,
    name: field.name,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => onChange(event.target.value),
    placeholder: field.placeholder,
    required: field.required,
    value,
  };
  return (
    <Field data-invalid={Boolean(errors?.length)} data-disabled={disabled}>
      <FieldLabel htmlFor={field.name}>
        {field.label}
        {!field.required && " (optional)"}
      </FieldLabel>
      {field.type === "textarea" ? (
        <Textarea {...props} rows={3} />
      ) : (
        <Input
          {...props}
          type={field.type}
          autoComplete={
            field.name === "name" || field.name === "email" ? field.name : "off"
          }
        />
      )}
      {errors?.length ? (
        <FieldError id={`${field.name}-error`}>{errors.join(" ")}</FieldError>
      ) : null}
    </Field>
  );
};

/** Shares accessible form behavior, samples, and result state across all examples. */
export const RouterForm = ({
  example,
  emailConfigured,
}: {
  example: Example;
  emailConfigured: boolean;
}) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [sendEmail, setSendEmail] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);

  const updateField = (name: string, value: string) => {
    setValues((previous) => ({ ...previous, [name]: value }));
    setResult(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) {
      return;
    }
    submitting.current = true;
    const formData = new FormData(event.currentTarget);
    formData.set("example", example.id);
    formData.set("submissionId", crypto.randomUUID());
    formData.set("sendEmail", String(sendEmail));
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await submitForm(formData));
      } catch {
        setResult({
          message:
            "The connection was interrupted. Your inputs are preserved. If you requested an email, check Resend before submitting again.",
          status: "error",
        });
      }
      submitting.current = false;
    });
  };

  const resetForm = () => {
    setValues({});
    setResult(null);
    setSendEmail(false);
  };

  const renderField = (field: FormField) => (
    <FormControl
      key={field.name}
      field={field}
      value={values[field.name] ?? ""}
      errors={
        result?.status === "error"
          ? result.fieldErrors?.[field.name]
          : undefined
      }
      disabled={pending}
      onChange={(value) => updateField(field.name, value)}
    />
  );

  return (
    <div className="grid items-start gap-6 min-[900px]:grid-cols-2">
      <section aria-labelledby="form-heading" className="min-w-0">
        <Card className="[--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]">
          <CardHeader divided>
            <CardTitle>
              <h2 id="form-heading">{example.title}</h2>
            </CardTitle>
            <CardDescription>{example.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              id="router-form"
              aria-labelledby="form-heading"
              aria-busy={pending}
              onSubmit={handleSubmit}
              className="flex flex-col gap-6"
            >
              <fieldset
                className="bg-muted/50 flex flex-col gap-3 rounded-lg p-4"
                aria-labelledby="samples-heading"
              >
                <p id="samples-heading" className="text-sm font-medium">
                  Load a sample
                </p>
                <div className="flex flex-wrap gap-2">
                  {example.samples.map((sample) => (
                    <Button
                      key={sample.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        setValues(sample.values);
                        setResult(null);
                        setSendEmail(false);
                      }}
                    >
                      {sample.label}
                    </Button>
                  ))}
                </div>
              </fieldset>
              <FieldSet disabled={pending}>
                <legend className="sr-only">{example.title} details</legend>
                <FieldGroup>
                  <FieldGroup className="sm:grid sm:grid-cols-2">
                    {example.fields.slice(0, 2).map(renderField)}
                  </FieldGroup>
                  {example.fields.slice(2).map(renderField)}
                  {emailConfigured && (
                    <Field orientation="horizontal" data-disabled={pending}>
                      <Checkbox
                        id="sendEmail"
                        checked={sendEmail}
                        disabled={pending}
                        onCheckedChange={(checked) => {
                          setSendEmail(checked);
                          setResult(null);
                        }}
                        aria-describedby="email-help"
                      />
                      <FieldContent>
                        <FieldLabel htmlFor="sendEmail">
                          Email the receiving team
                        </FieldLabel>
                        <FieldDescription id="email-help">
                          Send a copy to the selected team’s inbox.
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  )}
                </FieldGroup>
              </FieldSet>
            </form>
          </CardContent>
          <CardFooter>
            <div className="flex w-full flex-col gap-3 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between">
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={resetForm}
                aria-label="Reset form"
              >
                <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
                Reset
              </Button>
              <Button
                type="submit"
                form="router-form"
                size="lg"
                disabled={pending}
                className="min-w-40 sm:min-w-44"
              >
                {pending && <Spinner data-icon="inline-start" />}
                {pending ? "Routing…" : "Route submission"}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </section>
      <section
        className="min-w-0 min-[900px]:sticky min-[900px]:top-6"
        aria-labelledby="result-heading"
      >
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {pending ? "Routing your submission." : null}
          {result?.status === "success"
            ? `Routing complete. ${result.decision.destination.team}, ${result.decision.destination.specialty}.`
            : null}
        </div>
        <RoutingResult example={example} result={result} pending={pending} />
      </section>
    </div>
  );
};
