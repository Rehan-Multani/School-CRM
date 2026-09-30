import { studentApi } from '../../../api/student';
import NotificationSettingsScreen from '../../../components/account/NotificationSettingsScreen';

export default function Settings() {
  return <NotificationSettingsScreen load={studentApi.settings} save={studentApi.updateSettings} />;
}
