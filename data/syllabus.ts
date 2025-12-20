
import { Grade, SyllabusItem } from '../types';

export const SYLLABUS: Record<string, SyllabusItem[]> = {
  [Grade.SIX]: [
    {
      chapter: "Số tự nhiên",
      lessons: ["Tập hợp", "Các phép tính với số tự nhiên", "Lũy thừa với số mũ tự nhiên", "Thứ tự thực hiện phép tính", "Chia hết và chia có dư"]
    },
    {
      chapter: "Số nguyên",
      lessons: ["Tập hợp các số nguyên", "Thứ tự trong tập hợp các số nguyên", "Các phép tính với số nguyên", "Quy tắc dấu ngoặc"]
    }
  ],
  [Grade.SEVEN]: [
    {
      chapter: "Số hữu tỉ",
      lessons: ["Tập hợp các số hữu tỉ", "Các phép tính với số hữu tỉ", "Lũy thừa của một số hữu tỉ", "Quy tắc dấu ngoặc và quy tắc chuyển vế"]
    },
    {
      chapter: "Số thực",
      lessons: ["Số vô tỉ. Căn bậc hai số học", "Tập hợp các số thực", "Giá trị tuyệt đối của một số thực"]
    }
  ],
  [Grade.EIGHT]: [
    {
      chapter: "Đa thức",
      lessons: ["Đơn thức và đa thức nhiều biến", "Các phép toán với đa thức", "Hằng đẳng thức đáng nhớ", "Phân tích đa thức thành nhân tử"]
    },
    {
      chapter: "Phân thức đại số",
      lessons: ["Khái niệm phân thức đại số", "Tính chất cơ bản của phân thức", "Cộng trừ phân thức", "Nhân chia phân thức"]
    }
  ],
  [Grade.NINE]: [
    {
      chapter: "Hệ hai phương trình bậc nhất hai ẩn",
      lessons: ["Khái niệm phương trình bậc nhất hai ẩn", "Hệ hai phương trình bậc nhất hai ẩn", "Giải hệ bằng phương pháp thế", "Giải hệ bằng phương pháp cộng đại số"]
    },
    {
      chapter: "Phương trình bậc hai một ẩn",
      lessons: ["Hàm số y = ax^2 (a ≠ 0)", "Đồ thị hàm số y = ax^2 (a ≠ 0)", "Phương trình bậc hai một ẩn", "Công thức nghiệm", "Định lý Vi-et"]
    },
    {
      chapter: "Hệ thức lượng trong tam giác vuông",
      lessons: ["Một số hệ thức về cạnh và đường cao", "Tỉ số lượng giác của góc nhọn", "Bảng lượng giác", "Giải tam giác vuông"]
    },
    {
      chapter: "Đường tròn",
      lessons: ["Định nghĩa đường tròn", "Vị trí tương đối của đường thẳng và đường tròn", "Tiếp tuyến của đường tròn", "Góc với đường tròn"]
    }
  ]
};
