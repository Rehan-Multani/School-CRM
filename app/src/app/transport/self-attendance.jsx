import SelfAttendanceScreen from '../../components/attendance/SelfAttendanceScreen';
import { transportApi } from '../../api/transport';

const api = {
  today: () => transportApi.selfAttendanceToday(),
  checkIn: (body) => transportApi.selfCheckIn(body),
};

// Transport manager marks themselves present: fingerprint + inside the school radius.
export default function TransportSelfAttendance() {
  return <SelfAttendanceScreen api={api} />;
}
