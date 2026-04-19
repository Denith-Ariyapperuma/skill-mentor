import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/hooks/use-toast";
import { useAuth } from "@clerk/clerk-react";
import { API_BASE_URL } from "@/lib/api";
import { getTokenForBackend } from "@/lib/clerk-token";

const formSchema = z.object({
  subjectName: z.string().min(5, {
    message: "Subject name must be at least 5 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  courseImageUrl: z.string().url({
    message: "Please enter a valid URL.",
  }),
  mentorId: z.string().min(1, "Please select a mentor."),
});

interface Mentor {
  id: number;
  mentorId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function CreateSubjectPage() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subjectName: "",
      description: "",
      courseImageUrl: "",
    },
  });

  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/mentors`);
        if (!response.ok) throw new Error("Failed to fetch mentors");
        const data = await response.json();
        // Assuming data is a Page object with a 'content' property based on MentorController
        setMentors(data.content || []);
      } catch (error) {
        console.error("Error fetching mentors:", error);
      }
    };

    fetchMentors();
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!isLoaded) {
      toast({
        variant: "destructive",
        title: "Please wait",
        description: "Session is still loading.",
      });
      return;
    }
    if (!isSignedIn) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "You must be signed in to create a subject.",
      });
      return;
    }

    try {
      const token = await getTokenForBackend(getToken);
      if (!token) {
        toast({
          variant: "destructive",
          title: "Sign in required",
          description: "Could not get a session token. Try signing out and back in.",
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/subjects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...values,
          mentorId: parseInt(values.mentorId),
        }),
      });

      if (response.status === 401) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ||
            "Unauthorized — backend could not verify the JWT. Ensure CLERK_JWKS_URL matches your Clerk app (same instance as VITE_CLERK_PUBLISHABLE_KEY).",
        );
      }
      if (response.status === 403) {
        throw new Error(
          'Forbidden — this action requires role ADMIN. Set public metadata roles and JWT template "skillmentor-auth" with a roles claim.',
        );
      }
      if (!response.ok) throw new Error("Failed to create subject");

      toast({
        title: "Success",
        description: "Subject has been created successfully.",
      });

      navigate("/admin/bookings"); // Or wherever the list is
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create subject. Please try again.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Create Subject</h2>
        <p className="text-white/60">Add a new subject to the platform.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="subjectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject Name</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g. Web Development" {...field} className="bg-black/40 border-white/10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter subject description..." {...field} className="bg-black/40 border-white/10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="courseImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/image.jpg" {...field} className="bg-black/40 border-white/10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mentorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mentor</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-black/40 border-white/10">
                        <SelectValue placeholder="Select a mentor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-neutral-900 border-white/10 text-white">
                      {mentors.map((mentor) => (
                        <SelectItem key={mentor.id} value={mentor.id.toString()}>
                          {mentor.firstName} {mentor.lastName} ({mentor.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the mentor who will teach this subject.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90"
                disabled={!isLoaded || !isSignedIn}
              >
                Create Subject
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate(-1)}
                className="border-white/10 text-white hover:bg-white/5"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
