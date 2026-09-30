import { studentApi } from '../../../api/student';
import ChangePasswordScreen from '../../../components/account/ChangePasswordScreen';

export default function ChangePassword() {
  return <ChangePasswordScreen changePassword={studentApi.changePassword} />;
}
