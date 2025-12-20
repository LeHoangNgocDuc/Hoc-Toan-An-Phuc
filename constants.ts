
import { Member, Role, Task, TaskStatus } from './types';

export const INITIAL_MEMBERS: Member[] = [
  {
    id: '1',
    name: 'Nguyễn Văn A',
    role: Role.LEADER,
    email: 'vana@example.com',
    bio: 'Người dẫn dắt nhiệt huyết, giỏi về lập kế hoạch.'
  },
  {
    id: '2',
    name: 'Trần Thị B',
    role: Role.SECRETARY,
    email: 'thib@example.com',
    bio: 'Cẩn thận, tỉ mỉ, luôn hoàn thành báo cáo đúng hạn.'
  },
  {
    id: '3',
    name: 'Lê Văn C',
    role: Role.MEMBER,
    email: 'vanc@example.com',
    bio: 'Năng nổ trong các hoạt động phong trào.'
  }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: '101',
    title: 'Lập kế hoạch tuần 1',
    assignedTo: '1',
    status: TaskStatus.DONE,
    deadline: '2023-12-01'
  },
  {
    id: '102',
    title: 'Viết biên bản họp tổ',
    assignedTo: '2',
    status: TaskStatus.IN_PROGRESS,
    deadline: '2023-12-05'
  }
];
