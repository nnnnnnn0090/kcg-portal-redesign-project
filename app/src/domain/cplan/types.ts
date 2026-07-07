export type CplanRoute = 'login' | 'main' | 'category' | 'attendance';

export interface CplanLink {
  label: string;
  description?: string;
  element: HTMLAnchorElement;
}

export interface CplanAttendanceSnapshot {
  courses: Array<{ value: string; label: string }>;
  selectedCourse: string;
  date: string;
  period: string;
  teacher: string;
  result: string;
  error: string;
  success: string;
  message: string;
  passwordValue: string;
  passwordMaxLength: number;
  canSubmit: boolean;
}

export interface CplanSnapshot {
  route: CplanRoute;
  culture: 'ja' | 'en';
  userName: string;
  title: string;
  announcementHtml: string;
  links: CplanLink[];
  attendance?: CplanAttendanceSnapshot;
}
