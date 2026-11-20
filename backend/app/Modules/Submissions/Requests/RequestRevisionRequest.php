<?php

namespace App\Modules\Submissions\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RequestRevisionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'admin_notes' => ['required', 'string', 'min:3', 'max:2000'],
        ];
    }
}
