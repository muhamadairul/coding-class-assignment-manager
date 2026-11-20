<?php

namespace App\Shared\Support;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

class ApiResponse
{
    public static function success(
        mixed $data = null,
        string $message = 'Data berhasil diproses.',
        int $status = 200,
        mixed $meta = null
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'meta' => $meta,
        ], $status);
    }

    public static function paginated(
        LengthAwarePaginator $paginator,
        AnonymousResourceCollection|array $data,
        string $message = 'Data berhasil diambil.'
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data instanceof AnonymousResourceCollection ? $data->resolve() : $data,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ], 200);
    }

    public static function error(
        string $message = 'Terjadi kesalahan.',
        int $status = 400,
        mixed $errors = null,
        array $extra = []
    ): JsonResponse {
        $payload = [
            'success' => false,
            'message' => $message,
            'errors' => $errors ?? (object) [],
            ...$extra,
        ];

        return response()->json($payload, $status);
    }

    public static function resource(
        JsonResource $resource,
        string $message = 'Data berhasil diambil.',
        int $status = 200,
        mixed $meta = null
    ): JsonResponse {
        return self::success($resource->resolve(), $message, $status, $meta);
    }
}
