<?php

namespace App\Modules\Submissions\Requests;

use App\Modules\Files\Services\FileStorageService;
use Illuminate\Foundation\Http\FormRequest;

class SubmitRevisionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
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
            'files.required' => 'Minimal unggah 1 file revisi.',
            'files.max' => 'Maksimal '.FileStorageService::MAX_FILES_PER_SUBMISSION.' file per pengumpulan.',
            'files.*.max' => 'Ukuran setiap file maksimal 10 MB.',
        ];
    }
}
