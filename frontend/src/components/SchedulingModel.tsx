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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { startOfDay } from "date-fns";

interface SchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentor: Mentor;
  /** Database subject id to pre-select */
  defaultSubjectId?: number;
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
  defaultSubjectId,
}: SchedulingModalProps) {
  const [date, setDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [subjectId, setSubjectId] = useState<string>("");
  const navigate = useNavigate();

  const mentorName = `${mentor.firstName} ${mentor.lastName}`;

  useEffect(() => {
    if (!mentor.subjects.length) {
      setSubjectId("");
      return;
    }
    const match = defaultSubjectId
      ? mentor.subjects.find((s) => s.id === defaultSubjectId)
      : undefined;
    setSubjectId(String((match ?? mentor.subjects[0]).id));
  }, [mentor, defaultSubjectId]);

  const selectedSubject = mentor.subjects.find(
    (s) => String(s.id) === subjectId,
  );

  const handleSchedule = () => {
    if (date && selectedTime && selectedSubject) {
      const sessionDateTime = new Date(date);
      const [hours, minutes] = selectedTime.split(":");
      sessionDateTime.setHours(
        Number.parseInt(hours, 10),
        Number.parseInt(minutes, 10),
      );

      if (sessionDateTime < new Date()) {
        return;
      }

      const sessionId = `new-${mentor.id}-${Date.now()}`;
      const searchParams = new URLSearchParams({
        date: sessionDateTime.toISOString(),
        courseTitle: selectedSubject.subjectName,
        mentorName: mentorName,
        mentorId: String(mentor.id),
        mentorImg: mentor.profileImageUrl ?? "",
        subjectId: String(selectedSubject.id),
      });
      navigate(`/payment/${sessionId}?${searchParams.toString()}`);
      onClose();
    }
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

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Mentor</p>
            <p className="text-sm text-muted-foreground">
              {mentorName} · {mentor.company}
            </p>
          </div>

          {mentor.subjects.length > 1 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Subject</p>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a subject" />
                </SelectTrigger>
                <SelectContent>
                  {mentor.subjects.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.subjectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Choose a date</h4>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(d) => d < startOfDay(new Date())}
              className="rounded-md border"
            />
          </div>
          <div>
            <h4 className="font-medium mb-2">Choose a time</h4>
            <div className="grid grid-cols-2 gap-2">
              {TIME_SLOTS.map((time) => (
                <Button
                  key={time}
                  type="button"
                  variant={selectedTime === time ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setSelectedTime(time)}
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
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
