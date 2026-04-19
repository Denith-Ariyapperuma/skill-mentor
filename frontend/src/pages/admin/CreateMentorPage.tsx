import { useForm, type Resolver } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/hooks/use-toast";
import { useAuth } from "@clerk/clerk-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { API_BASE_URL } from "@/lib/api";
import { getTokenForBackend } from "@/lib/clerk-token";

const formSchema = z.object({
  mentorId: z.string().min(3, "Enter the mentor’s Clerk user id (from Clerk dashboard)"),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().optional(),
  title: z.string().min(2, "Title is required (e.g., Senior Software Engineer)"),
  profession: z.string().min(2, "Profession is required"),
  company: z.string().optional(),
  experienceYears: z.coerce.number().min(0),
  bio: z.string().min(10, "Bio must be at least 10 characters"),
  profileImageUrl: z.string().optional(),
  isCertified: z.boolean(),
  startYear: z.coerce.number().min(1900).max(new Date().getFullYear()),
});

type MentorFormValues = z.infer<typeof formSchema>;

export default function CreateMentorPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<MentorFormValues>({
    resolver: zodResolver(formSchema) as Resolver<MentorFormValues>,
    defaultValues: {
      mentorId: "",
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
      startYear: new Date().getFullYear(),
    },
  });

  async function onSubmit(values: MentorFormValues) {
    try {
      const token = await getTokenForBackend(getToken);
      const response = await fetch(`${API_BASE_URL}/api/v1/mentors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...values,
          startYear: String(values.startYear),
          profileImageUrl:
            values.profileImageUrl && values.profileImageUrl.trim() !== ""
              ? values.profileImageUrl
              : undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to create mentor");

      toast({
        title: "Success",
        description: "Mentor has been created successfully.",
      });

      navigate("/admin/bookings");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create mentor. Please try again.",
      });
    }
  }

  const watchValues = form.watch();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Manage Mentors</h2>
          <p className="text-white/60">Create a new mentor profiloe or grant roles.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="mentorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clerk user ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="user_..."
                        {...field}
                        className="bg-black/40 border-white/10"
                      />
                    </FormControl>
                    <FormDescription>
                      The mentor must exist in Clerk; paste their user id so the profile links to their login.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} className="bg-black/40 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} className="bg-black/40 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe@example.com" {...field} className="bg-black/40 border-white/10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Senior Software Engineer" {...field} className="bg-black/40 border-white/10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="profession"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profession</FormLabel>
                      <FormControl>
                        <Input placeholder="Software Development" {...field} className="bg-black/40 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="experienceYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience (Years)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-black/40 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <textarea 
                        {...field} 
                        className="w-full min-h-24 bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Tell us about the mentor..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="profileImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/avatar.jpg" {...field} className="bg-black/40 border-white/10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-8 py-2">
                <FormField
                  control={form.control}
                  name="isCertified"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-white/20"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Certified Mentor</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startYear"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Start Year</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-black/40 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 mt-4">
                Create Mentor Profile
              </Button>
            </form>
          </Form>
        </div>

        {/* Preview Section */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Preview Card</h3>
          <Card className="bg-gradient-to-br from-neutral-900 to-black border-white/10 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-white">Mentor Card Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="size-24 rounded-2xl bg-white/10 overflow-hidden border border-white/10 flex-shrink-0">
                  {watchValues.profileImageUrl ? (
                    <img src={watchValues.profileImageUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">Photo</div>
                  )}
                </div>
                <div className="space-y-1">
                  <h4 className="text-xl font-bold text-white">
                    {watchValues.firstName || "First"} {watchValues.lastName || "Last"}
                  </h4>
                  <p className="text-primary text-sm font-medium">{watchValues.title || "Tutor Title"}</p>
                  <p className="text-white/60 text-xs">{watchValues.profession || "Profession"}</p>
                  {watchValues.isCertified && (
                    <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                      Certified
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-white/5">
                <p className="text-sm text-white/50 italic line-clamp-3">
                  {watchValues.bio || "Bio preview will appear here..."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
