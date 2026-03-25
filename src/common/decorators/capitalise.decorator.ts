import { Transform } from 'class-transformer';

export function Capitalise() {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? // Capitalise the first letter of each word
        value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
      : value,
  );
}
