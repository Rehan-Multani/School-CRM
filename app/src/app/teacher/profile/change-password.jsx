import { teacherApi } from '../../../api/teacher';
import ChangePasswordScreen from '../../../components/account/ChangePasswordScreen';

export default function ChangePassword() {
  return <ChangePasswordScreen changePassword={teacherApi.changePassword} />;
}
