import SelfAttendanceScreen from '../../components/attendance/SelfAttendanceScreen';
import { teacherApi } from '../../api/teacher';

const api = {
  today: () => teacherApi.selfAttendanceToday(),
  checkIn: (body) => teacherApi.selfCheckIn(body),
};

// Teacher marks themselves present: fingerprint + inside the school radius.
export default function TeacherSelfAttendance() {
  return <SelfAttendanceScreen api={api} />;
}
