import { transportApi } from '../../../api/transport';
import ChangePasswordScreen from '../../../components/account/ChangePasswordScreen';

export default function ChangePassword() {
  return <ChangePasswordScreen changePassword={transportApi.changePassword} />;
}
