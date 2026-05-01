import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/hooks/use-toast";
import { createAdminMentor } from "@/lib/api";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import type { ReactNode } from "react";

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email(),
  phoneNumber: z.string().optional(),
  title: z.string().min(1, "Required"),
  profession: z.string().min(1, "Required"),
  company: z.string().min(1, "Required"),
  experienceYears: z.number().min(0),
  bio: z.string().min(1, "Required"),
  profileImageUrl: z
    .string()
    .optional()
    .refine((v) => !v || /^https?:\/\/.+/i.test(v), "Enter a valid URL"),
  isCertified: z.boolean(),
  startYear: z.string().min(2, "Required"),
});

type FormValues = z.infer<typeof schema>;

export default function CreateMentorPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      title: "",
      profession: "",
      company: "",
      experienceYears: 0,
      bio: "",
      profileImageUrl: "",
      isCertified: false,
      startYear: String(new Date().getFullYear()),
    },
  });

  const watchAll = form.watch();

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const token = await getToken({ template: "skillmentor-auth" });
      if (!token) throw new Error("Not signed in");
      const payload = {
        ...values,
        profileImageUrl: values.profileImageUrl || undefined,
        phoneNumber: values.phoneNumber || undefined,
      };
      const created = await createAdminMentor(token, payload);
      setCreatedId(created.id);
      toast({
        title: "Mentor created",
        description: `${created.firstName} ${created.lastName} was added.`,
      });
      form.reset();
    } catch (e) {
      toast({
        title: "Could not create mentor",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create mentor</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Add a mentor profile for the marketplace.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <Card className="p-6 space-y-4">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="First name" error={form.formState.errors.firstName}>
                <Input {...form.register("firstName")} />
              </Field>
              <Field label="Last name" error={form.formState.errors.lastName}>
                <Input {...form.register("lastName")} />
              </Field>
            </div>
            <Field label="Email" error={form.formState.errors.email}>
              <Input type="email" {...form.register("email")} />
            </Field>
            <Field label="Phone" error={form.formState.errors.phoneNumber}>
              <Input {...form.register("phoneNumber")} />
            </Field>
            <Field label="Title" error={form.formState.errors.title}>
              <Input {...form.register("title")} />
            </Field>
            <Field label="Profession" error={form.formState.errors.profession}>
              <Input {...form.register("profession")} />
            </Field>
            <Field label="Company" error={form.formState.errors.company}>
              <Input {...form.register("company")} />
            </Field>
            <Field
              label="Years experience"
              error={form.formState.errors.experienceYears}
            >
              <Input type="number" {...form.register("experienceYears", { valueAsNumber: true })} />
            </Field>
            <Field label="Start year" error={form.formState.errors.startYear}>
              <Input {...form.register("startYear")} />
            </Field>
            <Field label="Bio" error={form.formState.errors.bio}>
              <Textarea rows={4} {...form.register("bio")} />
            </Field>
            <Field
              label="Profile image URL"
              error={form.formState.errors.profileImageUrl}
            >
              <Input placeholder="https://..." {...form.register("profileImageUrl")} />
            </Field>
            <div className="flex items-center gap-2">
              <Checkbox
                id="cert"
                checked={form.watch("isCertified")}
                onCheckedChange={(v) =>
                  form.setValue("isCertified", Boolean(v))
                }
              />
              <Label htmlFor="cert">Certified mentor</Label>
            </div>
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? "Saving…" : "Create mentor"}
            </Button>
          </form>
        </Card>

        <div>
          <h2 className="text-lg font-semibold mb-3">Live preview</h2>
          <MentorPreview values={watchAll} />
          {createdId != null && (
            <p className="mt-4 text-sm text-muted-foreground">
              View profile:{" "}
              <Link
                className="text-primary font-medium underline"
                to={`/mentors/${createdId}`}
              >
                Open mentor page
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: { message?: string };
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error?.message && (
        <p className="text-xs text-destructive">{error.message}</p>
      )}
    </div>
  );
}

function MentorPreview({ values }: { values: Partial<FormValues> }) {
  const name =
    `${values.firstName ?? ""} ${values.lastName ?? ""}`.trim() || "Mentor name";
  return (
    <Card className="p-6 flex flex-col h-full border-2 border-dashed">
      <div className="flex justify-between gap-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">
            {values.title || "Professional title"}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {values.profileImageUrl ? (
              <img
                src={values.profileImageUrl}
                alt=""
                className="size-8 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <Skeleton className="size-8 rounded-full" />
            )}
            <span>{name}</span>
          </div>
          <p className="text-sm text-muted-foreground">{values.company}</p>
          <p className="text-sm">
            {(values.bio ?? "").slice(0, 160)}
            {(values.bio?.length ?? 0) > 160 ? "…" : ""}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
          <GraduationCap className="size-3" />
          {values.experienceYears ?? 0} yrs
        </span>
        {values.isCertified && (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 text-blue-900 px-2 py-1">
            <ShieldCheck className="size-3" />
            Certified
          </span>
        )}
      </div>
    </Card>
  );
}
