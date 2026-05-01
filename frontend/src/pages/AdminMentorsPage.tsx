import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "react-router";
import {
  deleteMentor,
  getPublicMentors,
  updateMentor,
} from "@/lib/api";
import type { Mentor } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { MENTOR } from "@/lib/fieldLimits";

const FETCH_SIZE = 500;
const PAGE_SIZE = 15;

export default function AdminMentorsPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rawRows, setRawRows] = useState<Mentor[]>([]);
  const [appliedSearch, setAppliedSearch] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [certFilter, setCertFilter] = useState<"all" | "certified" | "none">(
    "all",
  );
  const [page, setPage] = useState(0);

  const [editRow, setEditRow] = useState<Mentor | null>(null);
  const [delRow, setDelRow] = useState<Mentor | null>(null);

  const load = async (name: string): Promise<void> => {
    setLoading(true);
    try {
      const token = await getToken({ template: "skillmentor-auth" });
      if (!token) throw new Error("Sign in required");
      const res = await getPublicMentors(0, FETCH_SIZE, name, token);
      setRawRows(res.content ?? []);
      setPage(0);
    } catch (e) {
      toast({
        title: "Could not load mentors",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let r = rawRows;
    if (certFilter === "certified") {
      r = r.filter((m) => m.isCertified);
    }
    if (certFilter === "none") {
      r = r.filter((m) => !m.isCertified);
    }
    return r;
  }, [rawRows, certFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  if (loading && rawRows.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All mentors</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Search via the API name filter; refine certified status locally; edit
            or delete mentors.
          </p>
          <Link
            to="/admin/mentors/create"
            className="text-sm text-primary font-medium underline-offset-4 hover:underline mt-2 inline-block"
          >
            Create mentor
          </Link>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 flex-wrap items-end">
        <div className="flex flex-wrap gap-2 items-end flex-1 min-w-0">
          <div className="space-y-1.5 min-w-[200px] flex-1 max-w-md">
            <Label className="text-xs text-muted-foreground">Search name</Label>
            <Input
              placeholder="First / last name"
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setAppliedSearch(draftSearch);
                  load(draftSearch);
                }
              }}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setAppliedSearch(draftSearch);
              load(draftSearch);
            }}
          >
            Search
          </Button>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Certification
            </Label>
            <Select
              value={certFilter}
              onValueChange={(v) => {
                setCertFilter(v as typeof certFilter);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="certified">Certified only</SelectItem>
                <SelectItem value="none">Not certified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-sm text-muted-foreground shrink-0">
          Showing{" "}
          <strong>{filtered.length}</strong> on this fetch
          {appliedSearch ? (
            <>
              {" "}
              (search: &ldquo;{appliedSearch}&rdquo;)
            </>
          ) : null}
        </p>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Experience</TableHead>
              <TableHead>Certified</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  No mentors match your filters.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    {m.profileImageUrl ? (
                      <img
                        src={m.profileImageUrl}
                        alt=""
                        className="size-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="size-8 rounded-full bg-muted" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {m.firstName} {m.lastName}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {m.email}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate">
                    {m.title}
                  </TableCell>
                  <TableCell className="max-w-[140px] truncate">
                    {m.company}
                  </TableCell>
                  <TableCell>{m.experienceYears} yrs</TableCell>
                  <TableCell>
                    {m.isCertified ? (
                      <Badge variant="secondary">Yes</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <Link to={`/mentors/${m.id}`}>View</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditRow(m)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDelRow(m)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Page {page + 1} of {pageCount}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      {editRow && (
        <EditMentorDialog
          mentor={editRow}
          onClose={() => setEditRow(null)}
          onSaved={async () => {
            setEditRow(null);
            await load(appliedSearch);
            toast({ title: "Mentor updated" });
          }}
        />
      )}

      {delRow && (
        <DeleteMentorDialog
          mentor={delRow}
          onClose={() => setDelRow(null)}
          onDeleted={async () => {
            setDelRow(null);
            await load(appliedSearch);
            toast({ title: "Mentor deleted" });
          }}
        />
      )}
    </div>
  );
}

function EditMentorDialog({
  mentor,
  onClose,
  onSaved,
}: {
  mentor: Mentor;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    firstName: mentor.firstName,
    lastName: mentor.lastName,
    email: mentor.email,
    phoneNumber: mentor.phoneNumber ?? "",
    title: mentor.title,
    profession: mentor.profession,
    company: mentor.company,
    experienceYears: mentor.experienceYears,
    bio: mentor.bio,
    profileImageUrl: mentor.profileImageUrl ?? "",
    isCertified: mentor.isCertified ?? false,
    startYear: mentor.startYear,
  }));

  const submit = async (): Promise<void> => {
    if (!form.firstName.trim() || form.firstName.length > MENTOR.firstName.max) {
      toast({
        title: "Invalid first name",
        description: `Use 1–${MENTOR.firstName.max} characters.`,
        variant: "destructive",
      });
      return;
    }
    if (!form.lastName.trim() || form.lastName.length > MENTOR.lastName.max) {
      toast({
        title: "Invalid last name",
        description: `Use 1–${MENTOR.lastName.max} characters.`,
        variant: "destructive",
      });
      return;
    }
    if (!form.email.trim() || form.email.length > MENTOR.email.max) {
      toast({
        title: "Invalid email",
        variant: "destructive",
      });
      return;
    }
    if (form.phoneNumber.length > MENTOR.phoneNumber.max) {
      toast({
        title: "Phone too long",
        description: `Max ${MENTOR.phoneNumber.max} characters.`,
        variant: "destructive",
      });
      return;
    }
    if (
      !form.title.trim() ||
      form.title.length > MENTOR.title.max ||
      !form.profession.trim() ||
      form.profession.length > MENTOR.profession.max ||
      !form.company.trim() ||
      form.company.length > MENTOR.company.max
    ) {
      toast({
        title: "Invalid title / profession / company",
        description: `Respect limits (title/profession/company ≤ ${MENTOR.title.max}).`,
        variant: "destructive",
      });
      return;
    }
    if (
      typeof form.startYear !== "string" ||
      form.startYear.length > MENTOR.startYear.max
    ) {
      toast({
        title: "Invalid start year",
        variant: "destructive",
      });
      return;
    }
    if (!form.bio.trim()) {
      toast({ title: "Bio required", variant: "destructive" });
      return;
    }
    if (form.bio.length > MENTOR.bio.max) {
      toast({
        title: "Bio too long",
        description: `Max ${MENTOR.bio.max} characters.`,
        variant: "destructive",
      });
      return;
    }
    if (form.profileImageUrl.length > MENTOR.profileImageUrl.max) {
      toast({
        title: "Profile image URL too long",
        description: `Max ${MENTOR.profileImageUrl.max} characters.`,
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const token = await getToken({ template: "skillmentor-auth" });
      if (!token) throw new Error("Sign in required");
      const body: Record<string, unknown> = {
        mentorId: mentor.mentorId,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phoneNumber: form.phoneNumber || undefined,
        title: form.title,
        profession: form.profession,
        company: form.company,
        experienceYears: form.experienceYears,
        bio: form.bio,
        profileImageUrl: form.profileImageUrl || undefined,
        isCertified: form.isCertified,
        startYear: form.startYear,
      };
      await updateMentor(token, mentor.id, body);
      await onSaved();
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit mentor</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>First name</Label>
            <Input
              maxLength={MENTOR.firstName.max}
              value={form.firstName}
              onChange={(e) =>
                setForm((f) => ({ ...f, firstName: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Last name</Label>
            <Input
              maxLength={MENTOR.lastName.max}
              value={form.lastName}
              onChange={(e) =>
                setForm((f) => ({ ...f, lastName: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Email</Label>
            <Input
              type="email"
              maxLength={MENTOR.email.max}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Phone</Label>
            <Input
              maxLength={MENTOR.phoneNumber.max}
              value={form.phoneNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, phoneNumber: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Title</Label>
            <Input
              maxLength={MENTOR.title.max}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Profession</Label>
            <Input
              maxLength={MENTOR.profession.max}
              value={form.profession}
              onChange={(e) =>
                setForm((f) => ({ ...f, profession: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Company</Label>
            <Input
              maxLength={MENTOR.company.max}
              value={form.company}
              onChange={(e) =>
                setForm((f) => ({ ...f, company: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Years experience</Label>
            <Input
              type="number"
              value={form.experienceYears}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  experienceYears: Number(e.target.value) || 0,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Start year</Label>
            <Input
              maxLength={MENTOR.startYear.max}
              value={form.startYear}
              onChange={(e) =>
                setForm((f) => ({ ...f, startYear: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Bio</Label>
            <Textarea
              rows={4}
              maxLength={MENTOR.bio.max}
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground text-right">
              {form.bio.length}/{MENTOR.bio.max}
            </p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Profile image URL</Label>
            <Input
              maxLength={MENTOR.profileImageUrl.max}
              value={form.profileImageUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, profileImageUrl: e.target.value }))
              }
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox
              id="ed-cert"
              checked={form.isCertified}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, isCertified: Boolean(v) }))
              }
            />
            <Label htmlFor="ed-cert">Certified mentor</Label>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => submit()} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteMentorDialog({
  mentor,
  onClose,
  onDeleted,
}: {
  mentor: Mentor;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const run = async (): Promise<void> => {
    setBusy(true);
    try {
      const token = await getToken({ template: "skillmentor-auth" });
      if (!token) throw new Error("Sign in required");
      await deleteMentor(token, mentor.id);
      await onDeleted();
    } catch (e) {
      toast({
        title: "Delete failed",
        description:
          e instanceof Error
            ? e.message
            : "Ensure there are no linked subjects/sessions.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete mentor?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This removes{" "}
          <strong>
            {mentor.firstName} {mentor.lastName}
          </strong>{" "}
          permanently if the database allows (no blocking subjects/sessions).
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => run()} disabled={busy}>
            {busy ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
