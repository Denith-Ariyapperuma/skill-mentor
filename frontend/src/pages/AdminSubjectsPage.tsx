import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "react-router";
import {
  deleteSubject,
  getAdminSubjects,
  getPublicMentors,
  updateSubject,
} from "@/lib/api";
import type { AdminSubjectRow, Mentor } from "@/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { SUBJECT } from "@/lib/fieldLimits";

const PAGE_SIZE = 15;
const NONE = "__all";

export default function AdminSubjectsPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AdminSubjectRow[]>([]);
  const [mentorOptions, setMentorOptions] = useState<Mentor[]>([]);

  const [search, setSearch] = useState("");
  const [mentorFilter, setMentorFilter] = useState<string>(NONE);
  const [page, setPage] = useState(0);

  const [editRow, setEditRow] = useState<AdminSubjectRow | null>(null);
  const [delRow, setDelRow] = useState<AdminSubjectRow | null>(null);

  const loadSubjects = async (): Promise<void> => {
    setLoading(true);
    try {
      const token = await getToken({ template: "skillmentor-auth" });
      if (!token) throw new Error("Sign in required");
      const [subjectsData, mentorsPage] = await Promise.all([
        getAdminSubjects(token),
        getPublicMentors(0, 500, undefined, token),
      ]);
      setRows(subjectsData);
      setMentorOptions(mentorsPage.content ?? []);
      setPage(0);
    } catch (e) {
      toast({
        title: "Could not load subjects",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (mentorFilter !== NONE && String(r.mentorId) !== mentorFilter)
        return false;
      if (!q) return true;
      const blob = `${r.subjectName} ${r.description} ${r.mentorName}`.toLowerCase();
      return blob.includes(q);
    });
  }, [rows, search, mentorFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All subjects</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Filter locally by mentor and free-text search; edit or delete a
          course.
        </p>
        <Link
          to="/admin/subjects/create"
          className="text-sm text-primary font-medium underline-offset-4 hover:underline mt-2 inline-block"
        >
          Create subject
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-3 flex-wrap items-end">
        <div className="space-y-1.5 min-w-[220px] flex-1 max-w-md">
          <Label className="text-xs text-muted-foreground">
            Search (name / description / mentor)
          </Label>
          <Input
            placeholder="Type to filter…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <div className="space-y-1.5 w-full md:w-[240px]">
          <Label className="text-xs text-muted-foreground">
            Mentor filter
          </Label>
          <Select
            value={mentorFilter}
            onValueChange={(v) => {
              setMentorFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All mentors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>All mentors</SelectItem>
              {mentorOptions.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.firstName} {m.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          Showing <strong>{filtered.length}</strong> of {rows.length}
        </p>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Mentor</TableHead>
              <TableHead className="max-w-[260px]">Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  No subjects match your filters.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell className="font-medium">{r.subjectName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {r.mentorName}
                  </TableCell>
                  <TableCell className="max-w-[280px] text-sm text-muted-foreground align-top pt-4">
                    <span className="line-clamp-2">{r.description}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditRow(r)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDelRow(r)}
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
        <EditSubjectDialog
          row={editRow}
          mentors={mentorOptions}
          onClose={() => setEditRow(null)}
          onSaved={async () => {
            setEditRow(null);
            await loadSubjects();
            toast({ title: "Subject updated" });
          }}
        />
      )}
      {delRow && (
        <DeleteSubjectDialog
          row={delRow}
          onClose={() => setDelRow(null)}
          onDeleted={async () => {
            setDelRow(null);
            await loadSubjects();
            toast({ title: "Subject deleted" });
          }}
        />
      )}
    </div>
  );
}

function EditSubjectDialog({
  row,
  mentors,
  onClose,
  onSaved,
}: {
  row: AdminSubjectRow;
  mentors: Mentor[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [subjectName, setSubjectName] = useState(row.subjectName);
  const [description, setDescription] = useState(row.description);
  const [courseImageUrl, setCourseImageUrl] = useState(
    row.courseImageUrl ?? "",
  );
  const [mentorId, setMentorId] = useState(String(row.mentorId));

  const save = async (): Promise<void> => {
    const mid = Number(mentorId);
    const nm = subjectName.trim();
    const desc = description.trim();
    const urlTrim = courseImageUrl.trim();
    if (!nm || nm.length < SUBJECT.subjectName.min) {
      toast({
        title: "Invalid name",
        description: `Subject name needs ${SUBJECT.subjectName.min}–${SUBJECT.subjectName.max} characters.`,
        variant: "destructive",
      });
      return;
    }
    if (nm.length > SUBJECT.subjectName.max) {
      toast({
        title: "Invalid name",
        description: `Subject name must be at most ${SUBJECT.subjectName.max} characters.`,
        variant: "destructive",
      });
      return;
    }
    if (desc.length < SUBJECT.description.min) {
      toast({
        title: "Invalid description",
        description: `Description needs ${SUBJECT.description.min}–${SUBJECT.description.max} characters.`,
        variant: "destructive",
      });
      return;
    }
    if (desc.length > SUBJECT.description.max) {
      toast({
        title: "Invalid description",
        description: `Description must be at most ${SUBJECT.description.max} characters.`,
        variant: "destructive",
      });
      return;
    }
    if (courseImageUrl.length > SUBJECT.courseImageUrl.max) {
      toast({
        title: "Invalid URL",
        description: `Course image URL must be at most ${SUBJECT.courseImageUrl.max} characters.`,
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const token = await getToken({ template: "skillmentor-auth" });
      if (!token) throw new Error("Sign in required");
      await updateSubject(token, row.id, {
        subjectName: nm,
        description: desc,
        mentorId: mid,
        courseImageUrl: urlTrim || undefined,
      });
      await onSaved();
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : undefined,
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
          <DialogTitle>Edit subject</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Mentor</Label>
            <Select value={mentorId} onValueChange={setMentorId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mentors.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.firstName} {m.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Course name</Label>
            <Input
              maxLength={SUBJECT.subjectName.max}
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
            />
            <div className="flex justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {SUBJECT.subjectName.min}–{SUBJECT.subjectName.max} characters.
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {subjectName.length}/{SUBJECT.subjectName.max}
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={4}
              maxLength={SUBJECT.description.max}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/{SUBJECT.description.max}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Course image URL</Label>
            <Input
              maxLength={SUBJECT.courseImageUrl.max}
              value={courseImageUrl}
              onChange={(e) => setCourseImageUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground text-right tabular-nums">
              {courseImageUrl.length}/{SUBJECT.courseImageUrl.max}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save()} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteSubjectDialog({
  row,
  onClose,
  onDeleted,
}: {
  row: AdminSubjectRow;
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
      await deleteSubject(token, row.id);
      await onDeleted();
    } catch (e) {
      toast({
        title: "Delete failed",
        description:
          e instanceof Error
            ? e.message
            : "Sessions may reference this subject.",
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
          <DialogTitle>Delete subject?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Remove <strong>{row.subjectName}</strong> ({row.mentorName}). This fails
          while sessions reference it.
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
