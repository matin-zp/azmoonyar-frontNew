export interface Course {

  id: number;
  courseName: string;
  courseCode: string;

  teacher: {
    id: number;
    firstName: string;
    lastName: string;
  };

  students: {
    id: number;
    firstName: string;
    lastName: string;
    studentNumber: string;
  }[];

  exams: {
    id: number;
    name: string;
    startDate: string;   // API string تاریخ برمی‌گرداند
    endDate: string;
    room: {
      id: number;
      name: string;
      capacity: number;
    };
  }[];
}
