import { describe, expect, it } from 'vitest';
import { formString, optionalFormString } from './formData';

describe('community form data readers', () => {
  it('reads string fields', () => {
    const form = new FormData();
    form.set('name', 'student');
    expect(formString(form, 'name')).toBe('student');
    expect(optionalFormString(form, 'name')).toBe('student');
  });

  it('normalizes missing required fields and preserves optional nulls', () => {
    const form = new FormData();
    expect(formString(form, 'missing')).toBe('');
    expect(optionalFormString(form, 'missing')).toBeNull();
  });

  it('does not pass files into JSON request fields', () => {
    const form = new FormData();
    form.set('value', new File(['x'], 'value.txt', { type: 'text/plain' }));
    expect(formString(form, 'value')).toBe('');
    expect(optionalFormString(form, 'value')).toBeNull();
  });
});
