import { customAlphabet } from 'nanoid';

// MERFOX-XXXX-XXXX-XXXX format
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar characters
const nanoid = customAlphabet(alphabet, 4);

export function generateLicenseKey(): string {
    const part1 = nanoid();
    const part2 = nanoid();
    const part3 = nanoid();
    return `MERFOX-${part1}-${part2}-${part3}`;
}
