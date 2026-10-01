import { parentApi } from '../../../api/parent';
import ChangePasswordScreen from '../../../components/account/ChangePasswordScreen';

export default function ChangePassword() {
  return <ChangePasswordScreen changePassword={parentApi.changePassword} />;
}
