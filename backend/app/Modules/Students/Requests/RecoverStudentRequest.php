<?php

namespace App\Modules\Students\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RecoverStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token' => ['required', 'string', 'min:32', 'max:128'],
        ];
    }
}
