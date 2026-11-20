import { CheckCircle2, Clock, AlertTriangle, FileCheck2, RotateCcw, CircleDashed } from 'lucide-react';
import { Badge } from './badge';

export function ClassTargetBadge({ target }: { target?: string | null }) {
  if (!target || target === 'all') {
    return <Badge variant="indigo">Semua Kelas</Badge>;
  }
  return <Badge variant="slate">Kelas {target}</Badge>;
}

export function AssignmentStatusBadge({ status }: { status: string }) {
  if (status === 'published') {
    return <Badge variant="emerald">Published</Badge>;
  }
  if (status === 'archived') {
    return <Badge variant="slate">Archived</Badge>;
  }
  return <Badge variant="amber">Draft</Badge>;
}

export function ReviewStatusBadge({ status }: { status: string }) {
  if (status === 'reviewed') {
    return (
      <Badge variant="indigo">
        <FileCheck2 className="h-3 w-3" />
        Reviewed
      </Badge>
    );
  }
  if (status === 'revision_required') {
    return (
      <Badge variant="amber">
        <RotateCcw className="h-3 w-3" />
        Revision Required
      </Badge>
    );
  }
  return (
    <Badge variant="emerald">
      <CheckCircle2 className="h-3 w-3" />
      Submitted
    </Badge>
  );
}

export function TimelinessBadge({ isLate }: { isLate: boolean }) {
  if (isLate) {
    return (
      <Badge variant="rose">
        <AlertTriangle className="h-3 w-3" />
        Terlambat
      </Badge>
    );
  }
  return (
    <Badge variant="emerald">
      <Clock className="h-3 w-3" />
      Tepat Waktu
    </Badge>
  );
}

export function StudentTaskStatusBadge({ status }: { status?: string }) {
  if (status === 'late') {
    return (
      <Badge variant="rose">
        <AlertTriangle className="h-3 w-3" />
        Terlambat
      </Badge>
    );
  }
  if (status === 'submitted') {
    return (
      <Badge variant="emerald">
        <CheckCircle2 className="h-3 w-3" />
        Sudah Dikumpulkan
      </Badge>
    );
  }
  return (
    <Badge variant="slate">
      <CircleDashed className="h-3 w-3" />
      Belum Dikumpulkan
    </Badge>
  );
}
