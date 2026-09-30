import { teacherApi } from '../../../api/teacher';
import NotificationSettingsScreen from '../../../components/account/NotificationSettingsScreen';

export default function Settings() {
  return <NotificationSettingsScreen load={teacherApi.settings} save={teacherApi.updateSettings} />;
}
