<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->User_id,
            'name'           => $this->full_name,
            'first_name'     => $this->first_name,
            'middle_name'    => $this->middle_name,
            'surname'        => $this->surname,
            'contact_number' => $this->contact_number,
            'username'       => $this->username,
            'email'          => $this->email,
            'role'           => $this->role,
            'status'         => $this->status,
            'created_at'     => $this->Created_at,
        ];
    }
}
