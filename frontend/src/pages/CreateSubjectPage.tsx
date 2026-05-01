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
import type { Mentor } from "@/types";

const schema = z
  .object({
    subjectName: z.string().min(5, "At least 5 characters"),
    description: z.string().min(5),
    courseImageUrl: z
      .string()
      .optional()
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
        subjectName: values.subjectName,
        description: values.description,
        courseImageUrl: values.courseImageUrl || undefined,
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
            onValueChange={(v) => form.setValue("mentorId", Number(v))}
            value={
              (() => {
                const mid = form.watch("mentorId");
                return mid != null && mid > 0 ? String(mid) : undefined;
              })()
            }
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
          <Label>Name</Label>
          <Input {...form.register("subjectName")} />
          {form.formState.errors.subjectName && (
            <p className="text-xs text-destructive">
              {form.formState.errors.subjectName.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea rows={4} {...form.register("description")} />
        </div>
        <div className="space-y-2">
          <Label>Course image URL</Label>
          <Input {...form.register("courseImageUrl")} />
        </div>
        <Button type="submit">Create subject</Button>
      </form>
    </div>
  );
}
