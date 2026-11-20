<?php

namespace App\Modules\Assignments\Requests;

use App\Modules\Files\Services\FileStorageService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => ['nullable', 'integer', 'exists:assignment_categories,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'instructions' => ['nullable', 'string'],
            'class_target' => ['nullable', 'string', Rule::in(['10', '11', 'all'])],
            'start_date' => ['nullable', 'date'],
            'deadline' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['required', 'string', Rule::in(['draft', 'published', 'archived'])],
            'remove_attachment' => ['nullable', 'boolean'],
            'attachment' => [
                'nullable',
                'file',
                'max:'.FileStorageService::MAX_FILE_SIZE_KB,
                'mimes:'.implode(',', FileStorageService::ALLOWED_EXTENSIONS),
            ],
        ];
    }
}
