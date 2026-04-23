"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  matchId: string;
  matchLabel: string;
  redirectTo?: string;
  size?: "sm" | "md";
  variant?: "ghost" | "danger" | "outline";
}

export function DeleteMatchButton({
  matchId,
  matchLabel,
  redirectTo,
  size = "sm",
  variant = "ghost",
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function onDelete() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/matches/${matchId}`, { method: "DELETE" });
      const body = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to delete match.");
      }

      setOpen(false);
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete match.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} type="button" variant={variant}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete match log</DialogTitle>
          <DialogDescription>
            This permanently deletes {matchLabel}, its coach notes, and any uploaded VOD file.
          </DialogDescription>
        </DialogHeader>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <DialogFooter>
          <Button disabled={pending} onClick={() => setOpen(false)} type="button" variant="ghost">
            Cancel
          </Button>
          <Button disabled={pending} onClick={onDelete} type="button" variant="danger">
            {pending ? "Deleting…" : "Delete match"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
