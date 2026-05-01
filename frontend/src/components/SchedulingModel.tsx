import { useEffect, useState } from "react";
import { Calendar } from "./ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { useNavigate } from "react-router";
import type { Mentor } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentor: Mentor;
  /** DB subject id to pre-select when opening from subject card */
  prefilledSubjectId?: number;
}

const TIME_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
];

export function SchedulingModal({
  isOpen,
  onClose,
  mentor,
  prefilledSubjectId,
}: SchedulingModalProps) {
  const [date, setDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [subjectId, setSubjectId] = useState<number | undefined>(
    mentor.subjects[0]?.id,
  );
  const [pastError, setPastError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;
    setPastError(null);
    if (
      prefilledSubjectId &&
      mentor.subjects.some((s) => s.id === prefilledSubjectId)
    ) {
      setSubjectId(prefilledSubjectId);
    } else if (mentor.subjects[0]) {
      setSubjectId(mentor.subjects[0].id);
    }
  }, [isOpen, prefilledSubjectId, mentor.subjects]);

  const mentorName = `${mentor.firstName} ${mentor.lastName}`;
  const selectedSubject = mentor.subjects.find((s) => s.id === subjectId);

  const handleSchedule = () => {
    setPastError(null);
    if (!date || !selectedTime || !selectedSubject) return;
    const sessionDateTime = new Date(date);
    const [hours, minutes] = selectedTime.split(":");
    sessionDateTime.setHours(
      Number.parseInt(hours, 10),
      Number.parseInt(minutes, 10),
      0,
      0,
    );

    if (sessionDateTime.getTime() <= Date.now()) {
      setPastError("Please choose a future date and time.");
      return;
    }

    const sessionId = `${mentor.id}-${Date.now()}`;
    const searchParams = new URLSearchParams({
      date: sessionDateTime.toISOString(),
      courseTitle: selectedSubject.subjectName ?? "",
      mentorName,
      mentorId: String(mentor.id),
      subjectId: String(selectedSubject.id),
    });
    navigate(`/payment/${sessionId}?${searchParams.toString()}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-center space-y-0">
          <DialogTitle>Schedule this session</DialogTitle>
          <DialogDescription className="sr-only">
            Pick a date and time for your mentoring session with {mentorName}.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border p-4 flex gap-4 items-center bg-muted/40">
          {mentor.profileImageUrl ? (
            <img
              src={mentor.profileImageUrl}
              alt=""
              className="size-14 rounded-full object-cover"
            />
          ) : (
            <div className="size-14 rounded-full bg-muted flex items-center justify-center font-bold">
              {mentor.firstName.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-semibold">{mentorName}</p>
            <p className="text-sm text-muted-foreground">{mentor.title}</p>
            <p className="text-xs text-muted-foreground">{mentor.company}</p>
          </div>
        </div>

        {mentor.subjects.length > 1 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Subject</p>
            <div className="flex flex-wrap gap-2">
              {mentor.subjects.map((s) => (
                <Button
                  key={s.id}
                  type="button"
                  size="sm"
                  variant={subjectId === s.id ? "default" : "outline"}
                  onClick={() => setSubjectId(s.id)}
                >
                  {s.subjectName}
                </Button>
              ))}
            </div>
          </div>
        )}

        {pastError && (
          <Alert variant="destructive">
            <AlertDescription>{pastError}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Choose a date</h4>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md border"
            />
          </div>
          <div>
            <h4 className="font-medium mb-2">Choose a time</h4>
            <div className="grid grid-cols-2 gap-2">
              {TIME_SLOTS.map((time) => (
                <Button
                  key={time}
                  variant={selectedTime === time ? "default" : "outline"}
                  className="w-full"
                  type="button"
                  onClick={() => setSelectedTime(time)}
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" type="button" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSchedule}
            disabled={!date || !selectedTime || !selectedSubject}
          >
            Continue to payment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
