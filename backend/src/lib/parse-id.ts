import { HttpError } from './http-error.js';

// Route param (:id) as a positive integer, 400 otherwise
export function parseId(value: unknown): number {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1) {
        throw new HttpError(400, 'Invalid id');
    }
    return id;
}
