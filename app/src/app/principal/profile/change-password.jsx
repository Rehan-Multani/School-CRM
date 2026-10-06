import { principalApi } from '../../../api/principal';
import ChangePasswordScreen from '../../../components/account/ChangePasswordScreen';

export default function ChangePassword() {
  return <ChangePasswordScreen changePassword={principalApi.changePassword} />;
}
