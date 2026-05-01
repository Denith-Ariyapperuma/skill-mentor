import { useMemo, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/hooks/use-toast";
import { useAuth } from "@clerk/clerk-react";
import { enrollInSession } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";

const MAX_PAYMENT_SLIP_CHARS = 6_000_000;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => resolve(String(reader.result));
    reader.onerror = (): void => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sessionId } = useParams();
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const date = searchParams.get("date");
  const courseTitle = searchParams.get("courseTitle");
  const mentorId = searchParams.get("mentorId");
  const mentorName = searchParams.get("mentorName");
  const subjectId = searchParams.get("subjectId");

  const sessionDateObj = useMemo(() => (date ? new Date(date) : null), [date]);
  const sessionDate =
    sessionDateObj != null ? sessionDateObj.toLocaleDateString() : null;

  const pastSlot =
    sessionDateObj != null && sessionDateObj.getTime() <= Date.now();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    setBookingError(null);
    if (!file || !date || !mentorId || !subjectId || !sessionId) return;

    if (pastSlot) {
      setBookingError(
        "This session time is in the past. Go back and pick a future slot.",
      );
      return;
    }

    setIsUploading(true);

    try {
      const token = await getToken({ template: "skillmentor-auth" });
      if (!token) throw new Error("Not authenticated");

      const paymentSlipDataUrl = await readFileAsDataUrl(file);
      if (
        !paymentSlipDataUrl.startsWith("data:image/") ||
        !paymentSlipDataUrl.includes(";base64,")
      ) {
        setBookingError("Please upload an image file (photo of your slip).");
        setIsUploading(false);
        return;
      }
      if (paymentSlipDataUrl.length > MAX_PAYMENT_SLIP_CHARS) {
        setBookingError("Image is too large. Try a smaller photo.");
        setIsUploading(false);
        return;
      }

      await enrollInSession(token, {
        mentorId: Number(mentorId),
        subjectId: Number(subjectId),
        sessionAt: date,
        durationMinutes: 60,
        paymentSlipDataUrl,
      });

      toast({
        title: "Booking submitted",
        description:
          "Your payment slip was received. Complete payment verification on the Manage bookings screen.",
      });

      setIsUploading(false);
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "There was a problem scheduling your session.";
      setBookingError(msg);
      toast({
        title: "Could not complete booking",
        description: msg,
        variant: "destructive",
      });
      setIsUploading(false);
    }
  };

  return (
    <div className="container max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle>Upload Bank Transfer Slip</CardTitle>
        </CardHeader>
        <form onSubmit={handleUpload}>
          <CardContent className="space-y-4">
            {pastSlot && (
              <Alert variant="destructive">
                <AlertDescription>
                  This session is in the past. Please return home and schedule
                  a new time.
                </AlertDescription>
              </Alert>
            )}
            {bookingError && (
              <Alert variant="destructive">
                <AlertDescription>{bookingError}</AlertDescription>
              </Alert>
            )}
            {mentorName && (
              <div className="text-sm font-medium">
                Session with: {mentorName}
              </div>
            )}
            {courseTitle && (
              <div className="text-sm text-muted-foreground">{courseTitle}</div>
            )}
            {sessionDate && (
              <div className="text-sm">
                <strong>Session Date:</strong> {sessionDate}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="slip">Bank Transfer Slip</Label>
              <Input
                id="slip"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                required
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Please upload a clear image of your bank transfer slip to confirm
              your payment.
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={!file || isUploading || pastSlot}
            >
              {isUploading ? "Verifying..." : "Confirm Payment"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
