<?php

namespace App\Modules\Submissions\Requests;

use App\Models\Student;
use App\Modules\Files\Services\FileStorageService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'nis' => ['required', 'string', 'min:3', 'max:50', 'regex:/^[A-Za-z0-9\-_.]+$/'],
            'class' => ['required', 'string', Rule::in(Student::VALID_CLASSES)],
            'confirm_existing' => ['nullable', 'boolean'],
            'assignment_id' => ['required', 'integer', 'exists:assignments,id'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'files' => ['required', 'array', 'min:1', 'max:'.FileStorageService::MAX_FILES_PER_SUBMISSION],
            'files.*' => [
                'required',
                'file',
                'max:'.FileStorageService::MAX_FILE_SIZE_KB,
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'files.required' => 'Minimal unggah 1 file tugas.',
            'files.max' => 'Maksimal '.FileStorageService::MAX_FILES_PER_SUBMISSION.' file per pengumpulan.',
            'files.*.max' => 'Ukuran setiap file maksimal 10 MB.',
        ];
    }
}
