/**
 * King LMS コース一覧の React コンテキスト。
 * ホームページでストレージから読み込み、カレンダーパネルで参照する。
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type CourseRow = { displayName?: string; externalAccessUrl?: string };

interface CoursesContextValue {
  courses:    CourseRow[];
  setCourses: (rows: CourseRow[]) => void;
}

const CoursesContext = createContext<CoursesContextValue | null>(null);

export function CoursesProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const value = useMemo(() => ({ courses, setCourses }), [courses]);
  return <CoursesContext.Provider value={value}>{children}</CoursesContext.Provider>;
}

export function useCourses(): CoursesContextValue {
  const ctx = useContext(CoursesContext);
  if (!ctx) throw new Error('useCourses は CoursesProvider の中で使ってください');
  return ctx;
}
