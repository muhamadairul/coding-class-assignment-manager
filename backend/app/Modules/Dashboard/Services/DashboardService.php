<?php

namespace App\Modules\Dashboard\Services;

use App\Models\Assignment;
use App\Models\Student;
use App\Models\Submission;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    public function getOverview(): array
    {
        $totalAssignments = Assignment::count();
        $activeAssignments = Assignment::published()->count();
        $totalStudents = Student::count();
        $totalSubmissions = Submission::count();

        $lateSubmissions = Submission::query()
            ->join('assignments', 'submissions.assignment_id', '=', 'assignments.id')
            ->whereNotNull('assignments.deadline')
            ->whereColumn('submissions.submitted_at', '>', 'assignments.deadline')
            ->count();

        $publishedAssignments = Assignment::published()->get(['id', 'title', 'class_target', 'deadline']);
        $students = Student::all(['id', 'class']);
        $submissionPairs = Submission::query()
            ->whereIn('assignment_id', $publishedAssignments->pluck('id'))
            ->get(['student_id', 'assignment_id'])
            ->groupBy('student_id')
            ->map(fn ($items) => $items->pluck('assignment_id')->flip());

        $studentsWithMissingTasks = 0;
        $classStats = [
            '10' => ['class' => '10', 'total_students' => 0, 'expected_submissions' => 0, 'submitted' => 0, 'not_submitted' => 0],
            '11' => ['class' => '11', 'total_students' => 0, 'expected_submissions' => 0, 'submitted' => 0, 'not_submitted' => 0],
        ];

        foreach ($students as $student) {
            $cls = (string) $student->class;
            if (! isset($classStats[$cls])) {
                $classStats[$cls] = ['class' => $cls, 'total_students' => 0, 'expected_submissions' => 0, 'submitted' => 0, 'not_submitted' => 0];
            }
            $classStats[$cls]['total_students']++;

            $relevantAssignments = $publishedAssignments->filter(fn ($a) => $a->isTargetedToClass($cls));
            $studentSubmittedMap = $submissionPairs->get($student->id, collect());

            $missingForStudent = 0;
            foreach ($relevantAssignments as $assignment) {
                $classStats[$cls]['expected_submissions']++;
                if ($studentSubmittedMap->has($assignment->id)) {
                    $classStats[$cls]['submitted']++;
                } else {
                    $classStats[$cls]['not_submitted']++;
                    $missingForStudent++;
                }
            }

            if ($missingForStudent > 0) {
                $studentsWithMissingTasks++;
            }
        }

        // Daily submissions trend (last 14 days, PostgreSQL & MySQL compatible via Carbon)
        $startDate = Carbon::today('UTC')->subDays(13);
        $rawDates = Submission::query()
            ->where('submitted_at', '>=', $startDate->copy()->startOfDay())
            ->pluck('submitted_at')
            ->countBy(fn ($dt) => Carbon::parse($dt)->toDateString());

        $submissionsTrend = [];
        for ($i = 0; $i < 14; $i++) {
            $day = $startDate->copy()->addDays($i);
            $dateStr = $day->toDateString();
            $submissionsTrend[] = [
                'date' => $dateStr,
                'label' => $day->format('d M'),
                'count' => (int) ($rawDates[$dateStr] ?? 0),
            ];
        }

        $submissionCountsByAssignment = Submission::query()
            ->select('assignment_id', DB::raw('COUNT(*) as total'))
            ->whereIn('assignment_id', $publishedAssignments->pluck('id'))
            ->groupBy('assignment_id')
            ->pluck('total', 'assignment_id');

        $assignmentRates = $publishedAssignments->map(function (Assignment $assignment) use ($students, $submissionCountsByAssignment) {
            $targetCount = $students->filter(fn ($s) => $assignment->isTargetedToClass((string) $s->class))->count();
            $submittedCount = (int) ($submissionCountsByAssignment[$assignment->id] ?? 0);
            $rate = $targetCount > 0 ? round(($submittedCount / $targetCount) * 100, 1) : 0;

            return [
                'id' => $assignment->id,
                'title' => $assignment->title,
                'class_target' => $assignment->class_target ?? Assignment::CLASS_ALL,
                'deadline' => $assignment->deadline?->toIso8601String(),
                'submitted_count' => $submittedCount,
                'target_students' => $targetCount,
                'completion_rate' => $rate,
            ];
        })->sortByDesc('completion_rate')->values();

        return [
            'stats' => [
                'total_assignments' => $totalAssignments,
                'active_assignments' => $activeAssignments,
                'total_students' => $totalStudents,
                'total_submissions' => $totalSubmissions,
                'students_not_submitted' => $studentsWithMissingTasks,
                'late_submissions' => $lateSubmissions,
            ],
            'submissions_trend' => $submissionsTrend,
            'class_stats' => array_values($classStats),
            'assignment_rates' => $assignmentRates,
        ];
    }
}
