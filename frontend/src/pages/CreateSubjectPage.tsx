import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/hooks/use-toast";
import { createAdminSubject, getPublicMentors } from "@/lib/api";
import { SUBJECT } from "@/lib/fieldLimits";
import type { Mentor } from "@/types";

const schema = z
  .object({
    subjectName: z
      .string()
      .trim()
      .min(
        SUBJECT.subjectName.min,
        `Course name needs ${SUBJECT.subjectName.min}–${SUBJECT.subjectName.max} characters.`,
      )
      .max(SUBJECT.subjectName.max),
    description: z
      .string()
      .trim()
      .min(
        SUBJECT.description.min,
        `Description needs ${SUBJECT.description.min}–${SUBJECT.description.max} characters.`,
      )
      .max(SUBJECT.description.max),
    courseImageUrl: z
      .string()
      .max(SUBJECT.courseImageUrl.max)
      .refine((v) => !v || /^https?:\/\/.+/i.test(v), "Enter a valid URL"),
    mentorId: z.number().optional(),
  })
  .refine((d) => (d.mentorId ?? 0) > 0, {
    message: "Pick a mentor",
    path: ["mentorId"],
  });

type FormValues = z.infer<typeof schema>;

export default function CreateSubjectPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loadingMentors, setLoadingMentors] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      subjectName: "",
      description: "",
      courseImageUrl: "",
      mentorId: undefined,
    },
  });

  useEffect(() => {
    getPublicMentors(0, 500)
      .then((r) => setMentors(r.content))
      .catch(() =>
        toast({ title: "Failed to load mentors", variant: "destructive" }),
      )
      .finally(() => setLoadingMentors(false));
  }, [toast]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const token = await getToken({ template: "skillmentor-auth" });
      if (!token) throw new Error("Not signed in");
      await createAdminSubject(token, {
        subjectName: values.subjectName.trim(),
        description: values.description.trim(),
        courseImageUrl: values.courseImageUrl.trim() || undefined,
        mentorId: values.mentorId!,
      });
      toast({ title: "Subject created" });
      navigate("/", { replace: true });
    } catch (e) {
      toast({
        title: "Create failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    }
  });

  const subjectNameWatch = form.watch("subjectName");
  const descriptionWatch = form.watch("description");
  const courseImageUrlWatch = form.watch("courseImageUrl");

  const mentorIdRaw = form.watch("mentorId");
  const mentorSelectValue =
    typeof mentorIdRaw === "number" && mentorIdRaw > 0 ? String(mentorIdRaw) : "";

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create subject</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Assign a course to an existing mentor.
        </p>
      </div>

      <form
        className="space-y-4 border rounded-xl p-6 bg-card"
        onSubmit={onSubmit}
      >
        <div className="space-y-2">
          <Label>Mentor</Label>
          <Select
            disabled={loadingMentors}
            onValueChange={(v) =>
              form.setValue("mentorId", v === "" ? undefined : Number(v))
            }
            value={mentorSelectValue}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={loadingMentors ? "Loading…" : "Select mentor"}
              />
            </SelectTrigger>
            <SelectContent>
              {mentors.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.firstName} {m.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.mentorId && (
            <p className="text-xs text-destructive">
              {form.formState.errors.mentorId.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Course name</Label>
          <Input
            maxLength={SUBJECT.subjectName.max}
            {...form.register("subjectName")}
          />
          <div className="flex justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {SUBJECT.subjectName.min}–{SUBJECT.subjectName.max} characters.
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {(subjectNameWatch ?? "").length}/{SUBJECT.subjectName.max}
            </p>
          </div>
          {form.formState.errors.subjectName && (
            <p className="text-xs text-destructive">
              {form.formState.errors.subjectName.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            rows={4}
            maxLength={SUBJECT.description.max}
            {...form.register("description")}
          />
          <div className="flex justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {SUBJECT.description.min}–{SUBJECT.description.max} characters.
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {(descriptionWatch ?? "").length}/{SUBJECT.description.max}
            </p>
          </div>
          {form.formState.errors.description && (
            <p className="text-xs text-destructive">
              {form.formState.errors.description.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Course image URL</Label>
          <Input
            placeholder="https://…"
            maxLength={SUBJECT.courseImageUrl.max}
            {...form.register("courseImageUrl")}
          />
          <p className="text-xs text-muted-foreground text-right tabular-nums">
            {(courseImageUrlWatch ?? "").length}/{SUBJECT.courseImageUrl.max}
          </p>
          {form.formState.errors.courseImageUrl && (
            <p className="text-xs text-destructive">
              {form.formState.errors.courseImageUrl.message}
            </p>
          )}
        </div>
        <Button type="submit">Create subject</Button>
      </form>
    </div>
  );
}
