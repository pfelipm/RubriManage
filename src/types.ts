export interface Level {
  id: string;
  name: string;
  score: number;
  description: string;
}

export interface Indicator {
  id: string;
  name: string;
  weight: number;
  levels: Level[];
}

export interface Rubric {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  author?: string;
  indicators: Indicator[];
  maxScore: number;
  createdAt?: any;
}

export interface Student {
  id: string;
  name: string;
}

export interface Group {
  id: string;
  ownerId: string;
  name: string;
  students: Student[];
  createdAt?: any;
}

export interface Evaluation {
  id: string;
  ownerId: string;
  rubricId: string;
  groupId: string;
  studentId: string;
  selections: Record<string, string>; // indicatorId -> levelId
  score: number; // 0-maxScore
  updatedAt?: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'teacher';
  impersonatedBy?: string;
}
