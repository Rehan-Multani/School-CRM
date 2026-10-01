import { parentApi } from '../../../api/parent';
import NotificationSettingsScreen from '../../../components/account/NotificationSettingsScreen';

export default function Settings() {
  return <NotificationSettingsScreen load={parentApi.settings} save={parentApi.updateSettings} />;
}
